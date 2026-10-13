import React, { useState } from 'react';
import { 
  X, 
  Tv, 
  Video, 
  Film, 
  Radio, 
  Monitor, 
  Play, 
  Plus, 
  Link as LinkIcon, 
  Sparkles,
  HelpCircle,
  Clapperboard,
  Loader2
} from 'lucide-react';
import { getServerUrl } from '../services/socket';

const YoutubeIcon = () => (
  <svg className="w-4 h-4 text-red-500 fill-current" viewBox="0 0 24 24">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const MEDIA_TYPES = [
  { id: 'film', label: '🎬 Film / Dizi Sitesi Linki', icon: Clapperboard, desc: 'Ekran açmadan film sitesi linkini yapıştırıp doğrudan siteden izletin' },
  { id: 'hls', label: 'Canlı Maç / HLS (.m3u8)', icon: Radio, desc: 'IPTV, Spor kanalları & Canlı yayınlar' },
  { id: 'youtube', label: 'YouTube Videosu', icon: YoutubeIcon, desc: 'Standart veya canlı YouTube akışları' },
  { id: 'video', label: 'Doğrudan Video (MP4 / WebM)', icon: Film, desc: 'Doğrudan sunucudan mp4/mkv akışı' },
  { id: 'screenshare', label: 'Ekran Paylaşımı (Yedek Çözüm)', icon: Monitor, desc: 'Sıfır gecikmeli ekran/sekme yayını' }
];

const PRESETS = [
  {
    title: '🇹🇷 A Spor Canlı HD',
    url: 'https://rnttwmjcin.turknet.ercdn.net/lcpmvefbyo/aspor/aspor.m3u8',
    type: 'hls',
    isLive: true
  },
  {
    title: '🇹🇷 24 TV Haber HD',
    url: 'https://turkmedya-live.ercdn.net/tv24/tv24.m3u8',
    type: 'hls',
    isLive: true
  },
  {
    title: '⚽ HLS Spor Test Akışı',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    type: 'hls',
    isLive: true
  },
  {
    title: 'Big Buck Bunny (MP4 Video)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    type: 'video',
    isLive: false
  },
  {
    title: 'YouTube 4K Doğa Akışı',
    url: 'https://www.youtube.com/watch?v=LXb3EKWsInQ',
    type: 'youtube',
    isLive: false
  }
];

export function MediaInputModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  onAddToPlaylist, 
  onStartScreenShare 
}) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('film');
  const [isLive, setIsLive] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractStatus, setExtractStatus] = useState('');

  if (!isOpen) return null;

  // Auto-detect link format
  const handleUrlChange = (newUrl) => {
    setUrl(newUrl);
    const lower = newUrl.toLowerCase();
    if (lower.includes('.m3u8')) {
      setType('hls');
      setIsLive(true);
    } else if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
      setType('youtube');
      setIsLive(false);
    } else if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mkv')) {
      setType('video');
      setIsLive(false);
    } else if (lower.includes('film') || lower.includes('dizi') || lower.includes('vidsrc') || lower.includes('vidmoly')) {
      setType('film');
      setIsLive(false);
    }
  };

  const handleExtractFilm = async (addToQueue = false) => {
    if (!url.trim()) return;
    setIsExtracting(true);
    setExtractStatus('Film sayfası taranıyor ve video çözümleniyor...');
    const serverBase = getServerUrl();

    try {
      const res = await fetch(`${serverBase}/api/film/extract?url=${encodeURIComponent(url.trim())}`);
      const data = await res.json();

      let targetUrl = '';
      let targetType = 'embed';

      if (data && data.success) {
        if (data.mode === 'stream') {
          targetUrl = data.proxiedUrl ? `${serverBase}${data.proxiedUrl}` : data.url;
          targetType = data.type || 'hls';
        } else {
          targetUrl = data.proxiedEmbedUrl ? `${serverBase}${data.proxiedEmbedUrl}` : data.url;
          targetType = 'embed';
        }
      } else {
        // Fallback to embed proxy
        targetUrl = `${serverBase}/api/embed-proxy?url=${encodeURIComponent(url.trim())}`;
        targetType = 'embed';
      }

      const mediaData = {
        url: targetUrl,
        title: (data && data.title) || title.trim() || 'Film / Dizi Yayını',
        type: targetType,
        isLive: false
      };

      if (addToQueue) {
        onAddToPlaylist(mediaData);
      } else {
        onSubmit(mediaData);
      }

      setUrl('');
      setTitle('');
      onClose();
    } catch (err) {
      console.warn('Film extract error fallback:', err);
      // Fallback
      const fallbackUrl = `${serverBase}/api/embed-proxy?url=${encodeURIComponent(url.trim())}`;
      const mediaData = {
        url: fallbackUrl,
        title: title.trim() || 'Film Yayını',
        type: 'embed',
        isLive: false
      };
      if (addToQueue) onAddToPlaylist(mediaData);
      else onSubmit(mediaData);

      setUrl('');
      setTitle('');
      onClose();
    } finally {
      setIsExtracting(false);
      setExtractStatus('');
    }
  };

  const handleApply = (addToQueue = false) => {
    if (type === 'screenshare') {
      onStartScreenShare();
      onClose();
      return;
    }

    if (!url.trim()) return;

    if (type === 'film') {
      handleExtractFilm(addToQueue);
      return;
    }

    const mediaData = {
      url: url.trim(),
      title: title.trim() || (type === 'hls' ? 'Canlı Maç / Akış' : 'Video'),
      type,
      isLive
    };

    if (addToQueue) {
      onAddToPlaylist(mediaData);
    } else {
      onSubmit(mediaData);
    }

    setUrl('');
    setTitle('');
    onClose();
  };

  const handleSelectPreset = (p) => {
    setUrl(p.url);
    setTitle(p.title);
    setType(p.type);
    setIsLive(p.isLive);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-[#10121d] border border-zinc-800 rounded-md w-full max-w-xl overflow-hidden shadow-lg animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-zinc-100" />
            <h2 className="text-sm font-bold text-white">Yayın / Medya Değiştir</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          
          {/* Format Selector Pills */}
          <div>
            <label className="text-xs font-semibold text-zinc-400 block mb-2">Medya Türü Seçin:</label>
            <div className="grid grid-cols-2 gap-2">
              {MEDIA_TYPES.map((t) => {
                const Icon = t.icon;
                const isSelected = type === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setType(t.id);
                      if (t.id === 'hls') setIsLive(true);
                    }}
                    className={`p-3 rounded-md border text-left transition flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-zinc-800 border-purple-500 text-white'
                        : 'bg-white/5 border-zinc-800 text-zinc-400 hover:border-white/15 hover:text-zinc-200'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 ${isSelected ? 'text-zinc-100' : 'text-zinc-500'}`} />
                    <div>
                      <div className="text-xs font-bold leading-tight">{t.label}</div>
                      <div className="text-[10px] text-zinc-400 leading-tight mt-1">{t.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Screen share special prompt */}
          {type === 'screenshare' ? (
            <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-md p-4 text-xs text-indigo-200 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-indigo-300">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                Ekran / Sekme Paylaşımı
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                İstediğiniz pencereyi veya sekmeyi seçerek tüm odaya canlı yayınlayın. Sıfır gecikmeli WebRTC ekran akışı başlar.
              </p>
            </div>
          ) : (
            <>
              {/* Film special banner */}
              {type === 'film' && (
                <div className="bg-purple-950/40 border border-zinc-700 rounded-md p-3.5 text-xs text-zinc-100 space-y-2.5">
                  <div className="font-bold flex items-center gap-1.5 text-zinc-100">
                    <Sparkles className="w-4 h-4 text-zinc-100" />
                    Türk Siteleri ve 451 Koruması İçin Kesin Çözüm!
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    Kaçak siteler bot koruması veya 451 hatası verebilir. Bunu aşmak için aşağıdaki butonu farenizle tutup tarayıcınızın <b>Yer İmleri (Favoriler) Çubuğuna</b> sürükleyip bırakın. 
                  </p>
                  <div className="flex items-center justify-center p-2">
                    <a 
                      href="javascript:(function(){let url='';let type='';const v=document.querySelector('video');if(v&&v.src){url=v.src;type=url.includes('.m3u8')?'hls':'video';}else if(v&&v.querySelector('source')){url=v.querySelector('source').src;type=url.includes('.m3u8')?'hls':'video';}if(!url){const iframes=Array.from(document.querySelectorAll('iframe'));for(let f of iframes){if(f.src&&!f.src.includes('google')&&!f.src.includes('ads')&&!f.src.includes('facebook')&&!f.src.includes('disqus')){url=f.src;type='embed';break;}}}if(url){const t=document.createElement('input');t.value=url;document.body.appendChild(t);t.select();document.execCommand('copy');document.body.removeChild(t);alert('✅ Başarılı! Filmin temiz linki kopyalandı.\n\nŞimdi kendi izleme odana git, %22Manuel Link / Film%22 kısmına yapıştır!');}else{alert('❌ Video bulunamadı! Lütfen filmi sitede tam ekranda veya normal oynatmaya başladıktan sonra bu butona tıkla.');}})();" 
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-full font-bold text-white shadow-lg cursor-grab active:cursor-grabbing border border-purple-400/50"
                      title="Beni tutup yer imleri (favoriler) çubuğuna sürükle!"
                      onClick={(e) => e.preventDefault()}
                    >
                      📺 Synchro Film Çek (Beni Sürükle)
                    </a>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    <b>Nasıl Kullanılır:</b> Filmi kendi sitenizde açın. Reklamları geçtikten sonra yer imlerindeki bu butona tıklayın. Link kopyalanacak, buraya yapıştıracaksınız.
                  </p>
                </div>
              )}

              {/* Extraction Progress Indicator */}
              {isExtracting && (
                <div className="bg-purple-900/40 border border-zinc-700 p-3 rounded-md flex items-center gap-2.5 text-xs text-zinc-100">
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-100 shrink-0" />
                  <span>{extractStatus || 'Film çözümleniyor, lütfen bekleyin...'}</span>
                </div>
              )}

              {/* URL Input */}
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1.5">
                  {type === 'film' ? 'Film / Dizi Sayfa Linki:' : 'Akış veya Video Linki:'}
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder={
                      type === 'film' 
                        ? 'Örn: https://hdfilmcehennemi.../film-izle veya https://filmmodu.../' 
                        : 'https://.../stream.m3u8 veya https://youtube.com/watch?v=...'
                    }
                    className="w-full bg-white/5 border border-zinc-800 rounded-md pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
              </div>

              {/* Title & Live Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 block mb-1.5">
                    Yayın / Film Başlığı (İsteğe bağlı):
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={type === 'film' ? 'Örn: Oppenheimer Full HD' : 'Örn: Canlı Maç / Video'}
                    className="w-full bg-white/5 border border-zinc-800 rounded-md px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  {type !== 'film' && (
                    <label className="flex items-center gap-2 p-2.5 rounded-md bg-white/5 border border-zinc-800 cursor-pointer hover:border-white/20 transition">
                      <input
                        type="checkbox"
                        checked={isLive}
                        onChange={(e) => setIsLive(e.target.checked)}
                        className="rounded accent-purple-500 w-4 h-4"
                      />
                      <span className="text-xs font-semibold text-zinc-200">
                        Canlı Akış (Minimum Gecikme)
                      </span>
                    </label>
                  )}
                </div>
              </div>

              {/* Quick Presets / Test Akışları */}
              <div>
                <span className="text-[11px] font-semibold text-zinc-500 block mb-2">
                  Hızlı Test & Örnek Akışlar:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-zinc-800 text-[11px] text-zinc-300 hover:text-white transition"
                    >
                      {p.title}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white/[0.02] border-t border-zinc-800 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            disabled={isExtracting}
            className="px-4 py-2 rounded-md text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition disabled:opacity-40"
          >
            Vazgeç
          </button>

          {type !== 'screenshare' && (
            <button
              onClick={() => handleApply(true)}
              disabled={!url.trim() || isExtracting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-white/10 hover:bg-white/15 text-zinc-200 text-xs font-semibold transition disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
              <span>Listeye Ekle</span>
            </button>
          )}

          <button
            onClick={() => handleApply(false)}
            disabled={(type !== 'screenshare' && !url.trim()) || isExtracting}
            className="flex items-center gap-1.5 px-5 py-2 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg disabled:opacity-40"
          >
            {isExtracting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Çözümleniyor...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>
                  {type === 'screenshare' 
                    ? 'Ekranı Odaya Başlat' 
                    : type === 'film' 
                      ? 'Filmi Çöz ve Başlat' 
                      : 'Hemen Başlat'}
                </span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
