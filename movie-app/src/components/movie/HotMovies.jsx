import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from "framer-motion";
import { api } from '../../services/api';
import { useI18n } from '../../i18n';
import { LoadingSkeleton } from '../common/Loading';

function HotMovies() {
  const { t } = useI18n();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [backdrop, setBackdrop] = useState('');
  const autoplayRef = useRef(null);

  useEffect(() => {
    const fetchHotMovies = async () => {
      try {
        const data = await api.getMovies(1, 'phim-le'); // Get 'phim-le' for hot movies
        setMovies(data.movies?.slice(0, 10) || []);
      } catch (error) {
        console.error('Error fetching hot movies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHotMovies();
  }, []);

  // Fetch full details for current movie to get the landscape poster (thumb_url is usually horizontal)
  // Note: List API often returns thumb_url (vertical) or poster_url (vertical).
  // Detail API returns poster_url (horizontal backdrop) and thumb_url (vertical).
  useEffect(() => {
    const fetchBackdrop = async () => {
      if (movies.length > 0) {
        const current = movies[currentIndex];
        
        // Use thumb_url as priority for horizontal poster as requested by user
        const initialBackdrop = api.getImageUrl(current.thumb_url || current.poster_url);
        setBackdrop(initialBackdrop);
        
        try {
          const detail = await api.getMovieDetail(current.slug);
          // Also prioritize thumb_url from details if it's higher res/different
          if (detail.thumb_url || detail.poster_url) {
             const highResBackdrop = api.getImageUrl(detail.thumb_url || detail.poster_url);
             if (highResBackdrop !== initialBackdrop) {
                setBackdrop(highResBackdrop);
             }
          }
        } catch (e) {
          console.error("Failed to fetch movie detail for backdrop", e);
        }
      }
    };
    
    fetchBackdrop();
  }, [currentIndex, movies]);

  useEffect(() => {
    startAutoplay();
    return () => stopAutoplay();
  }, [currentIndex, movies.length]);

  const startAutoplay = () => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    autoplayRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % movies.length);
    }, 5000); // 5 seconds
  };

  const stopAutoplay = () => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
  };

  const handleManualChange = (index) => {
    stopAutoplay();
    setCurrentIndex(index);
    startAutoplay(); // Restart timer
  };

  if (loading) return <div className="container py-8"><LoadingSkeleton /></div>;
  if (!movies.length) return null;

  const currentMovie = movies[currentIndex];

  return (
    <div className="relative mb-10 w-full h-[500px] md:h-[600px] lg:h-[800px] bg-gray-900 text-white overflow-hidden group">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out transform"
        style={{ 
          backgroundImage: `url(${backdrop})`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/40 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
      </div>

      <div className="w-full relative h-full flex flex-col justify-center px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full">
          
          {/* Left Content */}
          <div className="lg:col-span-8 space-y-6 pt-20 md:pt-0">
            <div className="flex items-center gap-3 animate-fade-in-up">
              <span className="bg-yellow-500 text-black font-bold px-3 py-1 rounded text-sm rounded-tr-lg rounded-bl-lg shadow-lg shadow-yellow-500/20">
                {currentMovie.quality || 'HD'}
              </span>
              <span className="bg-white/10 backdrop-blur-sm px-3 py-1 rounded text-sm border border-white/10">
                {currentMovie.year}
              </span>
               <span className="bg-red-600/90 text-white px-3 py-1 rounded text-sm flex items-center gap-1">
                 <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
                {currentMovie.time || 'N/A'}
              </span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight drop-shadow-xl animate-title">
              <Link to={`/movie/${currentMovie.slug}`} className="hover:text-blue-400 transition-colors">
                 {currentMovie.name}
              </Link>
            </h1>
            
            <p className="text-xl text-gray-300 font-light truncate">
              {currentMovie.origin_name}
            </p>

            <div className="flex flex-wrap gap-2 text-sm text-gray-400">
               {/* Mock genres if not in API response, or just show lang */}
               <span className="border border-gray-700 px-3 py-1 rounded-full">{currentMovie.lang}</span>
            </div>

            <p className="text-gray-400 line-clamp-3 md:line-clamp-4 max-w-3xl text-lg leading-relaxed border-l-4 border-blue-600 pl-4 bg-gradient-to-r from-blue-600/10 to-transparent py-2 rounded-r-lg">
               {/* Description might not be in list API, fallback or check data */}
               {currentMovie.content || t('home.heroSubtitle1')}
            </p>
            
            <div className="flex items-center gap-6 pt-4">
              <Link 
                to={`/movie/${currentMovie.slug}`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-bold text-lg shadow-lg hover:shadow-blue-600/40 transition-all transform hover:-translate-y-1 flex items-center gap-2 group/btn"
              >
                <svg className="w-5 h-5 fill-current group-hover/btn:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                {t('common.watchNow')}
              </Link>
              <button 
                onClick={() => handleManualChange((currentIndex + 1) % movies.length)}
                className="text-gray-300 hover:text-white font-medium transition-colors flex items-center gap-2 group/next"
              >
                Next Movie
                <svg className="w-4 h-4 group-hover/next:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right Navigation (Desktop) */}
          <div className="hidden lg:col-span-4 lg:flex flex-col gap-4 h-[600px] overflow-y-auto scrollbar-hide py-4 pl-4 mask-image-b">
             <div className="text-gray-400  font-bold uppercase tracking-widest text-sm mb-2 border-b border-gray-800 pb-2">
                Trending Now
             </div>
             {movies.map((movie, index) => (
                <div 
                  key={movie._id}
                  onClick={() => handleManualChange(index)}
                  className={`
                    flex gap-4 p-3 rounded-xl cursor-pointer transition-all duration-300
                    ${index === currentIndex 
                      ? 'bg-gradient-to-r from-blue-600/20 to-transparent border-l-4 border-blue-600' 
                      : 'hover:bg-white/5 border-l-4 border-transparent'
                    }
                  `}
                >
                  {/* ss */}
                  <img 
                    src={api.getImageUrl(movie.thumb_url || movie.poster_url)} 
                    alt={movie.name}
                    className="w-24 h-16 object-cover rounded-lg shadow-md flex-shrink-0"
                  />
                  <div className="flex flex-col justify-center min-w-0">
                    <h4 className={`font-semibold text-sm truncate ${index === currentIndex ? 'text-blue-400' : 'text-gray-200'}`}>
                      {movie.name}
                    </h4>
                    <span className="text-xs text-gray-500 mt-1">{movie.year} • {movie.quality}</span>
                  </div>
                </div>
             ))}
          </div>
        </div>
      </div>
      
      {/* Mobile Controls / Indicators */}
      <div className="absolute bottom-4 left-0 right-0 lg:hidden flex justify-center gap-2 px-4 z-20">
         {movies.slice(0, 5).map((_, idx) => (
            <button
              key={idx}
              onClick={() => handleManualChange(idx)}
              className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-8 bg-blue-600' : 'w-2 bg-gray-600'}`}
            />
         ))}
      </div>
      
      {/* Scroll Down Indicator */}
      <ScrollDown />
    </div>
  );
}

const ScrollDown = () => {
  const { t } = useI18n();
  const handleScroll = () => {
    window.scrollBy({
      top: window.innerHeight,
      behavior: "smooth",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 1 }}
      className="hidden md:flex absolute bottom-10 left-1/2 -translate-x-1/2 z-20 cursor-pointer"
      onClick={handleScroll}
    >
      <motion.div
        animate={{ y: [0, 15, 0] }} 
        transition={{
          duration: 1.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="flex flex-col items-center group opacity-40 hover:opacity-100 transition-opacity duration-300"
      >
        <span className="text-[10px] uppercase tracking-[0.3em] text-white mb-2 transition-colors">
          {t("common.next")}
        </span>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5} 
          stroke="currentColor"
          className="w-6 h-8 text-white transition-colors"
        >
          {/* Mũi tên trên */}
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 5.25l-7.5 7.5-7.5-7.5"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 12.75l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </motion.div>
    </motion.div>
  );
};

export default HotMovies;
