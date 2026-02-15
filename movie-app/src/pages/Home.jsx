import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import MovieGrid from '../components/movie/MovieGrid';
import HotMovies from '../components/movie/HotMovies';
import Pagination from '../components/common/Pagination';
import { LoadingSkeleton } from '../components/common/Loading';
import { SHOW_ROOM_FEATURES } from '../config/features';
import { useI18n } from '../i18n';

function Home() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [movies, setMovies] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [currentFilter, setCurrentFilter] = useState('phim-moi-cap-nhat');
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [roomIdInput, setRoomIdInput] = useState('');
  const [activeRoom, setActiveRoom] = useState(null);

  const filters = [
    { label: t('filters.all'), value: 'phim-moi-cap-nhat' },
    { label: t('filters.single'), value: 'phim-le' },
    { label: t('filters.series'), value: 'phim-bo' },
    { label: t('filters.animation'), value: 'hoat-hinh' },
    { label: t('filters.tv'), value: 'tv-shows' }
  ];

  useEffect(() => {
    loadMovies();
    
    // Check for active room in localStorage
    const savedRoom = localStorage.getItem('activeRoom');
    if (savedRoom) {
      try {
        const roomData = JSON.parse(savedRoom);
        // Check if room is still fresh (< 24 hours)
        if (Date.now() - roomData.joinedAt < 24 * 60 * 60 * 1000) {
          setActiveRoom(roomData);
        } else {
          localStorage.removeItem('activeRoom');
        }
      } catch (e) {
        localStorage.removeItem('activeRoom');
      }
    }
  }, [currentPage, currentFilter]);

  const loadMovies = async () => {
    setLoading(true);
    try {
      const data = await api.getMovies(currentPage, currentFilter);
      setMovies(data.movies);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Error loading movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filter) => {
    setCurrentFilter(filter);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const createRoom = () => {
    const roomId = Math.random().toString(36).substring(2, 10); // Generate random ID
    navigate(`/room/${roomId}`);
  };

  const joinRoom = () => {
    if (roomIdInput.trim()) {
      navigate(`/room/${roomIdInput.trim()}`);
      setShowRoomModal(false);
      setRoomIdInput('');
    }
  };

  const returnToRoom = () => {
    if (activeRoom) {
      navigate(`/room/${activeRoom.roomId}`);
    }
  };

  const dismissRoomBanner = () => {
    localStorage.removeItem('activeRoom');
    setActiveRoom(null);
  };

  return (
    <div className="min-h-screen">
      {/* Active Room Banner */}
      {SHOW_ROOM_FEATURES && activeRoom && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 border-b border-blue-500 shadow-lg pt-20">
          <div className="container py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-white">
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="font-semibold text-sm">{t('home.activeRoomTitle')}</p>
                <p className="text-xs text-blue-100">{t('home.roomLabel', { roomId: activeRoom.roomId })}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={returnToRoom}
                className="px-4 py-2 bg-white text-blue-600 font-semibold rounded-lg shadow hover:bg-blue-50 transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                {t('home.returnRoom')}
              </button>
              <button
                onClick={dismissRoomBanner}
                className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                title={t('home.close')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="relative mb-8 py-16 border-b border-gray-800 bg-gray-900">
        <div className="container text-center">
          <h1 className="text-4xl text-white md:text-5xl font-extrabold mt-6 mb-4 py-6">
            {t('home.heroTitle')}
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            {t('home.heroSubtitle1')} 
            {' '}
            {t('home.heroSubtitle2')}
          </p>
          
          {SHOW_ROOM_FEATURES && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={createRoom}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                {t('home.createRoom')}
              </button>
              
              <button
                onClick={() => setShowRoomModal(true)}
               className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                {t('home.joinRoom')}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="container pb-16">
        <HotMovies />
        
        <div className="flex flex-wrap gap-3 mb-8">
          {filters.map((filter) => (
            <button
              key={filter.value}
              className={`
                px-5 py-2 rounded-lg text-sm font-medium transition-all duration-300 border
                ${currentFilter === filter.value 
                  ? 'bg-blue-600 border-transparent text-white shadow-md' 
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:border-blue-500 hover:text-white hover:-translate-y-0.5'
                }
              `}
              onClick={() => handleFilterChange(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-white">
          <span className="w-1 h-7 bg-blue-600 rounded-full"></span>
          {t('home.latestUpdated')}
        </h2>

        {loading ? (
          <LoadingSkeleton />
        ) : (
          <>
            <MovieGrid movies={movies} />
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>
      
      {/* Join Room Modal */}
      {SHOW_ROOM_FEATURES && showRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">{t('home.joinTitle')}</h2>
              <button
                onClick={() => {
                  setShowRoomModal(false);
                  setRoomIdInput('');
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-gray-400 mb-4 text-sm">
              {t('home.joinDesc')}
            </p>
            
            <input
              type="text"
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
              placeholder={t('home.joinPlaceholder')}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white mb-4 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              autoFocus
            />
            
            <button
              onClick={joinRoom}
              disabled={!roomIdInput.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all"
            >
              {t('home.joinButton')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
