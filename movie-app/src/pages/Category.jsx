import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import MovieGrid from '../components/movie/MovieGrid';
import Pagination from '../components/common/Pagination';
import { LoadingSkeleton } from '../components/common/Loading';
import { useI18n } from '../i18n';

function Category({ type = 'category' }) {
  const { slug } = useParams();
  const { t } = useI18n();
  const [movies, setMovies] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filter Data for Title Lookup
  const [categories, setCategories] = useState([]);
  const [countries, setCountries] = useState([]);

  useEffect(() => {
    fetchFilterData();
  }, []);

  useEffect(() => {
    loadCategoryMovies();
  }, [slug, currentPage, type]);

  const fetchFilterData = async () => {
      try {
        const [cats, counts] = await Promise.all([
          api.getCategories(),
          api.getCountries()
        ]);
        setCategories(cats || []);
        setCountries(counts || []);
      } catch (error) {
        // Ignore errors here, just for titles
      }
  };

  const loadCategoryMovies = async () => {
    setLoading(true);
    try {
      let data;
      
      if (type === 'country') {
         data = await api.getMoviesByCountry(slug, currentPage);
      } else if (type === 'year') {
         data = await api.getMoviesByYear(slug, currentPage);
      } else {
         // Category / Genre / Type
         if (['phim-le', 'phim-bo', 'hoat-hinh', 'tv-shows'].includes(slug)) {
            data = await api.getMovies(currentPage, slug);
         } else {
            data = await api.getMoviesByCategory(slug, currentPage);
         }
      }

      setMovies(data.movies);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Error loading movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageTitle = () => {
     if (type === 'country') {
        const country = countries.find(c => c.slug === slug);
        return country ? t('category.countryTitle', { name: country.name }) : t('category.countryFallback', { slug });
     }
     if (type === 'year') {
        return t('category.yearTitle', { year: slug });
     }
     // Category / Type
     const categoryNames = {
      'phim-le': t('filters.single'),
      'phim-bo': t('filters.series'),
      'hoat-hinh': t('filters.animation'),
      'tv-shows': t('filters.tv')
    };
    if (categoryNames[slug]) return categoryNames[slug];
    
    const cat = categories.find(c => c.slug === slug);
    return cat ? t('category.genreTitle', { name: cat.name }) : slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container">
        <div className="mb-8 pb-4 border-b border-white/5">
          <h1 className="text-3xl font-bold mb-2 capitalize border-l-4 border-accent-cyan pl-4">
            {getPageTitle()}
          </h1>
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
          </>
        )}
      </div>
    </div>
  );
}

export default Category;
