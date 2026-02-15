import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import VideoPlayer from '../components/player/VideoPlayer';
import EpisodeList from '../components/player/EpisodeList';
import CommentSection from '../components/common/CommentSection';
import { LoadingSpinner } from '../components/common/Loading';
import useAuth from '../hooks/useAuth';
import { SHOW_ROOM_FEATURES } from '../config/features';
import { useI18n } from '../i18n';

function Watch() {
  const { slug } = useParams();
  const { t } = useI18n();
  const [movie, setMovie] = useState(null);
  const [currentEpisode, setCurrentEpisode] = useState(0);
  const [serverIndex, setServerIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [watchedEpisodes, setWatchedEpisodes] = useState([]);
  const navigate = useNavigate();

  // State to track if we've handled the initial navigation/resume action
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const createRoom = () => {
    const roomId = Math.random().toString(36).substring(2, 8);
    const slugParams = movie ? `&slug=${movie.slug}` : '';
    navigate(`/room/${roomId}?url=${encodeURIComponent(currentVideoUrl)}${slugParams}`);
  };

  useEffect(() => {
    loadMovie();
  }, [slug]);
  
  const servers = useMemo(() => movie?.episodes || [], [movie]);

  const slugify = (value) => {
    return value
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const getServerKey = (server, index) => {
    const name = (server?.server_name || server?.server || '').toString();
    const key = slugify(name);
    return key || `server-${index + 1}`;
  };

  const getServerLabel = (server, index) => {
    const name = (server?.server_name || server?.server || '').toString().toLowerCase();
    if (name.includes('vietsub')) return t('server.vietsub');
    if (name.includes('lồng tiếng') || name.includes('long tieng')) return t('server.long');
    if (name.includes('thuyết minh') || name.includes('thuyet minh')) return t('server.thuyetminh');
    return t('server.generic', { index: index + 1 });
  };

  // Sync URL when currentEpisode changes
  useEffect(() => {
      if (initialLoadDone) {
        const params = { ep: currentEpisode + 1 };
        if (servers[serverIndex]) {
          params.server = getServerKey(servers[serverIndex], serverIndex);
        }
        setSearchParams(params, { replace: true });
      }
  }, [currentEpisode, initialLoadDone, serverIndex, servers, setSearchParams]);

  // Fetch history when user logs in or movie changes
  useEffect(() => {
    if (user && movie) {
        fetchHistory();
    } else if (movie && !user) {
        // If not logged in, check URL or navigation state
        if (!initialLoadDone) {
            const epParam = searchParams.get('ep');
            const serverParam = searchParams.get('server');
            if (epParam) {
                const epIndex = parseInt(epParam) - 1;
                if (!isNaN(epIndex) && epIndex >= 0) {
                     setCurrentEpisode(epIndex);
                }
            } else if (location.state?.episodeIndex !== undefined) {
                setCurrentEpisode(location.state.episodeIndex);
            }
            if (serverParam && servers.length > 0) {
                const idx = servers.findIndex((s, i) => getServerKey(s, i) === serverParam);
                if (idx !== -1) setServerIndex(idx);
            }
            setInitialLoadDone(true);
        }
    }
  }, [user, movie, servers]);

  const fetchHistory = async () => {
    try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/history`, {
            headers: {
                'Authorization': `Bearer ${user.token}`
            }
        });
        const history = await response.json();
        const movieHistory = history.filter(h => h.movieSlug === movie.slug);
        
        const watchedSlugs = movieHistory.map(h => h.episodeSlug || h.episodeName);
        setWatchedEpisodes(watchedSlugs);

        // Resume Logic
        if (!initialLoadDone) {
            const epParam = searchParams.get('ep');
            const serverParam = searchParams.get('server');
            
            if (epParam) {
                // Priority 1: URL Param (Direct Link)
                const epIndex = parseInt(epParam) - 1;
                if (!isNaN(epIndex) && epIndex >= 0) {
                     setCurrentEpisode(epIndex);
                }
            } else if (location.state?.episodeIndex !== undefined) {
                // Priority 2: Navigation State (from Detail Page)
                setCurrentEpisode(location.state.episodeIndex);
            } else if (watchedSlugs.length > 0) {
                // Priority 3: Auto-resume from History
                const serverData = movie.episodes?.[0]?.server_data || [];
                let maxIndex = 0;
                
                serverData.forEach((ep, index) => {
                    const epSlug = ep.slug || ep.name;
                    if (watchedSlugs.includes(epSlug)) {
                        maxIndex = index;
                    }
                });
                setCurrentEpisode(maxIndex);
            }
            if (serverParam && servers.length > 0) {
                const idx = servers.findIndex((s, i) => getServerKey(s, i) === serverParam);
                if (idx !== -1) setServerIndex(idx);
            }
            setInitialLoadDone(true);
        }
    } catch (error) {
        console.error("Failed to fetch history", error);
        // Fallback
        if (!initialLoadDone) {
             const epParam = searchParams.get('ep');
             const serverParam = searchParams.get('server');
             if (epParam) {
                const epIndex = parseInt(epParam) - 1;
                if (!isNaN(epIndex) && epIndex >= 0) {
                     setCurrentEpisode(epIndex);
                }
             } else if (location.state?.episodeIndex !== undefined) {
                setCurrentEpisode(location.state.episodeIndex);
             }
             if (serverParam && servers.length > 0) {
                const idx = servers.findIndex((s, i) => getServerKey(s, i) === serverParam);
                if (idx !== -1) setServerIndex(idx);
             }
             setInitialLoadDone(true);
        }
    }
  };

  useEffect(() => {
    if (!movie || servers.length === 0) return;
    const serverData = servers[serverIndex]?.server_data || [];
    if (currentEpisode >= serverData.length) {
      setCurrentEpisode(0);
    }
  }, [serverIndex, movie, servers, currentEpisode]);

  const loadMovie = async () => {
    try {
      setLoading(true);
      const data = await api.getMovieDetail(slug);
      setMovie(data);
    } catch (err) {
      setError(t('watch.loadError'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Keyboard shortcut for Next Episode (Ctrl + I)
  useEffect(() => {
      const handleKeyDown = (e) => {
          if (e.ctrlKey && (e.key === 'i' || e.key === 'I')) {
              e.preventDefault();
              const serverData = movie?.episodes?.[0]?.server_data || [];
              if (currentEpisode < serverData.length - 1) {
                  setCurrentEpisode(prev => prev + 1);
              }
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentEpisode, movie]);

  useEffect(() => {
    if (user && movie && !loading) {
      const serverData = movie.episodes?.[0]?.server_data || [];
      const currentEpData = serverData[currentEpisode];
      
      if (currentEpData) {
        saveHistory({
            movieSlug: movie.slug,
            movieName: movie.name,
            posterUrl: movie.poster_url || movie.thumb_url || '',
            episodeSlug: currentEpData.slug || '',
            episodeName: currentEpData.name, 
            progress: 0, // Placeholder
            duration: 0  // Placeholder
        });
      }
    }
  }, [user, movie, currentEpisode, loading]);

  const saveHistory = async (data) => {
    try {
        await fetch(`${import.meta.env.VITE_BACKEND_URL}/history`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user.token}`
            },
            body: JSON.stringify(data)
        });
        // Refresh watched list after saving
        fetchHistory();
    } catch (error) {
        console.error("Failed to save history", error);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-center text-red-500 py-20">{error}</div>;
  if (!movie) return null;

  // Safely access episodes
  // API structure: movie.episodes is an array of server objects
  // We typically want the first server's data for simplicity, or we can iterate
  const serverData = servers[serverIndex]?.server_data || [];
  const currentVideoUrl = serverData[currentEpisode]?.link_m3u8;

  return (
    <div className="min-h-screen bg-primary-darker pt-20 pb-10">
      <div className="container mx-auto px-4">
        {/* Breadcrumb / Back Button */}
        <div className="mb-6">
          <Link 
            to={`/movie/${slug}`}
            className="inline-flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t('watch.backToInfo')}
          </Link>
        </div>

        {/* Video Player Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Player Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-black rounded-xl overflow-hidden shadow-sm aspect-video relative z-10">
              {currentVideoUrl ? (
                <VideoPlayer key={currentVideoUrl} src={currentVideoUrl} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  {t('watch.noSource')}
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-bold text-white">
                  {movie.name}
                </h1>
                <h2 className="text-lg text-gray-400">
                  {movie.origin_name} - {serverData[currentEpisode]?.name || t('episode.number', { num: currentEpisode + 1 })}
                </h2>
              </div>
              
              {/* Create Room Button */}
              {SHOW_ROOM_FEATURES && currentVideoUrl && (
                <button
                  onClick={createRoom}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg whitespace-nowrap"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="hidden sm:inline">{t('home.createRoom')}</span>
                  <span className="sm:hidden">{t('movie.watchTogether')}</span>
                </button>
              )}
            </div>

            {/* Comment Section */}
            <CommentSection 
              movieSlug={slug} 
              episodeSlug={serverData[currentEpisode]?.slug || `tap-${currentEpisode + 1}`} 
            />
          </div>

          {/* Sidebar: Episodes & Info */}
          <div className="space-y-6">
            <div className="bg-primary-lighter rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">
                {t('watch.episodeList')}
              </h3>
              {servers.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {servers.map((server, index) => {
                    const label = getServerLabel(server, index);
                    const active = index === serverIndex;
                    return (
                      <button
                        key={label + index}
                        onClick={() => setServerIndex(index)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          active
                            ? 'bg-blue-600 text-white border-blue-500'
                            : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {serverData.length > 0 ? (
                    <EpisodeList
                      episodes={serverData}
                      currentEpisode={currentEpisode}
                      onEpisodeSelect={setCurrentEpisode}
                      watchedEpisodes={watchedEpisodes}
                      mode="grid"
                      gridClass="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 gap-2"
                    />
                  ) : (
                    <p className="text-gray-500 text-center py-4">{t('movie.updating')}</p>
                  )}
              </div>
            </div>

            <div className="bg-primary-lighter rounded-xl p-6 space-y-4">
               <h3 className="text-lg font-bold text-white mb-4">
                 {t('watch.info')}
               </h3>
               <div className="text-sm text-gray-300 space-y-3">
                 <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-gray-500">{t('watch.year')}</span>
                    <span className="text-white font-medium">{movie.year}</span>
                 </div>
                 <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-gray-500">{t('watch.country')}</span>
                    <span className="text-white font-medium">{movie.country?.[0]?.name}</span>
                 </div>
                 <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-gray-500">{t('watch.duration')}</span>
                    <span className="text-white font-medium">{movie.time}</span>
                 </div>
                 <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-gray-500">{t('watch.quality')}</span>
                    <span className="text-accent-cyan font-bold">{movie.quality}</span>
                 </div>
                 <div>
                    <span className="text-gray-500 block mb-1">{t('watch.genres')}</span>
                    <span className="text-white font-medium">
                      {movie.category?.map(c => c.name).join(', ')}
                    </span>
                 </div>
                 <div className="pt-2">
                    <span className="text-gray-500 block mb-1">{t('watch.content')}</span>
                    <p className="line-clamp-6 leading-relaxed text-justify text-gray-400">
                      {movie.content}
                    </p>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Watch;
