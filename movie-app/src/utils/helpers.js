// Format image URL through proxy
export const formatImageUrl = (imageUrl) => {
  if (!imageUrl) return '';
  return `https://phimapi.com/image.php?url=${encodeURIComponent(imageUrl)}`;
};

// Get quality label from movie data
export const getQualityLabel = (movie) => {
  return movie.quality || movie.lang || 'HD';
};

// Save to localStorage
export const saveToLocalStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

// Get from localStorage
export const getFromLocalStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return defaultValue;
  }
};

// Save watch progress
export const saveWatchProgress = (movieSlug, episodeIndex, currentTime) => {
  const progress = getFromLocalStorage('watchProgress', {});
  progress[movieSlug] = {
    episodeIndex,
    currentTime,
    timestamp: Date.now()
  };
  saveToLocalStorage('watchProgress', progress);
};

// Get watch progress
export const getWatchProgress = (movieSlug) => {
  const progress = getFromLocalStorage('watchProgress', {});
  return progress[movieSlug] || null;
};

// Format duration (seconds to HH:MM:SS)
export const formatDuration = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Debounce function
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};
