
const API_BASE = "https://phimapi.com";

async function checkYear() {
    try {
        console.log("Checking /v1/api/nam/2024...");
        const res = await fetch(`${API_BASE}/v1/api/nam/2024`);
        if (res.ok) {
            const data = await res.json();
             console.log("Year 2024:", data.data?.items?.length ? "Found items" : "Empty");
        } else {
            console.log("Endpoint /v1/api/nam/2024 failed");
        }

    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkYear();
