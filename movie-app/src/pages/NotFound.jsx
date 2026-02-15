import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';

function NotFound() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center text-center p-4">
      <div className="max-w-md">
        <h1 className="text-9xl font-black text-transparent bg-clip-text bg-gradient-primary mb-4">404</h1>
        <h2 className="text-2xl font-bold mb-4 text-white">{t('misc.notFoundTitle')}</h2>
        <p className="text-gray-400 mb-8">
          {t('misc.notFoundDesc')}
        </p>
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-primary rounded-full text-white font-bold shadow-glow hover:shadow-glow-strong hover:-translate-y-1 transition-all duration-300"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          {t('misc.backHome')}
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
