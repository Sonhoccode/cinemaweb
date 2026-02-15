import React from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';

function MovieCard({ movie }) {
  const imageUrl = api.getImageUrl(movie.poster_url || movie.thumb_url);

  return (
    <Link to={`/movie/${movie.slug}`} className="group relative block rounded-xl overflow-hidden bg-primary-lighter transition-transform duration-300 hover:-translate-y-2 hover:shadow-glow">
      <div className="aspect-[2/3] overflow-hidden">
        <img
          src={imageUrl}
          alt={movie.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        
        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
          <div className="w-12 h-12 rounded-full bg-accent-cyan/20 backdrop-blur-sm flex items-center justify-center border-2 border-accent-cyan text-accent-cyan shadow-glow">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </div>
        </div>
      </div>
      <div className="p-4 bg-gradient-to-t from-primary-dark to-transparent absolute bottom-0 left-0 w-full pt-16">
        <h3 className="text-white font-bold text-lg leading-tight mb-1 truncate group-hover:text-accent-cyan transition-colors">
          {movie.name}
        </h3>
        <div className="flex justify-between items-center text-sm text-gray-400">
          <span className="truncate max-w-[70%]">{movie.origin_name}</span>
          <span>{movie.year}</span>
        </div>
      </div>
    </Link>
  );
}

export default MovieCard;
