import React, { useState, useEffect, useCallback } from 'react';
import { socket } from './services/socket';
import { webrtc } from './services/webrtc';
import { sounds } from './services/soundEffects';

import { Navbar } from './components/Navbar';
import { VideoPlayer } from './components/VideoPlayer';
import { VoiceRoom } from './components/VoiceRoom';
import { ChatPanel } from './components/ChatPanel';
import { MediaInputModal } from './components/MediaInputModal';
import { PlaylistModal } from './components/PlaylistModal';
import { InviteModal } from './components/InviteModal';
import { ThemeSettingsModal } from './components/ThemeSettingsModal';
import { IptvModal } from './components/IptvModal';

import { 
  Tv, 
  Radio, 
  Share2, 
  Sparkles, 
  ShieldCheck, 
  Users, 
  Monitor, 
  Flame, 
  Play, 
  Plus 
} from 'lucide-react';

export default function App() {
  // -------------------------------------------------------------
  // ROOM & USER STATE
  // -------------------------------------------------------------
  const [roomId, setRoomId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || `canli-${Math.random().toString(36).substring(2, 7)}`;
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('synchro_user');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    const randId = Math.random().toString(36).substring(2, 5);
    return {
      nickname: `Yayıncı_${randId}`,
      avatar: '🎮',
      color: '#a855f7',
      isHost: false
    };
  });

  const [room, setRoom] = useState({
    id: roomId,
    title: `Oda #${roomId}`,
    hostId: null,
    isHostOnly: false,
    users: [],
    currentMedia: {
      url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      title: 'Canlı HLS / Spor Demo Yayını (M3U8)',
      type: 'hls',
      playbackState: 'playing',
      currentTime: 0,
      isLive: true
    },
    playlist: [],
    chatMessages: []
  });

  // Voice & Screen share states
  const [isMicActive, setIsMicActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteScreenStream, setRemoteScreenStream] = useState(null);
  const [speakingUsers, setSpeakingUsers] = useState(new Set());

  // UI Modals & Layout
  const [isIptvOpen, setIsIptvOpen] = useState(false);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  // Floating Reactions
  const [reactions, setReactions] = useState([]);
  const [kickedInfo, setKickedInfo] = useState(null);

  // Toast notification
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // -------------------------------------------------------------
  // INITIALIZATION & SOCKET SETUP
  // -------------------------------------------------------------
  useEffect(() => {
    // Keep URL synced with room
    const url = new URL(window.location.href);
    if (url.searchParams.get('room') !== roomId) {
      url.searchParams.set('room', roomId);
      window.history.replaceState({}, '', url.toString());
    }

    // Initialize WebRTC callbacks
    webrtc.initSignaling();
    webrtc.setCallbacks({
      onRemoteStream: (peerId, stream, streamType) => {
        if (streamType === 'screenshare') {
          setRemoteScreenStream(stream);
          showToast('Biri ekranını paylaşmaya başladı!', 'success');
        }
      },
      onSpeakingChange: (peerId, isSpeaking) => {
        setSpeakingUsers((prev) => {
          const next = new Set(prev);
          if (isSpeaking) next.add(peerId);
          else next.delete(peerId);
          return next;
        });
      }
    });

    // Join room
    socket.emit('join-room', {
      roomId,
      nickname: currentUser.nickname,
      avatar: currentUser.avatar,
      color: currentUser.color
    });

    // Listeners
    socket.on('room-state', (initialRoom) => {
      setRoom(initialRoom);
      const isHostNow = initialRoom.hostId === socket.id;
      setCurrentUser((prev) => ({ ...prev, isHost: isHostNow }));
    });

    socket.on('user-joined', (userData) => {
      setRoom((prev) => ({
        ...prev,
        users: [...prev.users.filter((u) => u.id !== userData.id), userData]
      }));
      sounds.playJoin();
    });

    socket.on('user-left', ({ userId, nickname }) => {
      setRoom((prev) => ({
        ...prev,
        users: prev.users.filter((u) => u.id !== userId)
      }));
    });

    socket.on('media-changed', (newMedia) => {
      setRoom((prev) => ({
        ...prev,
        currentMedia: newMedia
      }));
      showToast(`Yeni yayın yüklendi: "${newMedia.title}"`, 'info');
      sounds.playPop();
    });

    socket.on('new-message', (msg) => {
      setRoom((prev) => ({
        ...prev,
        chatMessages: [...prev.chatMessages, msg]
      }));
      if (!msg.isSystem) {
        sounds.playPop();
      }
    });

    socket.on('float-reaction', (reaction) => {
      setReactions((prev) => [...prev, reaction]);
      sounds.playReaction();
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 3000);
    });

    socket.on('playlist-updated', (newPlaylist) => {
      setRoom((prev) => ({ ...prev, playlist: newPlaylist }));
    });

    socket.on('host-control-updated', ({ isHostOnly }) => {
      setRoom((prev) => ({ ...prev, isHostOnly }));
      showToast(isHostOnly ? 'Yalnızca yönetici kontrolü açıldı.' : 'Kontrol herkese açıldı.', 'info');
    });

    socket.on('host-transferred', ({ newHostId }) => {
      const isMeHost = newHostId === socket.id;
      setCurrentUser((prev) => ({ ...prev, isHost: isMeHost }));
      setRoom((prev) => ({
        ...prev,
        hostId: newHostId,
        users: prev.users.map((u) => ({ ...u, isHost: u.id === newHostId }))
      }));
      if (isMeHost) {
        showToast('Tebrikler! Oda yöneticisi oldunuz.', 'success');
      }
    });

    socket.on('user-voice-updated', ({ userId, isMuted, isDeafened }) => {
      setRoom((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === userId ? { ...u, isMuted, isDeafened } : u))
      }));
    });

    socket.on('user-screenshare-updated', ({ userId, isScreenSharing }) => {
      setRoom((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === userId ? { ...u, isScreenSharing } : u))
      }));
    });

    socket.on('screen-share-available', ({ broadcasterName }) => {
      showToast(`${broadcasterName} ekran yayını başlattı!`, 'success');
    });

    socket.on('kicked-from-room', ({ reason }) => {
      setKickedInfo(reason || 'Oda yöneticisi tarafından odadan çıkarıldınız.');
      webrtc.cleanup();
      sounds.playLeave();
    });

    socket.on('user-permission-updated', ({ userId, permissions }) => {
      setRoom((prev) => ({
        ...prev,
        users: prev.users.map((u) => (u.id === userId ? { ...u, permissions } : u))
      }));
      if (userId === socket.id) {
        if (permissions.canVoice === false && isMicActive) {
          webrtc.toggleMute(true);
          setIsMuted(true);
          showToast('Yönetici sesli konuşma yetkinizi kapattı.', 'error');
        }
        if (permissions.canChat === false) {
          showToast('Yönetici sohbet mesajı yazma yetkinizi kapattı.', 'error');
        }
      }
    });

    return () => {
      socket.off('room-state');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('media-changed');
      socket.off('new-message');
      socket.off('float-reaction');
      socket.off('playlist-updated');
      socket.off('host-control-updated');
      socket.off('host-transferred');
      socket.off('user-voice-updated');
      socket.off('user-screenshare-updated');
      socket.off('screen-share-available');
      socket.off('kicked-from-room');
      socket.off('user-permission-updated');
      webrtc.cleanup();
    };
  }, [roomId, isMicActive]);

  // Save current user preferences
  const handleUpdateUser = (updated) => {
    const newUser = { ...currentUser, ...updated };
    setCurrentUser(newUser);
    localStorage.setItem('synchro_user', JSON.stringify(newUser));
    showToast('Profil ayarlarınız güncellendi!', 'success');
  };

  // -------------------------------------------------------------
  // VOICE & SCREEN ACTIONS
  // -------------------------------------------------------------
  const handleToggleMic = async () => {
    if (!isMicActive) {
      const ok = await webrtc.startMicrophone();
      if (ok) {
        setIsMicActive(true);
        setIsMuted(false);
        showToast('Ses kanalına bağlandınız!', 'success');
      } else {
        showToast('Mikrofon erişimi sağlanamadı.', 'error');
      }
    } else {
      const nextMute = !isMuted;
      setIsMuted(nextMute);
      webrtc.toggleMute(nextMute);
    }
  };

  const handleToggleDeafen = () => {
    const nextDeafen = !isDeafened;
    setIsDeafened(nextDeafen);
    webrtc.toggleDeafen(nextDeafen);
  };

  const handleToggleScreenShare = async () => {
    if (!isScreenSharing) {
      const stream = await webrtc.startScreenShare();
      if (stream) {
        setIsScreenSharing(true);
        // Switch room current media to screenshare mode so everyone sees it directly
        socket.emit('media-change', {
          url: 'screenshare',
          title: `${currentUser.nickname} Ekran Yayını`,
          type: 'screenshare',
          isLive: true
        });
        showToast('Ekranınız odaya canlı yayınlanıyor!', 'success');
      }
    } else {
      webrtc.stopScreenShare();
      setIsScreenSharing(false);
      showToast('Ekran paylaşımı durduruldu.', 'info');
    }
  };

  // -------------------------------------------------------------
  // MEDIA & CHAT ACTIONS
  // -------------------------------------------------------------
  const handleMediaSubmit = (mediaData) => {
    socket.emit('media-change', mediaData);
  };

  const handleAddToPlaylist = (mediaData) => {
    socket.emit('playlist-add', mediaData);
    showToast(`"${mediaData.title}" oynatma listesine eklendi.`, 'success');
  };

  const handlePlayPlaylistItem = (itemId) => {
    socket.emit('playlist-play', itemId);
  };

  const handleRemovePlaylistItem = (itemId) => {
    socket.emit('playlist-remove', itemId);
  };

  const handleSendMessage = (text) => {
    socket.emit('send-message', { text });
  };

  const handleSendReaction = (emoji) => {
    socket.emit('send-reaction', { emoji });
  };

  const handleToggleHostOnly = () => {
    socket.emit('toggle-host-control');
  };

  const handleTransferHost = (targetUserId) => {
    socket.emit('transfer-host', { targetUserId });
  };

  const handleKickUser = (targetUserId, targetNick) => {
    socket.emit('kick-user', { targetUserId, reason: 'Oda yöneticisi tarafından odadan çıkarıldınız.' });
    showToast(`${targetNick || 'Kullanıcı'} odadan atıldı.`, 'info');
  };

  const handleSetUserPermission = (targetUserId, permission, value) => {
    socket.emit('set-user-permission', { targetUserId, permission, value });
    showToast(`Kullanıcı izni güncellendi.`, 'success');
  };

  const currentUserInRoom = room.users.find((u) => u.id === socket.id);
  const canControlMedia = currentUser.isHost || !room.isHostOnly || !!currentUserInRoom?.permissions?.canControlMedia;
  const canChat = currentUser.isHost || currentUserInRoom?.permissions?.canChat !== false;

  return (
    <div className="min-h-screen bg-[#07080c] text-slate-100 flex flex-col font-sans">
      
      {/* Kicked From Room Overlay */}
      {kickedInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#121422] border border-red-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-red-600/20 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto text-3xl">
              ⛔
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Odadan Çıkarıldınız</h2>
              <p className="text-xs text-red-300 mt-1">{kickedInfo}</p>
            </div>
            <button
              onClick={() => {
                const newRoom = `canli-${Math.random().toString(36).substring(2, 7)}`;
                window.location.search = `?room=${newRoom}`;
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-lg shadow-purple-600/30"
            >
              Yeni Bir Odaya Katıl
            </button>
          </div>
        </div>
      )}

      {/* Toast popup */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold backdrop-blur-md border animate-in slide-in-from-bottom duration-200 ${
          toast.type === 'success' 
            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40' 
            : toast.type === 'error'
              ? 'bg-red-950/90 text-red-300 border-red-500/40'
              : 'bg-purple-950/90 text-purple-300 border-purple-500/40'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Main Top Navigation */}
      <Navbar
        room={room}
        currentUser={currentUser}
        isMicActive={isMicActive}
        isMuted={isMuted}
        isDeafened={isDeafened}
        isScreenSharing={isScreenSharing}
        onToggleMic={handleToggleMic}
        onToggleDeafen={handleToggleDeafen}
        onToggleScreenShare={handleToggleScreenShare}
        onOpenIptvModal={() => setIsIptvOpen(true)}
        onOpenMediaModal={() => setIsMediaModalOpen(true)}
        onOpenInviteModal={() => setIsInviteModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenPlaylist={() => setIsPlaylistOpen(true)}
        isTheaterMode={isTheaterMode}
        onToggleTheater={() => setIsTheaterMode(!isTheaterMode)}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto p-3 sm:p-4 md:p-5 flex flex-col gap-4">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
          
          {/* LEFT/CENTER: Player & Voice Channel & Stream Details */}
          <div className={`${isTheaterMode ? 'lg:col-span-12' : 'lg:col-span-8 xl:col-span-9'} flex flex-col gap-4 transition-all duration-300`}>
            
            {/* The Universal Video Player */}
            <VideoPlayer
              media={room.currentMedia}
              isHost={currentUser.isHost}
              isHostOnly={room.isHostOnly}
              canControlMedia={canControlMedia}
              screenStream={remoteScreenStream || (isScreenSharing ? webrtc.localScreenStream : null)}
              onSendReaction={handleSendReaction}
              reactions={reactions}
            />

            {/* Stream Title Bar & Quick Actions */}
            <div className="bg-[#0f111a]/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center justify-between gap-3 flex-wrap shadow-lg">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400">
                  <Tv className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-base font-bold text-white truncate max-w-[500px]">
                    {room.currentMedia?.title || 'Medya Başlığı'}
                  </h1>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                    <span className="uppercase text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/5 border border-white/5">
                      {room.currentMedia?.type || 'hls'}
                    </span>
                    <span>•</span>
                    <span className="truncate max-w-[280px]">
                      {room.currentMedia?.url}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsIptvOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                >
                  <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                  <span>IPTV & Canlı Maçlar</span>
                </button>
                <button
                  onClick={() => setIsMediaModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Manuel Link / Film</span>
                </button>
                <button
                  onClick={() => setIsInviteModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Share2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Davet Linki</span>
                </button>
              </div>
            </div>

            {/* Voice Room Channel */}
            <VoiceRoom
              users={room.users}
              currentUserId={socket.id}
              speakingUsers={speakingUsers}
              isHost={currentUser.isHost}
              onTransferHost={handleTransferHost}
              onKickUser={handleKickUser}
              onSetUserPermission={handleSetUserPermission}
            />

          </div>

          {/* RIGHT: Chat & Live Sidebar (Hidden in Theater Mode) */}
          {!isTheaterMode && (
            <div className="lg:col-span-4 xl:col-span-3 h-[600px] lg:h-auto flex flex-col transition-all duration-300">
              <ChatPanel
                messages={room.chatMessages}
                onSendMessage={handleSendMessage}
                onSendReaction={handleSendReaction}
                canChat={canChat}
              />
            </div>
          )}

        </div>

      </main>

      {/* Modals */}
      <IptvModal
        isOpen={isIptvOpen}
        onClose={() => setIsIptvOpen(false)}
        onSelectChannel={handleMediaSubmit}
        onAddToPlaylist={handleAddToPlaylist}
      />

      <MediaInputModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSubmit={handleMediaSubmit}
        onAddToPlaylist={handleAddToPlaylist}
        onStartScreenShare={handleToggleScreenShare}
      />

      <PlaylistModal
        isOpen={isPlaylistOpen}
        onClose={() => setIsPlaylistOpen(false)}
        playlist={room.playlist}
        onPlayItem={handlePlayPlaylistItem}
        onRemoveItem={handleRemovePlaylistItem}
        canControl={!room.isHostOnly || currentUser.isHost}
      />

      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        roomId={room.id}
      />

      <ThemeSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentUser={currentUser}
        onUpdateUser={handleUpdateUser}
        isHost={currentUser.isHost}
        isHostOnly={room.isHostOnly}
        onToggleHostOnly={handleToggleHostOnly}
      />

    </div>
  );
}
