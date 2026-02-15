import React, { useState, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n';

function CommentSection({ movieSlug, episodeSlug }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    fetchComments();
  }, [movieSlug, episodeSlug]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${backendUrl}/comments/${movieSlug}/${episodeSlug}`);
      const data = await response.json();
      if (response.ok) {
        setComments(data);
      }
    } catch (err) {
      console.error("Failed to fetch comments", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    if (!user) {
        setError(t('comment.loginRequired'));
        return;
    }

    try {
      const response = await fetch(`${backendUrl}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          movieSlug,
          episodeSlug,
          content: newComment
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setComments([data, ...comments]); // Prepend new comment
        setNewComment('');
        setError(null);
      } else {
        setError(data.message || t('comment.sendFailed'));
      }
    } catch (err) {
      setError(t('comment.serverError'));
    }
  };

  const handleDelete = async (commentId) => {
      if (!confirm(t('comment.confirmDelete'))) return;

      try {
          const response = await fetch(`${backendUrl}/comments/${commentId}`, {
              method: 'DELETE',
              headers: {
                  'Authorization': `Bearer ${user.token}`
              }
          });
          
          if (response.ok) {
              setComments(comments.filter(c => c._id !== commentId));
          }
      } catch (err) {
          alert(t('comment.deleteFailed'));
      }
  };

  return (
    <div className="bg-primary-lighter rounded-xl p-6 mt-8">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <svg className="w-6 h-6 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
        </svg>
        {t('comment.title', { count: comments.length })}
      </h3>

      {/* Input Box */}
      <div className="mb-8">
        {user ? (
            <form onSubmit={handleSubmit} className="relative">
                <textarea
                    className="w-full bg-black/20 border border-gray-700 rounded-lg p-4 text-white placeholder-gray-500 focus:outline-none focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan transition-all resize-none"
                    rows="3"
                    placeholder={t('comment.placeholder')}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    required
                ></textarea>
                <div className="flex justify-between items-center mt-2">
                    {error && <span className="text-red-500 text-sm">{error}</span>}
                    <button 
                        type="submit" 
                        className="ml-auto px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                        disabled={!newComment.trim()}
                    >
                        <span>{t('comment.send')}</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                </div>
            </form>
        ) : (
            <div className="bg-black/20 rounded-lg p-6 text-center border border-dashed border-gray-700">
                <p className="text-gray-400 mb-2">{t('comment.loginRequired')}</p>
                <Link to="/login" className="inline-block px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
                    {t('comment.loginNow')}
                </Link>
            </div>
        )}
      </div>

      {/* Comments List */}
      <div className="space-y-6">
        {loading ? (
             <div className="text-center py-4 text-gray-500">{t('comment.loading')}</div>
        ) : comments.length > 0 ? (
            comments.map(comment => (
                <div key={comment._id} className="flex gap-4 group">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shrink-0 shadow-lg">
                        {comment.user?.username?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                        <div className="bg-black/20 rounded-2xl rounded-tl-none p-4 border border-white/5 relative">
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-accent-cyan font-bold">{comment.user?.username}</span>
                                <span className="text-xs text-gray-500">
                                    {new Date(comment.createdAt).toLocaleDateString(locale, { 
                                        hour: '2-digit', 
                                        minute: '2-digit',
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric'
                                    })}
                                </span>
                            </div>
                            
                            {/* Episode Badge (Only show if viewing All comments and it's not a full-movie comment) */}
                            {episodeSlug === 'all' && comment.episodeSlug !== 'full-movie' && (
                                <div className="mb-2">
                                    <span className="bg-blue-600/20 text-blue-400 text-xs px-2 py-0.5 rounded border border-blue-600/30">
                                        {comment.episodeSlug?.startsWith('tap-') 
                                            ? t('episode.number', { num: comment.episodeSlug.replace('tap-', '') })
                                            : comment.episodeSlug}
                                    </span>
                                </div>
                            )}

                            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                            
                            {/* Delete Button (Owner only) */}
                            {user && user.username === comment.user?.username && (
                                <button 
                                    onClick={() => handleDelete(comment._id)}
                                    className="absolute bottom-2 right-4 text-xs text-red-500/50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    {t('comment.delete')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ))
        ) : (
            <div className="text-center py-10 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                <p>{t('comment.empty')}</p>
            </div>
        )}
      </div>
    </div>
  );
}

export default CommentSection;
