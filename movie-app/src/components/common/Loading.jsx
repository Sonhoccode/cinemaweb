import React from 'react';

export function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-12">
      <div className="w-10 h-10 border-4 border-white/10 border-t-accent-cyan rounded-full animate-spin shadow-glow"></div>
    </div>
  );
}

export function LoadingSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
      {Array(count).fill(0).map((_, index) => (
        <div key={index} className="rounded-xl overflow-hidden bg-primary-lighter animate-pulse">
          <div className="aspect-[2/3] bg-white/5"></div>
          <div className="p-4 space-y-2">
            <div className="h-4 bg-white/5 rounded w-3/4"></div>
            <div className="h-3 bg-white/5 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default LoadingSpinner;
