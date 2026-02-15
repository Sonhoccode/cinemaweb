import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useI18n } from '../../i18n';
import { LoadingSkeleton } from '../common/Loading';

function HotMovies() {
  const { t } = useI18n();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const fetchHotMovies = async () => {
      try {
        // Fetch 'phim-le' as hot movies
        const data = await api.getMovies(1, 'phim-le');
        setMovies(data.movies?.slice(0, 10) || []); // Limit to top 10
      } catch (error) {
        console.error('Error fetching hot movies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHotMovies();
  }, []);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const { current } = scrollContainerRef;
      const scrollAmount = 300; // Adjust scroll amount as needed
      if (direction === 'left') {
        current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }
  };

  if (loading) return <div className="container py-8"><LoadingSkeleton /></div>;
  if (!movies.length) return null;

  return (
    <div className="container py-8 border-b border-gray-800">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-3 text-white">
          <span className="w-1 h-7 bg-red-600 rounded-full"></span>
          Phim Hot
          <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded animate-pulse">HOT</span>
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={() => scroll('left')}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button 
            onClick={() => scroll('right')}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div 
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {movies.map((movie) => (
          <Link 
            key={movie._id} 
            to={`/phim/${movie.slug}`}
            className="flex-none w-[160px] md:w-[200px] group snap-start"
          >
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-3">
              <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shadow-lg z-10">
                {movie.quality || 'HD'}
              </div>
              <img
                src={api.getImageUrl(movie.poster_url || movie.thumb_url)}
                alt={movie.name}
                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium text-sm">
                  Xem ngay
                </button>
              </div>
            </div>
            <h3 className="text-white font-medium truncate group-hover:text-blue-400 transition-colors">
              {movie.name}
            </h3>
            <p className="text-gray-500 text-sm truncate">{movie.origin_name}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default HotMovies;
