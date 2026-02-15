const API_BASE = import.meta.env.VITE_API_BASE_URL;
const IMAGE_PROXY = `${import.meta.env.VITE_API_BASE_URL}/image.php?url=`;

export const api = {
  // Get movies with filters
  async getMovies(page = 1, filter = "phim-moi-cap-nhat") {
    try {
    const endpoint =
        filter === "phim-moi-cap-nhat"
          ? `/danh-sach/${filter}-v3?page=${page}`
          : `/v1/api/danh-sach/${filter}?page=${page}`;

      const response = await fetch(API_BASE + endpoint);
      const data = await response.json();

      return {
        movies: data.data?.items || data.items || [],
        totalPages:
          data.data?.params?.pagination?.totalPages ||
          data.pagination?.totalPages ||
          1,
        currentPage: page,
      };
    } catch (error) {
      console.error("Error fetching movies:", error);
      throw error;
    }
  },

  // Search movies
  async searchMovies(keyword, page = 1) {
    try {
      const response = await fetch(
        `${API_BASE}/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`,
      );
      const data = await response.json();

      return {
        movies: data.data?.items || [],
        totalPages: data.data?.params?.pagination?.totalPages || 1,
        currentPage: page,
      };
    } catch (error) {
      console.error("Error searching movies:", error);
      throw error;
    }
  },

  // Get movie details
  async getMovieDetail(slug) {
    try {
      const response = await fetch(`${API_BASE}/phim/${slug}`);
      const data = await response.json();

      if ((data.status === true || data.status === "success") && data.movie) {
        return { ...data.movie, episodes: data.episodes };
      }
      throw new Error("Movie not found");
    } catch (error) {
      console.error("Error fetching movie detail:", error);
      throw error;
    }
  },

  // Get categories
  async getCategories() {
    try {
      const response = await fetch(`${API_BASE}/the-loai`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching categories:", error);
      throw error;
    }
  },

  // Get movies by category
  async getMoviesByCategory(categorySlug, page = 1) {
    try {
      const response = await fetch(
        `${API_BASE}/v1/api/the-loai/${categorySlug}?page=${page}`,
      );
      const data = await response.json();

      return {
        movies: data.data?.items || [],
        totalPages: data.data?.params?.pagination?.totalPages || 1,
        currentPage: page,
      };
    } catch (error) {
      console.error("Error fetching category movies:", error);
      throw error;
    }
  },

  // Get countries
  async getCountries() {
    try {
      const response = await fetch(`${API_BASE}/quoc-gia`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching countries:", error);
      throw error;
    }
  },

  // Get movies by country
  async getMoviesByCountry(countrySlug, page = 1) {
    try {
      const response = await fetch(
        `${API_BASE}/v1/api/quoc-gia/${countrySlug}?page=${page}`,
      );
      const data = await response.json();

      return {
        movies: data.data?.items || [],
        totalPages: data.data?.params?.pagination?.totalPages || 1,
        currentPage: page,
      };
    } catch (error) {
      console.error("Error fetching country movies:", error);
      throw error;
    }
  },

  // Get movies by year
  async getMoviesByYear(year, page = 1) {
    try {
      const response = await fetch(
        `${API_BASE}/v1/api/nam/${year}?page=${page}`,
      );
      const data = await response.json();

      return {
        movies: data.data?.items || [],
        totalPages: data.data?.params?.pagination?.totalPages || 1,
        currentPage: page,
      };
    } catch (error) {
      console.error("Error fetching year movies:", error);
      throw error;
    }
  },

  // Image URL helper
  getImageUrl(imageUrl) {
    if (!imageUrl) return '/placeholder.jpg';

    // If already a full URL, return as is
    if (imageUrl.startsWith('http')) return imageUrl;

    // Otherwise construct the full URL using the CDN domain
    const fullUrl = `https://phimimg.com/${imageUrl}`;
    
    // Return the WebP proxy URL
    return `${API_BASE}/image.php?url=${fullUrl}`;
  }
};
