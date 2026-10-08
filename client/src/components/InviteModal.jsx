import React, { useState } from 'react';
import { X, Copy, Check, Users, Sparkles, Share2 } from 'lucide-react';

export function InviteModal({ isOpen, onClose, roomId }) {
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const inviteUrl = `${window.location.origin}?room=${roomId}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-[#10121d] border border-zinc-800 rounded-md w-full max-w-md overflow-hidden shadow-lg">
        
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-zinc-100" />
            <h2 className="text-sm font-bold text-white">Odaya Arkadaşlarını Davet Et</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-zinc-300 leading-relaxed">
            Bu linki veya oda kodunu arkadaşlarınla paylaş. Odaya katıldıklarında canlı maç, video ve sesli sohbet anında senkronize olur!
          </p>

          {/* Full Link */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 block mb-1.5">
              Doğrudan Davet Linki:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="w-full bg-white/5 border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-100 font-mono select-all focus:outline-none"
              />
              <button
                onClick={copyUrl}
                className="px-3.5 py-2 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition shadow-md"
              >
                {copied ? <Check className="w-4 h-4 text-zinc-100" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
              </button>
            </div>
          </div>

          {/* Room Code */}
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 block mb-1.5">
              Oda Kodu:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={roomId}
                className="w-full bg-white/5 border border-zinc-800 rounded-md px-3 py-2 text-xs text-white font-mono select-all focus:outline-none font-bold"
              />
              <button
                onClick={copyCode}
                className="px-3.5 py-2 rounded-md bg-white/10 hover:bg-white/15 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition"
              >
                {copiedCode ? <Check className="w-4 h-4 text-zinc-100" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Kopyalandı' : 'Kodu Al'}</span>
              </button>
            </div>
          </div>

          <div className="p-3 bg-purple-950/20 border border-zinc-700 rounded-md flex items-center gap-2.5 text-xs text-zinc-100">
            <Sparkles className="w-4 h-4 shrink-0 text-zinc-100" />
            <span>Kayıt veya indirme gerekmez; tarayıcıdan anında bağlanırlar.</span>
          </div>
        </div>

      </div>
    </div>
  );
}
