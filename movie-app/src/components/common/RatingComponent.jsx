import React, { useState, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import { useI18n } from '../../i18n';

const RatingComponent = ({ movieSlug }) => {
  const [rating, setRating] = useState(0); // Current user's rating
  const [average, setAverage] = useState(0);
  const [count, setCount] = useState(0);
  const [hover, setHover] = useState(0);
  const { user } = useAuth();
  const { t } = useI18n();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    fetchRating();
    if (user) {
        fetchUserRating();
    }
  }, [movieSlug, user]);

  const fetchRating = async () => {
    try {
        const res = await fetch(`${backendUrl}/ratings/${movieSlug}`);
        const data = await res.json();
        setAverage(data.average || 0);
        setCount(data.count || 0);
    } catch (err) {
        console.error("Failed to fetch rating", err);
    }
  };

  const fetchUserRating = async () => {
    try {
        const res = await fetch(`${backendUrl}/ratings/${movieSlug}/user`, {
            headers: { 'Authorization': `Bearer ${user.token}` }
        });
        const data = await res.json();
        if (data.score) setRating(data.score);
    } catch (err) {
        console.error("Failed to fetch user rating", err);
    }
  };

  const handleRate = async (score) => {
      if (!user) {
          alert(t('rating.loginAlert'));
          return;
      }
      
      try {
          const res = await fetch(`${backendUrl}/ratings`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${user.token}`
              },
              body: JSON.stringify({ movieSlug, score })
          });
          const data = await res.json();
          if (res.ok) {
              setRating(score);
              fetchRating(); // Refresh average
          } else {
              alert(data.message || t('rating.error'));
          }
      } catch (err) {
          console.error("Rate error", err);
      }
  };

  return (
    <div className="bg-primary-lighter/30 rounded-xl p-6 border border-white/5 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                {t('rating.title')}
            </h3>
            <div className="text-right">
                <div className="text-3xl font-bold text-yellow-500">{average}<span className="text-lg text-gray-500">/10</span></div>
                <div className="text-xs text-gray-400">{t('rating.count', { count })}</div>
            </div>
        </div>

        <div className="flex items-center justify-center gap-2 py-4">
            {[...Array(10)].map((_, index) => {
                const score = index + 1;
                return (
                    <button
                        key={score}
                        type="button"
                        className={`transition-all duration-200 ${score <= (hover || rating) ? 'text-yellow-400 scale-110' : 'text-gray-600 hover:text-yellow-200'}`}
                        onClick={() => handleRate(score)}
                        onMouseEnter={() => setHover(score)}
                        onMouseLeave={() => setHover(rating)}
                        title={t('rating.rateStar', { score })}
                    >
                        <svg className="w-6 h-6 md:w-8 md:h-8" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                    </button>
                );
            })}
        </div>
        {user ? (
            <p className="text-center text-sm text-gray-400 mt-2">
                {rating > 0 ? t('rating.yourRating', { score: rating }) : t('rating.encourage')}
            </p>
        ) : (
            <p className="text-center text-sm text-gray-500 mt-2">{t('rating.loginToRate')}</p>
        )}
    </div>
  );
};

export default RatingComponent;
