import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { LoadingSkeleton } from '../components/common/Loading';
import EpisodeList from '../components/player/EpisodeList';
import useAuth from '../hooks/useAuth';
import RatingComponent from '../components/common/RatingComponent';
import CommentSection from '../components/common/CommentSection';
import { SHOW_ROOM_FEATURES } from '../config/features';
import { useI18n } from '../i18n';

function MovieDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [watchedEpisodes, setWatchedEpisodes] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);

  useEffect(() => {
    loadMovieDetail();
    
    // Check for active room
    const savedRoom = localStorage.getItem('activeRoom');
    if (savedRoom) {
      try {
        const roomData = JSON.parse(savedRoom);
        if (Date.now() - roomData.joinedAt < 24 * 60 * 60 * 1000) {
          setActiveRoom(roomData);
        }
      } catch (e) {
        // ignore
      }
    }
  }, [slug]);

  useEffect(() => {
    if (user && movie) {
        fetchHistory();
    }
  }, [user, movie]);

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

  const getServerType = (server) => {
    const name = (server?.server_name || server?.server || '').toString().toLowerCase();
    if (name.includes('vietsub')) return 'vietsub';
    if (name.includes('lồng tiếng') || name.includes('long tieng')) return 'long';
    if (name.includes('thuyết minh') || name.includes('thuyet minh')) return 'thuyetminh';
    return 'other';
  };

  const serverGroups = useMemo(() => {
    const groups = { vietsub: null, long: null, thuyetminh: null, other: [] };
    servers.forEach((server, index) => {
      const type = getServerType(server);
      if (type === 'vietsub' && !groups.vietsub) {
        groups.vietsub = { server, index };
      } else if (type === 'long' && !groups.long) {
        groups.long = { server, index };
      } else if (type === 'thuyetminh' && !groups.thuyetminh) {
        groups.thuyetminh = { server, index };
      } else {
        groups.other.push({ server, index });
      }
    });
    return groups;
  }, [servers]);

  const fetchHistory = async () => {
    if (!user?.token) return;
    try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/history`, {
            headers: {
                'Authorization': `Bearer ${user.token}`
            }
        });
        if (!response.ok) {
            console.error('Failed to fetch history:', response.status);
            setWatchedEpisodes([]);
            return;
        }
        const history = await response.json();
        if (!Array.isArray(history)) {
            console.error('History payload is not an array');
            setWatchedEpisodes([]);
            return;
        }
        const movieHistory = history.filter(h => h.movieSlug === slug);
        setWatchedEpisodes(movieHistory);
    } catch (error) {
        console.error("Failed to fetch history", error);
        setWatchedEpisodes([]);
    }
  };

  const loadMovieDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMovieDetail(slug);
      setMovie(data);
    } catch (err) {
      setError(t('movie.loadError'));
      console.error('Error loading movie detail:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="container py-20"><LoadingSkeleton /></div>;
  if (error) return <div className="container py-20 text-center text-accent-pink text-xl">{error}</div>;
  if (!movie) return null;

  const posterUrl = api.getImageUrl(movie.poster_url || movie.thumb_url);
  const backdropUrl = movie.poster_url ? api.getImageUrl(movie.poster_url) : posterUrl;
  
  const primaryEntry = serverGroups.vietsub || serverGroups.long || serverGroups.thuyetminh || serverGroups.other[0] || null;
  const primaryEpisodes = primaryEntry?.server?.server_data || [];
  const primaryServerKey = primaryEntry ? getServerKey(primaryEntry.server, primaryEntry.index) : null;
  const hasEpisodes = servers.some(s => (s.server_data || []).length > 0);

  const renderEpisodeSection = (title, entry) => {
    if (!entry) return null;
    const episodes = entry.server?.server_data || [];
    if (episodes.length === 0) return null;
    const serverKey = getServerKey(entry.server, entry.index);
    return (
      <div className="space-y-3">
        <h4 className="text-lg font-bold text-white">{title}</h4>
        <EpisodeList
          episodes={episodes}
          currentEpisode={-1}
          watchedEpisodes={watchedEpisodes}
          onEpisodeSelect={(index) => {
            navigate(`/watch/${movie.slug}?ep=${index + 1}&server=${serverKey}`, { state: { episodeIndex: index } });
          }}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen relative pt-20">
      {/* Backdrop */}
      <div className="absolute top-0 left-0 w-full h-[70vh] z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary-dark/10 to-primary-dark z-10"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-primary-dark via-primary-dark/50 to-transparent z-10"></div>
        <img src={backdropUrl} alt="" className="w-full h-full object-cover opacity-30" />
      </div>

      <div className="container relative z-20 pb-20">
        {/* Info Section */}
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12 items-start mb-12">
          {/* Poster */}
          <div className="w-full max-w-[300px] mx-auto md:mx-0 shrink-0 rounded-xl overflow-hidden shadow-2xl shadow-accent-cyan/10 transistion-transform hover:scale-105 duration-500">
            <img 
              src={posterUrl} 
              alt={movie.name} 
              className="w-full h-auto object-cover aspect-[2/3]"
            />
          </div>

          {/* Metadata */}
          <div className="flex-1 text-gray-300">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-2 leading-tight">
              {movie.name}
            </h1>
            <h2 className="text-xl md:text-2xl text-accent-cyan mb-6 font-medium">
              {movie.origin_name} ({movie.year})
            </h2>

            <div className="flex flex-wrap gap-4 mb-8">
              {hasEpisodes && (
                <div className="flex flex-wrap gap-4">
                  <Link 
                    to={primaryServerKey ? `/watch/${movie.slug}?ep=1&server=${primaryServerKey}` : `/watch/${movie.slug}`}
                    className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 rounded-full text-white font-bold shadow-lg hover:bg-blue-700 hover:scale-105 transition-all duration-300"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    {t('movie.watchNow')}
                  </Link>

                  {SHOW_ROOM_FEATURES && (
                    <button 
                      onClick={() => {
                        // Get first episode URL
                        const firstEp = primaryEpisodes?.[0];
                        const videoUrl = firstEp?.link_m3u8 || '';
                        if (!videoUrl) return;
                        
                        if (activeRoom) {
                           // Join existing room
                           window.location.href = `/room/${activeRoom.roomId}?url=${encodeURIComponent(videoUrl)}&slug=${movie.slug}`;
                        } else {
                           // Create new room
                           const newRoomId = Math.random().toString(36).substring(2, 10);
                           window.location.href = `/room/${newRoomId}?url=${encodeURIComponent(videoUrl)}&slug=${movie.slug}`;
                        }
                      }}
                      className="inline-flex items-center gap-2 px-8 py-3 bg-purple-600 rounded-full text-white font-bold shadow-lg hover:bg-purple-700 hover:scale-105 transition-all duration-300"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {t('movie.watchTogether')}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-8 text-sm">
              <div className="flex gap-2">
                <span className="text-gray-500 min-w-[100px]">{t('movie.status')}</span>
                <span className="text-white font-medium bg-white/10 px-2 py-0.5 rounded text-xs inline-flex items-center">
                  {movie.episode_current || t('movie.updating')}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500 min-w-[100px]">{t('movie.duration')}</span>
                <span className="text-white">{movie.time}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500 min-w-[100px]">{t('movie.quality')}</span>
                <span className="text-accent-cyan font-bold">{movie.quality}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500 min-w-[100px]">{t('movie.language')}</span>
                <span className="text-white">{movie.lang}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500 min-w-[100px]">{t('movie.director')}</span>
                <span className="text-white">{movie.director?.join(', ') || t('misc.notAvailable')}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500 min-w-[100px]">{t('movie.actors')}</span>
                <span className="text-white">{movie.actor?.join(', ') || t('misc.notAvailable')}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500 min-w-[100px]">{t('movie.genres')}</span>
                <span className="text-white">
                  {movie.category?.map(c => c.name).join(', ')}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500 min-w-[100px]">{t('movie.country')}</span>
                <span className="text-white">
                  {movie.country?.map(c => c.name).join(', ')}
                </span>
              </div>
            </div>
            
             <div className="bg-primary-lighter/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6 md:p-8">
              <h3 className="text-xl font-bold text-white mb-4 border-l-4 border-accent-cyan pl-3">{t('movie.content')}</h3>
              <p className="leading-relaxed text-gray-300 text-justify">
                {movie.content}
              </p>
            </div>
          </div>
        </div>
        
        {/* Episode List Section */}
         {hasEpisodes && (
            <div className="container max-w-4xl mx-auto">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                    <span className="w-1 h-8 bg-accent-pink rounded-full"></span>
                    {t('movie.episodeList')}
                </h3>
                <div className="bg-primary-lighter/30 rounded-2xl p-6 border border-white/5">
                    <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        <div className="space-y-6">
                            {renderEpisodeSection(t('server.vietsub'), serverGroups.vietsub)}
                            {renderEpisodeSection(t('server.long'), serverGroups.long)}
                            {renderEpisodeSection(t('server.thuyetminh'), serverGroups.thuyetminh)}
                            {serverGroups.other.map((group, idx) => (
                                <React.Fragment key={idx}>
                                    {renderEpisodeSection(group.server?.server_name || t('server.generic', {index: idx + 1}), group)}
                                </React.Fragment>
                            ))}
                            {!serverGroups.vietsub && !serverGroups.long && !serverGroups.thuyetminh && serverGroups.other.length === 0 && (
                              <p className="text-gray-500 text-center py-4">{t('movie.updating')}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
         )}

        {/* Rating and Comments Section */}
        <div className="container max-w-4xl mx-auto mt-12 space-y-8">
           <RatingComponent movieSlug={slug} />
           <CommentSection movieSlug={slug} episodeSlug="all" />
        </div>


      </div>
    </div>
  );
}

export default MovieDetail;
