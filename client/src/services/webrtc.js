import { socket } from './socket';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

class WebRTCManager {
  constructor() {
    this.localAudioStream = null;
    this.localScreenStream = null;
    this.peerConnections = new Map(); // peerId -> RTCPeerConnection
    this.remoteStreams = new Map(); // peerId -> { stream, type }
    this.audioElements = new Map(); // peerId -> HTMLAudioElement
    this.onRemoteStream = null;
    this.onSpeakingChange = null;
    this.isMuted = false;
    this.isDeafened = false;
  }

  // Set callbacks
  setCallbacks({ onRemoteStream, onSpeakingChange }) {
    this.onRemoteStream = onRemoteStream;
    this.onSpeakingChange = onSpeakingChange;
  }

  // Initialize and listen to socket signaling events
  initSignaling() {
    socket.on('webrtc-all-peers', (peerIds) => {
      peerIds.forEach((peerId) => {
        this.createPeerConnection(peerId, true);
      });
    });

    socket.on('user-joined', (userData) => {
      // Incoming user, prepare connection
      this.createPeerConnection(userData.id, false);
    });

    socket.on('webrtc-signal', async ({ senderId, signal, streamType }) => {
      let pc = this.peerConnections.get(senderId);
      if (!pc) {
        pc = this.createPeerConnection(senderId, false);
      }

      try {
        if (signal.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          if (signal.sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('webrtc-signal', {
              targetId: senderId,
              signal: { sdp: pc.localDescription },
              streamType
            });
          }
        } else if (signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error('Error handling WebRTC signal:', err);
      }
    });

    socket.on('user-left', ({ userId }) => {
      this.closePeerConnection(userId);
    });
  }

  // Start microphone
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

      // Add local audio tracks to all existing peer connections
      this.peerConnections.forEach((pc) => {
        this.localAudioStream.getAudioTracks().forEach((track) => {
          pc.addTrack(track, this.localAudioStream);
        });
      });

      // Renegotiate with peers
      this.renegotiateAll();
      return true;
    } catch (err) {
      console.warn('Microphone permission denied or not available:', err);
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

  // Start Screen Share
  async startScreenShare() {
    try {
      this.localScreenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          frameRate: { ideal: 60, max: 60 }
        },
        audio: true
      });

      // When user clicks browser's native "Stop sharing" button
      const videoTrack = this.localScreenStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.stopScreenShare();
        };
      }

      // Add tracks to all peer connections
      this.peerConnections.forEach((pc) => {
        this.localScreenStream.getTracks().forEach((track) => {
          pc.addTrack(track, this.localScreenStream);
        });
      });

      this.renegotiateAll('screenshare');
      socket.emit('screen-share-status', { isSharing: true });
      return this.localScreenStream;
    } catch (err) {
      console.warn('Screen share canceled or failed:', err);
      return null;
    }
  }

  stopScreenShare() {
    if (this.localScreenStream) {
      this.localScreenStream.getTracks().forEach((track) => track.stop());
      this.localScreenStream = null;
    }
    socket.emit('screen-share-status', { isSharing: false });
    this.renegotiateAll();
  }

  // Create Peer Connection
  createPeerConnection(peerId, isInitiator = false) {
    if (this.peerConnections.has(peerId)) {
      return this.peerConnections.get(peerId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections.set(peerId, pc);

    // Add local audio tracks if we have mic open
    if (this.localAudioStream) {
      this.localAudioStream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, this.localAudioStream);
      });
    }

    // Add local screen tracks if active
    if (this.localScreenStream) {
      this.localScreenStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localScreenStream);
      });
    }

    // ICE candidate generation
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc-signal', {
          targetId: peerId,
          signal: { candidate: event.candidate }
        });
      }
    };

    // Remote track received
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      const isVideo = event.track.kind === 'video';

      if (isVideo) {
        // Screen share video stream from peer
        if (this.onRemoteStream) {
          this.onRemoteStream(peerId, remoteStream, 'screenshare');
        }
      } else {
        // Voice chat audio stream
        let audioEl = this.audioElements.get(peerId);
        if (!audioEl) {
          audioEl = new Audio();
          audioEl.autoplay = true;
          this.audioElements.set(peerId, audioEl);
        }
        audioEl.srcObject = remoteStream;
        audioEl.muted = this.isDeafened;
        audioEl.play().catch(() => {});

        if (this.onRemoteStream) {
          this.onRemoteStream(peerId, remoteStream, 'voice');
        }
      }
    };

    // If initiator, send offer
    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('webrtc-signal', {
            targetId: peerId,
            signal: { sdp: pc.localDescription }
          });
        } catch (err) {
          console.error('Error creating offer:', err);
        }
      };
    }

    return pc;
  }

  async renegotiateAll(streamType = 'general') {
    for (const [peerId, pc] of this.peerConnections.entries()) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc-signal', {
          targetId: peerId,
          signal: { sdp: pc.localDescription },
          streamType
        });
      } catch (e) {
        console.error('Renegotiation failed for', peerId, e);
      }
    }
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
      this.audioElements.delete(peerId);
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
    this.audioElements.clear();
  }
}

export const webrtc = new WebRTCManager();
