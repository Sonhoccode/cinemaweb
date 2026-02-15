import React from 'react';
import { Link } from 'react-router-dom'; // Assuming Link is from react-router-dom
import { useI18n } from '../../i18n';

function Footer() {
  const { t } = useI18n();
  return (
    <footer className="bg-gray-900 border-t border-gray-800 pt-16 pb-8">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="text-3xl font-extrabold tracking-tighter text-white mb-6 block">
              NosCinema
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              {t('home.heroSubtitle1')} {t('home.heroSubtitle2')}
            </p>
        </div>
        
        <div>
          <h4 className="text-white font-bold mb-4">{t('footer.categories')}</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><a href="/category/phim-le" className="hover:text-accent-cyan transition-colors">{t('nav.moviesSingle')}</a></li>
            <li><a href="/category/phim-bo" className="hover:text-accent-cyan transition-colors">{t('nav.moviesSeries')}</a></li>
            <li><a href="/category/hoat-hinh" className="hover:text-accent-cyan transition-colors">{t('filters.animation')}</a></li>
            <li><a href="/category/tv-shows" className="hover:text-accent-cyan transition-colors">TV Shows</a></li>
          </ul>
        </div>

        <div>
           <h4 className="text-white font-bold mb-4">{t('footer.info')}</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><a href="#" className="hover:text-accent-cyan transition-colors">{t('footer.about')}</a></li>
            <li><a href="#" className="hover:text-accent-cyan transition-colors">{t('footer.contact')}</a></li>
            <li><a href="#" className="hover:text-accent-cyan transition-colors">{t('footer.terms')}</a></li>
            <li><a href="#" className="hover:text-accent-cyan transition-colors">{t('footer.privacy')}</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold mb-4">{t('footer.contactTitle')}</h4>
          <p className="text-gray-400 text-sm mb-2">Email: caoson1193@gmail.com</p>
          <p className="text-gray-400 text-sm">Facebook: Hoàng Sơn</p>
        </div>
      </div>
      </div>
      
      <div className="border-t border-gray-800 pt-8 text-center">
        <div className="container">
          <p className="text-gray-500 text-sm">&copy; 2026 NosCinema. {t('footer.rights')}</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
