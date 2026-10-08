const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const https = require('https');
const httpNative = require('http');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// In-Memory Room Data
const rooms = new Map();

// Helper to get or create room
function getOrCreateRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      id: roomId,
      title: `Oda #${roomId}`,
      hostId: null,
      isHostOnly: false,
      users: new Map(),
      currentMedia: {
        url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', // High quality default HLS stream for demo
        title: 'Örnek Canlı HLS / Spor Yayını',
        type: 'hls', // 'hls', 'youtube', 'video', 'screenshare', 'iframe'
        playbackState: 'playing',
        currentTime: 0,
        updatedAt: Date.now(),
        isLive: true
      },
      playlist: [
        {
          id: 'sample-1',
          title: 'Canlı HLS / Spor Demo Yayını (M3U8)',
          url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
          type: 'hls',
          isLive: true,
          addedBy: 'Sistem'
        },
        {
          id: 'sample-2',
          title: 'YouTube 4K Demo',
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          type: 'youtube',
          isLive: false,
          addedBy: 'Sistem'
        },
        {
          id: 'sample-3',
          title: 'Big Buck Bunny (MP4 Video)',
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          type: 'video',
          isLive: false,
          addedBy: 'Sistem'
        }
      ],
      chatMessages: [
        {
          id: 'msg-welcome',
          sender: 'Sistem',
          text: 'Odaya hoş geldiniz! Canlı yayın, YouTube, HLS, MP4 veya film linki ekleyerek hemen izlemeye başlayabilirsiniz.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isSystem: true
        }
      ]
    });
  }
  return rooms.get(roomId);
}

// Convert room map to client-friendly JSON
function serializeRoom(room) {
  return {
    id: room.id,
    title: room.title,
    hostId: room.hostId,
    isHostOnly: room.isHostOnly,
    users: Array.from(room.users.values()),
    currentMedia: room.currentMedia,
    playlist: room.playlist,
    chatMessages: room.chatMessages.slice(-100) // Keep last 100 messages
  };
}

// Stream / CORS Bypass Proxy
// Allows fetching M3U8 playlists or video segments that block cross-origin browser requests
// Stream / CORS Bypass Proxy
// Recursively follows redirects and rewrites M3U8 chunk URLs
function handleProxyStream(targetUrl, req, res, hop = 0) {
  if (hop > 5) {
    if (!res.headersSent) res.status(508).send('Too many redirects');
    return;
  }

  try {
    const parsed = new URL(targetUrl);
    const clientReq = parsed.protocol === 'https:' ? https : httpNative;

    const proxyReq = clientReq.request(
      targetUrl,
      {
        headers: {
          'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
          'Referer': parsed.origin,
          'Origin': parsed.origin
        },
        timeout: 25000
      },
      (proxyRes) => {
        if (res.headersSent) return;

        // Follow HTTP redirects (301, 302, 307, 308) INTERNALLY so Hls.js never fails
        if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
          const redirectUrl = new URL(proxyRes.headers.location, targetUrl).href;
          return handleProxyStream(redirectUrl, req, res, hop + 1);
        }

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');

        const contentType = proxyRes.headers['content-type'] || '';
        const isM3U8 = contentType.includes('mpegurl') || contentType.includes('m3u') || targetUrl.includes('.m3u8') || targetUrl.includes('/live/');

        if (isM3U8) {
          res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
          let m3u8Data = '';

          proxyRes.setEncoding('utf8');
          proxyRes.on('data', (chunk) => {
            m3u8Data += chunk;
          });

          proxyRes.on('end', () => {
            if (res.headersSent) return;
            const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
            const rewrittenLines = m3u8Data.split('\n').map((line) => {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith('#')) {
                if (trimmed.startsWith('#EXT-X-KEY') && trimmed.includes('URI="')) {
                  return trimmed.replace(/URI="([^"]+)"/, (match, uri) => {
                    const fullUri = uri.startsWith('http') ? uri : new URL(uri, baseUrl).href;
                    return `URI="/api/proxy?url=${encodeURIComponent(fullUri)}"`;
                  });
                }
                return line;
              }

              const segmentUrl = trimmed.startsWith('http') ? trimmed : new URL(trimmed, baseUrl).href;
              return `/api/proxy?url=${encodeURIComponent(segmentUrl)}`;
            });

            res.send(rewrittenLines.join('\n'));
          });
        } else {
          if (contentType) {
            res.setHeader('Content-Type', contentType);
          }
          proxyRes.pipe(res);
        }
      }
    );

    proxyReq.on('error', (err) => {
      if (!res.headersSent) res.status(502).send(`Proxy Error: ${err.message}`);
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      if (!res.headersSent) res.status(504).send('Proxy Timeout');
    });

    proxyReq.end();
  } catch (err) {
    if (!res.headersSent) res.status(400).send(`Invalid URL: ${err.message}`);
  }
}

app.get('/api/proxy', (req, res) => {
  let targetUrl = req.query.url;
  if (req.originalUrl && req.originalUrl.includes('url=')) {
    const rawMatch = req.originalUrl.substring(req.originalUrl.indexOf('url=') + 4);
    if (rawMatch.startsWith('http://') || rawMatch.startsWith('https://')) {
      targetUrl = rawMatch;
    }
  }

  if (!targetUrl) {
    return res.status(400).send('Missing url parameter');
  }

  handleProxyStream(targetUrl, req, res, 0);
});

// In-Memory IPTV Playlist Cache
const iptvCache = new Map(); // url -> { channels, categories, updatedAt }

// Helper function to fetch JSON via HTTP
function fetchJsonWithVLC(urlStr) {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(urlStr);
      const client = parsed.protocol === 'https:' ? https : httpNative;
      const req = client.get(
        urlStr,
        {
          headers: { 'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18' },
          timeout: 25000
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return resolve(fetchJsonWithVLC(new URL(res.headers.location, urlStr).href));
          }
          if (res.statusCode !== 200) {
            return reject(new Error(`HTTP ${res.statusCode}`));
          }
          let data = '';
          res.setEncoding('utf8');
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        }
      );
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    } catch (e) {
      reject(e);
    }
  });
}

// IPTV M3U & Xtream Codes Parser Endpoint
app.get('/api/iptv/parse', async (req, res) => {
  let playlistUrl = req.query.url;
  if (req.originalUrl && req.originalUrl.includes('url=')) {
    const rawMatch = req.originalUrl.substring(req.originalUrl.indexOf('url=') + 4);
    if (rawMatch.startsWith('http://') || rawMatch.startsWith('https://')) {
      playlistUrl = rawMatch;
    }
  }

  if (!playlistUrl) {
    return res.status(400).json({ success: false, error: 'Playlist URL is required' });
  }

  // Check cache first (valid for 2 hours)
  const cached = iptvCache.get(playlistUrl);
  if (cached && (Date.now() - cached.updatedAt < 2 * 60 * 60 * 1000)) {
    return res.json({
      success: true,
      fromCache: true,
      totalChannels: cached.channels.length,
      categories: cached.categories,
      channels: cached.channels.slice(0, 80)
    });
  }

  try {
    const parsed = new URL(playlistUrl);
    const username = parsed.searchParams.get('username');
    const password = parsed.searchParams.get('password');

    // 1. FAST XTREAM CODES API PATH (Preferred if credentials exist)
    if (username && password) {
      const baseUrl = `${parsed.protocol}//${parsed.host}`;
      const streamsApiUrl = `${baseUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_live_streams`;

      try {
        const streamsData = await fetchJsonWithVLC(streamsApiUrl);
        const categoriesSet = new Set();
        const channels = [];

        if (Array.isArray(streamsData)) {
          streamsData.forEach((s, idx) => {
            const name = s.name || `Kanal #${idx + 1}`;
            let catName = 'Genel';

            // Smart category classification based on clean channel naming
            const upperName = name.toUpperCase();
            if (upperName.includes('BEIN') || upperName.includes('BE*IN')) {
              catName = 'TR ⚜️ beIN SPORTS';
            } else if (upperName.includes('S SPORT')) {
              catName = 'TR ⚜️ S SPORT';
            } else if (upperName.includes('EXXEN')) {
              catName = 'TR ⚜️ EXXEN SPORTS';
            } else if (upperName.includes('TABII')) {
              catName = 'TR ⚜️ TABII SPOR';
            } else if (upperName.includes('SPOR') || upperName.includes('SPORT') || upperName.includes('EUROSPORT') || upperName.includes('ARENA')) {
              catName = 'SPOR & CANLI MAÇ';
            } else if (name.startsWith('TR:')) {
              catName = 'TR ⚜️ TÜRKİYE KANALLARI';
            } else if (name.startsWith('AZ:')) {
              catName = 'AZ ⚜️ AZERBAYCAN';
            } else if (name.startsWith('DE:')) {
              catName = 'DE ⚜️ ALMANYA';
            } else if (name.startsWith('RU:') || upperName.includes('RU ')) {
              catName = 'RU ⚜️ RUSYA';
            } else if (name.startsWith('USA:') || upperName.includes('USA ')) {
              catName = 'USA ⚜️ AMERİKA';
            }

            categoriesSet.add(catName);
            const streamId = s.stream_id;
            const hlsUrl = `${baseUrl}/live/${username}/${password}/${streamId}.m3u8`;
            const rawStreamUrl = `${baseUrl}/${username}/${password}/${streamId}`;

            channels.push({
              id: `xt-${streamId || idx}`,
              title: name,
              group: catName,
              logo: s.stream_icon || '',
              streamUrl: hlsUrl,
              directUrl: rawStreamUrl,
              proxiedUrl: `/api/proxy?url=${encodeURIComponent(hlsUrl)}`
            });
          });
        }

        const categoriesList = Array.from(categoriesSet).sort();

        // Cache results
        iptvCache.set(playlistUrl, {
          channels,
          categories: categoriesList,
          updatedAt: Date.now()
        });

        return res.json({
          success: true,
          mode: 'xtream_api',
          totalChannels: channels.length,
          categories: categoriesList,
          channels: channels.slice(0, 80)
        });
      } catch (xtreamErr) {
        console.warn('Xtream API direct fetch failed, falling back to M3U text fetch:', xtreamErr.message);
      }
    }

    // 2. STANDARD M3U PARSING FALLBACK
    const clientReq = parsed.protocol === 'https:' ? https : httpNative;
    const request = clientReq.get(
      playlistUrl,
      {
        headers: { 'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18' },
        timeout: 30000
      },
      (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          return res.redirect(`/api/iptv/parse?url=${encodeURIComponent(response.headers.location)}`);
        }

        if (response.statusCode !== 200) {
          return res.status(response.statusCode).json({
            success: false,
            error: `IPTV sunucusu durum kodu: ${response.statusCode}`
          });
        }

        let rawData = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => (rawData += chunk));
        response.on('end', () => {
          const { channels, categories } = parseM3UPlaylist(rawData);
          iptvCache.set(playlistUrl, {
            channels,
            categories,
            updatedAt: Date.now()
          });

          res.json({
            success: true,
            mode: 'm3u_text',
            totalChannels: channels.length,
            categories,
            channels: channels.slice(0, 80)
          });
        });
      }
    );

    request.on('error', (err) => {
      if (!res.headersSent) res.status(500).json({ success: false, error: err.message });
    });

    request.on('timeout', () => {
      request.destroy();
      if (!res.headersSent) res.status(504).json({ success: false, error: 'Zaman aşımı' });
    });

  } catch (err) {
    if (!res.headersSent) res.status(400).json({ success: false, error: err.message });
  }
});

// IPTV Search & Filter Endpoint
app.get('/api/iptv/search', (req, res) => {
  const { q = '', category = '', page = 1, limit = 60 } = req.query;
  let playlistUrl = req.query.url;

  let cached = playlistUrl ? iptvCache.get(playlistUrl) : null;
  if (!cached && iptvCache.size > 0) {
    // If only one playlist is cached, or match by host/user
    for (const [k, v] of iptvCache.entries()) {
      if (!playlistUrl || k.includes(playlistUrl) || (playlistUrl.includes('necati29') && k.includes('necati29'))) {
        cached = v;
        break;
      }
    }
  }

  if (!cached) {
    return res.status(404).json({ success: false, error: 'Playlist not loaded yet. Call /api/iptv/parse first.' });
  }

  let results = cached.channels;

  // Filter by category
  if (category && category !== 'Tümü') {
    results = results.filter((c) => c.group.toLowerCase() === category.toLowerCase());
  }

  // Filter by search query
  if (q && q.trim()) {
    const queryLower = q.trim().toLowerCase();
    results = results.filter((c) => 
      c.title.toLowerCase().includes(queryLower) || 
      c.group.toLowerCase().includes(queryLower)
    );
  }

  const pageNum = parseInt(page, 10) || 1;
  const pageLimit = parseInt(limit, 10) || 60;
  const startIndex = (pageNum - 1) * pageLimit;
  const paginated = results.slice(startIndex, startIndex + pageLimit);

  res.json({
    success: true,
    totalMatches: results.length,
    page: pageNum,
    totalPages: Math.ceil(results.length / pageLimit),
    channels: paginated
  });
});

// Film Site Video & Embed Extractor Endpoint
app.get('/api/film/extract', (req, res) => {
  let filmUrl = req.query.url;
  if (!filmUrl) {
    return res.status(400).json({ success: false, error: 'Film URL required' });
  }

  try {
    const parsed = new URL(filmUrl);
    const clientReq = parsed.protocol === 'https:' ? https : httpNative;

    clientReq.get(
      filmUrl,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
        },
        timeout: 15000
      },
      (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          const redirectUrl = new URL(response.headers.location, filmUrl).href;
          return res.redirect(`/api/film/extract?url=${encodeURIComponent(redirectUrl)}`);
        }

        let html = '';
        response.setEncoding('utf8');
        response.on('data', (c) => (html += c));
        response.on('end', () => {
          // Extract page title
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i) || html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
          const rawTitle = titleMatch ? titleMatch[1].trim() : 'Film / Dizi';
          const cleanTitle = rawTitle.replace(/\s*-\s*(HD|Full|İzle|Tek Parça|Türkçe Dublaj).*$/i, '').trim();

          // 1. Check for direct .m3u8 or .mp4 inside scripts or attributes
          const m3u8Match = html.match(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/i);
          const mp4Match = html.match(/(https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*)/i);
          const videoTagMatch = html.match(/<video[^>]*src=["']([^"']+)["']/i) || html.match(/<source[^>]*src=["']([^"']+)["']/i);

          if (m3u8Match) {
            return res.json({
              success: true,
              mode: 'stream',
              type: 'hls',
              title: cleanTitle,
              url: m3u8Match[1],
              proxiedUrl: `/api/proxy?url=${encodeURIComponent(m3u8Match[1])}`
            });
          }

          if (mp4Match) {
            return res.json({
              success: true,
              mode: 'stream',
              type: 'video',
              title: cleanTitle,
              url: mp4Match[1],
              proxiedUrl: `/api/proxy?url=${encodeURIComponent(mp4Match[1])}`
            });
          }

          if (videoTagMatch) {
            const vUrl = videoTagMatch[1].startsWith('http') ? videoTagMatch[1] : new URL(videoTagMatch[1], filmUrl).href;
            const isHls = vUrl.includes('.m3u8');
            return res.json({
              success: true,
              mode: 'stream',
              type: isHls ? 'hls' : 'video',
              title: cleanTitle,
              url: vUrl,
              proxiedUrl: `/api/proxy?url=${encodeURIComponent(vUrl)}`
            });
          }

          // 2. Check for player iframe embeds (VidMoly, Filemoon, Streamwish, Dood, Vidsrc, Superembed, etc.)
          const iframeMatches = [...html.matchAll(/<iframe[^>]*src=["']([^"']+)["']/gi)];
          let selectedEmbed = null;

          for (const match of iframeMatches) {
            const src = match[1];
            if (!src || src.includes('google') || src.includes('facebook') || src.includes('disqus') || src.includes('ads')) {
              continue;
            }
            selectedEmbed = src.startsWith('//') ? 'https:' + src : (src.startsWith('http') ? src : new URL(src, filmUrl).href);
            break;
          }

          if (selectedEmbed) {
            return res.json({
              success: true,
              mode: 'embed',
              type: 'embed',
              title: cleanTitle,
              url: selectedEmbed,
              proxiedEmbedUrl: `/api/embed-proxy?url=${encodeURIComponent(selectedEmbed)}`
            });
          }

          // 3. Fallback: Embed the page itself through our anti-frame-busting proxy
          return res.json({
            success: true,
            mode: 'embed',
            type: 'embed',
            title: cleanTitle,
            url: filmUrl,
            proxiedEmbedUrl: `/api/embed-proxy?url=${encodeURIComponent(filmUrl)}`
          });
        });
      }
    ).on('error', (err) => {
      res.status(500).json({ success: false, error: err.message });
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Embed Proxy: Strips X-Frame-Options and Content-Security-Policy to allow embedding any movie site inside our synced player!
app.get('/api/embed-proxy', (req, res) => {
  let targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('Missing url parameter');

  try {
    const parsed = new URL(targetUrl);
    const clientReq = parsed.protocol === 'https:' ? https : httpNative;

    clientReq.get(
      targetUrl,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': parsed.origin
        },
        timeout: 20000
      },
      (proxyRes) => {
        if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
          const redirectUrl = new URL(proxyRes.headers.location, targetUrl).href;
          return res.redirect(`/api/embed-proxy?url=${encodeURIComponent(redirectUrl)}`);
        }

        // Strip headers that prevent embedding in iframe
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.removeHeader('X-Frame-Options');
        res.removeHeader('Content-Security-Policy');

        const contentType = proxyRes.headers['content-type'] || 'text/html';
        res.setHeader('Content-Type', contentType);

        if (contentType.includes('text/html')) {
          let html = '';
          proxyRes.setEncoding('utf8');
          proxyRes.on('data', (c) => (html += c));
          proxyRes.on('end', () => {
            const baseTag = `<base href="${parsed.origin}/">`;
            const modifiedHtml = html.replace(/<head[^>]*>/i, `$&${baseTag}`);
            res.send(modifiedHtml);
          });
        } else {
          proxyRes.pipe(res);
        }
      }
    ).on('error', (err) => {
      res.status(502).send(`Embed Proxy Error: ${err.message}`);
    });
  } catch (err) {
    res.status(400).send(`Invalid URL: ${err.message}`);
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    activeRooms: rooms.size,
    uptime: process.uptime()
  });
});

// Socket.io Realtime Signaling & Room Sync
io.on('connection', (socket) => {
  let currentRoomId = null;

  socket.on('join-room', ({ roomId, nickname, avatar, color }) => {
    currentRoomId = roomId;
    socket.join(roomId);

    const room = getOrCreateRoom(roomId);

    // If no host exists, first user becomes host
    const isHost = !room.hostId || room.users.size === 0;
    if (isHost) {
      room.hostId = socket.id;
    }

    const userData = {
      id: socket.id,
      nickname: nickname || `Misafir_${socket.id.slice(0, 4)}`,
      avatar: avatar || '🎮',
      color: color || '#8b5cf6',
      isHost,
      isMuted: false,
      isDeafened: false,
      isScreenSharing: false,
      permissions: {
        canVoice: true,
        canChat: true,
        canControlMedia: isHost
      },
      joinedAt: Date.now()
    };

    room.users.set(socket.id, userData);

    // Send full current room state to joining user
    socket.emit('room-state', serializeRoom(room));

    // Announce to everyone in room
    socket.to(roomId).emit('user-joined', userData);

    // System message
    const sysMsg = {
      id: 'sys-' + Date.now() + Math.random().toString(36).substr(2, 4),
      sender: 'Sistem',
      text: `${userData.nickname} odaya katıldı.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true
    };
    room.chatMessages.push(sysMsg);
    io.to(roomId).emit('new-message', sysMsg);

    // Tell everyone about existing peers for WebRTC voice setup
    const peerIds = Array.from(room.users.keys()).filter(id => id !== socket.id);
    socket.emit('webrtc-all-peers', peerIds);
  });

  // Helper: Check if socket can control room playback
  const canUserControlMedia = (room, socketId) => {
    if (!room) return false;
    if (!room.isHostOnly) return true;
    if (room.hostId === socketId) return true;
    const u = room.users.get(socketId);
    return !!u?.permissions?.canControlMedia;
  };

  // Media Change (URL, Type, Title)
  socket.on('media-change', (newMedia) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    if (!canUserControlMedia(room, socket.id)) {
      return socket.emit('notification', { type: 'error', message: 'Sadece oda yöneticisi veya yetkilendirilenler medya değiştirebilir!' });
    }

    room.currentMedia = {
      url: newMedia.url,
      title: newMedia.title || 'Canlı Yayın / Video',
      type: newMedia.type || 'hls',
      playbackState: 'playing',
      currentTime: 0,
      updatedAt: Date.now(),
      isLive: !!newMedia.isLive
    };

    io.to(currentRoomId).emit('media-changed', room.currentMedia);

    // System announce
    const user = room.users.get(socket.id);
    const msg = {
      id: 'sys-' + Date.now(),
      sender: 'Sistem',
      text: `${user ? user.nickname : 'Biri'} medyayı değiştirdi: "${room.currentMedia.title}"`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true
    };
    room.chatMessages.push(msg);
    io.to(currentRoomId).emit('new-message', msg);
  });

  // Play Event
  socket.on('media-play', ({ currentTime }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    if (!canUserControlMedia(room, socket.id)) return;

    room.currentMedia.playbackState = 'playing';
    room.currentMedia.currentTime = currentTime;
    room.currentMedia.updatedAt = Date.now();

    socket.to(currentRoomId).emit('media-played', {
      currentTime,
      senderId: socket.id
    });
  });

  // Pause Event
  socket.on('media-pause', ({ currentTime }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    if (!canUserControlMedia(room, socket.id)) return;

    room.currentMedia.playbackState = 'paused';
    room.currentMedia.currentTime = currentTime;
    room.currentMedia.updatedAt = Date.now();

    socket.to(currentRoomId).emit('media-paused', {
      currentTime,
      senderId: socket.id
    });
  });

  // Seek Event
  socket.on('media-seek', ({ currentTime }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    if (!canUserControlMedia(room, socket.id)) return;

    room.currentMedia.currentTime = currentTime;
    room.currentMedia.updatedAt = Date.now();

    socket.to(currentRoomId).emit('media-seeked', {
      currentTime,
      senderId: socket.id
    });
  });

  // Millisecond Sync Heartbeat Request
  socket.on('request-sync', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    // Calculate elapsed time if playing
    let accurateTime = room.currentMedia.currentTime;
    if (room.currentMedia.playbackState === 'playing' && !room.currentMedia.isLive) {
      accurateTime += (Date.now() - room.currentMedia.updatedAt) / 1000;
    }

    socket.emit('sync-state', {
      currentTime: accurateTime,
      playbackState: room.currentMedia.playbackState,
      updatedAt: room.currentMedia.updatedAt
    });
  });

  // Playback Rate Sync (Speed Up / Slow Down)
  socket.on('media-rate-change', ({ playbackRate, currentTime }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    if (!canUserControlMedia(room, socket.id)) return;

    room.currentMedia.playbackRate = playbackRate || 1;
    if (currentTime !== undefined) room.currentMedia.currentTime = currentTime;
    room.currentMedia.updatedAt = Date.now();

    socket.to(currentRoomId).emit('media-rate-changed', {
      playbackRate: room.currentMedia.playbackRate,
      currentTime: room.currentMedia.currentTime,
      senderId: socket.id
    });
  });

  // Transfer Host Ownership
  socket.on('transfer-host', ({ targetUserId }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.hostId !== socket.id) return;
    const targetUser = room.users.get(targetUserId);
    if (!targetUser) return;

    const oldHost = room.users.get(socket.id);
    if (oldHost) {
      oldHost.isHost = false;
      if (oldHost.permissions) oldHost.permissions.canControlMedia = false;
    }

    room.hostId = targetUserId;
    targetUser.isHost = true;
    if (targetUser.permissions) targetUser.permissions.canControlMedia = true;

    io.to(currentRoomId).emit('host-transferred', { 
      newHostId: targetUserId,
      newHostName: targetUser.nickname
    });

    const sysMsg = {
      id: 'sys-' + Date.now(),
      sender: 'Sistem',
      text: `👑 Oda yöneticiliği ${targetUser.nickname} kullanıcısına devredildi.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true
    };
    room.chatMessages.push(sysMsg);
    io.to(currentRoomId).emit('new-message', sysMsg);
  });

  // Kick User from Room
  socket.on('kick-user', ({ targetUserId, reason }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.hostId !== socket.id) return;
    if (targetUserId === socket.id) return;

    const targetUser = room.users.get(targetUserId);
    if (!targetUser) return;

    room.users.delete(targetUserId);

    io.to(targetUserId).emit('kicked-from-room', {
      reason: reason || 'Oda yöneticisi tarafından odadan çıkarıldınız.'
    });

    io.to(currentRoomId).emit('user-left', {
      userId: targetUserId,
      nickname: targetUser.nickname
    });

    const sysMsg = {
      id: 'sys-' + Date.now(),
      sender: 'Sistem',
      text: `⛔ ${targetUser.nickname} yöneticisi tarafından odadan atıldı.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: true
    };
    room.chatMessages.push(sysMsg);
    io.to(currentRoomId).emit('new-message', sysMsg);
  });

  // Set User Specific Permission (Voice, Chat, Media Control)
  socket.on('set-user-permission', ({ targetUserId, permission, value }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.hostId !== socket.id) return;

    const targetUser = room.users.get(targetUserId);
    if (!targetUser) return;

    if (!targetUser.permissions) {
      targetUser.permissions = { canVoice: true, canChat: true, canControlMedia: false };
    }
    targetUser.permissions[permission] = !!value;

    io.to(currentRoomId).emit('user-permission-updated', {
      userId: targetUserId,
      permissions: targetUser.permissions
    });
  });

  // Toggle Host Control
  socket.on('toggle-host-control', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room || room.hostId !== socket.id) return;

    room.isHostOnly = !room.isHostOnly;
    io.to(currentRoomId).emit('host-control-updated', { isHostOnly: room.isHostOnly });
  });

  // Playlist management
  socket.on('playlist-add', (item) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const newItem = {
      id: 'pl-' + Date.now() + Math.random().toString(36).substr(2, 4),
      title: item.title,
      url: item.url,
      type: item.type,
      isLive: !!item.isLive,
      addedBy: room.users.get(socket.id)?.nickname || 'Anonim'
    };
    room.playlist.push(newItem);
    io.to(currentRoomId).emit('playlist-updated', room.playlist);
  });

  socket.on('playlist-remove', (itemId) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    room.playlist = room.playlist.filter(i => i.id !== itemId);
    io.to(currentRoomId).emit('playlist-updated', room.playlist);
  });

  socket.on('playlist-play', (itemId) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    if (room.isHostOnly && room.hostId !== socket.id) return;

    const item = room.playlist.find(i => i.id === itemId);
    if (item) {
      room.currentMedia = {
        url: item.url,
        title: item.title,
        type: item.type,
        playbackState: 'playing',
        currentTime: 0,
        updatedAt: Date.now(),
        isLive: item.isLive
      };
      io.to(currentRoomId).emit('media-changed', room.currentMedia);
    }
  });

  // Chat message
  socket.on('send-message', ({ text }) => {
    if (!currentRoomId || !text || !text.trim()) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const user = room.users.get(socket.id);
    if (user && user.permissions && user.permissions.canChat === false) {
      return socket.emit('notification', { type: 'error', message: 'Yönetici mesaj gönderme izninizi kapattı.' });
    }

    const newMsg = {
      id: 'msg-' + Date.now() + Math.random().toString(36).substr(2, 4),
      sender: user ? user.nickname : 'Misafir',
      avatar: user ? user.avatar : '🎮',
      color: user ? user.color : '#8b5cf6',
      userId: socket.id,
      text: text.trim().slice(0, 500),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSystem: false
    };

    room.chatMessages.push(newMsg);
    io.to(currentRoomId).emit('new-message', newMsg);
  });

  // Floating Reaction (Emojis)
  socket.on('send-reaction', ({ emoji }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    const user = room ? room.users.get(socket.id) : null;

    io.to(currentRoomId).emit('float-reaction', {
      id: 'reaction-' + Date.now() + Math.random(),
      emoji: emoji || '🔥',
      sender: user ? user.nickname : '',
      x: Math.floor(Math.random() * 80) + 10 // Random percentage position across player
    });
  });

  // User Voice / Mic state toggle
  socket.on('update-voice-state', ({ isMuted, isDeafened }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const user = room.users.get(socket.id);
    if (user) {
      if (typeof isMuted === 'boolean') user.isMuted = isMuted;
      if (typeof isDeafened === 'boolean') user.isDeafened = isDeafened;
      io.to(currentRoomId).emit('user-voice-updated', {
        userId: socket.id,
        isMuted: user.isMuted,
        isDeafened: user.isDeafened
      });
    }
  });

  // Screen Share Status
  socket.on('screen-share-status', ({ isSharing }) => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;
    const user = room.users.get(socket.id);
    if (user) {
      user.isScreenSharing = !!isSharing;
      io.to(currentRoomId).emit('user-screenshare-updated', {
        userId: socket.id,
        isScreenSharing: user.isScreenSharing
      });

      // If sharing started, automatically prompt users or set media mode
      if (isSharing) {
        io.to(currentRoomId).emit('screen-share-available', {
          broadcasterId: socket.id,
          broadcasterName: user.nickname
        });
      }
    }
  });

  // WebRTC P2P Signaling (Voice Chat + Direct Screen Stream)
  socket.on('webrtc-signal', ({ targetId, signal, streamType }) => {
    io.to(targetId).emit('webrtc-signal', {
      senderId: socket.id,
      signal,
      streamType: streamType || 'voice' // 'voice' or 'screenshare'
    });
  });

  // Disconnection cleanup
  socket.on('disconnect', () => {
    if (!currentRoomId) return;
    const room = rooms.get(currentRoomId);
    if (!room) return;

    const user = room.users.get(socket.id);
    room.users.delete(socket.id);

    // Notify room
    socket.to(currentRoomId).emit('user-left', {
      userId: socket.id,
      nickname: user ? user.nickname : 'Kullanıcı'
    });

    if (user) {
      const exitMsg = {
        id: 'sys-' + Date.now(),
        sender: 'Sistem',
        text: `${user.nickname} odadan ayrıldı.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSystem: true
      };
      room.chatMessages.push(exitMsg);
      io.to(currentRoomId).emit('new-message', exitMsg);
    }

    // Transfer host if host disconnected
    if (room.hostId === socket.id) {
      const remainingUsers = Array.from(room.users.keys());
      if (remainingUsers.length > 0) {
        room.hostId = remainingUsers[0];
        const newHost = room.users.get(room.hostId);
        if (newHost) newHost.isHost = true;
        io.to(currentRoomId).emit('host-transferred', { newHostId: room.hostId });
      }
    }

    // Clean empty rooms after 30 minutes of inactivity
    if (room.users.size === 0) {
      setTimeout(() => {
        if (rooms.get(currentRoomId)?.users.size === 0) {
          rooms.delete(currentRoomId);
        }
      }, 30 * 60 * 1000);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[SYNCHRO SERVER] Online & listening on port ${PORT}`);
});
