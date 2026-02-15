import React from 'react';
import { useI18n } from '../../i18n';

function EpisodeList({ episodes, currentEpisode, onEpisodeSelect, watchedEpisodes, mode = 'grid', gridClass }) {
  const { t } = useI18n();
  if (!episodes || episodes.length === 0) {
    return null;
  }

  // Default grid layout if not provided
  const defaultGridClass = 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-2';
  const containerClass = mode === 'grid' ? (gridClass || defaultGridClass) : 'flex flex-col space-y-2';

  return (
    <div className="mt-2 text-white">
      <div className={containerClass}>
        {episodes.map((episode, index) => {
            // Robust check: match slug OR name, handling both string array (legacy) and object array
            const isWatched = Array.isArray(watchedEpisodes) && watchedEpisodes.some(w => {
                if (typeof w === 'string') return w === (episode.slug || episode.name); 
                if (typeof w === 'object' && w !== null) {
                     return (episode.slug && w.episodeSlug === episode.slug) || (w.episodeName === episode.name);
                }
                return false;
            });

            const isCurrent = index === currentEpisode;
            
            // Base classes for all buttons
            let buttonClass = "relative overflow-hidden rounded-lg text-sm font-medium transition-all duration-200 border flex items-center justify-center";
            
            // Layout specific classes
            if (mode === 'grid') {
                buttonClass += " py-2 px-1 h-10"; // Fixed height for grid buttons
            } else {
                buttonClass += " py-3 px-4 w-full justify-between"; // List items
            }

            // State specific styling (Color/Border)
            if (isCurrent) {
                buttonClass += " bg-blue-600 border-blue-500 text-white shadow-md z-10 scale-105";
            } else if (isWatched) {
                buttonClass += " bg-gray-800 border-gray-700 text-gray-500 opacity-75 hover:opacity-100 hover:bg-gray-700 hover:text-gray-200";
            } else {
                buttonClass += " bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500";
            }

            return (
                <button
                key={index}
                className={buttonClass}
                onClick={() => onEpisodeSelect(index)}
                title={isWatched ? t('episode.watched') : episode.name}
                >
                {/* Content Container */}
                <div className="flex items-center gap-2 truncate max-w-full">
                    {isCurrent && mode === 'vertical' && (
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shrink-0"></span>
                    )}
                    <span className="truncate text-xs sm:text-sm">{episode.name}</span>
                </div>
                
                {/* Watched Indicator (Absolute for Grid, Inline for Vertical) */}
                {isWatched && !isCurrent && (
                    <div className={mode === 'grid' ? "absolute top-0.5 right-0.5" : "ml-2"}>
                        <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                )}
                </button>
            );
        })}
      </div>
    </div>
  );
}

export default EpisodeList;
