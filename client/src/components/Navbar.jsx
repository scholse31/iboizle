import React, { useState } from 'react';
import { 
  Tv, 
  Share2, 
  Settings, 
  PlusCircle, 
  Mic, 
  MicOff, 
  Monitor, 
  Maximize, 
  ListVideo, 
  Radio, 
  Volume2, 
  VolumeX,
  Copy,
  Check
} from 'lucide-react';

export function Navbar({
  room,
  currentUser,
  isMicActive,
  isMuted,
  isDeafened,
  isScreenSharing,
  onToggleMic,
  onToggleDeafen,
  onToggleScreenShare,
  onOpenIptvModal,
  onOpenMediaModal,
  onOpenInviteModal,
  onOpenSettingsModal,
  onOpenPlaylist,
  isTheaterMode,
  onToggleTheater
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#090b14]/80 backdrop-blur-md px-4 py-3">
      <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-3 flex-wrap">
        
        {/* Brand & Room Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1.5 rounded-xl shadow-lg shadow-purple-500/20 font-bold tracking-wider text-sm">
            <Radio className="w-4 h-4 animate-pulse text-white" />
            <span className="text-white font-extrabold tracking-widest">SYNCHRO</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
            <span className="text-xs text-slate-400">Oda:</span>
            <span className="text-xs font-semibold text-purple-300">{room.id}</span>
            {room.currentMedia?.isLive && (
              <span className="flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 animate-live-badge">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                CANLI YAYIN
              </span>
            )}
          </div>
        </div>

        {/* Center: Voice & Screen Quick Hub */}
        <div className="flex items-center gap-2 bg-slate-900/80 px-2.5 py-1 rounded-xl border border-white/10 shadow-inner">
          {/* Mic Button */}
          <button
            onClick={onToggleMic}
            title={isMicActive ? (isMuted ? "Mikrofon Aç" : "Mikrofon Kapat") : "Ses Kanalına Katıl"}
            className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-medium ${
              !isMicActive 
                ? 'bg-slate-800 text-slate-400 hover:text-slate-200' 
                : isMuted 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/20'
            }`}
          >
            {isMuted || !isMicActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span className="hidden md:inline">
              {!isMicActive ? 'Sese Katıl' : (isMuted ? 'Sessiz' : 'Konuşuyor')}
            </span>
          </button>

          {/* Deafen Button */}
          <button
            onClick={onToggleDeafen}
            title={isDeafened ? "Sesi Aç" : "Sağırlaştır (Kulaklık Kapat)"}
            className={`p-2 rounded-lg transition-all ${
              isDeafened 
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {isDeafened ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <div className="h-4 w-[1px] bg-white/10 mx-1"></div>

          {/* Screen Share Button */}
          <button
            onClick={onToggleScreenShare}
            title={isScreenSharing ? "Ekran Paylaşımını Durdur" : "Ekranını Odaya Yayınla (Ultra Düşük Gecikme)"}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold ${
              isScreenSharing
                ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                : 'bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/50 border border-indigo-500/30'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span className="hidden sm:inline">
              {isScreenSharing ? 'Ekranı Durdur' : 'Ekran Paylaş'}
            </span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* IPTV & Live Sports Channels */}
          <button
            onClick={onOpenIptvModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs transition shadow-sm shadow-emerald-500/10"
            title="beIN, Exxen, S Sport ve Dünya Kanalları Rehberi"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span className="hidden sm:inline">IPTV & Canlı Maçlar</span>
          </button>

          {/* Add Media */}
          <button
            onClick={onOpenMediaModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition shadow-md shadow-purple-600/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Manuel Link</span>
          </button>

          {/* Playlist */}
          <button
            onClick={onOpenPlaylist}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 transition"
            title="Oynatma Listesi"
          >
            <ListVideo className="w-4 h-4" />
          </button>

          {/* Invite */}
          <button
            onClick={onOpenInviteModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-medium transition"
            title="Arkadaşını Davet Et"
          >
            <Share2 className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden md:inline">Davet Et</span>
          </button>

          {/* Fast Link Copy */}
          <button
            onClick={handleCopyLink}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 transition"
            title="Oda Linkini Kopyala"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Theater Mode */}
          <button
            onClick={onToggleTheater}
            className={`p-2 rounded-xl border border-white/5 transition ${
              isTheaterMode ? 'bg-purple-600/20 text-purple-400' : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
            title="Sinema Modu"
          >
            <Maximize className="w-4 h-4" />
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettingsModal}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 transition"
            title="Özelleştirme & Ayarlar"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <span className="text-xl select-none" title="Avatarınız">{currentUser.avatar}</span>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-semibold leading-tight" style={{ color: currentUser.color }}>
                {currentUser.nickname}
              </span>
              <span className="text-[10px] text-slate-400 leading-tight">
                {currentUser.isHost ? 'Oda Yöneticisi' : 'İzleyici'}
              </span>
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}
