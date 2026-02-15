import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import MovieGrid from '../components/movie/MovieGrid';
import Pagination from '../components/common/Pagination';
import { LoadingSkeleton } from '../components/common/Loading';
import { useI18n } from '../i18n';

function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const { t } = useI18n();
  
  const [movies, setMovies] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query) {
      searchMovies();
    }
  }, [query, currentPage]);

  const searchMovies = async () => {
    setLoading(true);
    try {
      const data = await api.searchMovies(query, currentPage);
      setMovies(data.movies);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Error searching movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container">
        <div className="mb-8 pb-4 border-b border-white/5">
          <h1 className="text-3xl font-bold mb-2">
            {t('search.resultsFor')}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-primary">"{query}"</span>
          </h1>
          <p className="text-gray-400">
            {loading ? t('search.searching') : t('search.foundResults', { count: movies.length })}
          </p>
        </div>

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
            {!loading && movies.length === 0 && (
              <div className="text-center py-20">
                <p className="text-gray-400 text-lg">{t('search.noResults')}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Search;
