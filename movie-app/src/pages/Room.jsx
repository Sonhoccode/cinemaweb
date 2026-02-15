import React, { useEffect, useState, useRef, useContext } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { api } from '../services/api'; 
import VideoPlayer from '../components/player/VideoPlayer';
import EpisodeList from '../components/player/EpisodeList'; 
import AuthContext from '../context/AuthContext';
import { SHOW_ROOM_FEATURES } from '../config/features';
import { useI18n } from '../i18n';

let BACKEND_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// If running on LAN (e.g., 192.168.x.x) and backend is localhost, try to connect to same IP
if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && BACKEND_URL.includes('localhost')) {
    BACKEND_URL = `${window.location.protocol}//${window.location.hostname}:5000`;
}

function Room() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const initialMovieUrl = searchParams.get('url') || null; 
  const hideRoomButtons = !SHOW_ROOM_FEATURES;

  const [socket, setSocket] = useState(null);
  
  const { user, isLoading } = useContext(AuthContext); 

  const [username, setUsername] = useState(() => {
      try {
          const storedUser = JSON.parse(localStorage.getItem('user'));
          if (storedUser?.username) return storedUser.username;
      } catch {}
      try {
          const savedRoom = JSON.parse(localStorage.getItem('activeRoom'));
          if (savedRoom?.username) return savedRoom.username;
      } catch {}
      return '';
  });

  // Sync username when AuthContext loads
  useEffect(() => {
      if (user?.username) setUsername(user.username);
  }, [user]);

  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [roomSize, setRoomSize] = useState(0);
  const [videoUrl, setVideoUrl] = useState(initialMovieUrl || null); 
  const [movieSlug, setMovieSlug] = useState(searchParams.get('slug') || null);
  const [movie, setMovie] = useState(null);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0);
  const [serverIndex, setServerIndex] = useState(0);
  const [initialTime, setInitialTime] = useState(0);
  
  const [inputUrl, setInputUrl] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [members, setMembers] = useState([]);
  const [showNameInput, setShowNameInput] = useState(false);
  const [showMovieSelector, setShowMovieSelector] = useState(true);

  const playerRef = useRef(null);
  const isHostRef = useRef(false);
  const videoUrlRef = useRef(initialMovieUrl || null);
  const movieSlugRef = useRef(searchParams.get('slug') || null);
  const pendingSyncRef = useRef(false);
  const isPlayerReadyRef = useRef(false);
  const suppressUntilRef = useRef({ play: 0, pause: 0, seek: 0 });
  const pendingHostPauseRef = useRef(false);
  
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const isUserAtBottom = useRef(true);

  const handleChatScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    // Considered "at bottom" if within 100px from the bottom
    isUserAtBottom.current = scrollHeight - scrollTop - clientHeight < 100;
  };

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); 

  useEffect(() => {
    // Only auto-scroll if user was already at bottom OR they sent the message
    const lastMessage = messages[messages.length - 1];
    if (isUserAtBottom.current || (lastMessage && lastMessage.user === username)) {
        scrollToBottom();
    }
  }, [messages, isChatVisible, activeTab]);

  // Keep refs in sync to avoid stale socket listener closures
  useEffect(() => {
      isHostRef.current = isHost;
  }, [isHost]);

  useEffect(() => {
      videoUrlRef.current = videoUrl;
  }, [videoUrl]);

  useEffect(() => {
      movieSlugRef.current = movieSlug;
  }, [movieSlug]);

  const handlePlayerReady = () => {
      isPlayerReadyRef.current = true;
      if (!socket || !roomId) return;
      if (pendingHostPauseRef.current && isHostRef.current) {
          pendingHostPauseRef.current = false;
          const pausedNow = playerRef.current?.isPaused ? playerRef.current.isPaused() : false;
          if (!pausedNow) {
              suppressFor('pause');
              playerRef.current.pause();
          }
          const currentTime = playerRef.current?.getCurrentTime ? playerRef.current.getCurrentTime() : null;
          const payload = { type: 'pause' };
          if (Number.isFinite(currentTime)) payload.time = currentTime;
          if (videoUrlRef.current) payload.url = videoUrlRef.current;
          if (movieSlugRef.current) payload.slug = movieSlugRef.current;
          socket.emit('player-state', roomId, payload);
      }
      if (pendingSyncRef.current) {
          // Ask for a fresh state now that player is ready
          if (!isHostRef.current) {
              socket.emit('request-sync', roomId);
          }
          pendingSyncRef.current = false;
      }
  };

  const attemptPlayWithNotice = () => {
      const result = playerRef.current?.play?.();
      if (result && result.then) {
          result.then((ok) => {
              if (ok === false) {
                  addSystemMessage(t('room.blockedAutoplay'));
              }
          });
      } else if (result === false) {
          addSystemMessage(t('room.blockedAutoplay'));
      }
  };

  const suppressFor = (type, ms = 700) => {
      if (!type) return;
      suppressUntilRef.current[type] = Date.now() + ms;
  };

  // Initialize Socket and Auto-Join
  useEffect(() => {
    const newSocket = io(BACKEND_URL, {
        reconnectionAttempts: 5,
        timeout: 10000 
    });
    setSocket(newSocket);

    newSocket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
        if (!joined) setShowNameInput(true);
    });

    newSocket.on('connect', () => {
      console.log('Connected to socket', newSocket.id);
      
      const savedRoom = JSON.parse(localStorage.getItem('activeRoom'));
      const savedRoomId = savedRoom?.roomId;
      const savedName = savedRoom?.username;
      const savedVideoUrl = savedRoom?.videoUrl;

      if (savedRoomId === roomId && savedName) {
          setUsername(savedName);
          const savedSlug = searchParams.get('slug') || null;
          const initialUrl = searchParams.get('url') || savedVideoUrl || null;
          const uid = user ? (user.id || user._id) : null;
          newSocket.emit('join-room', roomId, { username: savedName, movieSlug: savedSlug, userId: uid, videoUrl: initialUrl });
          setJoined(true);
          newSocket.emit('request-sync', roomId);
      } else if (user && user.username) {
          setUsername(user.username);
          const savedSlug = searchParams.get('slug') || null;
          const initialUrl = searchParams.get('url') || null;
          const uid = user.id || user._id;
          newSocket.emit('join-room', roomId, { username: user.username, movieSlug: savedSlug, userId: uid, videoUrl: initialUrl });
          setJoined(true);
          newSocket.emit('request-sync', roomId);
          setShowNameInput(false);
      } else if (!isLoading) {
          setShowNameInput(true);
      }
    });

    newSocket.on('user-joined', (user) => {
      addSystemMessage(t('room.userJoined', { user: user.username }));
    });

    newSocket.on('user-left', (user) => {
      addSystemMessage(t('room.userLeft', { user: user.username }));
    });

    newSocket.on('room-joined', ({ isHost: hostStatus, videoUrl: roomVideoUrl, movieSlug: roomSlug, currentTime }) => {
      setIsHost(hostStatus);
      if (roomVideoUrl) setVideoUrl(roomVideoUrl);
      if (roomSlug) setMovieSlug(roomSlug);
      
      let startAt = currentTime || 0;

      // Host Logic: Prefer Local Storage if available and valid
      if (hostStatus) {
           const savedProgress = localStorage.getItem(`room_progress_${roomId}`);
           if (savedProgress) {
               const localTime = parseFloat(savedProgress);
               if (localTime > startAt) {
                   console.log(`Host Recovery: Restoring local time ${localTime}s`);
                   startAt = localTime;
               }
           }
      }

      if (startAt > 0) {
          setInitialTime(startAt);
      }
      
      newSocket.emit('request-sync', roomId);
    });

    newSocket.on('member-list', (memberList) => {
      setMembers(memberList);
    });

    newSocket.on('promoted-to-host', () => {
      setIsHost(true);
      addSystemMessage(t('room.promoted'));
    });

    newSocket.on('kicked-from-room', () => {
      localStorage.removeItem('activeRoom');
      alert(t('room.kicked'));
      window.location.href = '/';
    });

    newSocket.on('room-size', (size) => {
      setRoomSize(size);
    });

    newSocket.on('chat-message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    newSocket.on('sync-pause', () => {
        if (!playerRef.current || !isPlayerReadyRef.current) {
            pendingHostPauseRef.current = true;
            return;
        }
        if (!isHostRef.current) return;

        const pausedNow = playerRef.current.isPaused ? playerRef.current.isPaused() : false;
        if (!pausedNow) {
            suppressFor('pause');
            playerRef.current.pause();
        }
        const currentTime = playerRef.current.getCurrentTime ? playerRef.current.getCurrentTime() : null;
        const payload = { type: 'pause' };
        if (Number.isFinite(currentTime)) payload.time = currentTime;
        if (videoUrlRef.current) payload.url = videoUrlRef.current;
        if (movieSlugRef.current) payload.slug = movieSlugRef.current;
        newSocket.emit('player-state', roomId, payload);
    });

    // Sync Events
    newSocket.on('player-state', (state) => {
        if (!playerRef.current || !isPlayerReadyRef.current) {
            console.warn('Sync State: VideoPlayer not ready');
            // If video URL arrives before player mounts, apply it
            if (state.type === 'url' && state.url) {
                setVideoUrl(state.url);
                if (state.slug) setMovieSlug(state.slug);
                if (state.time !== undefined) {
                    setInitialTime(state.time);
                }
            } else if (state.time !== undefined) {
                // Preserve time so we can resume when ready
                setInitialTime(state.time);
            }
            pendingSyncRef.current = true;
            return;
        }
        
        console.log('Sync State Received:', state);

        if (state.type === 'play') {
            // Seek first if needed
            if (Math.abs(playerRef.current.getCurrentTime() - state.time) > 0.5) {
                console.log('Sync State: Seeking, then Playing', state.time);
                suppressFor('seek');
                playerRef.current.seek(state.time);
            }
            // Then play
            suppressFor('play');
            attemptPlayWithNotice();
            if (state.user) addSystemMessage(t('room.resumed', { user: state.user }));
        } else if (state.type === 'pause') {
            console.log('Sync State: Pausing');
            const pausedNow = playerRef.current.isPaused ? playerRef.current.isPaused() : false;
            if (!pausedNow) {
                suppressFor('pause');
                playerRef.current.pause();
            } else {
                playerRef.current.pause();
            }
            if (Number.isFinite(state.time)) {
                const currentTime = playerRef.current.getCurrentTime();
                if (Math.abs(currentTime - state.time) > 0.5) {
                    suppressFor('seek');
                    playerRef.current.seek(state.time);
                }
            }
            if (state.user) addSystemMessage(t('room.paused', { user: state.user }));
        } else if (state.type === 'seek') {
            console.log('Sync State: Seeking to', state.time);
            if (Number.isFinite(state.time)) {
                suppressFor('seek');
                playerRef.current.seek(state.time);
            }
            if (state.user) {
                const minutes = Math.floor(state.time / 60);
                const seconds = Math.floor(state.time % 60);
                const timeStr = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
                addSystemMessage(t('room.seeked', { user: state.user, time: timeStr }));
            }
        } else if (state.type === 'url') {
            console.log('Sync State: Changing URL', state.url);
            setVideoUrl(state.url);
            if (state.slug) setMovieSlug(state.slug);
            // Ensure new player instance gets the correct start time (usually 0)
            if (state.time !== undefined) {
                 setInitialTime(state.time); 
            }
            if (state.user) addSystemMessage(t('room.changedVideo', { user: state.user }));
        } else if (state.type === 'timeupdate') {
             // 1. Host is Playing. If I am Paused, I MUST Play (Self-Healing)
             const isPaused = playerRef.current.isPaused ? playerRef.current.isPaused() : false;
             const current = playerRef.current.getCurrentTime();
             const drift = Math.abs(current - state.time);
             
             let actionTaken = false;

             if (isPaused) {
                 console.warn('Sync Help: Received timeupdate but paused. Resuming playback...');
                 // Attempt to play
                 suppressFor('play');
                 attemptPlayWithNotice();
                 actionTaken = true;
             }

             // 2. Drift Correction
             if (drift > 1.5) {
                 console.warn(`Sync Help: Drift detected (${drift.toFixed(2)}s). Correcting...`);
                 suppressFor('seek');
                 playerRef.current.currentTime = state.time; // Direct set without seek event if possible, but plyr usually fires seeked
                 actionTaken = true;
             }
             
             if (actionTaken) {
                 // Suppress only the next local events triggered by these actions
             }
             
             return; // Done processing timeupdate
        }
    });

    newSocket.on('get-current-state', (requesterId) => {
        if (!playerRef.current) return;

        const currentState = {
            type: playerRef.current.isPlaying() ? 'play' : 'pause',
            time: playerRef.current.getCurrentTime(),
            url: videoUrlRef.current,
            slug: movieSlugRef.current
        };
        newSocket.emit('sync-response', requesterId, currentState);
    });

    newSocket.on('sync-response', (state) => {
        if (state.url && state.url !== videoUrlRef.current) {
            console.log('Sync Response: New URL', state.url);
            setVideoUrl(state.url);
            if (state.slug) setMovieSlug(state.slug);
            // CRITICAL FIX: If URL changes, we MUST set initialTime for the NEW player instance
            if (state.time > 0) {
                console.log('Sync Response: Setting initialTime for new player', state.time);
                setInitialTime(state.time); 
            }
        } else if (playerRef.current) {
            // Same URL, so we can seek immediately
            if (state.type === 'play') {
                suppressFor('play');
                attemptPlayWithNotice();
            } else {
                const pausedNow = playerRef.current.isPaused ? playerRef.current.isPaused() : false;
                if (!pausedNow) {
                    suppressFor('pause');
                    playerRef.current.pause();
                } else {
                    playerRef.current.pause();
                }
            }
            
            if (state.time > 0) {
                 // Only seek if gap is significant
                if (Math.abs(playerRef.current.getCurrentTime() - state.time) > 0.5) {
                    suppressFor('seek');
                    playerRef.current.seek(state.time);
                }
            }
        }
    });

    return () => newSocket.close();
  }, [roomId, user, isLoading, searchParams]); 

  useEffect(() => {
      // Reset readiness when switching video source
      isPlayerReadyRef.current = false;
  }, [videoUrl]);

  // Handle URL Params Update (Host Only)
  useEffect(() => {
    const urlParam = searchParams.get('url');
    const slugParam = searchParams.get('slug');
    
    if (urlParam && urlParam !== videoUrl && isHost && socket) {
        setVideoUrl(urlParam);
        if (slugParam) setMovieSlug(slugParam);
        
        socket.emit('player-state', roomId, { 
            type: 'url', 
            url: urlParam, 
            slug: slugParam || movieSlug,
            time: 0 
        });
    }
  }, [searchParams, isHost, socket, videoUrl, movieSlug]); 

  useEffect(() => {
      const fetchMovie = async () => {
          if (!movieSlug) return;
          try {
              const data = await api.getMovieDetail(movieSlug);
              setMovie(data);
              
              const servers = data.episodes || [];
              let foundServerIndex = 0;
              if (videoUrl && servers.length > 0) {
                  const idx = servers.findIndex(s => (s.server_data || []).some(ep => ep.link_m3u8 === videoUrl));
                  if (idx !== -1) foundServerIndex = idx;
              }
              setServerIndex(foundServerIndex);

              if (videoUrl && servers[foundServerIndex]?.server_data) {
                  const index = servers[foundServerIndex].server_data.findIndex(ep => ep.link_m3u8 === videoUrl);
                  if (index !== -1) setCurrentEpisodeIndex(index);
              }
          } catch (err) {
              console.error("Failed to load movie", err);
          }
      };
      fetchMovie();
  }, [movieSlug, videoUrl]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) {
        setIsChatVisible(false); 
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const addSystemMessage = (text) => {
      setMessages(prev => [...prev, { type: 'system', text, id: Date.now() }]);
  };

  useEffect(() => {
     if (joined && roomId && username) {
         localStorage.setItem('activeRoom', JSON.stringify({
             roomId,
             username,
             videoUrl: videoUrl || null, 
             joinedAt: Date.now()
         }));
     }
  }, [joined, roomId, username, videoUrl]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (username.trim()) {
      const slug = searchParams.get('slug') || null;
      const initialUrl = searchParams.get('url') || null;
      const uid = user ? (user.id || user._id) : null;
      socket.emit('join-room', roomId, { username, movieSlug: slug, userId: uid, videoUrl: initialUrl });
      setJoined(true);
      socket.emit('request-sync', roomId);
    }
  };

  const handleSendMessage = (e) => {
      e.preventDefault();
      if (!newMessage.trim()) return;
      
      const msg = {
          type: 'user',
          user: username,
          text: newMessage,
          id: Date.now()
      };
      
      setMessages(prev => [...prev, msg]);
      socket.emit('chat-message', roomId, msg);
      setNewMessage('');
  };

  const lastEmitTime = useRef(0);

  const handlePlayerStateChange = (type, time) => {
      // Prevent echo from programmatic actions only
      if (type !== 'timeupdate') {
          const suppressUntil = suppressUntilRef.current[type] || 0;
          if (Date.now() < suppressUntil) {
              return;
          }
      }
      
      // 1. Save Progress Locally (For crash recovery)
      if (type === 'timeupdate') {
          localStorage.setItem(`room_progress_${roomId}`, time);
      }

      // 2. Host Logic for Time Updates (Source of Truth)
      if (type === 'timeupdate') {
          if (!isHost) return; // Only host sends time updates
          
          const now = Date.now();
          if (now - lastEmitTime.current < 2000) return;
          lastEmitTime.current = now;
      }

      // 3. Emit Event (Allowed for Everyone for Play/Pause/Seek)
      const payload = {
          type,
          time,
          user: username // Include username for system message
      };
      if (videoUrlRef.current) payload.url = videoUrlRef.current;
      if (movieSlugRef.current) payload.slug = movieSlugRef.current;
      socket.emit('player-state', roomId, payload);
  };

  const changeUrl = () => {
    if (inputUrl && isHost) {
        setVideoUrl(inputUrl);
        setInitialTime(0); 
        socket.emit('player-state', roomId, { type: 'url', url: inputUrl, time: 0, user: username });
        setInputUrl('');
        // Sender message
        addSystemMessage(t('room.youChangedVideo', { url: inputUrl }));
    }
  };

  const handleMovieSelect = (url) => {
    if (isHost) {
      setVideoUrl(url);
      setInitialTime(0); 
      socket.emit('player-state', roomId, { type: 'url', url, time: 0, user: username });
      setShowMovieSelector(false);
    }
  };

  const kickMember = (socketId) => {
    if (isHost) {
      socket.emit('kick-member', roomId, socketId);
    }
  };

  if (showNameInput && !joined) {
      return (
          <div className="min-h-screen pt-24 pb-12 flex items-center justify-center container">
              <div className="bg-primary-lighter p-8 rounded-2xl shadow-2xl max-w-md w-full border border-white/10">
                  <h1 className="text-3xl font-bold text-center text-white mb-2">{t('room.title')}</h1>
                  <p className="text-gray-400 text-center mb-8">{t('room.roomId', { roomId: '' })}<span className="text-accent-cyan">{roomId}</span></p>
                  
                  <form onSubmit={handleJoin} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-300 mb-1">{t('room.displayName')}</label>
                          <input 
                              type="text" 
                              className="w-full bg-black/30 border border-gray-600 rounded-lg p-3 text-white focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan outline-none"
                              placeholder={t('room.displayNamePlaceholder')}
                              value={username}
                              onChange={e => setUsername(e.target.value)}
                              required
                          />
                      </div>
                      <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-105">
                          {t('room.join')}
                      </button>
                  </form>
              </div>
          </div>
      );
  } else if (!joined) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-black">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
      );
  }

  return (
    <div className={`min-h-screen flex flex-col bg-gray-950 pt-20 ${hideRoomButtons ? 'room-hide-buttons' : ''}`}>
      {hideRoomButtons && (
        <style>{`
          .room-hide-buttons button { display: none !important; }
          .room-hide-buttons .plyr button { display: inline-flex !important; }
        `}</style>
      )}
        <div className="flex flex-col lg:flex-row">
            {/* Main Content: Video */}
            <div className="flex-1 bg-black flex flex-col relative">
                {/* Header Overlay */}
                <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                    <div className="pointer-events-auto">
                        <h2 className="text-white font-bold text-lg">{t('room.roomLabel', { roomId })}</h2>
                        <span className="text-green-400 text-sm flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            {t('room.watchingCount', { count: roomSize })}
                        </span>
                    </div>
                </div>

                {/* Video Player */}
                <div className="w-full bg-black py-4 flex justify-center min-h-[50vh]">
                    {videoUrl ? (
                         <div className="w-full max-w-6xl aspect-video mx-auto">
                            <VideoPlayer 
                                key={videoUrl} // Force remount on URL change
                                ref={playerRef}
                                src={videoUrl}
                                initialTime={initialTime}
                                onStateChange={handlePlayerStateChange}
                                onReady={handlePlayerReady}
                                syncAutoPlay={isHost}
                            />
                         </div>
                    ) : (
        <div className="bg-gray-900 rounded-xl aspect-video flex items-center justify-center flex-col gap-4 text-center p-8 border border-gray-800 shadow-2xl">
           {/* Lobby UI */}
           <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <span className="text-4xl">🎬</span>
           </div>
           <h2 className="text-2xl font-bold text-white">{t('room.noMovieTitle')}</h2>
           <p className="text-gray-400 max-w-md">
             {isHost ? t('room.noMovieHost') : t('room.noMovieGuest')}
           </p>
           {isHost && (
             <div className="w-full max-w-md">
                <input 
                  type="text" 
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder={t('room.pasteLink')}
                  className="w-full bg-gray-800 border-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none mb-3"
                />
                <button 
                  onClick={() => {
                    if (inputUrl) {
                        const newSlug = inputUrl.includes('slug=') ? inputUrl.split('slug=')[1] : null; // Basic parse attempt
                        setVideoUrl(inputUrl);
                        socket.emit('player-state', roomId, { type: 'url', url: inputUrl, slug: newSlug, time: 0 });
                    }
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-colors shadow-lg"
                >
                  {t('room.playNow')}
                </button>
             </div>
           )}
        </div>
      )}
    </div>
            </div>

            {/* Floating Chat Toggle Button - Only during fullscreen on mobile */}
            {isFullscreen && (
                <button
                    onClick={() => setIsChatVisible(!isChatVisible)}
                    className="fixed bottom-20 right-4 z-50 p-3 bg-blue-600/90 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all lg:hidden"
                    aria-label={t('room.toggleChat')}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {messages.filter(m => m.type === 'user').length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {messages.filter(m => m.type === 'user').length}
                        </span>
                    )}
                </button>
            )}

            {/* Chat Overlay Popup - Only during fullscreen on mobile */}
            {isFullscreen && isChatVisible && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => setIsChatVisible(false)}
                    ></div>
                    
                    {/* Chat Panel */}
                    <div className="absolute bottom-0 right-0 left-0 bg-primary-lighter border-t border-white/10 flex flex-col max-h-[700px] rounded-t-2xl">
                        <div className="p-3 border-b border-white/5 bg-gray-900/50 flex justify-between items-center">
                            <h3 className="font-bold text-white text-sm">{t('room.messages')}</h3>
                            <button 
                                onClick={() => setIsChatVisible(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                            {messages.map(msg => (
                                <div key={msg.id} className={`flex flex-col ${msg.type === 'system' ? 'items-center' : msg.user === username ? 'items-end' : 'items-start'}`}>
                                    {msg.type === 'system' ? (
                                        <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-full">{msg.text}</span>
                                    ) : (
                                        <>
                                            <span className={`text-xs text-gray-400 mb-1 ${msg.user === username ? 'hidden' : 'block'}`}>{msg.user}</span>
                                            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${
                                                msg.user === username 
                                                ? 'bg-blue-600 text-white rounded-tr-none' 
                                                : 'bg-white/10 text-gray-200 rounded-tl-none'
                                            }`}>
                                                {msg.text}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSendMessage} className="p-2 border-t border-white/5 bg-gray-900/50">
                            <div className="relative">
                                <input 
                                    type="text" 
                                    className="w-full bg-black/20 border border-white/10 rounded-full py-2 pl-4 pr-10 text-white focus:border-accent-cyan outline-none text-xs placeholder-gray-500"
                                    placeholder={t('room.messagePlaceholder')}
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                />
                                <button 
                                    type="submit" 
                                    className="absolute right-1 top-1 p-1.5 bg-accent-cyan/10 hover:bg-accent-cyan/20 text-accent-cyan rounded-full transition-colors"
                                    disabled={!newMessage.trim()}
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Sidebar: Chat & Members - Hidden on mobile during fullscreen */} 
            <div className={`w-full mr-16.   lg:w-96 bg-primary-lighter border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col h-96 lg:h-[700px] lg:max-h-[80vh] ${isFullscreen ? 'hidden lg:flex' : 'flex'}`}>
                {/* Tabs */}
                <div className="flex border-b border-white/5 bg-gray-900/50 relative z-10">
                    <button 
                        onClick={() => setActiveTab('chat')}
                        className={`flex-1 py-3 text-sm font-bold transition-colors relative cursor-pointer ${activeTab === 'chat' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        {t('room.messages')}
                        {activeTab === 'chat' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>}
                    </button>
                    <button 
                        onClick={() => setActiveTab('members')}
                        className={`flex-1 py-3 text-sm font-bold transition-colors relative cursor-pointer ${activeTab === 'members' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        {t('room.members', { count: members.length })}
                        {activeTab === 'members' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"></div>}
                    </button>
                </div>
                
                {activeTab === 'chat' ? (
                    <>
                        <div 
                            ref={chatContainerRef}
                            onScroll={handleChatScroll}
                            className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"
                        >
                            {messages.map(msg => (
                                <div key={msg.id} className={`flex flex-col ${msg.type === 'system' ? 'items-center' : msg.user === username ? 'items-end' : 'items-start'}`}>
                                    {msg.type === 'system' ? (
                                        <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-full">{msg.text}</span>
                                    ) : (
                                        <>
                                            <span className={`text-xs text-gray-400 mb-1 ${msg.user === username ? 'hidden' : 'block'}`}>{msg.user}</span>
                                            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                                                msg.user === username 
                                                ? 'bg-blue-600 text-white rounded-tr-none' 
                                                : 'bg-white/10 text-gray-200 rounded-tl-none'
                                            }`}>
                                                {msg.text}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSendMessage} className="p-3 border-t border-white/5 bg-gray-900/50">
                            <div className="relative">
                                <input 
                                    type="text" 
                                    className="w-full bg-black/20 border border-white/10 rounded-full py-2 pl-4 pr-10 text-white focus:border-accent-cyan outline-none text-sm placeholder-gray-500"
                                    placeholder={t('room.messagePlaceholder')}
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                />
                                <button 
                                    type="submit" 
                                    className="absolute right-1 top-1 p-1.5 bg-accent-cyan/10 hover:bg-accent-cyan/20 text-accent-cyan rounded-full transition-colors"
                                    disabled={!newMessage.trim()}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <div className="space-y-4">
                            {members.map(member => (
                                <div key={member.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${member.isHost ? 'bg-yellow-600' : 'bg-gray-600'}`}>
                                            {member.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className={`text-sm font-medium ${member.username === username ? 'text-blue-400' : 'text-gray-200'}`}>
                                                {member.username} {member.username === username && t('room.you')}
                                            </p>
                                            {member.isHost && <p className="text-xs text-yellow-500 flex items-center gap-1">👑 {t('room.host')}</p>}
                                        </div>
                                    </div>
                                    
                                    {/* Kick Button: Show if I am host, and target is NOT me */}
                                    {isHost && member.username !== username && (
                                        <button 
                                            onClick={() => kickMember(member.id)}
                                            className="text-gray-500 hover:text-red-500 p-2 transition-colors"
                                            title={t('room.kick')}
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" /></svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    
      {/* Moved Info Section */}
      {movie && (
        <div className="w-full max-w-[1400px] mx-auto mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn p-4 pb-12">
            {/* Movie Info */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-gray-900/80 backdrop-blur-sm rounded-xl p-6 border border-gray-800 shadow-xl">
                    <div className="flex gap-4 mb-4">
                        <img 
                            src={api.getImageUrl(movie.thumb_url)} 
                            alt={movie.name} 
                            className="w-24 h-36 object-cover rounded-lg shadow-md"
                        />
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">{movie.name}</h2>
                            <p className="text-gray-400 text-sm">{movie.origin_name}</p>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded border border-yellow-500/30">
                                    {movie.year}
                                </span>
                                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded border border-purple-500/30">
                                    {movie.quality}
                                </span>
                            </div>
                        </div>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed line-clamp-4 hover:line-clamp-none transition-all duration-300">
                        {movie.content?.replace(/<[^>]*>/g, '')}
                    </p>
                </div>
            </div>

            {/* Episode List */}
            <div className="lg:col-span-2">
                 <div className="bg-gray-900/80 backdrop-blur-sm rounded-xl p-6 border border-gray-800 shadow-xl h-full">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                        {t('movie.episodeList')}
                    </h3>
                    
                    <EpisodeList 
                        episodes={movie.episodes?.[serverIndex]?.server_data || []}
                        currentEpisode={currentEpisodeIndex}
                        onEpisodeSelect={(index) => {
                            const episodes = movie.episodes?.[serverIndex]?.server_data || [];
                            const episode = episodes[index];
                            
                            // Only host can change episode
                            if (isHost) {
                                const newUrl = episode.link_m3u8;
                                setVideoUrl(newUrl);
                                setCurrentEpisodeIndex(index);
                                setInitialTime(0); // Reset initial time
                                socket.emit('player-state', roomId, { 
                                    type: 'url', 
                                    url: newUrl, 
                                    slug: movieSlug, // Keep same slug
                                    time: 0 
                                });
                                addSystemMessage(t('room.hostChangedEpisode', { episode: episode.name }));
                            } else {
                                alert(t('room.hostOnlySwitch'));
                            }
                        }}
                    />
                 </div>
            </div>
        </div>
      )}

    </div>
  );
}

export default Room;
