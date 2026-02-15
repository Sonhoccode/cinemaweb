
const API_BASE = "https://phimapi.com";

async function checkEndpoints() {
    try {
        console.log("Checking /the-loai...");
        const cats = await fetch(`${API_BASE}/the-loai`).then(r => r.json());
        console.log("Categories:", cats.length ? "Found" : "Empty");

        console.log("Checking /quoc-gia...");
        const countries = await fetch(`${API_BASE}/quoc-gia`).then(r => r.json());
        console.log("Countries:", countries.length ? "Found" : "Empty");
        if(countries.length > 0) console.log("Sample Country:", countries[0]);

    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkEndpoints();
