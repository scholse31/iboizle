import React, { useState, useEffect } from 'react';
import { 
  X, 
  Tv, 
  Search, 
  Radio, 
  Play, 
  Plus, 
  Loader2, 
  Sparkles, 
  Film, 
  RefreshCw,
  Trophy,
  Filter,
  Flame,
  Globe
} from 'lucide-react';
import { sounds } from '../services/soundEffects';
import { getServerUrl } from '../services/socket';

const PRESET_SOURCES = [
  {
    id: 'tr',
    title: '🇹🇷 Türkiye Canlı TV (170+ Kanal)',
    subtitle: 'A Spor, 24 TV, A2, Ulusal & Yerel Kanallar - Kesintisiz 1080p',
    url: 'https://iptv-org.github.io/iptv/countries/tr.m3u'
  },
  {
    id: 'sports',
    title: '⚽ Dünya & Canlı Spor Kanalları',
    subtitle: 'Uluslararası Canlı Maç, Futbol & Motorsporları',
    url: 'https://iptv-org.github.io/iptv/categories/sports.m3u'
  },
  {
    id: 'movies',
    title: '🎬 Sinema & Dizi Kanalları',
    subtitle: '24 Saat Kesintisiz Film ve Yabancı Dizi Yayınları',
    url: 'https://iptv-org.github.io/iptv/categories/movies.m3u'
  },
  {
    id: 'news',
    title: '📰 Canlı Haber Kanalları',
    subtitle: 'Türkiye ve Dünya Gündemi Canlı Yayınları',
    url: 'https://iptv-org.github.io/iptv/categories/news.m3u'
  }
];

export function IptvModal({ 
  isOpen, 
  onClose, 
  onSelectChannel, 
  onAddToPlaylist 
}) {
  const [activePreset, setActivePreset] = useState('tr');
  const [url, setUrl] = useState(PRESET_SOURCES[0].url);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [searchQuery, setSearchQuery] = useState('');
  const [channels, setChannels] = useState([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [error, setError] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [customServerUrl, setCustomServerUrl] = useState(() => localStorage.getItem('synchro_server_url') || '');

  // Auto load on initial open
  useEffect(() => {
    if (isOpen && !isLoaded) {
      loadPlaylist(url);
    }
  }, [isOpen]);

  // Search or category filter debounce
  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => {
      fetchSearchResults();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory]);

  const loadPlaylist = async (targetUrl) => {
    const listUrl = (targetUrl || url || '').trim();
    if (!listUrl) return;
    setLoading(true);
    setError(null);

    try {
      const serverBase = getServerUrl();
      const res = await fetch(`${serverBase}/api/iptv/parse?url=${encodeURIComponent(listUrl)}`);
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || contentType.includes('text/html')) {
        setError('BACKEND_NOT_CONFIGURED');
        return;
      }

      const data = await res.json();

      if (data.success) {
        setIsLoaded(true);
        setCategories(['Tümü', ...(data.categories || [])]);
        setSelectedCategory('Tümü');
        setChannels(data.channels || []);
        setTotalMatches(data.totalChannels || 0);
        sounds.playPop();
      } else {
        setError(data.error || 'IPTV listesi yüklenemedi.');
      }
    } catch (err) {
      if (err.message?.includes('JSON') || err.message?.includes('doctype') || err.message?.includes('Failed to fetch')) {
        setError('BACKEND_NOT_CONFIGURED');
      } else {
        setError('Bağlantı hatası: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSearchResults = async () => {
    try {
      const serverBase = getServerUrl();
      const queryParams = new URLSearchParams({
        url: url.trim(),
        q: searchQuery,
        category: selectedCategory === 'Tümü' ? '' : selectedCategory,
        limit: '90'
      });
      const res = await fetch(`${serverBase}/api/iptv/search?${queryParams.toString()}`);
      const data = await res.json();
      if (data.success) {
        setChannels(data.channels || []);
        setTotalMatches(data.totalMatches || 0);
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const handleSelectPreset = (p) => {
    setActivePreset(p.id);
    setUrl(p.url);
    loadPlaylist(p.url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85">
      <div className="bg-[#0f111a] border border-zinc-800 rounded-md w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden shadow-lg">
        
        {/* MODAL HEADER */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-emerald-500/20 text-zinc-300 border border-zinc-700">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Canlı Maç & IPTV Kanal Rehberi
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-zinc-100 border border-zinc-700">
                  {totalMatches} Kanal Aktif
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                A Spor, 24 TV, Haber ve Dünya Spor kanallarını tek tıkla odaya açın
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PRESET PLAYLIST SELECTION TABS */}
        <div className="p-2.5 bg-black/50 border-b border-zinc-800 flex items-center gap-2 overflow-x-auto">
          {PRESET_SOURCES.map((p) => {
            const isSelected = activePreset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p)}
                className={`px-3 py-2 rounded-md text-left transition whitespace-nowrap flex flex-col shrink-0 border ${
                  isSelected
                    ? 'bg-emerald-500/20 border-emerald-500 text-white'
                    : 'bg-white/5 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                <span className="text-xs font-bold leading-tight">{p.title}</span>
                <span className="text-[10px] text-zinc-500 mt-0.5">{p.subtitle}</span>
              </button>
            );
          })}

          <button
            onClick={() => {
              setActivePreset('custom');
              setUrl('');
            }}
            className={`px-3 py-2 rounded-md text-left transition whitespace-nowrap flex flex-col shrink-0 border ${
              activePreset === 'custom'
                ? 'bg-emerald-500/20 border-emerald-500 text-white'
                : 'bg-white/5 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
            }`}
          >
            <span className="text-xs font-bold leading-tight">⚙️ Özel M3U / Xtream</span>
            <span className="text-[10px] text-zinc-500 mt-0.5">Kendi IPTV linkinizi yapıştırın</span>
          </button>
        </div>

        {/* CUSTOM URL INPUT BAR (VISIBLE ON CUSTOM OR REFRESH) */}
        {activePreset === 'custom' && (
          <div className="p-3 bg-black/30 border-b border-zinc-800 flex items-center gap-2 flex-wrap">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="IPTV / Xtream M3U Linki (https://... veya http://.../get.php?...)"
              className="flex-1 min-w-[280px] bg-white/5 border border-zinc-800 rounded-md px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-mono"
            />
            <button
              onClick={() => loadPlaylist(url)}
              disabled={loading}
              className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span>{loading ? 'Yükleniyor...' : 'Listeyi Yükle'}</span>
            </button>
          </div>
        )}

        {/* SEARCH & DYNAMIC CATEGORY FILTERS */}
        <div className="p-3 bg-white/[0.01] border-b border-zinc-800 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kanal ara (Örn: spor, haber, 24, a2, trt, tv)..."
              className="w-full bg-white/5 border border-zinc-800 rounded-md pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Dynamic Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {categories.slice(0, 8).map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  sounds.playPop();
                }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition border ${
                  selectedCategory === cat
                    ? 'bg-emerald-500/20 border-emerald-500 text-zinc-100 shadow-sm'
                    : 'bg-white/5 border-zinc-800 text-zinc-400 hover:text-white hover:border-white/15'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* ERROR STATE */}
        {error === 'BACKEND_NOT_CONFIGURED' ? (
          <div className="p-4 m-3 bg-amber-950/60 border border-zinc-700 rounded-md text-xs text-amber-200 space-y-2.5 shadow-md">
            <div className="font-bold flex items-center gap-2 text-amber-300 text-sm">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Render Backend Sunucunuzu Bağlayın
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              Siteniz Vercel'de çalışıyor, ancak IPTV motoru ve canlı maç sunucusu Render'dadır. Render üzerinde açtığınız Web Service linkini (örn: <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300 font-mono">https://iboizle.onrender.com</code>) buraya yapıştırıp kaydedin:
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={customServerUrl}
                onChange={(e) => setCustomServerUrl(e.target.value)}
                placeholder="https://iboizle.onrender.com"
                className="flex-1 bg-black/40 border border-zinc-800 rounded-md px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  if (customServerUrl.trim()) {
                    localStorage.setItem('synchro_server_url', customServerUrl.trim().replace(/\/+$/, ''));
                    setError(null);
                    window.location.reload();
                  }
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-md font-bold text-xs transition shrink-0"
              >
                Kaydet & Yeniden Bağlan
              </button>
            </div>
          </div>
        ) : error ? (
          <div className="p-4 m-3 bg-red-950/60 border border-zinc-700 rounded-md text-xs text-red-200 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => loadPlaylist(url)}
              className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-white font-bold text-xs"
            >
              Tekrar Dene
            </button>
          </div>
        ) : null}

        {/* CHANNELS GRID */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-zinc-400">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              <span className="text-xs font-medium">Kanal listesi taranıyor ve güncelleniyor...</span>
            </div>
          ) : channels.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-zinc-500 text-center">
              <Tv className="w-10 h-10 opacity-30" />
              <p className="text-xs">Aramanıza uygun kanal bulunamadı.</p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('Tümü'); }}
                className="mt-2 text-xs text-zinc-300 hover:underline"
              >
                Filtreleri Temizle
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {channels.map((ch) => (
                <div
                  key={ch.id}
                  className="bg-white/5 border border-zinc-800 hover:border-zinc-700 rounded-md p-3 flex flex-col justify-between gap-2.5 transition group hover:shadow-lg"
                >
                  <div className="flex items-start gap-2.5">
                    {/* Logo or placeholder */}
                    <div className="w-10 h-10 rounded-lg bg-black/40 border border-zinc-800 shrink-0 flex items-center justify-center overflow-hidden">
                      {ch.logo ? (
                        <img 
                          src={ch.logo} 
                          alt={ch.title} 
                          className="w-full h-full object-contain p-1"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <Radio className="w-5 h-5 text-zinc-300" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition" title={ch.title}>
                        {ch.title}
                      </h4>
                      <span className="text-[10px] text-zinc-400 truncate block mt-0.5">
                        {ch.group}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-800">
                    <button
                      onClick={() => {
                        const serverBase = getServerUrl();
                        const fullStreamUrl = ch.proxiedUrl 
                          ? `${serverBase}${ch.proxiedUrl}` 
                          : ch.streamUrl;

                        onSelectChannel({
                          url: fullStreamUrl,
                          title: ch.title,
                          type: 'hls',
                          isLive: true
                        });
                        sounds.playJoin();
                        onClose();
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-zinc-800 hover:bg-emerald-600 text-zinc-100 hover:text-white border border-zinc-700 text-[11px] font-bold transition"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Odaya Aç</span>
                    </button>

                    <button
                      onClick={() => {
                        const serverBase = getServerUrl();
                        const fullStreamUrl = ch.proxiedUrl 
                          ? `${serverBase}${ch.proxiedUrl}` 
                          : ch.streamUrl;

                        onAddToPlaylist({
                          url: fullStreamUrl,
                          title: ch.title,
                          type: 'hls',
                          isLive: true
                        });
                        sounds.playPop();
                      }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white transition"
                      title="Oynatma Listesine Ekle"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
