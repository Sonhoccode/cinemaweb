import React from 'react';


function Pagination({ currentPage, totalPages, onPageChange }) {
  const getPageNumbers = () => {
    const maxVisible = 7;
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        range.push(i);
      }
    }

    let l;
    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  return (
    <div className="flex justify-center items-center gap-2 mt-12 mb-8">
      <button
        className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary-lighter border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      {getPageNumbers().map((page, index) => (
        <button
          key={page}
          className={`
            w-10 h-10 rounded-lg text-sm font-bold transition-all duration-300 flex items-center justify-center
            ${currentPage === page
              ? 'bg-blue-600 text-white shadow-md scale-110'
              : page === '...'
                ? 'bg-transparent text-gray-500 cursor-default'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }
          `}
          onClick={() => typeof page === 'number' && onPageChange(page)}
          disabled={page === '...'}
        >
          {page}
        </button>
      ))}

      <button
        className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary-lighter border border-white/10 text-gray-400 hover:bg-white/5 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>
  );
}

export default Pagination;
