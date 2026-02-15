import React from 'react';
import MovieCard from './MovieCard';
import { useI18n } from '../../i18n';

function MovieGrid({ movies }) {
  const { t } = useI18n();
  if (!movies || movies.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-lg">{t('misc.noMoviesFound')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {movies.map((movie) => (
        <MovieCard key={movie._id || movie.slug} movie={movie} />
      ))}
    </div>
  );
}

export default MovieGrid;
