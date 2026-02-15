import React, { useState, useEffect } from 'react';
import useAuth from '../hooks/useAuth';
import { useI18n } from '../i18n';

function Settings() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [seekTime, setSeekTime] = useState(10);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    // Load settings from localStorage
    const savedSeekTime = localStorage.getItem('player_seek_time');
    if (savedSeekTime) setSeekTime(parseInt(savedSeekTime));

    const savedAutoPlay = localStorage.getItem('player_auto_play');
    if (savedAutoPlay) setAutoPlay(savedAutoPlay === 'true');
  }, []);

  const handleSeekTimeChange = (value) => {
    setSeekTime(value);
    localStorage.setItem('player_seek_time', value);
  };

  const handleAutoPlayChange = (e) => {
      const checked = e.target.checked;
      setAutoPlay(checked);
      localStorage.setItem('player_auto_play', checked);
  };

  return (
    <div className="min-h-screen pt-24 pb-10 container mx-auto px-4">
      <div className="max-w-2xl mx-auto bg-primary-lighter rounded-2xl p-8 border border-white/5 shadow-2xl">
        <h1 className="text-3xl font-bold text-white mb-8 border-l-4 border-accent-cyan pl-4">
          {t('settings.title')}
        </h1>

        <div className="space-y-8">
            {/* Player Settings */}
            <section>
                <h2 className="text-xl font-bold text-gray-200 mb-4 flex items-center gap-2">
                    <svg className="w-6 h-6 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    {t('settings.player')}
                </h2>
                
                <div className="bg-primary-dark/50 rounded-xl p-6 space-y-6">
                    {/* Seek Time */}
                    <div>
                        <label className="block text-gray-300 font-medium mb-3">{t('settings.seekTime')}</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[5, 10, 15, 30].map((time) => (
                                <button
                                    key={time}
                                    onClick={() => handleSeekTimeChange(time)}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                        seekTime === time 
                                        ? 'bg-gradient-primary text-white shadow-glow' 
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    {t('settings.seconds', { count: time })}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{t('settings.seekHint')}</p>
                    </div>

                    {/* Auto Play (Future Proofing) */}
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="block text-gray-300 font-medium">{t('settings.autoNext')}</label>
                            <p className="text-xs text-gray-500">{t('settings.autoNextHint')}</p>
                        </div>
                         <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={autoPlay} onChange={handleAutoPlayChange} className="sr-only peer" disabled />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-cyan opacity-50 cursor-not-allowed"></div>
                        </label>
                    </div>
                </div>
            </section>

             {/* Account Settings */}
             <section>
                <h2 className="text-xl font-bold text-gray-200 mb-4 flex items-center gap-2">
                    <svg className="w-6 h-6 text-accent-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {t('settings.account')}
                </h2>
                 <div className="bg-primary-dark/50 rounded-xl p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center text-xl font-bold text-white shadow-lg">
                            {user?.username?.[0]?.toUpperCase()}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">{user?.username}</h3>
                            <p className="text-gray-400">{user?.email}</p>
                        </div>
                    </div>
                 </div>
             </section>
        </div>
      </div>
    </div>
  );
}

export default Settings;
