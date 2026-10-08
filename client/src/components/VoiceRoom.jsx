import React, { useState } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Monitor, 
  Crown, 
  Radio, 
  Sliders,
  Shield,
  ShieldAlert,
  UserX,
  MessageSquare,
  PlayCircle,
  X,
  Check,
  Sparkles,
  MoreVertical
} from 'lucide-react';
import { webrtc } from '../services/webrtc';

export function VoiceRoom({ 
  users = [], 
  currentUserId, 
  speakingUsers = new Set(),
  isHost = false,
  onTransferHost,
  onKickUser,
  onSetUserPermission
}) {
  const [peerVolumes, setPeerVolumes] = useState({});
  const [showSliders, setShowSliders] = useState(false);
  const [activeAdminUserId, setActiveAdminUserId] = useState(null);

  const handleVolumeChange = (userId, val) => {
    setPeerVolumes(prev => ({ ...prev, [userId]: val }));
    webrtc.setPeerVolume(userId, val);
  };

  const activeAdminUser = users.find(u => u.id === activeAdminUserId);

  return (
    <div className="bg-[#0f111a]/90 rounded-md p-3.5 border border-zinc-800 shadow-md relative">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-zinc-300" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
            Ses Kanalı & Katılımcılar ({users.length})
          </h3>
          {isHost && (
            <span className="bg-amber-500/20 text-amber-300 border border-zinc-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Crown className="w-3 h-3 fill-current" />
              Oda Yöneticisisiniz
            </span>
          )}
        </div>
        <button
          onClick={() => setShowSliders(!showSliders)}
          className={`p-1.5 rounded-lg text-xs transition flex items-center gap-1 ${
            showSliders ? 'hover:bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
          }`}
          title="Kişisel Ses Seviyesi Ayarları"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span className="text-[10px]">Ses Seviyeleri</span>
        </button>
      </div>

      {/* Users Voice Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {users.map((user) => {
          const isSelf = user.id === currentUserId;
          const isSpeaking = speakingUsers.has(user.id);
          const userVolume = peerVolumes[user.id] !== undefined ? peerVolumes[user.id] : 1;
          const permissions = user.permissions || { canVoice: true, canChat: true, canControlMedia: false };

          return (
            <div
              key={user.id}
              className={`relative flex flex-col items-center p-2.5 rounded-md border transition-all ${
                isSpeaking
                  ? 'bg-emerald-950/30 border-zinc-700 shadow-lg '
                  : 'bg-white/5 border-zinc-800 hover:border-white/15'
              }`}
            >
              {/* Host Admin Trigger Button for Other Users */}
              {isHost && !isSelf && (
                <button
                  type="button"
                  onClick={() => setActiveAdminUserId(user.id)}
                  className="absolute top-1.5 right-1.5 p-1 rounded-md bg-white/10 hover:bg-purple-600 text-zinc-300 hover:text-white transition shadow text-xs"
                  title="Yönetici İzinleri & İşlemler"
                >
                  <MoreVertical className="w-3 h-3" />
                </button>
              )}

              {/* Avatar with speaking wave */}
              <div className="relative mt-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-transform ${
                    isSpeaking ? 'scale-110 ring-4 ring-emerald-500 ring-offset-2 ring-offset-slate-950 ' : ''
                  }`}
                  style={{
                    backgroundColor: `${user.color || '#8b5cf6'}20`,
                    border: `2px solid ${user.color || '#8b5cf6'}`
                  }}
                >
                  {user.avatar || '🎮'}
                </div>

                {/* Host Crown */}
                {user.isHost && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 p-0.5 rounded-full text-black shadow">
                    <Crown className="w-3 h-3 fill-current" />
                  </span>
                )}

                {/* Screen Sharing Indicator */}
                {user.isScreenSharing && (
                  <span className="absolute -bottom-1 -left-1 bg-indigo-600 p-0.5 rounded-full text-white shadow">
                    <Monitor className="w-3 h-3" />
                  </span>
                )}
              </div>

              {/* Nickname */}
              <div className="mt-2 text-center w-full">
                <p 
                  className="text-xs font-bold truncate max-w-full"
                  style={{ color: user.color || '#e2e8f0' }}
                >
                  {user.nickname} {isSelf && <span className="text-zinc-400 font-normal">(Sen)</span>}
                </p>

                {/* Status Icons & Restrictions */}
                <div className="flex items-center justify-center gap-1.5 mt-1 text-[11px]">
                  {user.isMuted ? (
                    <span className="text-red-400" title="Mikrofon Kapalı">
                      <MicOff className="w-3 h-3" />
                    </span>
                  ) : (
                    <span className="text-zinc-300" title="Mikrofon Açık">
                      <Mic className="w-3 h-3" />
                    </span>
                  )}

                  {user.isDeafened && (
                    <span className="text-amber-400" title="Sağırlaştırıldı">
                      <VolumeX className="w-3 h-3" />
                    </span>
                  )}

                  {/* Restricted indicators */}
                  {permissions.canChat === false && (
                    <span className="text-red-400" title="Mesaj Göndermesi Kısıtlandı">
                      <MessageSquare className="w-3 h-3 opacity-50 line-through" />
                    </span>
                  )}
                  {permissions.canVoice === false && (
                    <span className="text-red-400" title="Ses İzni Kapalı">
                      <MicOff className="w-3 h-3 text-red-500" />
                    </span>
                  )}
                  {permissions.canControlMedia && !user.isHost && (
                    <span className="text-zinc-100" title="Medya Kontrol Yetkisi Var">
                      <PlayCircle className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>

              {/* Volume Slider for Remote Peers */}
              {!isSelf && showSliders && (
                <div className="mt-2 w-full pt-1 border-t border-zinc-800 flex items-center gap-1">
                  <Volume2 className="w-2.5 h-2.5 text-zinc-400" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={userVolume}
                    onChange={(e) => handleVolumeChange(user.id, parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/20 rounded appearance-none cursor-pointer accent-purple-500"
                    title={`Ses Seviyesi: %${Math.round(userVolume * 100)}`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Host Management Modal / Popover for Selected User */}
      {activeAdminUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-800 rounded-md p-5 max-w-sm w-full shadow-lg space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{activeAdminUser.avatar || '🎮'}</span>
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">
                    {activeAdminUser.nickname}
                  </h4>
                  <p className="text-[11px] text-zinc-400">Yönetici Kontrol Paneli</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveAdminUserId(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Permission Toggles */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Kullanıcı İzinleri:
              </span>

              {/* Voice Permission */}
              <div className="flex items-center justify-between p-2.5 rounded-md bg-white/5 border border-zinc-800">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-zinc-300" />
                  <div>
                    <div className="text-xs font-bold text-zinc-200">Sesli Sohbet</div>
                    <div className="text-[10px] text-zinc-400">Konuşma ve mikrofon izni</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const currentVal = activeAdminUser.permissions?.canVoice !== false;
                    onSetUserPermission(activeAdminUser.id, 'canVoice', !currentVal);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    activeAdminUser.permissions?.canVoice !== false
                      ? 'hover:bg-zinc-700 text-zinc-100 border border-zinc-700'
                      : 'bg-red-600/30 text-red-300 border border-zinc-700'
                  }`}
                >
                  {activeAdminUser.permissions?.canVoice !== false ? 'İzin Verildi' : 'Engellendi'}
                </button>
              </div>

              {/* Chat Permission */}
              <div className="flex items-center justify-between p-2.5 rounded-md bg-white/5 border border-zinc-800">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-zinc-100" />
                  <div>
                    <div className="text-xs font-bold text-zinc-200">Metin Sohbeti</div>
                    <div className="text-[10px] text-zinc-400">Oda chatine mesaj yazma</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const currentVal = activeAdminUser.permissions?.canChat !== false;
                    onSetUserPermission(activeAdminUser.id, 'canChat', !currentVal);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    activeAdminUser.permissions?.canChat !== false
                      ? 'hover:bg-zinc-700 text-zinc-100 border border-zinc-700'
                      : 'bg-red-600/30 text-red-300 border border-zinc-700'
                  }`}
                >
                  {activeAdminUser.permissions?.canChat !== false ? 'İzin Verildi' : 'Engellendi'}
                </button>
              </div>

              {/* Media Control Permission */}
              <div className="flex items-center justify-between p-2.5 rounded-md bg-white/5 border border-zinc-800">
                <div className="flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="text-xs font-bold text-zinc-200">Medya Kontrolü</div>
                    <div className="text-[10px] text-zinc-400">Durdurma/oynatma & link değiştirme</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const currentVal = !!activeAdminUser.permissions?.canControlMedia;
                    onSetUserPermission(activeAdminUser.id, 'canControlMedia', !currentVal);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    activeAdminUser.permissions?.canControlMedia
                      ? 'hover:bg-zinc-700 text-zinc-100 border border-zinc-700'
                      : 'bg-white/10 text-zinc-400 border border-zinc-800'
                  }`}
                >
                  {activeAdminUser.permissions?.canControlMedia ? 'Yetkili' : 'Yetkisiz'}
                </button>
              </div>
            </div>

            {/* Critical Actions: Host Transfer & Kick */}
            <div className="pt-2 border-t border-zinc-800 space-y-2">
              <button
                type="button"
                onClick={() => {
                  if (confirm(`${activeAdminUser.nickname} kullanıcısına oda yöneticiliğini devretmek istiyor musunuz?`)) {
                    onTransferHost(activeAdminUser.id, activeAdminUser.nickname);
                    setActiveAdminUserId(null);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-zinc-700 text-xs font-bold transition"
              >
                <Crown className="w-4 h-4 fill-current" />
                <span>Oda Yöneticiliğini (Host) Devret</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm(`${activeAdminUser.nickname} kullanıcısını odadan atmak istediğinize emin misiniz?`)) {
                    onKickUser(activeAdminUser.id, activeAdminUser.nickname);
                    setActiveAdminUserId(null);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-zinc-700 text-xs font-bold transition"
              >
                <UserX className="w-4 h-4" />
                <span>Odadan At (Kick)</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
