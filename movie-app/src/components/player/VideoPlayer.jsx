import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import { createPortal } from 'react-dom';
import Hls from 'hls.js';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';
import { useI18n } from '../../i18n';

const VideoPlayer = forwardRef(({ src, onStateChange, onReady, syncAutoPlay = true, initialTime = 0 }, ref) => {
  const { t } = useI18n();
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  
  // Use ref for onStateChange to avoid stale closures in listeners
  const onStateChangeRef = useRef(onStateChange);
  useEffect(() => {
      onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  const onReadyRef = useRef(onReady);
  useEffect(() => {
      onReadyRef.current = onReady;
  }, [onReady]);

  const [showSettings, setShowSettings] = React.useState(false);
  const [seekTime, setSeekTime] = React.useState(() => parseInt(localStorage.getItem('player_seek_time') || '10'));
  const [autoPlay, setAutoPlay] = React.useState(() => localStorage.getItem('player_auto_play') === 'true');
  const [plyrContainer, setPlyrContainer] = useState(null);

  useImperativeHandle(ref, () => ({
    play: async () => {
        console.log('VideoPlayer: Imperative PLAY called');
        const player = playerRef.current;
        if (!player) return false;
        try {
            const playPromise = player.play();
            if (playPromise && playPromise.then) await playPromise;
            return true;
        } catch (error) {
            // Retry muted to bypass autoplay restrictions
            try {
                player.muted = true;
                const retryPromise = player.play();
                if (retryPromise && retryPromise.then) await retryPromise;
                return true;
            } catch (retryError) {
                console.error('VideoPlayer: Play blocked', retryError);
                return false;
            }
        }
    },
    pause: () => {
        console.log('VideoPlayer: Imperative PAUSE called');
        playerRef.current?.pause();
    },
    seek: (time) => {
        if (playerRef.current) {
            console.log('VideoPlayer: Imperative SEEK called', time);
            playerRef.current.currentTime = time;
        }
    },
    getCurrentTime: () => playerRef.current?.currentTime,
    getDuration: () => playerRef.current?.duration,
    isPlaying: () => playerRef.current?.playing,
    isPaused: () => playerRef.current?.paused,
  }));

  // ... (seekTime / autoPlay handlers) ...

  const handleSeekTimeChange = (time) => {
    setSeekTime(time);
    localStorage.setItem('player_seek_time', time);
    if (playerRef.current) {
        playerRef.current.config.seekTime = time;
    }
  };

  const handleAutoPlayChange = () => {
      const newValue = !autoPlay;
      setAutoPlay(newValue);
      localStorage.setItem('player_auto_play', newValue);
  };

  // Sync initialTime when it changes (if provided later)
  useEffect(() => {
      if (initialTime > 0 && playerRef.current) {
          // Only seek if we are at the beginning (to avoid overriding user seeking)
          // or if the difference is significant (indicating a restore)
          const current = playerRef.current.currentTime;
          if (current < 5 || Math.abs(current - initialTime) > 1) {
             console.log(`VideoPlayer: Seeking to initialTime ${initialTime}`);
             playerRef.current.currentTime = initialTime;
             if (syncAutoPlay) {
                 try { playerRef.current.play(); } catch(e) {}
             }
          }
      }
  }, [initialTime, syncAutoPlay]);

  useEffect(() => {
    if (!src || !videoRef.current) return;
     // ... (rest of src effect)

    const video = videoRef.current;
    
    // Modern browsers (Safari) natively support HLS
    const isSafari = video.canPlayType('application/vnd.apple.mpegurl');
    
    if (Hls.isSupported()) {
      const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
         const availableQualities = hls.levels.map((l) => l.height);
         // Add 0 for 'Auto'
         availableQualities.unshift(0);

         // Initialize Plyr only after HLS is ready or manifest parsed
         if (!playerRef.current) {
            const player = new Plyr(video, {
                seekTime: seekTime, // Use state
                controls: [
                    'play-large', 'restart', 'rewind', 'play', 'fast-forward', 
                    'progress', 'current-time', 'duration', 'mute', 'volume', 
                    'captions', 'settings', 'fullscreen'
                ],
                settings: ['quality', 'speed'], // Remove 'loop' to simplify
                speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
                quality: {
                    default: 0,
                    options: availableQualities,
                    forced: true,
                    onChange: (e) => updateQuality(e),
                },
                i18n: {
                    qualityLabel: { 0: 'Auto' },
                },
                keyboard: { focused: true, global: true },
                autoplay: syncAutoPlay,
                muted: true, // Mute by default to allow autoplay behavior
                clickToPlay: false, // Handled manually by wrapper
                hideControls: true, 
                resetOnEnd: true,
            });
            
            playerRef.current = player;
            
            player.once('ready', () => {
                if (initialTime > 0) {
                    player.currentTime = initialTime;
                    console.log('Restored time:', initialTime);
                }
                onReadyRef.current?.();
            });

            // Attach Event Listeners for Sync
            player.on('play', () => onStateChangeRef.current?.('play', player.currentTime));
            player.on('pause', () => onStateChangeRef.current?.('pause', player.currentTime));
            player.on('seeked', () => onStateChangeRef.current?.('seek', player.currentTime));
            
            // Time Update for LocalStorage (Throttled if needed, but Plyr is okay)
            player.on('timeupdate', () => onStateChangeRef.current?.('timeupdate', player.currentTime));
            
            playerRef.current.config.seekTime = seekTime;
            
            // Save container reference for Portal
            setPlyrContainer(player.elements.container);
         }
      });
      
      const updateQuality = (newQuality) => {
        if (newQuality === 0) {
            hls.currentLevel = -1; // Enable AUTO
        } else {
            hls.levels.forEach((level, levelIndex) => {
                if (level.height === newQuality) {
                    hls.currentLevel = levelIndex;
                }
            });
        }
      };

      return () => {
        if (hls) hls.destroy();
        if (playerRef.current) playerRef.current.destroy();
        playerRef.current = null;
      };
    } else if (isSafari) {
       video.src = src;
       const player = new Plyr(video, {
            controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
            seekTime: seekTime,
            seekTime: seekTime,
            autoplay: syncAutoPlay,
            muted: true, // Critical for mobile autoplay
            keyboard: { focused: true, global: true },
            clickToPlay: false,
       });
       playerRef.current = player;

       player.once('ready', () => {
           if (initialTime > 0) {
               player.currentTime = initialTime;
           }
           onReadyRef.current?.();
       });

       if (onStateChange) {
            player.on('play', () => onStateChangeRef.current?.('play', player.currentTime));
            player.on('pause', () => onStateChangeRef.current?.('pause', player.currentTime));
            player.on('seeked', () => onStateChangeRef.current?.('seek', player.currentTime));
       }
       
       setPlyrContainer(player.elements.container);

       return () => {
           if (playerRef.current) playerRef.current.destroy();
       }
    }
  }, [src]); // Re-run if src changes, seekTime change handled separately

  // Allow updating seekTime config dynamically without destroying player?
  // plyr.config is not always reactive. We might need to rely on the overlay being the source of truth for next time.
  // But let's try to update the instance config if possible.
  useEffect(() => {
    if (playerRef.current) {
        playerRef.current.config.seekTime = seekTime;
    }
  }, [seekTime]);

  // Force controls to stay visible when settings are open
  useEffect(() => {
    if (!plyrContainer) return;
    
    if (showSettings) {
        plyrContainer.classList.add('plyr-settings-open');
    } else {
        plyrContainer.classList.remove('plyr-settings-open');
    }
  }, [showSettings, plyrContainer]);

  const renderCustomControls = () => {
      const controls = (
          <>
            {/* Settings Toggle Button (Top Right) */}
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    setShowSettings(!showSettings);
                }}
                className="custom-settings-btn absolute top-4 right-4 z-[90] p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-all"
                title={t('video.settingsButtonTitle')}
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>

            {/* Settings Overlay */}
            {showSettings && (
                <div 
                    className="absolute inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowSettings(false);
                    }}
                >
                    <div 
                        className="bg-gray-800 rounded-xl p-6 w-full max-w-sm border border-gray-700 shadow-2xl relative animate-fadeIn"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowSettings(false);
                            }}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                            {t('video.settingsTitle')}
                        </h3>

                        <div className="space-y-6">
                            {/* Seek Time Control */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-3">{t('video.seekLabel')}</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[5, 10, 15, 30].map(time => (
                                        <button
                                            key={time}
                                            onClick={() => handleSeekTimeChange(time)}
                                            className={`py-2 px-1 rounded text-sm font-medium transition-colors ${
                                                seekTime === time 
                                                ? 'bg-blue-600 text-white' 
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            }`}
                                        >
                                            {time}s
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Auto Play Toggle */}
                            <div className="flex items-center justify-between border-t border-gray-700 pt-4">
                                <div>
                                    <span className="block text-sm font-medium text-gray-300">{t('video.autoNext')}</span>
                                    <span className="text-xs text-gray-500">{t('video.autoNextHint')}</span>
                                </div>
                                <button 
                                    onClick={handleAutoPlayChange}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoPlay ? 'bg-blue-600' : 'bg-gray-700'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoPlay ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
          </>
      );

      if (plyrContainer) {
          return createPortal(controls, plyrContainer);
      }
      return controls;
  };

  const handleWrapperClick = (e) => {
      // Ignore clicks on buttons inputs or Plyr controls to prevent double actions
      if (
        e.target.tagName === 'BUTTON' || 
        e.target.tagName === 'INPUT' || 
        e.target.closest('button') || 
        e.target.closest('.plyr__controls') ||
        e.target.closest('.custom-settings-btn')
      ) {
          return;
      }
      
      // If settings are open, close them instead of toggling play
      if (showSettings) {
          setShowSettings(false);
          return;
      }

      console.log('Wrapper click - toggling play');
      playerRef.current?.togglePlay();
  };

  return (
    <div 
        className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow relative z-20 group cursor-pointer"
        onClick={handleWrapperClick}
    >
      {/* Basic Clean CSS for Plyr */}
      <style>{`
        .plyr {
            --plyr-color-main: #3b82f6; /* Basic Blue */
            --plyr-video-background: #000;
            --plyr-menu-background: #1f2937;
            --plyr-menu-color: #fff;
            --plyr-menu-border-color: #374151;
            font-family: inherit;
            height: 100%;
        }
        .plyr__control--overlaid {
            background: rgba(59, 130, 246, 0.8) !important;
            color: #fff !important;
        }
        .plyr__control:hover {
            background: #3b82f6 !important;
            color: #fff !important;
        }
        
        /* Sync custom button visibility with Plyr controls */
        .custom-settings-btn {
            opacity: 1;
            visibility: visible;
            transition: opacity 0.3s ease;
        }
        .plyr--hide-controls .custom-settings-btn {
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
        }

        /* Force controls visible when settings are open */
        .plyr-settings-open .plyr__controls,
        .plyr-settings-open .custom-settings-btn {
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
        }

        /* Force controls visible in portrait mobile (both inline and fullscreen) */
        @media (orientation: portrait) and (max-width: 768px) {
            .plyr__controls,
            .custom-settings-btn {
                opacity: 1 !important;
                visibility: visible !important;
                pointer-events: auto !important;
                display: flex !important;
            }
        }
      `}</style>
      
      <video
        ref={videoRef}
        className="plyr-react plyr"
        playsInline
        crossOrigin="anonymous"
      />

      {renderCustomControls()}
    </div>
  );
}); // End forwardRef

export default VideoPlayer;
