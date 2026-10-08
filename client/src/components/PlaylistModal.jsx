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
      case 'hls': return <Radio className="w-4 h-4 text-zinc-300" />;
      default: return <Film className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-[#10121d] border border-zinc-800 rounded-md w-full max-w-lg overflow-hidden shadow-lg">
        
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <ListVideo className="w-5 h-5 text-zinc-100" />
            <h2 className="text-sm font-bold text-white">Oynatma Listesi Sırası ({playlist.length})</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List Content */}
        <div className="p-4 max-h-[400px] overflow-y-auto space-y-2">
          {playlist.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-xs">
              Oynatma listesi boş. "Medya Ekle" kısmından yeni linkler ekleyebilirsiniz.
            </div>
          ) : (
            playlist.map((item, index) => (
              <div 
                key={item.id}
                className="flex items-center justify-between p-3 rounded-md bg-white/5 border border-zinc-800 hover:border-white/15 transition group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono text-zinc-500 w-4 text-right">
                    {index + 1}
                  </span>
                  <div className="p-2 rounded-lg bg-white/5">
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 truncate max-w-[260px]">
                      {item.title}
                    </p>
                    <span className="text-[10px] text-zinc-500 block truncate">
                      Ekleyen: {item.addedBy}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onPlayItem(item.id)}
                    disabled={!canControl}
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-purple-600 text-zinc-100 hover:text-white transition disabled:opacity-30"
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
