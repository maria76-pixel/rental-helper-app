// ══════════════════════════════════════════════
//  Rental Contract Helper — script.js  (Phase 1)
//  Backend connection comes in Phase 2
// ══════════════════════════════════════════════

// ── Sample building data (replace with API in Phase 2) ──────────────────────
const BUILDINGS_DB = [
    {
        id: 1,
        name: "Sunrise Apartments",
        address: "142 Oak Street, Downtown",
        type: "Apartment",
        image: "",           // put a filename here e.g. "sunrise.jpg"
        emoji: "🏠",
        rating: 4.2,
        amenities: ["Parking", "Gym", "Laundry"],
        reviews: [
            { stars: 5, date: "Mar 2025", text: "Great location, responsive landlord. Heating works perfectly all winter." },
            { stars: 4, date: "Jan 2025", text: "Nice building overall. A bit pricey but worth it for the amenities." },
            { stars: 3, date: "Nov 2024", text: "Maintenance can be slow on weekends, but they do fix things eventually." }
        ]
    },
    {
        id: 2,
        name: "Greenview Tower",
        address: "78 Elm Avenue, Midtown",
        type: "Condo",
        image: "housing-satire.jpg",
        emoji: "🏢",
        rating: 3.5,
        amenities: ["Concierge", "Rooftop"],
        reviews: [
            { stars: 2, date: "Feb 2025", text: "Landlord ignored multiple requests about the broken elevator for weeks." },
            { stars: 4, date: "Dec 2024", text: "Great views and modern interiors. Noise from the street can be an issue." },
            { stars: 4, date: "Oct 2024", text: "Generally a good place. Management improved a lot in the past year." }
        ]
    },
    {
        id: 3,
        name: "Lakeside Studios",
        address: "9 Lakeview Road, West End",
        type: "Studio",
        image: "",
        emoji: "🏡",
        rating: 4.7,
        amenities: ["Lake View", "Pet Friendly", "Bike Storage"],
        reviews: [
            { stars: 5, date: "Apr 2025", text: "Best landlord I have ever had. Issues are fixed same day. Highly recommend." },
            { stars: 5, date: "Feb 2025", text: "Super quiet, beautiful views, and management genuinely cares about tenants." }
        ]
    },
    {
        id: 4,
        name: "A1C Dorms",
        address: "Saadiyat Island, Abu Dhabi",
        type: "Apartment",
        image: "",
        emoji: "🏡",
        rating: 4.9,
        amenities: ["Lake View", "College Life", "Bike Storage"],
        reviews: [
            { stars: 5, date: "Apr 2025", text: "Best landlord I have ever had. Issues are fixed same day. Highly recommend." },
            { stars: 5, date: "Jan 2025", text: "Super quiet, beautiful views, and management genuinely cares about tenants." }
        ]
    },
];

// Store user-submitted reviews (in memory for Phase 1)
let userReviews = {};

// Currently viewed building id
let currentBuildingId = null;


// ── LEGAL TERM TRANSLATOR ────────────────────────────────────────────────────

const LEGAL_TERMS = {
    "indemnification": "This clause means you agree to protect the landlord from financial loss caused by your actions. For example, if a guest gets hurt in your apartment and sues, you — not the landlord — would have to cover the costs.",
    "subrogation": "If your insurance company pays for a loss (like a flood), this clause allows them to sue the responsible party (such as a neighbor) on your behalf to recover that money.",
    "force majeure": "A 'no blame' clause that excuses either party from their obligations if an extraordinary event beyond their control occurs — like a natural disaster, pandemic, or government action.",
    "lien": "A legal claim or hold on a property. If a landlord has a lien, it means someone else (like a bank or contractor) has a financial stake in the property and could affect your tenancy.",
    "latent defect": "A hidden flaw or problem with the property that was not visible during a normal inspection — like hidden mold, faulty wiring, or structural damage the landlord may have known about.",
    "habitability": "Your legal right to a safe, livable home. Landlords are legally required to maintain working plumbing, heating, and structural safety. If they fail, you may have the right to withhold rent.",
    "subletting": "Renting your apartment to another person while you are still on the lease. Many contracts forbid this or require landlord approval.",
    "easement": "A legal right for someone else to use part of your rented property for a specific purpose — like a utility company accessing a shared driveway.",
    "default": "When one party (usually the tenant) fails to meet a legal obligation — most commonly, not paying rent on time. Default can trigger penalty clauses.",
    "escrow": "Money held by a neutral third party until a condition is met. In rentals, a security deposit is sometimes held in escrow by a bank."
};

function quickTerm(term) {
    document.getElementById("legalInput").value = term;
    explainTerm();
}

function explainTerm() {
    const raw = document.getElementById("legalInput").value.trim().toLowerCase();
    const resultBox  = document.getElementById("legalResult");
    const resultText = document.getElementById("legalText");

    if (!raw) {
        shake(document.getElementById("legalInput"));
        return;
    }

    // Check our dictionary first
    const match = Object.keys(LEGAL_TERMS).find(k => raw.includes(k));

    if (match) {
        resultText.textContent = LEGAL_TERMS[match];
    } else {
        resultText.textContent = "Term not found in our current dictionary. In Phase 2, this will query a legal database. Try one of the quick-pick tags above!";
    }

    resultBox.classList.remove("hidden");
    resultBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
}


// ── RENT GROWTH CALCULATOR ──────────────────────────────────────────────────

function calculateRent() {
    const initial  = parseFloat(document.getElementById("initialRent").value);
    const rate     = parseFloat(document.getElementById("increaseRate").value);
    const months   = parseInt(document.getElementById("months").value);

    if (!initial || initial <= 0 || isNaN(rate) || !months || months < 1) {
        alert("Please fill in all three fields with valid numbers.");
        return;
    }

    if (initial > 1_000_000 || rate > 100 || months > 600) {
        alert("Please enter realistic values (rent ≤ $1,000,000, rate ≤ 100%, months ≤ 600).");
        return;
    }

    let total       = 0;
    let currentRent = initial;
    let firstRent   = initial;
    let lastRent    = initial;
    let rows        = [];

    for (let m = 1; m <= months; m++) {
        // Apply annual increase at the start of each new year (after month 12, 24…)
        if (m > 1 && (m - 1) % 12 === 0) {
            currentRent = currentRent * (1 + rate / 100);
        }
        total += currentRent;
        lastRent = currentRent;

        // Collect yearly snapshots for the table
        if (m % 12 === 0 || m === months) {
            const year = Math.ceil(m / 12);
            rows.push({ label: m % 12 === 0 ? `Year ${year}` : `Month ${m} (partial)`, rent: currentRent, cumTotal: total });
        }
    }

    const increase = lastRent - firstRent;
    const increasePercent = ((increase / firstRent) * 100).toFixed(1);

    // Stats pills
    document.getElementById("rentStats").innerHTML = `
        <div class="stat-pill">
            <span class="stat-val">$${fmt(total)}</span>
            <span class="stat-key">Total Cost</span>
        </div>
        <div class="stat-pill">
            <span class="stat-val">$${fmt(lastRent)}</span>
            <span class="stat-key">Final Monthly Rent</span>
        </div>
        <div class="stat-pill">
            <span class="stat-val">+${increasePercent}%</span>
            <span class="stat-key">Total Increase</span>
        </div>
    `;

    // Yearly breakdown table
    let tableHTML = `
        <table class="breakdown-table">
            <thead><tr><th>Period</th><th>Monthly Rent</th><th>Cumulative Total</th></tr></thead>
            <tbody>
    `;
    rows.forEach(r => {
        tableHTML += `<tr>
            <td>${r.label}</td>
            <td>$${fmt(r.rent)}</td>
            <td>$${fmt(r.cumTotal)}</td>
        </tr>`;
    });
    tableHTML += "</tbody></table>";
    document.getElementById("rentBreakdown").innerHTML = tableHTML;

    const resultBox = document.getElementById("rentResult");
    resultBox.classList.remove("hidden");
    resultBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function fmt(n) {
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}


// ── BUILDING SEARCH ─────────────────────────────────────────────────────────

function searchBuilding() {
    const query = document.getElementById("buildingInput").value.trim().toLowerCase();
    const grid  = document.getElementById("buildingsGrid");

    // Hide detail panel if open
    closeDetail();

    if (!query) {
        shake(document.getElementById("buildingInput"));
        return;
    }

    const results = BUILDINGS_DB.filter(b =>
        b.name.toLowerCase().includes(query) ||
        b.address.toLowerCase().includes(query) ||
        b.type.toLowerCase().includes(query)
    );

    if (results.length === 0) {
        grid.innerHTML = `<p class="placeholder-text">😕 No buildings found for "<strong>${escHtml(query)}</strong>". Try "Sunrise", "Tower", or "Studio".</p>`;
        return;
    }

    grid.innerHTML = results.map(b => buildingCardHTML(b)).join("");
}

function buildingCardHTML(b) {
    const allReviews = [...b.reviews, ...(userReviews[b.id] || [])];
    const avgRating  = allReviews.length
        ? (allReviews.reduce((s, r) => s + r.stars, 0) / allReviews.length).toFixed(1)
        : b.rating.toFixed(1);

    const imgContent = b.image
        ? `<img src="${b.image}" alt="${escHtml(b.name)}">`
        : b.emoji;

    return `
    <div class="building-card" onclick="openDetail(${b.id})">
        <div class="building-card-img">${imgContent}</div>
        <div class="building-card-body">
            <p class="building-card-name">${escHtml(b.name)}</p>
            <p class="building-card-address">${escHtml(b.address)}</p>
            <div class="building-card-footer">
                <span>
                    <span class="stars">${starHTML(parseFloat(avgRating))}</span>
                    <span class="review-count">&nbsp;${avgRating} (${allReviews.length})</span>
                </span>
                <span class="badge-type">${escHtml(b.type)}</span>
            </div>
        </div>
    </div>`;
}

function openDetail(id) {
    const b = BUILDINGS_DB.find(x => x.id === id);
    if (!b) return;

    currentBuildingId = id;
    const allReviews  = [...b.reviews, ...(userReviews[id] || [])];
    const avgRating   = allReviews.length
        ? (allReviews.reduce((s, r) => s + r.stars, 0) / allReviews.length).toFixed(1)
        : b.rating.toFixed(1);

    const imgContent = b.image
        ? `<img src="${b.image}" alt="${escHtml(b.name)}">`
        : b.emoji;

    const reviewsHTML = allReviews.length
        ? allReviews.map(r => `
            <div class="review-item">
                <div class="review-item-header">
                    <span class="review-item-stars">${starHTML(r.stars)}</span>
                    <span class="review-item-date">${r.date || "Anonymous"}</span>
                </div>
                <p class="review-item-text">${escHtml(r.text)}</p>
            </div>`).join("")
        : `<p class="no-reviews">No reviews yet — be the first!</p>`;

    const amenitiesHTML = b.amenities.map(a => `<span class="detail-pill">${escHtml(a)}</span>`).join("");

    document.getElementById("detailInner").innerHTML = `
        <div class="detail-hero">
            <div class="detail-img">${imgContent}</div>
            <div class="detail-meta">
                <h3>${escHtml(b.name)}</h3>
                <p class="detail-address">📍 ${escHtml(b.address)}</p>
                <div class="detail-pills">${amenitiesHTML}</div>
                <div class="detail-rating-big">
                    <span class="star-big">★</span> ${avgRating}
                    <span style="font-size:0.85rem;font-weight:400;color:var(--text-muted)">&nbsp;from ${allReviews.length} review${allReviews.length !== 1 ? "s" : ""}</span>
                </div>
            </div>
        </div>

        <div class="reviews-section">
            <h4>Tenant Reviews</h4>
            <div id="reviewsList">${reviewsHTML}</div>
        </div>

        <div class="review-form-section">
            <h4>Leave an Anonymous Review</h4>
            <div class="star-rating" id="starRating">
                <span class="star" data-val="1">★</span>
                <span class="star" data-val="2">★</span>
                <span class="star" data-val="3">★</span>
                <span class="star" data-val="4">★</span>
                <span class="star" data-val="5">★</span>
            </div>
            <input type="hidden" id="ratingValue" value="0">
            <div class="field-group" style="margin-top:10px">
                <label>Your Review</label>
                <textarea id="reviewText" placeholder="Share your honest experience about this building…"></textarea>
            </div>
            <button class="btn btn-building" onclick="submitReview()">Submit Review</button>
            <p class="submit-note" id="submitNote"></p>
        </div>
    `;

    // Attach star rating events
    initStarRating("starRating", "ratingValue");

    document.getElementById("buildingsGrid").classList.add("hidden");
    const panel = document.getElementById("buildingDetail");
    panel.classList.remove("hidden");
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeDetail() {
    document.getElementById("buildingDetail").classList.add("hidden");
    document.getElementById("buildingsGrid").classList.remove("hidden");
    currentBuildingId = null;
}

function submitReview() {
    const rating = parseInt(document.getElementById("ratingValue").value);
    const text   = document.getElementById("reviewText").value.trim();
    const note   = document.getElementById("submitNote");

    if (rating === 0) { note.style.color = "#dc2626"; note.textContent = "Please select a star rating."; return; }
    if (!text)        { note.style.color = "#dc2626"; note.textContent = "Please write a short review."; return; }

    const now = new Date().toLocaleString("en-US", { month: "short", year: "numeric" });

    if (!userReviews[currentBuildingId]) userReviews[currentBuildingId] = [];
    userReviews[currentBuildingId].push({ stars: rating, date: now, text });

    // Refresh reviews list inline
    const allReviews = [
        ...BUILDINGS_DB.find(b => b.id === currentBuildingId).reviews,
        ...userReviews[currentBuildingId]
    ];

    document.getElementById("reviewsList").innerHTML = allReviews.map(r => `
        <div class="review-item">
            <div class="review-item-header">
                <span class="review-item-stars">${starHTML(r.stars)}</span>
                <span class="review-item-date">${r.date || "Anonymous"}</span>
            </div>
            <p class="review-item-text">${escHtml(r.text)}</p>
        </div>`).join("");

    // Reset form
    document.getElementById("reviewText").value = "";
    document.getElementById("ratingValue").value = "0";
    document.querySelectorAll("#starRating .star").forEach(s => s.classList.remove("active"));
    note.style.color = "#0f766e";
    note.textContent = "✓ Review submitted — thank you!";

    // Refresh card in grid too
    searchBuilding();
}


// ── STAR RATING WIDGET ───────────────────────────────────────────────────────

function initStarRating(containerId, inputId) {
    const container = document.getElementById(containerId);
    const input     = document.getElementById(inputId);
    if (!container) return;

    const stars = container.querySelectorAll(".star");

    stars.forEach(star => {
        star.addEventListener("mouseover", () => {
            const val = parseInt(star.dataset.val);
            stars.forEach(s => s.classList.toggle("active", parseInt(s.dataset.val) <= val));
        });

        star.addEventListener("mouseout", () => {
            const selected = parseInt(input.value);
            stars.forEach(s => s.classList.toggle("active", parseInt(s.dataset.val) <= selected));
        });

        star.addEventListener("click", () => {
            input.value = star.dataset.val;
            const selected = parseInt(input.value);
            stars.forEach(s => s.classList.toggle("active", parseInt(s.dataset.val) <= selected));
        });
    });
}


// ── HELPERS ──────────────────────────────────────────────────────────────────

function starHTML(rating) {
    let html = "";
    for (let i = 1; i <= 5; i++) {
        html += `<span class="${i <= Math.round(rating) ? "stars" : "stars-empty"}">★</span>`;
    }
    return html;
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function shake(el) {
    el.style.animation = "none";
    el.offsetHeight; // reflow
    el.style.animation = "shake 0.3s ease";
    el.addEventListener("animationend", () => el.style.animation = "", { once: true });
}

// Add shake animation to stylesheet dynamically
const shakeStyle = document.createElement("style");
shakeStyle.textContent = `
@keyframes shake {
    0%,100% { transform: translateX(0); }
    20%,60%  { transform: translateX(-5px); }
    40%,80%  { transform: translateX(5px); }
}`;
document.head.appendChild(shakeStyle);

console.log("Rental Contract Helper — Phase 1 loaded ✓");
