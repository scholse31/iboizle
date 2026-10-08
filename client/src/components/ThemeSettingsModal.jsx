import React, { useState } from 'react';
import { X, Settings, User, Shield, Volume2, Palette, Check, Globe } from 'lucide-react';
import { sounds } from '../services/soundEffects';

const AVATARS = ['🎮', '⚡', '🔥', '🚀', '👑', '🐺', '🦊', '👾', '🐱', '🕶️', '⚽', '🍿'];
const COLORS = [
  '#a855f7', // Purple
  '#38bdf8', // Sky Blue
  '#34d399', // Emerald
  '#f43f5e', // Rose
  '#fbbf24', // Amber
  '#ec4899', // Pink
  '#818cf8', // Indigo
  '#2dd4bf'  // Teal
];

export function ThemeSettingsModal({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  isHost,
  isHostOnly,
  onToggleHostOnly
}) {
  const [nickname, setNickname] = useState(currentUser.nickname || '');
  const [selectedAvatar, setSelectedAvatar] = useState(currentUser.avatar || '🎮');
  const [selectedColor, setSelectedColor] = useState(currentUser.color || '#a855f7');
  const [soundsEnabled, setSoundsEnabled] = useState(sounds.enabled);
  const [serverUrl, setServerUrl] = useState(() => localStorage.getItem('synchro_server_url') || '');

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateUser({
      nickname: nickname.trim() || currentUser.nickname,
      avatar: selectedAvatar,
      color: selectedColor
    });
    sounds.enabled = soundsEnabled;
    
    // Save or clear custom backend server URL
    if (serverUrl.trim()) {
      localStorage.setItem('synchro_server_url', serverUrl.trim());
    } else {
      localStorage.removeItem('synchro_server_url');
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#10121d] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-400" />
            <h2 className="text-sm font-bold text-white">Profil & Menü Özelleştirmesi</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Nickname */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-purple-400" />
              Kullanıcı Adı:
            </label>
            <input
              type="text"
              value={nickname}
              maxLength={20}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          {/* Avatar Picker */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">
              Avatar Seçimi:
            </label>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setSelectedAvatar(av)}
                  className={`h-11 rounded-xl text-xl flex items-center justify-center transition ${
                    selectedAvatar === av
                      ? 'bg-purple-600/30 border-2 border-purple-500 scale-105 shadow-md shadow-purple-500/20'
                      : 'bg-white/5 border border-white/5 hover:bg-white/10'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-purple-400" />
              İsim Rengi & Tema Vurgusu:
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setSelectedColor(col)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                  style={{ backgroundColor: col }}
                >
                  {selectedColor === col && <Check className="w-4 h-4 text-black stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Room Control Host Only Toggle (Only if user is Host) */}
          {isHost && (
            <div className="pt-2 border-t border-white/10">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <div>
                    <p className="text-xs font-bold text-white leading-tight">Yalnızca Yönetici Kontrolü</p>
                    <p className="text-[10px] text-slate-400 leading-tight">Oynat/Durdur/Yayın değiştirme yetkisi sadece sende olur.</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isHostOnly}
                  onChange={onToggleHostOnly}
                  className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Sound FX Toggle */}
          <div className="pt-2 border-t border-white/10">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <div>
                  <p className="text-xs font-bold text-white leading-tight">Arayüz & Mesaj Sesleri</p>
                  <p className="text-[10px] text-slate-400 leading-tight">Yeni mesaj ve reaksiyonlarda hafif efekt sesi çalar.</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={soundsEnabled}
                onChange={(e) => setSoundsEnabled(e.target.checked)}
                className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Render Backend URL Field (For Vercel + Render deployments) */}
          <div className="pt-2 border-t border-white/10">
            <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              Sunucu Adresi (Render Backend URL):
            </label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="https://synchro-backend.onrender.com (Boşsa yerel/otomatik)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-indigo-300 placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500 transition"
            />
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
              Site Vercel'de, sunucu Render'da çalıştığında Render linkinizi buraya yazabilirsiniz veya Vercel panelinden <code className="text-purple-300 bg-white/5 px-1 py-0.5 rounded">VITE_SERVER_URL</code> olarak tanımlayabilirsiniz.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-white/[0.02] border-t border-white/10 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-md shadow-purple-600/20"
          >
            Kaydet & Uygula
          </button>
        </div>

      </div>
    </div>
  );
}
