import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n';

function SearchBar() {
  const [keyword, setKeyword] = useState('');
  const navigate = useNavigate();
  const { t } = useI18n();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (keyword.trim()) {
      navigate(`/search?q=${encodeURIComponent(keyword)}`);
      setKeyword('');
    }
  };

  return (
    <form className="relative w-full" onSubmit={handleSubmit}>
      <div className="relative group">
        <input
          type="text"
          className="w-full bg-primary-lighter border border-white/10 rounded-full py-2.5 pl-5 pr-12 text-sm text-white placeholder-gray-500 outline-none transition-all duration-300 focus:border-accent-cyan/50 focus:bg-primary-dark focus:shadow-[0_0_15px_rgba(0,217,255,0.1)] group-hover:border-white/20"
          placeholder={t('search.placeholder')}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button 
          type="submit" 
          className="absolute right-1.5 top-1.5 p-1.5 rounded-full bg-transparent text-gray-400 hover:bg-white/10 hover:text-white transition-all duration-300"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>
      </div>
    </form>
  );
}

export default SearchBar;
