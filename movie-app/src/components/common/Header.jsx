import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import SearchBar from './SearchBar';
import { api } from '../../services/api';
import { useI18n } from '../../i18n';

function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  
  // Data for menus
  const [categories, setCategories] = useState([]);
  const [countries, setCountries] = useState([]);
  
  // Years list (2026 -> 2010)
  const years = Array.from({ length: 2026 - 2009 }, (_, i) => 2026 - i);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    
    // Fetch filter data
    const fetchData = async () => {
        try {
            const [cats, counts] = await Promise.all([
                api.getCategories(),
                api.getCountries()
            ]);
            setCategories(cats || []);
            setCountries(counts || []);
        } catch (e) {
            console.error("Header data fetch error", e);
        }
    };
    fetchData();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const NavItem = ({ title, children }) => (
      <div className="relative group px-3 py-2">
          <button className="text-gray-300 hover:text-white font-medium flex items-center gap-1 transition-colors">
              {title}
              <svg className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
          </button>
          <div className="absolute left-0 mt-2 w-48 bg-primary-lighter rounded-xl shadow-2xl border border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-left z-50 overflow-hidden">
              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                {children}
              </div>
          </div>
  
  // Data for menus
  const [categories, setCategories] = useState([]);
  const [countries, setCountries] = useState([]);
  
  // Years list (2026 -> 2010)
  const years = Array.from({ length: 2026 - 2009 }, (_, i) => 2026 - i);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    
    // Fetch filter data
    const fetchData = async () => {
        try {
            const [cats, counts] = await Promise.all([
                api.getCategories(),
                api.getCountries()
            ]);
            setCategories(cats || []);
            setCountries(counts || []);
        } catch (e) {
            console.error("Header data fetch error", e);
        }
    };
    fetchData();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const NavItem = ({ title, children }) => (
      <div className="relative group px-3 py-2">
          <button className="text-gray-300 hover:text-white font-medium flex items-center gap-1 transition-colors">
              {title}
              <svg className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
          </button>
          <div className="absolute left-0 mt-2 w-48 bg-primary-lighter rounded-xl shadow-2xl border border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-left z-50 overflow-hidden">
              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                {children}
              </div>
          </div>
      </div>
  );

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-primary-dark shadow-md py-3' : 'bg-transparent py-5'}`}>
      <nav className="container flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-white shrink-0 mr-4">
          <img src="/logo.svg" alt="NosCinema" className="w-8 h-8 rounded-lg" />
          <span className="hidden sm:inline">NosCinema</span>
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-1">
            <Link to="/" className="text-gray-300 hover:text-white font-medium px-3 py-2">{t('nav.home')}</Link>
            
            <NavItem title={t('nav.categories')}>
                {categories.map(cat => (
                    <Link 
                        key={cat._id} 
                        to={`/category/${cat.slug}`}
                        className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 truncate"
                    >
                        {cat.name}
                    </Link>
                ))}
            </NavItem>

            <NavItem title={t('nav.countries')}>
                {countries.map(c => (
                    <Link 
                        key={c._id} 
                        to={`/country/${c.slug}`}
                        className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 truncate"
                    >
                        {c.name}
                    </Link>
                ))}
            </NavItem>

             <NavItem title={t('nav.year')}>
                {years.map(y => (
                    <Link 
                        key={y} 
                        to={`/year/${y}`}
                        className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 truncate"
                    >
                        {y}
                    </Link>
                ))}
            </NavItem>

            <Link to="/category/phim-le" className="text-gray-300 hover:text-white font-medium px-3 py-2">{t('nav.moviesSingle')}</Link>
            <Link to="/category/phim-bo" className="text-gray-300 hover:text-white font-medium px-3 py-2">{t('nav.moviesSeries')}</Link>
        </div>

        <div className="flex-1 max-w-md mx-4 hidden sm:block">
          <SearchBar />
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <button
              className="px-2 py-1 text-xs font-bold text-gray-300 hover:text-white border border-white/10 rounded-md hover:border-white/30 transition-colors flex items-center gap-1"
              title={lang === 'vi' ? t('misc.langSwitchEn') : t('misc.langSwitchVi')}
            >
              {lang === 'vi' ? 'VI' : 'EN'}
              <svg className="w-3 h-3 text-gray-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div className="absolute right-0 mt-2 w-32 bg-primary-lighter rounded-lg shadow-xl border border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden">
              <button
                onClick={() => setLang('vi')}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${lang === 'vi' ? 'text-white bg-white/10' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
              >
                VI
              </button>
              <button
                onClick={() => setLang('en')}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${lang === 'en' ? 'text-white bg-white/10' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
              >
                EN
              </button>
            </div>
          </div>
          <Link to="/search" className="p-2 text-gray-300 hover:text-accent-cyan transition-colors sm:hidden">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </Link>

          {user ? (
             <div className="relative group">
               <button className="flex items-center gap-2 text-white font-medium hover:text-accent-cyan transition-colors">
                 <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold">
                    {user.username?.[0]?.toUpperCase()}
                 </div>
                 <span className="hidden sm:inline max-w-[100px] truncate">{user.username}</span>
               </button>
               {/* User Dropdown */}
               <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden transform scale-90 opacity-0 invisible group-hover:scale-100 group-hover:opacity-100 group-hover:visible transition-all duration-200 origin-top-right">
                  <div className="px-4 py-3 border-b border-gray-700">
                    <p className="text-sm text-white font-bold truncate">{user.username}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                  <Link to="/history" className="block px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
                     {t('nav.history')}
                  </Link>
                  <Link to="/settings" className="block px-4 py-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
                     {t('nav.settings')}
                  </Link>
                  <button 
                    onClick={logout}
                    className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors border-t border-gray-700"
                  >
                     {t('nav.logout')}
                  </button>
               </div>
             </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link 
                to="/login"
                className="text-sm font-bold text-gray-300 hover:text-white transition-colors hidden md:block"
              >
                {t('nav.login')}
              </Link>
              <Link 
                to="/register"
                className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all text-nowrap"
              >
                {t('nav.register')}
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Header;
