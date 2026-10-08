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
  Filter
} from 'lucide-react';
import { sounds } from '../services/soundEffects';
import { getServerUrl } from '../services/socket';

const DEFAULT_IPTV_URL = 'http://fixtv123.xyz:2095/get.php?username=necati29&password=20082010hasanmete&type=m3u';

export function IptvModal({ 
  isOpen, 
  onClose, 
  onSelectChannel, 
  onAddToPlaylist 
}) {
  const [url, setUrl] = useState(DEFAULT_IPTV_URL);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [searchQuery, setSearchQuery] = useState('');
  const [channels, setChannels] = useState([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [error, setError] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Auto load on initial open if not loaded
  useEffect(() => {
    if (isOpen && !isLoaded) {
      handleLoadPlaylist();
    }
  }, [isOpen]);

  // Search trigger when query or category changes
  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => {
      fetchSearchResults();
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory]);

  const handleLoadPlaylist = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const serverBase = getServerUrl();
      const res = await fetch(`${serverBase}/api/iptv/parse?url=${encodeURIComponent(url.trim())}`);
      const data = await res.json();

      if (data.success) {
        setIsLoaded(true);
        setCategories(['Tümü', ...(data.categories || [])]);
        setChannels(data.channels || []);
        setTotalMatches(data.totalChannels || 0);
        sounds.playPop();
      } else {
        setError(data.error || 'IPTV listesi yüklenemedi.');
      }
    } catch (err) {
      setError('Bağlantı hatası: ' + err.message);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
      <div className="bg-[#0f111a] border border-white/10 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* MODAL HEADER */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Canlı Maç & IPTV Kanal Rehberi
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {totalMatches} Kanal
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                beIN Sports, Exxen, S Sport, Smart Spor ve dünya kanallarını tek tıkla odaya yayınla
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PLAYLIST URL INPUT BAR */}
        <div className="p-3.5 bg-black/40 border-b border-white/5 flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="IPTV / Xtream M3U Linki (http://.../get.php?...)"
            className="flex-1 min-w-[280px] bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-mono"
          />
          <button
            onClick={handleLoadPlaylist}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>{loading ? 'Yükleniyor...' : 'Listeyi Yenile'}</span>
          </button>
        </div>

        {/* SEARCH & CATEGORY FILTERS BAR */}
        <div className="p-3 bg-white/[0.01] border-b border-white/5 flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kanal ara (Örn: bein, exxen, spor, tr, cbc)..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Quick Sport Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['Tümü', 'TR ⚜️ beIN SPORTS', 'TR ⚜️ EXXEN SPORTS', 'TR ⚜️ S SPORT', 'TR ⚜️ TABII SPOR', 'SPOR & CANLI MAÇ'].map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  sounds.playPop();
                }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition border ${
                  selectedCategory === cat
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-500/20'
                    : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:border-white/15'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

        </div>

        {/* ERROR STATE */}
        {error && (
          <div className="p-3 m-3 bg-red-950/50 border border-red-500/30 rounded-xl text-xs text-red-200">
            {error}
          </div>
        )}

        {/* CHANNELS GRID CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400 py-16">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-xs">IPTV kanalları taranıyor ve optimize ediliyor...</p>
            </div>
          ) : channels.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-500 py-16 text-center">
              <Tv className="w-10 h-10 stroke-[1.5]" />
              <p className="text-xs">Aramanıza uygun kanal bulunamadı.</p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('Tümü'); }}
                className="mt-2 text-xs text-emerald-400 hover:underline"
              >
                Filtreleri Temizle
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {channels.map((ch) => (
                <div
                  key={ch.id}
                  className="bg-white/5 border border-white/5 hover:border-emerald-500/50 rounded-xl p-3 flex flex-col justify-between gap-2.5 transition group hover:shadow-lg hover:shadow-emerald-500/5"
                >
                  <div className="flex items-start gap-2.5">
                    {/* Logo or placeholder */}
                    <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/10 shrink-0 flex items-center justify-center overflow-hidden">
                      {ch.logo ? (
                        <img 
                          src={ch.logo} 
                          alt={ch.title} 
                          className="w-full h-full object-contain p-1"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <Radio className="w-5 h-5 text-emerald-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-emerald-300 transition" title={ch.title}>
                        {ch.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                        {ch.group}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
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
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-[11px] font-bold transition"
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
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition"
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
