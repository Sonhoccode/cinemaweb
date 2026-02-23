import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { api } from '../services/api';
import { LoadingSkeleton } from '../components/common/Loading';
import { useI18n } from '../i18n';

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [posterMap, setPosterMap] = useState({});
  const { user, isLoading } = useAuth();
  const { t, locale } = useI18n();

  useEffect(() => {
    if (isLoading) return;
    if (!user?.token) {
      setLoading(false);
      return;
    }
    fetchHistory();
  }, [user, isLoading]);

  const fetchHistory = async () => {
    try {
      if (!user?.token) {
        setHistory([]);
        return;
      }
      // We'll add this endpoint to api.js later, for now fetching directly
      // In a real app, this should be in api.js or history service
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/history`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      if (!response.ok) {
        console.error('Error fetching history:', response.status);
        setHistory([]);
        return;
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setHistory(data);
      } else {
        console.error('History payload is not an array');
        setHistory([]);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (movieSlug, e) => {
    e.preventDefault(); // Prevent navigation
    try {
      await fetch(`${import.meta.env.VITE_BACKEND_URL}/history/${movieSlug}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      setHistory(history.filter((item) => item.movieSlug !== movieSlug));
    } catch (error) {
      console.error('Error deleting history:', error);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen pt-24 container mx-auto px-4">
        <h1 className="text-3xl font-bold text-white mb-8">{t('history.title')}</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-white/10 aspect-[2/3] rounded-xl mb-4"></div>
              <div className="h-4 bg-white/10 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen pt-24 container mx-auto px-4">
        <h1 className="text-3xl font-bold text-white mb-8">{t('history.title')}</h1>
        <div className="text-center py-20 bg-primary-lighter rounded-2xl border border-white/5">
          <h3 className="text-xl font-bold text-white mb-2">{t('comment.loginRequired')}</h3>
          <p className="text-gray-400 mb-6">{t('history.emptyDesc')}</p>
          <Link
            to="/login"
            className="inline-block px-6 py-3 bg-blue-600 rounded-full text-white font-bold hover:shadow-lg transition-all"
          >
            {t('comment.loginNow')}
          </Link>
        </div>
      </div>
    );
  }

  // Deduplicate history by movieSlug, keeping the most recent one
  const uniqueHistory = useMemo(() => (
    history.reduce((acc, current) => {
      const x = acc.find(item => item.movieSlug === current.movieSlug);
      if (!x) {
        return acc.concat([current]);
      } else {
        // If duplicate, keep the one with later lastWatched date
        return new Date(current.lastWatched) > new Date(x.lastWatched) 
          ? acc.map(i => i.movieSlug === current.movieSlug ? current : i)
          : acc;
      }
    }, [])
  ), [history]);

  useEffect(() => {
    if (uniqueHistory.length === 0) return;
    let isMounted = true;

    const fetchMissingPosters = async () => {
      const missing = uniqueHistory.filter(item => !item.posterUrl && !posterMap[item.movieSlug]);
      if (missing.length === 0) return;

      const results = await Promise.allSettled(
        missing.map(item => api.getMovieDetail(item.movieSlug))
      );

      if (!isMounted) return;

      const nextMap = {};
      results.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          const movie = res.value;
          const poster = movie.poster_url || movie.thumb_url || null;
          if (poster) {
            nextMap[missing[idx].movieSlug] = poster;
          }
        }
      });

      if (Object.keys(nextMap).length > 0) {
        setPosterMap(prev => ({ ...prev, ...nextMap }));
      }
    };

    fetchMissingPosters();

    return () => {
      isMounted = false;
    };
  }, [uniqueHistory, posterMap]);

  return (
    <div className="min-h-screen pt-24 pb-12 bg-primary-darker">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            {t('history.title')}
          </h1>
          <span className="text-gray-400">{t('history.count', { count: uniqueHistory.length })}</span>
        </div>

        {uniqueHistory.length === 0 ? (
          <div className="text-center py-20 bg-primary-lighter rounded-2xl border border-white/5">
            <svg
              className="w-20 h-20 mx-auto text-gray-600 mb-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="text-xl font-bold text-white mb-2">{t('history.emptyTitle')}</h3>
            <p className="text-gray-400 mb-6">{t('history.emptyDesc')}</p>
            <Link
              to="/"
              className="inline-block px-6 py-3 bg-blue-600 rounded-full text-white font-bold hover:shadow-lg transition-all"
            >
              {t('history.exploreNow')}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {uniqueHistory.map((item) => (
              <Link
                key={item._id}
                to={`/watch/${item.movieSlug}`}
                className="group relative bg-primary-lighter rounded-xl overflow-hidden border border-white/5 hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/10"
              >
                {/* Remove Button */}
                <button
                  onClick={(e) => handleRemove(item.movieSlug, e)}
                  className="absolute top-2 right-2 z-20 p-1.5 bg-black/60 hover:bg-red-500/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                  title={t('history.remove')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>

                {/* Progress Bar */}
                <div className="absolute top-0 left-0 w-full h-1 bg-white/10 z-20">
                    <div 
                        className="h-full bg-blue-500" 
                        style={{ width: `${(item.progress / item.duration) * 100}%` }}
                    ></div>
                </div>

                <div className="w-full aspect-[2/3] bg-gray-800 relative">
                   {/* Placeholder for thumbnail, using helper or generic icon if no proper thumb available from history */}
                   {/* Attempt to use movie poster if available in history data, otherwise placeholder */}
                   <div className="absolute inset-0 flex items-center justify-center text-gray-600 bg-gradient-to-br from-gray-800 to-black">
                       <span className="text-4xl font-bold opacity-20">{item.movieName?.[0]}</span>
                   </div>
                   {(item.posterUrl || posterMap[item.movieSlug]) && (
                      <img
                        src={api.getImageUrl(item.posterUrl || posterMap[item.movieSlug])}
                        alt={item.movieName}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                   )}
                   <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all"></div>
                   
                   {/* Play Icon on Hover */}
                   <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-blue-600/80 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                        <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      </div>
                   </div>
                </div>
                
                <div className="p-4 absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/90 to-transparent pt-10">
                  <h3 className="font-bold text-white text-md line-clamp-1 mb-1 group-hover:text-blue-400 transition-colors">
                    {item.movieName}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {new Date(item.lastWatched).toLocaleDateString(locale)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
