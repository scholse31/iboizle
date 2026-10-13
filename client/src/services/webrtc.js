import { socket } from './socket';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    // Free Public TURN Relay for cross-network (Mobile 4G to PC WiFi)
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10
};

class WebRTCManager {
  constructor() {
    this.localAudioStream = null;
    this.localScreenStream = null;
    this.peerConnections = new Map(); // peerId -> RTCPeerConnection
    this.makingOffers = new Map(); // peerId -> boolean
    this.audioElements = new Map(); // peerId -> HTMLAudioElement
    this.analysers = new Map(); // peerId -> { analyser, interval }
    this.onRemoteStream = null;
    this.onSpeakingChange = null;
    this.isMuted = false;
    this.isDeafened = false;
    this.audioContext = null;

    // Mobile Audio Unlock on User Interaction
    this.setupMobileAudioUnlock();
  }

  setupMobileAudioUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      this.audioElements.forEach((el) => {
        if (el.paused) {
          el.play().catch(() => {});
        }
      });
    };
    window.addEventListener('click', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
  }

  setCallbacks({ onRemoteStream, onSpeakingChange }) {
    this.onRemoteStream = onRemoteStream;
    this.onSpeakingChange = onSpeakingChange;
  }

  initSignaling() {
    socket.off('webrtc-all-peers');
    socket.off('user-joined');
    socket.off('webrtc-signal');
    socket.off('user-left');

    socket.on('webrtc-all-peers', (peerIds) => {
      peerIds.forEach((peerId) => {
        this.getOrCreatePeerConnection(peerId);
      });
    });

    socket.on('user-joined', (userData) => {
      this.getOrCreatePeerConnection(userData.id);
    });

    socket.on('webrtc-signal', async ({ senderId, signal }) => {
      const pc = this.getOrCreatePeerConnection(senderId);
      const isPolite = socket.id < senderId;

      try {
        if (signal.sdp) {
          const offerCollision =
            signal.sdp.type === 'offer' &&
            (this.makingOffers.get(senderId) || pc.signalingState !== 'stable');

          if (!isPolite && offerCollision) {
            return;
          }

          if (offerCollision) {
            await Promise.all([
              pc.setLocalDescription({ type: 'rollback' }),
              pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
            ]);
          } else {
            await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          }

          if (signal.sdp.type === 'offer') {
            await pc.setLocalDescription();
            socket.emit('webrtc-signal', {
              targetId: senderId,
              signal: { sdp: pc.localDescription }
            });
          }
        } else if (signal.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (candErr) {
            // Ignore minor ICE candidate race condition
          }
        }
      } catch (err) {
        console.warn('WebRTC signal handling caught:', err.message);
      }
    });

    socket.on('user-left', ({ userId }) => {
      this.closePeerConnection(userId);
    });
  }

  getOrCreatePeerConnection(peerId) {
    if (this.peerConnections.has(peerId)) {
      return this.peerConnections.get(peerId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections.set(peerId, pc);
    this.makingOffers.set(peerId, false);

    // Attach local audio if microphone is already on
    if (this.localAudioStream) {
      this.localAudioStream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, this.localAudioStream);
      });
    }

    // Attach local screen share if active
    if (this.localScreenStream) {
      this.localScreenStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localScreenStream);
      });
    }

    // ICE Candidate
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc-signal', {
          targetId: peerId,
          signal: { candidate: event.candidate }
        });
      }
    };

    // Perfect Negotiation: onnegotiationneeded
    pc.onnegotiationneeded = async () => {
      try {
        this.makingOffers.set(peerId, true);
        await pc.setLocalDescription();
        socket.emit('webrtc-signal', {
          targetId: peerId,
          signal: { sdp: pc.localDescription }
        });
      } catch (err) {
        console.warn('Negotiation error for peer', peerId, err.message);
      } finally {
        this.makingOffers.set(peerId, false);
      }
    };

    // Remote Track Handler
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      const isVideo = event.track.kind === 'video';

      if (isVideo) {
        if (this.onRemoteStream) {
          this.onRemoteStream(peerId, remoteStream, 'screenshare');
        }
      } else {
        // Voice Audio Track
        let audioEl = this.audioElements.get(peerId);
        if (!audioEl) {
          audioEl = document.createElement('audio');
          audioEl.autoplay = true;
          audioEl.playsInline = true;
          audioEl.style.display = 'none';
          document.body.appendChild(audioEl);
          this.audioElements.set(peerId, audioEl);
        }

        audioEl.srcObject = remoteStream;
        audioEl.muted = this.isDeafened;
        audioEl.play().catch(() => {});

        // Setup voice activity / speaking detection
        this.setupAudioAnalysis(peerId, remoteStream);

        if (this.onRemoteStream) {
          this.onRemoteStream(peerId, remoteStream, 'voice');
        }
      }
    };

    return pc;
  }

  setupAudioAnalysis(id, stream) {
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioCtx();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const source = this.audioContext.createMediaStreamSource(stream);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let wasSpeaking = false;

      const interval = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const isSpeaking = average > 18;

        if (isSpeaking !== wasSpeaking) {
          wasSpeaking = isSpeaking;
          if (this.onSpeakingChange) {
            this.onSpeakingChange(id, isSpeaking);
          }
        }
      }, 150);

      this.analysers.set(id, { analyser, interval });
    } catch (e) {
      console.warn('Audio analysis setup warning:', e.message);
    }
  }

  async startMicrophone() {
    try {
      this.localAudioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      // Add local audio tracks to all connections
      this.peerConnections.forEach((pc) => {
        this.localAudioStream.getAudioTracks().forEach((track) => {
          pc.addTrack(track, this.localAudioStream);
        });
      });

      // Analyze self speaking
      this.setupAudioAnalysis('self', this.localAudioStream);
      socket.emit('update-voice-state', { isMuted: false, isDeafened: this.isDeafened });
      return true;
    } catch (err) {
      console.warn('Microphone permission or hardware error:', err);
      return false;
    }
  }

  toggleMute(shouldMute) {
    this.isMuted = shouldMute;
    if (this.localAudioStream) {
      this.localAudioStream.getAudioTracks().forEach((track) => {
        track.enabled = !this.isMuted;
      });
    }
    socket.emit('update-voice-state', { isMuted: this.isMuted, isDeafened: this.isDeafened });
  }

  toggleDeafen(shouldDeafen) {
    this.isDeafened = shouldDeafen;
    this.audioElements.forEach((audioEl) => {
      audioEl.muted = this.isDeafened;
    });
    if (this.isDeafened && !this.isMuted) {
      this.toggleMute(true);
    }
    socket.emit('update-voice-state', { isMuted: this.isMuted, isDeafened: this.isDeafened });
  }

  async startScreenShare() {
    try {
      this.localScreenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always', frameRate: { ideal: 60, max: 60 } },
        audio: true
      });

      const videoTrack = this.localScreenStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.stopScreenShare();
        };
      }

      this.peerConnections.forEach((pc) => {
        this.localScreenStream.getTracks().forEach((track) => {
          pc.addTrack(track, this.localScreenStream);
        });
      });

      socket.emit('screen-share-status', { isSharing: true });
      return this.localScreenStream;
    } catch (err) {
      console.warn('Screen share canceled:', err);
      return null;
    }
  }

  stopScreenShare() {
    if (this.localScreenStream) {
      this.localScreenStream.getTracks().forEach((track) => track.stop());
      this.localScreenStream = null;
    }
    socket.emit('screen-share-status', { isSharing: false });
  }

  setPeerVolume(peerId, volume) {
    const audioEl = this.audioElements.get(peerId);
    if (audioEl) {
      audioEl.volume = Math.max(0, Math.min(1, volume));
    }
  }

  closePeerConnection(peerId) {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
    const audioEl = this.audioElements.get(peerId);
    if (audioEl) {
      audioEl.srcObject = null;
      if (audioEl.parentNode) audioEl.parentNode.removeChild(audioEl);
      this.audioElements.delete(peerId);
    }
    const analysis = this.analysers.get(peerId);
    if (analysis) {
      clearInterval(analysis.interval);
      this.analysers.delete(peerId);
    }
  }

  cleanup() {
    this.stopScreenShare();
    if (this.localAudioStream) {
      this.localAudioStream.getTracks().forEach((track) => track.stop());
      this.localAudioStream = null;
    }
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.audioElements.forEach((el) => {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
    this.audioElements.clear();
    this.analysers.forEach(({ interval }) => clearInterval(interval));
    this.analysers.clear();
  }
}

export const webrtc = new WebRTCManager();
