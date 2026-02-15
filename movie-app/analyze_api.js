
const API_BASE = "https://phimapi.com";

async function checkMovieDetail() {
    try {
        // Fetch a random movie to check metadata
        // Using 'hoat-hinh' to find an anime which usually has intros
        const list = await fetch(`${API_BASE}/v1/api/danh-sach/hoat-hinh?limit=1`).then(r => r.json());
        const slug = list.data.items[0].slug;
        
        console.log(`Checking movie: ${slug}`);
        const detail = await fetch(`${API_BASE}/phim/${slug}`).then(r => r.json());
        
        // Inspect for keys related to intro, skip, time, etc.
        console.log("Movie Keys:", Object.keys(detail.movie));
        console.log("Episode Keys:", Object.keys(detail.episodes[0]));
        console.log("Server Data Keys:", Object.keys(detail.episodes[0].server_data[0]));
        
        // Check deep values for 'intro' or 'skip'
        console.log("Sample Server Data:", detail.episodes[0].server_data[0]);

    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkMovieDetail();
