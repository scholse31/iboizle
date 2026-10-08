import React from 'react';
import { X, Play, Trash2, ListVideo, Radio, Film } from 'lucide-react';

const YoutubeIcon = () => (
  <svg className="w-4 h-4 text-red-500 fill-current" viewBox="0 0 24 24">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

export function PlaylistModal({ 
  isOpen, 
  onClose, 
  playlist = [], 
  onPlayItem, 
  onRemoveItem, 
  canControl 
}) {
  if (!isOpen) return null;

  const getTypeIcon = (type) => {
    switch (type) {
      case 'youtube': return <YoutubeIcon />;
      case 'hls': return <Radio className="w-4 h-4 text-emerald-400" />;
      default: return <Film className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#10121d] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <ListVideo className="w-5 h-5 text-purple-400" />
            <h2 className="text-sm font-bold text-white">Oynatma Listesi Sırası ({playlist.length})</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List Content */}
        <div className="p-4 max-h-[400px] overflow-y-auto space-y-2">
          {playlist.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              Oynatma listesi boş. "Medya Ekle" kısmından yeni linkler ekleyebilirsiniz.
            </div>
          ) : (
            playlist.map((item, index) => (
              <div 
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/15 transition group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono text-slate-500 w-4 text-right">
                    {index + 1}
                  </span>
                  <div className="p-2 rounded-lg bg-white/5">
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate max-w-[260px]">
                      {item.title}
                    </p>
                    <span className="text-[10px] text-slate-500 block truncate">
                      Ekleyen: {item.addedBy}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onPlayItem(item.id)}
                    disabled={!canControl}
                    className="p-2 rounded-lg bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white transition disabled:opacity-30"
                    title="Şimdi Oynat"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition"
                    title="Listeden Kaldır"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
