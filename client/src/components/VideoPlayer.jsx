import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Minimize2, 
  RotateCcw, 
  Tv, 
  Radio, 
  ShieldAlert, 
  Activity, 
  Sparkles,
  Layers,
  Flame,
  Trophy,
  Popcorn,
  Rocket,
  Heart,
  Gauge,
  Zap
} from 'lucide-react';
import { socket, getServerUrl } from '../services/socket';
import { sounds } from '../services/soundEffects';

export function VideoPlayer({ 
  media, 
  isHost, 
  isHostOnly, 
  canControlMedia,
  screenStream, 
  onSendReaction, 
  reactions 
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hlsRef = useRef(null);
  const ytPlayerRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [useProxy, setUseProxy] = useState(() => {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') return true;
    return false;
  });
  const [latencyInfo, setLatencyInfo] = useState({ buffer: 0, latency: 0 });
  const [hasError, setHasError] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(media?.playbackRate || 1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // Derive active stream URL (direct or proxied with backend serverBase)
  const serverBase = getServerUrl();
  let baseMediaUrl = media?.url || '';
  if (baseMediaUrl.startsWith('/api/')) {
    baseMediaUrl = `${serverBase}${baseMediaUrl}`;
  }

  // Auto proxy if on HTTPS and stream is HTTP (mixed content block) or if proxy requested
  const isMixedContent = typeof window !== 'undefined' && window.location.protocol === 'https:' && baseMediaUrl.startsWith('http://');
  const shouldProxy = (useProxy || isMixedContent) && !baseMediaUrl.includes('/api/proxy') && !!serverBase;

  const streamUrl = shouldProxy
    ? `${serverBase}/api/proxy?url=${encodeURIComponent(baseMediaUrl)}`
    : baseMediaUrl;

  // -------------------------------------------------------------
  // YOUTUBE HELPER
  // -------------------------------------------------------------
  const getYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : null;
  };

  const isYouTube = media?.type === 'youtube' || (media?.url && (media.url.includes('youtube.com') || media.url.includes('youtu.be')));
  const isHls = media?.type === 'hls' || (media?.url && media.url.includes('.m3u8'));
  const isScreenShare = media?.type === 'screenshare' || !!screenStream;
  const isEmbed = media?.type === 'embed';

  // -------------------------------------------------------------
  // HLS.JS INITIALIZATION & LL-HLS TUNING
  // -------------------------------------------------------------
  useEffect(() => {
    if (isYouTube || isScreenShare || isEmbed) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      return;
    }

    const video = videoRef.current;
    if (!video || !streamUrl) return;

    setHasError(null);

    if (isHls && Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true, // Minimum delay for live match streams!
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
        maxBufferLength: 15,
        backBufferLength: 10,
        xhrSetup: (xhr, loadUrl) => {
          // Intercept any relative chunk URL that targets /api/proxy and route to serverBase
          if (serverBase && (loadUrl.startsWith('/api/') || loadUrl.startsWith(window.location.origin + '/api/'))) {
            const absoluteProxyUrl = loadUrl.replace(window.location.origin, serverBase);
            xhr.open('GET', absoluteProxyUrl, true);
          }
        }
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (media.playbackState === 'playing') {
          video.play().catch(() => {});
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.warn('HLS Fatal error:', data.type);
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            setHasError('Ağ hatası veya CORS kısıtlaması. Lütfen yukarıdaki "CORS Proxy" butonunu açmayı deneyin.');
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            hls.destroy();
          }
        }
      });

      hlsRef.current = hls;

      // Stats update interval
      const statsInterval = setInterval(() => {
        if (hls && video) {
          const buffer = video.buffered.length > 0 ? (video.buffered.end(video.buffered.length - 1) - video.currentTime) : 0;
          setLatencyInfo({
            buffer: buffer.toFixed(1),
            latency: hls.latency ? hls.latency.toFixed(1) : 0
          });
        }
      }, 1000);

      return () => {
        clearInterval(statsInterval);
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari HLS
      video.src = streamUrl;
    } else {
      // Standard video format (MP4 / WebM)
      video.src = streamUrl;
    }
  }, [streamUrl, isHls, isYouTube, isScreenShare]);

  // -------------------------------------------------------------
  // SCREEN SHARE STREAM BINDING
  // -------------------------------------------------------------
  useEffect(() => {
    if (isScreenShare && videoRef.current && screenStream) {
      videoRef.current.srcObject = screenStream;
      videoRef.current.play().catch(() => {});
    }
  }, [isScreenShare, screenStream]);

  // -------------------------------------------------------------
  // SOCKET SYNC LISTENERS
  // -------------------------------------------------------------
  useEffect(() => {
    const handleMediaPlayed = ({ currentTime: targetTime, senderId }) => {
      if (senderId === socket.id) return;
      setIsSyncing(true);
      const video = videoRef.current;
      if (video) {
        if (Math.abs(video.currentTime - targetTime) > 1.0 && !media.isLive) {
          video.currentTime = targetTime;
        }
        video.play().catch(() => {});
        setIsPlaying(true);
      }
      setTimeout(() => setIsSyncing(false), 500);
    };

    const handleMediaPaused = ({ currentTime: targetTime, senderId }) => {
      if (senderId === socket.id) return;
      setIsSyncing(true);
      const video = videoRef.current;
      if (video) {
        video.pause();
        if (Math.abs(video.currentTime - targetTime) > 0.5 && !media.isLive) {
          video.currentTime = targetTime;
        }
        setIsPlaying(false);
      }
      setTimeout(() => setIsSyncing(false), 500);
    };

    const handleMediaSeeked = ({ currentTime: targetTime, senderId }) => {
      if (senderId === socket.id) return;
      const video = videoRef.current;
      if (video && !media.isLive) {
        video.currentTime = targetTime;
      }
    };

    const handleMediaRateChanged = ({ playbackRate: newRate, senderId }) => {
      if (senderId === socket.id) return;
      setPlaybackRate(newRate);
      const video = videoRef.current;
      if (video) {
        video.playbackRate = newRate;
      }
      sounds.playPop();
    };

    socket.on('media-played', handleMediaPlayed);
    socket.on('media-paused', handleMediaPaused);
    socket.on('media-seeked', handleMediaSeeked);
    socket.on('media-rate-changed', handleMediaRateChanged);

    return () => {
      socket.off('media-played', handleMediaPlayed);
      socket.off('media-paused', handleMediaPaused);
      socket.off('media-seeked', handleMediaSeeked);
      socket.off('media-rate-changed', handleMediaRateChanged);
    };
  }, [media]);

  // -------------------------------------------------------------
  // CONTROLS HANDLERS
  // -------------------------------------------------------------
  const canControl = isHost || !isHostOnly || !!canControlMedia;

  const handleRateChange = (rate) => {
    if (!canControl) return;
    setPlaybackRate(rate);
    setShowSpeedMenu(false);
    const video = videoRef.current;
    if (video) {
      video.playbackRate = rate;
    }
    socket.emit('media-rate-change', {
      playbackRate: rate,
      currentTime: videoRef.current?.currentTime || 0
    });
    sounds.playPop();
  };

  const handleTogglePlay = () => {
    if (!canControl) return;
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
        socket.emit('media-play', { currentTime: video.currentTime });
      }).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
      socket.emit('media-pause', { currentTime: video.currentTime });
    }
  };

  const handleSeek = (e) => {
    if (!canControl || media?.isLive) return;
    const targetTime = parseFloat(e.target.value);
    const video = videoRef.current;
    if (video) {
      video.currentTime = targetTime;
      setCurrentTime(targetTime);
      socket.emit('media-seek', { currentTime: targetTime });
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    videoRef.current.muted = newMuted;
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '00:00';
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  const ytId = isYouTube ? getYouTubeId(media?.url) : null;

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-md overflow-hidden shadow-lg border border-zinc-800 group select-none"
    >
      {/* FLOATING REACTIONS OVERLAY */}
      <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
        {reactions.map((r) => (
          <div
            key={r.id}
            className="absolute bottom-12 transition-all duration-1000 transform -translate-x-1/2 flex flex-col items-center"
            style={{
              left: `${r.x}%`,
              animation: 'floatUp 2.8s forwards cubic-bezier(0.1, 0.8, 0.3, 1)'
            }}
          >
            <span className="text-4xl filter drop-shadow-lg">{r.emoji}</span>
            {r.sender && (
              <span className="text-[10px] bg-black/60 px-2 py-0.5 rounded-full text-zinc-100 font-semibold border border-zinc-700">
                {r.sender}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* SYNC INDICATOR BADGE */}
      {isSyncing && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-purple-600/90 text-white text-xs px-3 py-1 rounded-full shadow-lg">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Senkronize Ediliyor...</span>
        </div>
      )}

      {/* ERROR NOTICE & CORS PROXY PROMPT */}
      {hasError && (
        <div className="absolute inset-x-6 top-6 z-20 bg-red-950/90 border border-zinc-700 p-4 rounded-md text-red-200 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
            <span>{hasError}</span>
          </div>
          <button
            onClick={() => setUseProxy(!useProxy)}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs shrink-0 transition"
          >
            {useProxy ? 'Proxy Kapat' : 'CORS Proxy Aktif Et'}
          </button>
        </div>
      )}

      {/* STREAM STATS OVERLAY (FOR HLS LIVE / MATCH STREAMS) */}
      {isHls && (
        <div className="absolute top-4 right-4 z-20 hidden group-hover:flex items-center gap-2 bg-black/60 px-3 py-1 rounded-full border border-zinc-800 text-[11px] text-zinc-300">
          <Activity className="w-3.5 h-3.5 text-zinc-300" />
          <span>Buffer: <strong className="text-white">{latencyInfo.buffer}s</strong></span>
          <span className="text-zinc-600">•</span>
          <span>Gecikme: <strong className="text-zinc-300">Düşük</strong></span>
          <button 
            onClick={() => setUseProxy(!useProxy)}
            className={`ml-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${
              useProxy ? 'bg-purple-600 text-white' : 'bg-white/10 text-zinc-400 hover:text-white'
            }`}
            title="CORS engelli spor ve IPTV linklerini proxy üzerinden çözer"
          >
            {useProxy ? 'Proxy: Açık' : 'Proxy: Kapalı'}
          </button>
        </div>
      )}

      {/* THE ACTUAL VIDEO ELEMENT */}
      {isEmbed ? (
        <div className="w-full h-full relative bg-black">
          <iframe
            title={media?.title || "Film / Dizi Oynatıcı"}
            className="w-full h-full border-0 pointer-events-auto"
            src={streamUrl}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
          />
          <div className="absolute top-3 left-3 pointer-events-none bg-black/70 px-3 py-1 rounded-full border border-zinc-700 text-[11px] text-zinc-100 font-bold flex items-center gap-1.5 shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-zinc-100" />
            <span>Doğrudan Film Sitesi Oynatıcı</span>
          </div>
        </div>
      ) : isYouTube && ytId ? (
        <div className="w-full h-full">
          <iframe
            title="YouTube Player"
            className="w-full h-full pointer-events-auto"
            src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&enablejsapi=1&origin=${window.location.origin}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <video
          ref={videoRef}
          className="w-full h-full object-contain cursor-pointer"
          playsInline
          autoPlay
          onTimeUpdate={() => {
            if (videoRef.current) {
              setCurrentTime(videoRef.current.currentTime);
            }
          }}
          onDurationChange={() => {
            if (videoRef.current) {
              setDuration(videoRef.current.duration);
            }
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onClick={handleTogglePlay}
        />
      )}

      {/* PLAYER HOVER CONTROLS BAR (FOR NON-YOUTUBE OR NATIVE STREAMS) */}
      {!isYouTube && (
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          
          {/* Timeline slider (Disabled for live streams) */}
          {!media?.isLive && duration > 0 && (
            <div className="relative mb-3 flex items-center">
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={currentTime}
                disabled={!canControl}
                onChange={handleSeek}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:h-2 transition-all"
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-3 text-white">
            
            {/* Left Controls: Play/Pause, Live Indicator, Time */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleTogglePlay}
                disabled={!canControl}
                className={`p-2 rounded-md transition ${
                  canControl 
                    ? 'hover:bg-white/10 active:scale-95 text-zinc-100' 
                    : 'opacity-40 cursor-not-allowed'
                }`}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              </button>

              {media?.isLive ? (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600/30 border border-zinc-700 text-[11px] font-extrabold text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  CANLI AKIŞ
                </div>
              ) : (
                <span className="text-xs font-mono text-zinc-300">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              )}

              {/* Volume Slider */}
              <div className="flex items-center gap-2 group/vol">
                <button onClick={toggleMute} className="p-1 hover:text-zinc-100 transition">
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 bg-white/20 rounded appearance-none cursor-pointer accent-purple-500"
                />
              </div>
            </div>

            {/* Quick Reactions Bar inside Player */}
            <div className="hidden sm:flex items-center gap-1 bg-black/40 px-2 py-1 rounded-md border border-zinc-800">
              {[
                { emoji: '🔥', label: 'Ateş' },
                { emoji: '⚽', label: 'Gol / Maç' },
                { emoji: '🍿', label: 'Mısır' },
                { emoji: '🚀', label: 'Uçuş' },
                { emoji: '❤️', label: 'Kalp' }
              ].map((btn) => (
                <button
                  key={btn.emoji}
                  onClick={() => onSendReaction(btn.emoji)}
                  className="px-2 py-0.5 hover:scale-125 transition active:scale-95 text-lg"
                  title={btn.label}
                >
                  {btn.emoji}
                </button>
              ))}
            </div>

            {/* Right Controls: Playback Speed, Fullscreen, Re-sync */}
            <div className="flex items-center gap-2">
              {/* Playback Speed Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  disabled={!canControl || media?.isLive}
                  className={`p-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition ${
                    playbackRate !== 1 
                      ? 'bg-purple-600 text-white shadow-md ' 
                      : 'hover:bg-white/10 text-zinc-300 hover:text-white'
                  } ${(!canControl || media?.isLive) ? 'opacity-40 cursor-not-allowed' : ''}`}
                  title={canControl ? "Oynatma Hızı (Odadaki Herkeste Değişir)" : "Hız ayarı oda yöneticisi kontrolünde"}
                >
                  <Gauge className="w-3.5 h-3.5" />
                  <span>{playbackRate}x</span>
                </button>

                {showSpeedMenu && (
                  <div className="absolute bottom-full mb-2 right-0 bg-[#121420] border border-zinc-800 rounded-md p-1.5 shadow-lg flex flex-col gap-1 min-w-[80px] z-50">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold px-2 py-0.5 border-b border-zinc-800">
                      Hız Seç
                    </span>
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => handleRateChange(rate)}
                        className={`px-2 py-1 rounded-lg text-xs font-mono font-bold text-left transition ${
                          playbackRate === rate
                            ? 'bg-purple-600 text-white'
                            : 'hover:bg-white/10 text-zinc-300'
                        }`}
                      >
                        {rate}x {rate === 1 && <span className="text-[10px] opacity-60">(Norm)</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  socket.emit('request-sync');
                  sounds.playPop();
                }}
                className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-300 hover:text-zinc-100 transition text-xs flex items-center gap-1"
                title="Yayınla Yeniden Senkron Ol"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Senk Yenile</span>
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-300 hover:text-white transition"
                title="Tam Ekran"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Custom CSS keyframes for floating emoji animations */}
      <style>{`
        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translate(-50%, 0) scale(0.6);
          }
          50% {
            transform: translate(-50%, -100px) scale(1.3) rotate(8deg);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -240px) scale(1.6) rotate(-8deg);
          }
        }
      `}</style>
    </div>
  );
}
