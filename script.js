// ============================================================
//  script.js
//  Rental Contract Helper — Frontend Logic
//  
//  This file is the brain of the website. It handles:
//    1. Firebase setup (Auth, Firestore, Storage)
//    2. User authentication (login, signup, logout)
//    3. DOM updates (changing what the user sees on screen)
//    4. Building search and detail page
//    5. Tenant reviews
//    6. Rent growth calculator
//    7. Deadline and renewal tracker
//    8. Admin panel (adding buildings)
//    9. Legal term translator
//   10. Helper functions
//
//  NOTE: All calculation logic (rent math, budget checks)
//  lives in BackendFunctions.java on the backend.
//  The local versions here are temporary mirrors used in
//  Phase 1 while the Java server is not yet connected.
//  In Phase 2, flip BACKEND_URL to your Java server address
//  and the website will use the Java functions instead.
// ============================================================


// ============================================================
//  SECTION 1 — FIREBASE SETUP
//  We import the Firebase tools we need and initialize the app.
//  Firebase gives us: Auth (users), Firestore (database),
//  and Storage (photos).
// ============================================================

import { initializeApp } from
    "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

import {
    getFirestore,
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-storage.js";

// Our Firebase project credentials
const firebaseConfig = {
    apiKey:            "AIzaSyBnW28s9JgtXLr2gOVNiNKZBh2PTc4i62A",
    authDomain:        "rental-contract-helper.firebaseapp.com",
    projectId:         "rental-contract-helper",
    storageBucket:     "rental-contract-helper.firebasestorage.app",
    messagingSenderId: "997716275483",
    appId:             "1:997716275483:web:e82cac48557c7a160723be"
};

// Start Firebase and get references to each service
const app     = initializeApp(firebaseConfig);
const auth    = getAuth(app);       // handles user accounts
const db      = getFirestore(app);  // handles database (buildings, reviews, deadlines)
const storage = getStorage(app);    // handles file uploads (building photos)

// Phase 2: set this to your Java server URL to use BackendFunctions.java
// Example: "http://localhost:8080" when running locally
// Example: "https://your-app.onrender.com" when deployed
const BACKEND_URL = null;
const USE_BACKEND = BACKEND_URL !== null;


// ============================================================
//  SECTION 2 — GLOBAL STATE
//  Variables that need to be remembered across functions.
// ============================================================

let currentUser       = null; // the logged-in Firebase user (null if not logged in)
let currentBuildingId = null; // the Firestore ID of whichever building is open


// ============================================================
//  SECTION 3 — USER AUTHENTICATION
//  Handles login, signup, logout, and detecting if a user
//  is already logged in when the page loads.
// ============================================================

// This runs automatically whenever the login state changes.
// If a user is logged in: show the dashboard and load their data.
// If no user is logged in: show the login page.
onAuthStateChanged(auth, function(user) {
    currentUser = user;

    if (user) {
        // User is logged in — update the header and go to dashboard
        updateUserBar(user);
        goTo("page-dashboard");
        loadDeadlines(); // load this user's saved deadlines from Firestore
    }
});

// Called when the user clicks "Create Account"
async function signup() {
    // Read the values the user typed in
    const name     = document.getElementById("signupName").value.trim();
    const email    = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const errorEl  = document.getElementById("signupError");

    // Basic validation before sending to Firebase
    if (!name || !email || !password) {
        showAuthError(errorEl, "Please fill in all fields.");
        return;
    }
    if (password.length < 6) {
        showAuthError(errorEl, "Password must be at least 6 characters.");
        return;
    }

    try {
        // Create the account in Firebase Auth
        const credential = await createUserWithEmailAndPassword(auth, email, password);

        // Save the user's display name to their profile
        await updateProfile(credential.user, { displayName: name });

        // onAuthStateChanged above will handle the redirect automatically

    } catch (error) {
        // Show a friendly error message instead of the raw Firebase error code
        showAuthError(errorEl, friendlyAuthError(error.code));
    }
}

// Called when the user clicks "Sign In"
async function login() {
    const email    = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const errorEl  = document.getElementById("loginError");

    if (!email || !password) {
        showAuthError(errorEl, "Please enter your email and password.");
        return;
    }

    try {
        // Sign in with Firebase Auth
        await signInWithEmailAndPassword(auth, email, password);

        // onAuthStateChanged above will handle the redirect automatically

    } catch (error) {
        showAuthError(errorEl, friendlyAuthError(error.code));
    }
}

// Called when the user clicks "Sign Out"
async function logout() {
    await signOut(auth);
    currentUser = null;
    goTo("page-auth"); // send them back to the login page
}

// Called when the user clicks "Continue without account"
function skipAuth() {
    goTo("page-dashboard");
}

// Switches between the Login and Create Account tabs on the auth page
function switchTab(tab) {
    // Show the correct form and hide the other
    document.getElementById("formLogin").classList.toggle("hidden",  tab !== "login");
    document.getElementById("formSignup").classList.toggle("hidden", tab !== "signup");

    // Highlight the active tab button
    document.getElementById("tabLogin").classList.toggle("active",  tab === "login");
    document.getElementById("tabSignup").classList.toggle("active", tab === "signup");
}

// Updates the greeting and buttons in the hero header
// Called after a successful login
function updateUserBar(user) {
    const userBar = document.getElementById("userBar");
    userBar.innerHTML = `
        <span class="user-greeting">👋 Hi, ${esc(user.displayName || user.email)}</span>
        <button class="user-btn" onclick="goTo('page-admin')">+ Add Building</button>
        <button class="user-btn user-btn-outline" onclick="logout()">Sign Out</button>
    `;
}

// Converts Firebase error codes into plain English messages
function friendlyAuthError(code) {
    const messages = {
        "auth/email-already-in-use": "This email is already registered. Try signing in.",
        "auth/invalid-email":        "That email address is not valid.",
        "auth/wrong-password":       "Incorrect password. Please try again.",
        "auth/user-not-found":       "No account found with that email.",
        "auth/weak-password":        "Password must be at least 6 characters.",
        "auth/too-many-requests":    "Too many attempts. Please wait a moment and try again.",
        "auth/invalid-credential":   "Incorrect email or password."
    };
    return messages[code] || "Something went wrong. Please try again.";
}

// Shows an error message below the auth form
function showAuthError(element, message) {
    element.textContent = message;
    element.classList.remove("hidden");
}


// ============================================================
//  SECTION 4 — PAGE NAVIGATION
//  The app has multiple "pages" that slide in and out.
//  Only one page is visible at a time.
//  We switch between them by adding/removing the "active" class.
// ============================================================

function goTo(pageId) {
    // Hide all pages
    document.querySelectorAll(".page").forEach(function(page) {
        page.classList.remove("active");
    });

    // Show only the requested page
    document.getElementById(pageId).classList.add("active");

    // Scroll back to the top of the new page
    window.scrollTo(0, 0);
}

function goBack() {
    goTo("page-dashboard");
}

// These need to be on window so the onclick attributes in index.html can find them
window.goTo   = goTo;
window.goBack = goBack;


// ============================================================
//  SECTION 5 — LEGAL TERM TRANSLATOR
//  The user types a legal term and gets a plain English
//  explanation. The dictionary lives here in Phase 1.
//  Phase 2: this will call GET /api/legal?term=... on the
//  Java backend (BackendFunctions.java).
// ============================================================

// Dictionary of legal terms and their plain English explanations
const LEGAL_TERMS = {
    "indemnification": "This clause means you agree to protect the landlord from financial loss caused by your actions. For example, if a guest is injured in your apartment and sues, you — not the landlord — would be responsible for covering those costs.",
    "subrogation":     "If your insurance company pays out for a loss, this clause lets them sue the responsible party on your behalf. It prevents you from claiming insurance and also suing the same party separately.",
    "force majeure":   "A 'no blame' clause. If something extraordinary and unforeseeable happens — like a natural disaster or pandemic — neither side is penalized for not fulfilling the contract.",
    "lien":            "A legal claim on the property. If a lien exists, a third party like a bank has a financial stake in the building. This could affect your tenancy if the landlord defaults on their payments.",
    "latent defect":   "A hidden flaw not visible during inspection — mold behind walls, faulty wiring, or structural damage the landlord knew about but did not tell you. You may have legal recourse if this appears after signing.",
    "habitability":    "Your legal right to a safe and livable home. Landlords must maintain working plumbing, heating, and structural integrity. If they fail, you may be able to withhold rent.",
    "subletting":      "Renting your unit to another person while you remain on the lease. Most contracts forbid this or require the landlord's written approval first.",
    "default":         "When one party fails to meet a legal obligation — most often the tenant not paying rent on time. This can trigger late fees, penalties, or eviction.",
    "easement":        "A legal right for a third party to use part of the property — like a utility company accessing shared pipes through your building.",
    "escrow":          "Money held by a neutral third party until a condition is met. Security deposits are often held in escrow to protect both tenant and landlord."
};

// Called when the user clicks a quick-pick tag like "Indemnification"
// It fills in the input and immediately explains it
window.quickTerm = function(term) {
    document.getElementById("legalInput").value = term;
    explainTerm();
};

// Called when the user clicks "Explain" or presses Enter
window.explainTerm = async function() {
    const input    = document.getElementById("legalInput");
    const resultBox = document.getElementById("legalResult");
    const resultText = document.getElementById("legalText");

    const userInput = input.value.trim().toLowerCase();

    // Don't do anything if the input is empty — shake it to indicate the problem
    if (!userInput) {
        shake(input);
        return;
    }

    if (USE_BACKEND) {
        // Phase 2: ask the Java backend for the explanation
        // BackendFunctions.java will handle the lookup
        try {
            const response = await fetch(`${BACKEND_URL}/api/legal?term=${encodeURIComponent(userInput)}`);
            const data     = await response.json();
            resultText.textContent = data.explanation || "Term not found in the database.";
        } catch (error) {
            resultText.textContent = "Could not reach the backend. Please try again.";
        }
    } else {
        // Phase 1: look up the term in our local dictionary above
        const matchedKey = Object.keys(LEGAL_TERMS).find(function(key) {
            return userInput.includes(key);
        });

        resultText.textContent = matchedKey
            ? LEGAL_TERMS[matchedKey]
            : "This term is not in our current dictionary. In Phase 2 this will query a live legal database. Try one of the quick-pick tags above.";
    }

    // Show the result box (it starts hidden)
    resultBox.classList.remove("hidden");
    resultBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
};

// Called when the user clicks the Tenant Rights banner
// It toggles the list of rights open or closed
window.toggleRights = function() {
    const rightsList = document.getElementById("rightsList");
    const chevron    = document.getElementById("rightsChevron");

    const isCurrentlyHidden = rightsList.classList.contains("hidden");

    // Toggle the list visibility
    rightsList.classList.toggle("hidden", !isCurrentlyHidden);

    // Rotate the arrow icon to show open/closed state
    chevron.classList.toggle("open", isCurrentlyHidden);
};


// ============================================================
//  SECTION 6 — RENT GROWTH CALCULATOR
//
//  The user enters a starting rent, an annual increase rate,
//  a duration in months, and optionally a total budget.
//  We calculate the total cost, final monthly rent, and
//  whether the rent exceeds their budget.
//
//  Phase 1: the math runs locally in the functions below.
//  Phase 2: the math runs in BackendFunctions.java on the
//  server. script.js just sends the inputs and displays
//  the result it receives back.
// ============================================================

// Called when the user clicks "Calculate Projection" on the dashboard
window.calculateRent = async function() {
    // Read the values from the input fields
    const initialRent = parseFloat(document.getElementById("initialRent").value);
    const increaseRate = parseFloat(document.getElementById("increaseRate").value);
    const durationMonths = parseInt(document.getElementById("months").value);
    const userBudget = parseFloat(document.getElementById("userBudget").value) || 0;

    // Validate — make sure the required fields have sensible values
    if (!initialRent || initialRent <= 0 || isNaN(increaseRate) || !durationMonths || durationMonths < 1) {
        alert("Please fill in the first three fields with valid numbers.");
        return;
    }

    let projectionData;

    if (USE_BACKEND) {
        // Phase 2: send inputs to BackendFunctions.java
        // It runs projectRent() and returns the result as JSON
        try {
            const response = await fetch(`${BACKEND_URL}/api/calculate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    initial: initialRent,
                    rate:    increaseRate,
                    months:  durationMonths,
                    budget:  userBudget
                })
            });
            projectionData = await response.json();
        } catch (error) {
            alert("Could not reach the backend. Please try again.");
            return;
        }
    } else {
        // Phase 1: run the calculation locally
        // This mirrors BackendFunctions.java projectRent() exactly
        projectionData = calculateProjection(initialRent, increaseRate, durationMonths, userBudget);
    }

    // Take the result and update the DOM (what the user sees)
    displayRentResult(
        projectionData,
        "budgetAlert",
        "rentStats",
        "feasibleRow",
        "rentBreakdown",
        "rentResult"
    );
};

// Called when the user clicks "Estimate" on the building detail page sidebar
// Uses the building's own monthly rent as the starting value
window.quickCalc = async function() {
    const building = window._currentBuilding;
    if (!building) return;

    const increaseRate   = parseFloat(document.getElementById("quickRate").value);
    const durationMonths = parseInt(document.getElementById("quickMonths").value);
    const userBudget     = parseFloat(document.getElementById("quickBudget").value) || 0;

    if (isNaN(increaseRate) || !durationMonths || durationMonths < 1) {
        alert("Please fill in the rate and duration fields.");
        return;
    }

    let projectionData;

    if (USE_BACKEND) {
        // Phase 2: send to Java backend with the building's rent pre-filled
        try {
            const response = await fetch(`${BACKEND_URL}/api/calculate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    initial: building.monthlyRent,
                    rate:    increaseRate,
                    months:  durationMonths,
                    budget:  userBudget
                })
            });
            projectionData = await response.json();
        } catch (error) {
            alert("Could not reach the backend. Please try again.");
            return;
        }
    } else {
        // Phase 1: run locally
        projectionData = calculateProjection(building.monthlyRent, increaseRate, durationMonths, userBudget);
    }

    // Show budget alert in the quick estimate sidebar
    const alertEl    = document.getElementById("quickBudgetAlert");
    const feasibleEl = document.getElementById("quickFeasibleRow");

    if (projectionData.budgetProvided) {
        if (projectionData.overBudget) {
            // Over budget — show red warning
            alertEl.className = "budget-alert over";
            alertEl.innerHTML = `<span class="alert-icon">⚠️</span>
                <span>Total <strong>$${formatNumber(projectionData.total)}</strong>
                exceeds budget by <strong>$${formatNumber(projectionData.overBy)}</strong>.</span>`;
            alertEl.classList.remove("hidden");

            // Show how many months they can actually afford
            feasibleEl.innerHTML = `⏱️ Max affordable:
                <strong>${projectionData.feasibleMonths} months</strong>
                (${(projectionData.feasibleMonths / 12).toFixed(1)} years)`;
            feasibleEl.classList.remove("hidden");
        } else {
            // Within budget — show green confirmation
            alertEl.className = "budget-alert ok";
            alertEl.innerHTML = `<span class="alert-icon">✅</span>
                <span>Fits budget —
                <strong>$${formatNumber(projectionData.spareAmount)}</strong> to spare.</span>`;
            alertEl.classList.remove("hidden");
            feasibleEl.classList.add("hidden");
        }
    } else {
        alertEl.classList.add("hidden");
        feasibleEl.classList.add("hidden");
    }

    // Show the three stat pills
    document.getElementById("quickResultText").innerHTML = `
        <div class="rent-stats" style="margin-bottom:0">
            <div class="stat-pill">
                <span class="stat-val">$${formatNumber(projectionData.total)}</span>
                <span class="stat-key">Total Cost</span>
            </div>
            <div class="stat-pill">
                <span class="stat-val">$${formatNumber(projectionData.finalRent)}</span>
                <span class="stat-key">Final Monthly</span>
            </div>
            <div class="stat-pill">
                <span class="stat-val">+${projectionData.increasePercent.toFixed(1)}%</span>
                <span class="stat-key">Increase</span>
            </div>
        </div>`;

    document.getElementById("quickResult").classList.remove("hidden");
};


// ── Calculation functions (Phase 1 only) ──────────────────────────────────
// These run the math locally in the browser.
// They are direct mirrors of BackendFunctions.java.
// In Phase 2, the Java server runs these instead and
// script.js just displays whatever the server sends back.

// Mirrors: BackendFunctions.java projectRent()
// Calculates rent month by month, applying the annual increase every 12 months
function calculateProjection(initial, rate, months, budget) {
    let totalCost   = 0;
    let currentRent = initial;
    let breakdownRows = [];

    for (let month = 1; month <= months; month++) {
        // Apply the annual increase at the start of each new year
        if (month > 1 && (month - 1) % 12 === 0) {
            currentRent = currentRent * (1 + rate / 100);
        }

        totalCost += currentRent;

        // Save a snapshot at the end of each year and at the final month
        if (month % 12 === 0 || month === months) {
            const label = (month % 12 === 0)
                ? "Year " + (month / 12)
                : "Month " + month + " (partial)";
            breakdownRows.push({
                label:      label,
                rent:       currentRent,
                cumulative: totalCost
            });
        }
    }

    const finalRent       = currentRent;
    const increasePercent = ((finalRent - initial) / initial) * 100;

    // Build the result object
    const result = {
        total:          totalCost,
        finalRent:      finalRent,
        increasePercent: increasePercent,
        rows:           breakdownRows,
        budgetProvided: budget > 0,
        overBudget:     false
    };

    // Budget evaluation — mirrors BackendFunctions.java rentFlag()
    if (budget > 0) {
        if (totalCost > budget) {
            result.overBudget     = true;
            result.overBy         = totalCost - budget;
            // How many months can they actually afford?
            // Mirrors BackendFunctions.java feasibleDuration()
            result.feasibleMonths = calculateFeasibleMonths(initial, rate, budget);
        } else {
            result.overBudget  = false;
            result.spareAmount = budget - totalCost;
        }
    }

    return result;
}

// Mirrors: BackendFunctions.java feasibleDuration()
// Returns the maximum number of months affordable within the given budget
function calculateFeasibleMonths(initial, rate, budget) {
    let totalCost   = 0;
    let currentRent = initial;
    let months      = 0;

    while (true) {
        months++;
        if (months > 1 && (months - 1) % 12 === 0) {
            currentRent = currentRent * (1 + rate / 100);
        }
        totalCost += currentRent;

        // Stop when we exceed the budget or hit the safety limit
        if (totalCost > budget || months >= 600) break;
    }

    // Step back one — the month that pushed us over is not affordable
    return Math.max(0, months - 1);
}


// ── DOM update: display rent result ───────────────────────────────────────
// Takes the projection data object and updates the result section on screen

function displayRentResult(data, alertId, statsId, feasibleId, breakdownId, boxId) {
    const alertEl    = document.getElementById(alertId);
    const feasibleEl = document.getElementById(feasibleId);

    // Show or hide the budget alert depending on whether a budget was provided
    if (data.budgetProvided) {
        if (data.overBudget) {
            // Red warning — over budget
            alertEl.className = "budget-alert over";
            alertEl.innerHTML = `<span class="alert-icon">⚠️</span>
                <span>Projected total of <strong>$${formatNumber(data.total)}</strong>
                exceeds your budget by <strong>$${formatNumber(data.overBy)}</strong>.
                See below for how long you can afford this rent.</span>`;
            alertEl.classList.remove("hidden");

            feasibleEl.innerHTML = `⏱️ With your budget you can afford this rent for a maximum of
                <strong>${data.feasibleMonths} months</strong>
                (${(data.feasibleMonths / 12).toFixed(1)} years).`;
            feasibleEl.classList.remove("hidden");
        } else {
            // Green confirmation — within budget
            alertEl.className = "budget-alert ok";
            alertEl.innerHTML = `<span class="alert-icon">✅</span>
                <span>This rent fits your budget.
                You will have <strong>$${formatNumber(data.spareAmount)}</strong>
                to spare over the full term.</span>`;
            alertEl.classList.remove("hidden");
            feasibleEl.classList.add("hidden");
        }
    } else {
        // No budget entered — hide both
        alertEl.classList.add("hidden");
        feasibleEl.classList.add("hidden");
    }

    // Show the three summary stat pills
    document.getElementById(statsId).innerHTML = `
        <div class="stat-pill">
            <span class="stat-val">$${formatNumber(data.total)}</span>
            <span class="stat-key">Total Cost</span>
        </div>
        <div class="stat-pill">
            <span class="stat-val">$${formatNumber(data.finalRent)}</span>
            <span class="stat-key">Final Monthly</span>
        </div>
        <div class="stat-pill">
            <span class="stat-val">+${data.increasePercent.toFixed(1)}%</span>
            <span class="stat-key">Total Increase</span>
        </div>`;

    // Build the year-by-year breakdown table
    let tableHTML = `
        <table class="breakdown-table">
            <thead>
                <tr>
                    <th>Period</th>
                    <th>Monthly Rent</th>
                    <th>Cumulative Total</th>
                </tr>
            </thead>
            <tbody>`;

    data.rows.forEach(function(row) {
        tableHTML += `
            <tr>
                <td>${row.label}</td>
                <td>$${formatNumber(row.rent)}</td>
                <td>$${formatNumber(row.cumulative)}</td>
            </tr>`;
    });

    tableHTML += "</tbody></table>";
    document.getElementById(breakdownId).innerHTML = tableHTML;

    // Reveal the result box and scroll to it
    const resultBox = document.getElementById(boxId);
    resultBox.classList.remove("hidden");
    resultBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
}


// ============================================================
//  SECTION 7 — BUILDING SEARCH
//  The user types a search query and we look up matching
//  buildings from Firestore. The results are displayed as
//  clickable cards in the buildings grid.
//
//  Firestore equivalent of Storage.java searchBuildings()
// ============================================================

window.searchBuilding = async function() {
    const searchInput = document.getElementById("buildingInput");
    const resultsGrid = document.getElementById("buildingsGrid");
    const query_text  = searchInput.value.trim().toLowerCase();

    // Don't search if the input is empty
    if (!query_text) {
        shake(searchInput);
        return;
    }

    // Show a loading message while we wait for Firestore
    resultsGrid.innerHTML = `<p class="placeholder-text">Searching…</p>`;

    try {
        // Get all buildings from Firestore
        // Firestore equivalent of Storage.java getAllBuildings()
        const snapshot = await getDocs(collection(db, "buildings"));

        // Filter the results to those that match the search query
        // Mirrors Storage.java searchBuildings()
        const matchingBuildings = [];
        snapshot.forEach(function(document) {
            const building = { id: document.id, ...document.data() };

            const nameMatches    = building.name?.toLowerCase().includes(query_text);
            const addressMatches = building.address?.toLowerCase().includes(query_text);
            const typeMatches    = building.type?.toLowerCase().includes(query_text);

            if (nameMatches || addressMatches || typeMatches) {
                matchingBuildings.push(building);
            }
        });

        // If nothing matched, show a message
        if (matchingBuildings.length === 0) {
            resultsGrid.innerHTML = `
                <p class="placeholder-text">
                    😕 No results for "<strong>${esc(query_text)}</strong>".
                    Try searching by name, address, or type.
                </p>`;
            return;
        }

        // Build a card for each matching building and put them in the grid
        resultsGrid.innerHTML = matchingBuildings.map(function(building) {
            return buildingCardHTML(building);
        }).join("");

    } catch (error) {
        resultsGrid.innerHTML = `
            <p class="placeholder-text">
                Could not load buildings. Check your internet connection.
            </p>`;
        console.error("Firestore search error:", error);
    }
};

// Creates the HTML for a single building card in the search results
function buildingCardHTML(building) {
    const avgRating   = building.avgRating   || 0;
    const reviewCount = building.reviewCount || 0;

    // Show the photo if there is one, otherwise show the emoji
    const imageHTML = building.imageUrl
        ? `<img src="${esc(building.imageUrl)}" alt="${esc(building.name)}">`
        : (building.emoji || "🏢");

    const availabilityBadge = building.available
        ? `<span class="badge badge-yes">Available</span>`
        : `<span class="badge badge-no">Unavailable</span>`;

    return `
        <div class="building-card" onclick="openBuilding('${building.id}')">
            <div class="building-card-img">${imageHTML}</div>
            <div class="building-card-body">
                <p class="building-card-name">${esc(building.name)}</p>
                <p class="building-card-address">📍 ${esc(building.address)}</p>
                <div class="building-card-footer">
                    <span>
                        ${starsHTML(avgRating)}
                        <span class="review-count-sm">
                            ${avgRating > 0 ? avgRating.toFixed(1) : "—"}
                            (${reviewCount})
                        </span>
                    </span>
                    ${availabilityBadge}
                </div>
            </div>
        </div>`;
}


// ============================================================
//  SECTION 8 — BUILDING DETAIL PAGE
//  When a user clicks a building card, we fetch that
//  building's full data from Firestore and display it
//  on the detail page. We also load its reviews.
//
//  Firestore equivalent of Storage.java findBuildingById()
// ============================================================

window.openBuilding = async function(buildingId) {
    currentBuildingId = buildingId;

    // Navigate to the detail page immediately so the user sees something
    goTo("page-building");

    try {
        // Fetch the building document from Firestore
        // Mirrors Storage.java findBuildingById()
        const buildingDoc  = await getDoc(doc(db, "buildings", buildingId));
        if (!buildingDoc.exists()) return;

        const building = { id: buildingDoc.id, ...buildingDoc.data() };

        // Save to window so the quick calculator can access the rent
        window._currentBuilding = building;

        // ── Update the DOM with this building's data ──────────────────────

        // Hero image or emoji
        document.getElementById("bHeroImg").innerHTML = building.imageUrl
            ? `<img src="${esc(building.imageUrl)}" alt="${esc(building.name)}">`
            : (building.emoji || "🏢");

        // Type badge and availability badge
        const availBadge = building.available
            ? `<span class="badge badge-yes">✓ Available</span>`
            : `<span class="badge badge-no">✗ Unavailable</span>`;
        document.getElementById("bBadges").innerHTML =
            `<span class="badge badge-type">${esc(building.type)}</span>${availBadge}`;

        // Name, address, description
        document.getElementById("bName").textContent    = building.name;
        document.getElementById("bAddress").textContent = "📍 " + building.address;
        document.getElementById("bDesc").textContent    = building.description || "";

        // Average rating row
        const avgRating   = building.avgRating   || 0;
        const reviewCount = building.reviewCount || 0;
        document.getElementById("bRatingRow").innerHTML = avgRating > 0
            ? `<span class="b-rating-num">${avgRating.toFixed(1)}</span>
               <span style="color:#f59e0b;font-size:1.05rem">${starsHTML(avgRating)}</span>
               <span class="b-rating-count">
                   ${reviewCount} review${reviewCount !== 1 ? "s" : ""}
               </span>`
            : `<span class="b-rating-count">No reviews yet</span>`;

        // Key details strip (rent, rooms, size, type)
        document.getElementById("bStatsStrip").innerHTML = `
            <div class="stat-chip">
                <span class="chip-val">
                    $${(building.monthlyRent || 0).toLocaleString()}
                    <small style="font-size:0.65rem;font-weight:400">/mo</small>
                </span>
                <span class="chip-key">Monthly Rent</span>
            </div>
            <div class="stat-chip">
                <span class="chip-val">${building.bedrooms || 0} bed · ${building.bathrooms || 0} bath</span>
                <span class="chip-key">Rooms</span>
            </div>
            <div class="stat-chip">
                <span class="chip-val">${(building.sqft || 0).toLocaleString()} sq ft</span>
                <span class="chip-key">Size</span>
            </div>
            <div class="stat-chip">
                <span class="chip-val">${esc(building.type || "")}</span>
                <span class="chip-key">Type</span>
            </div>`;

        // Amenity chips
        document.getElementById("bAmenities").innerHTML =
            (building.amenities || [])
                .map(function(amenity) {
                    return `<span class="amenity-tag">${esc(amenity)}</span>`;
                })
                .join("");

        // Load reviews from Firestore
        await loadReviews(buildingId);

        // Reset the review form and quick calculator
        resetBuildingDetailForms();
        initStarRating();

    } catch (error) {
        console.error("Error loading building:", error);
    }
};

// Resets the review form and quick calc inputs to their default state
function resetBuildingDetailForms() {
    document.getElementById("reviewText").value       = "";
    document.getElementById("ratingValue").value      = "0";
    document.getElementById("submitNote").textContent = "";
    document.getElementById("quickRate").value        = "";
    document.getElementById("quickMonths").value      = "";
    document.getElementById("quickBudget").value      = "";
    document.getElementById("quickResult").classList.add("hidden");
    document.querySelectorAll("#starRating .star").forEach(function(star) {
        star.classList.remove("active");
    });
}


// ============================================================
//  SECTION 9 — TENANT REVIEWS
//  Reviews are stored in a Firestore subcollection under
//  each building: buildings/{buildingId}/reviews
//
//  Firestore equivalent of Storage.java getReviews()
//  and Storage.java addReview()
// ============================================================

// Loads all reviews for a building from Firestore and displays them
async function loadReviews(buildingId) {
    try {
        // Get reviews ordered by newest first
        // Mirrors Storage.java getReviews()
        const reviewsSnapshot = await getDocs(
            query(
                collection(db, "buildings", buildingId, "reviews"),
                orderBy("createdAt", "desc")
            )
        );

        const reviews = [];
        reviewsSnapshot.forEach(function(reviewDoc) {
            reviews.push({ id: reviewDoc.id, ...reviewDoc.data() });
        });

        displayReviews(reviews);

    } catch (error) {
        // Firestore index might not be ready — fall back to unordered
        const reviewsSnapshot = await getDocs(
            collection(db, "buildings", buildingId, "reviews")
        );
        const reviews = [];
        reviewsSnapshot.forEach(function(reviewDoc) {
            reviews.push({ id: reviewDoc.id, ...reviewDoc.data() });
        });
        displayReviews(reviews);
    }
}

// Updates the reviews section of the building detail page
function displayReviews(reviews) {
    // Update the review count badge in the section heading
    document.getElementById("bReviewPill").textContent = reviews.length;

    if (reviews.length === 0) {
        document.getElementById("bReviewsList").innerHTML =
            `<p class="no-reviews">No reviews yet — be the first to share your experience!</p>`;
        return;
    }

    // Build a review card for each review
    document.getElementById("bReviewsList").innerHTML = reviews.map(function(review) {
        return `
            <div class="review-item">
                <div class="review-item-header">
                    <span style="color:#f59e0b;font-size:0.92rem">
                        ${starsHTML(review.stars)}
                    </span>
                    <span class="review-date">${review.date || "Anonymous"}</span>
                </div>
                <p class="review-text">${esc(review.text)}</p>
            </div>`;
    }).join("");
}

// Called when the user clicks "Submit Review"
// Saves the review to Firestore and updates the building's average rating
// Mirrors Storage.java addReview()
window.submitReview = async function() {
    const starRating  = parseInt(document.getElementById("ratingValue").value);
    const reviewText  = document.getElementById("reviewText").value.trim();
    const statusNote  = document.getElementById("submitNote");

    // Validate before saving
    if (!starRating) {
        statusNote.style.color = "#dc2626";
        statusNote.textContent = "Please select a star rating first.";
        return;
    }
    if (!reviewText) {
        statusNote.style.color = "#dc2626";
        statusNote.textContent = "Please write a short review.";
        return;
    }

    const dateString = new Date().toLocaleString("en-US", { month: "short", year: "numeric" });

    try {
        // Save the review to the Firestore subcollection
        // Mirrors Storage.java addReview()
        await addDoc(
            collection(db, "buildings", currentBuildingId, "reviews"),
            {
                stars:     starRating,
                text:      reviewText,
                date:      dateString,
                userId:    currentUser?.uid || "anonymous",
                createdAt: serverTimestamp()
            }
        );

        // Recalculate and update the building's average rating
        const buildingRef  = doc(db, "buildings", currentBuildingId);
        const buildingSnap = await getDoc(buildingRef);
        const buildingData = buildingSnap.data();

        const oldCount = buildingData.reviewCount || 0;
        const oldAvg   = buildingData.avgRating   || 0;
        const newCount = oldCount + 1;
        const newAvg   = ((oldAvg * oldCount) + starRating) / newCount;

        await updateDoc(buildingRef, {
            avgRating:   newAvg,
            reviewCount: newCount
        });

        // Reload the reviews list to show the new review
        await loadReviews(currentBuildingId);

        // Reset the form
        document.getElementById("reviewText").value  = "";
        document.getElementById("ratingValue").value = "0";
        document.querySelectorAll("#starRating .star").forEach(function(star) {
            star.classList.remove("active");
        });

        statusNote.style.color = "#0f766e";
        statusNote.textContent = "✓ Review saved permanently — thank you!";

    } catch (error) {
        statusNote.style.color = "#dc2626";
        statusNote.textContent = "Could not save your review. Please try again.";
        console.error("Error saving review:", error);
    }
};


// ============================================================
//  SECTION 10 — DEADLINE & RENEWAL TRACKER
//  Deadlines are saved to Firestore under the user's account:
//  users/{userId}/deadlines
//  Logged-in users: deadlines persist across sessions.
//  Guest users: deadlines are stored in memory only.
//
//  Firestore equivalent of Storage.java deadline operations
// ============================================================

// Icons for each deadline type
const DEADLINE_TYPE_ICONS = {
    renewal:    "🔄",
    payment:    "💳",
    inspection: "🔍",
    notice:     "📨",
    other:      "📌"
};

// Called when the user clicks "+ Add Deadline"
// Saves to Firestore if logged in, memory if guest
// Mirrors Storage.java addDeadline()
window.addDeadline = async function() {
    const labelInput = document.getElementById("deadlineLabel");
    const dateInput  = document.getElementById("deadlineDate");
    const typeSelect = document.getElementById("deadlineType");
    const statusNote = document.getElementById("trackerSaveNote");

    const label = labelInput.value.trim();
    const date  = dateInput.value;
    const type  = typeSelect.value;

    // Validate — both label and date are required
    if (!label) { shake(labelInput); return; }
    if (!date)  { shake(dateInput);  return; }

    try {
        if (currentUser) {
            // Logged in — save to Firestore permanently
            // Mirrors Storage.java addDeadline()
            await addDoc(
                collection(db, "users", currentUser.uid, "deadlines"),
                { label, date, type, createdAt: serverTimestamp() }
            );
            statusNote.style.color = "#0f766e";
            statusNote.textContent = "✓ Saved to your account";
        } else {
            // Guest — save in memory only (will disappear on refresh)
            window._guestDeadlines = window._guestDeadlines || [];
            window._guestDeadlines.push({
                id: Date.now().toString(), label, date, type
            });
            statusNote.style.color = "#92400e";
            statusNote.textContent = "⚠ Sign in to save permanently";
        }

        // Clear the form inputs
        labelInput.value = "";
        dateInput.value  = "";

        // Reload the deadline list
        await loadDeadlines();

    } catch (error) {
        console.error("Error saving deadline:", error);
    }
};

// Loads all deadlines for the current user and displays them
// Mirrors Storage.java getDeadlines()
async function loadDeadlines() {
    const deadlineList = document.getElementById("trackerList");

    try {
        let deadlines = [];

        if (currentUser) {
            // Logged in — get from Firestore
            const snapshot = await getDocs(
                query(
                    collection(db, "users", currentUser.uid, "deadlines"),
                    orderBy("date", "asc")
                )
            );
            snapshot.forEach(function(deadlineDoc) {
                deadlines.push({ id: deadlineDoc.id, ...deadlineDoc.data() });
            });
        } else {
            // Guest — get from memory
            deadlines = (window._guestDeadlines || [])
                .sort((a, b) => a.date.localeCompare(b.date));
        }

        if (deadlines.length === 0) {
            deadlineList.innerHTML = `
                <p class="tracker-empty">No deadlines yet — add one to get started</p>`;
            return;
        }

        // Build a card for each deadline
        deadlineList.innerHTML = deadlines.map(function(deadline) {
            return deadlineCardHTML(deadline);
        }).join("");

    } catch (error) {
        // Fallback if Firestore index is not ready yet
        console.error("Error loading deadlines:", error);
        deadlineList.innerHTML = `
            <p class="tracker-empty">Could not load deadlines. Please try again.</p>`;
    }
}

// Creates the HTML for a single deadline card
// Mirrors Storage.java getUrgency() and getCountdown()
function deadlineCardHTML(deadline) {
    const today      = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(deadline.date + "T00:00:00");
    const daysUntil  = Math.round((targetDate - today) / (1000 * 60 * 60 * 24));

    // Determine urgency level — mirrors Storage.java getUrgency()
    let urgencyClass, countdownClass, countdownText;

    if (daysUntil < 0) {
        urgencyClass   = "past";
        countdownClass = "countdown-past";
        countdownText  = `${Math.abs(daysUntil)}d ago`;
    } else if (daysUntil <= 7) {
        urgencyClass   = "urgent";
        countdownClass = "countdown-urgent";
        countdownText  = daysUntil === 0 ? "Today!" : `${daysUntil}d left`;
    } else if (daysUntil <= 30) {
        urgencyClass   = "soon";
        countdownClass = "countdown-soon";
        countdownText  = `${daysUntil}d left`;
    } else {
        urgencyClass   = "future";
        countdownClass = "countdown-future";
        countdownText  = daysUntil >= 60
            ? `~${Math.round(daysUntil / 30)}mo`
            : `~${Math.round(daysUntil / 7)}wk`;
    }

    const formattedDate = targetDate.toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric"
    });

    const icon = DEADLINE_TYPE_ICONS[deadline.type] || "📌";

    return `
        <div class="deadline-item ${urgencyClass}">
            <span class="deadline-type-icon">${icon}</span>
            <div class="deadline-info">
                <p class="deadline-label">${esc(deadline.label)}</p>
                <p class="deadline-date">${formattedDate}</p>
            </div>
            <span class="deadline-countdown ${countdownClass}">${countdownText}</span>
            <button class="deadline-delete"
                    onclick="removeDeadline('${deadline.id}')"
                    title="Remove">✕</button>
        </div>`;
}

// Called when the user clicks the ✕ on a deadline card
// Mirrors Storage.java removeDeadline()
window.removeDeadline = async function(deadlineId) {
    try {
        if (currentUser) {
            // Delete from Firestore
            await deleteDoc(
                doc(db, "users", currentUser.uid, "deadlines", deadlineId)
            );
        } else {
            // Remove from memory
            window._guestDeadlines = (window._guestDeadlines || [])
                .filter(function(d) { return d.id != deadlineId; });
        }
        await loadDeadlines();
    } catch (error) {
        console.error("Error removing deadline:", error);
    }
};


// ============================================================
//  SECTION 11 — ADMIN PANEL (Add a building)
//  Only visible when logged in. Saves the building data
//  to Firestore and the photo to Firebase Storage.
//
//  Firestore equivalent of Storage.java addBuilding()
// ============================================================

// Show a preview of the photo before uploading
document.getElementById("adminPhoto")?.addEventListener("change", function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById("photoPreviewImg").src = e.target.result;
        document.getElementById("photoPreview").classList.remove("hidden");
    };
    reader.readAsDataURL(file);
});

// Called when the admin clicks "Add Building to Database"
// Mirrors Storage.java addBuilding()
window.addBuilding = async function() {
    const statusNote = document.getElementById("adminNote");
    const submitBtn  = document.getElementById("addBuildingBtn");

    // Read all the form values
    const name      = document.getElementById("adminName").value.trim();
    const address   = document.getElementById("adminAddress").value.trim();
    const type      = document.getElementById("adminType").value;
    const available = document.getElementById("adminAvailable").value === "true";
    const rent      = parseInt(document.getElementById("adminRent").value)  || 0;
    const sqft      = parseInt(document.getElementById("adminSqft").value)  || 0;
    const beds      = parseInt(document.getElementById("adminBeds").value)  || 0;
    const baths     = parseInt(document.getElementById("adminBaths").value) || 0;
    const amenities = document.getElementById("adminAmenities").value
        .split(",")
        .map(function(item) { return item.trim(); })
        .filter(function(item) { return item.length > 0; });
    const description = document.getElementById("adminDesc").value.trim();
    const photoFile   = document.getElementById("adminPhoto").files[0];

    // Validate — name and address are required
    if (!name || !address) {
        statusNote.style.color = "#dc2626";
        statusNote.textContent = "Building name and address are required.";
        return;
    }

    // Show saving state
    submitBtn.textContent = "Saving…";
    submitBtn.disabled    = true;

    try {
        let imageUrl = "";

        // If a photo was selected, upload it to Firebase Storage first
        if (photoFile) {
            const fileRef    = ref(storage, `buildings/${Date.now()}_${photoFile.name}`);
            const snapshot   = await uploadBytes(fileRef, photoFile);
            imageUrl         = await getDownloadURL(snapshot.ref);
        }

        // Save the building document to Firestore
        // Mirrors Storage.java addBuilding()
        await addDoc(collection(db, "buildings"), {
            name,
            address,
            type,
            available,
            monthlyRent:  rent,
            sqft,
            bedrooms:     beds,
            bathrooms:    baths,
            amenities,
            description,
            imageUrl,
            emoji:        "🏢",
            avgRating:    0,
            reviewCount:  0,
            createdAt:    serverTimestamp(),
            addedBy:      currentUser?.uid || "admin"
        });

        statusNote.style.color = "#0f766e";
        statusNote.textContent = "✓ Building added successfully! It will appear in search immediately.";

        // Clear all the form inputs
        const fieldsToClear = [
            "adminName", "adminAddress", "adminRent", "adminSqft",
            "adminBeds", "adminBaths", "adminAmenities", "adminDesc"
        ];
        fieldsToClear.forEach(function(fieldId) {
            document.getElementById(fieldId).value = "";
        });
        document.getElementById("photoPreview").classList.add("hidden");

    } catch (error) {
        statusNote.style.color = "#dc2626";
        statusNote.textContent = "Error saving building: " + error.message;
        console.error("Error adding building:", error);
    }

    submitBtn.textContent = "Add Building to Database";
    submitBtn.disabled    = false;
};


// ============================================================
//  SECTION 12 — STAR RATING WIDGET
//  Handles the interactive star rating on the review form.
//  When the user hovers or clicks the stars, we update
//  their appearance and store the selected value.
// ============================================================

function initStarRating() {
    const stars          = document.querySelectorAll("#starRating .star");
    const hiddenInput    = document.getElementById("ratingValue");

    stars.forEach(function(star) {
        // When hovering, highlight all stars up to this one
        star.addEventListener("mouseover", function() {
            const hoveredValue = parseInt(star.dataset.val);
            stars.forEach(function(s) {
                s.classList.toggle("active", parseInt(s.dataset.val) <= hoveredValue);
            });
        });

        // When mouse leaves, go back to showing the selected value
        star.addEventListener("mouseout", function() {
            const selectedValue = parseInt(hiddenInput.value);
            stars.forEach(function(s) {
                s.classList.toggle("active", parseInt(s.dataset.val) <= selectedValue);
            });
        });

        // When clicked, save the selected value
        star.addEventListener("click", function() {
            hiddenInput.value = star.dataset.val;
            const selectedValue = parseInt(hiddenInput.value);
            stars.forEach(function(s) {
                s.classList.toggle("active", parseInt(s.dataset.val) <= selectedValue);
            });
        });
    });
}


// ============================================================
//  SECTION 13 — HELPER FUNCTIONS
//  Small reusable functions used throughout the file.
// ============================================================

// Builds an HTML star rating display from a numeric rating
// e.g. starsHTML(3.7) returns 4 filled stars and 1 empty
function starsHTML(rating) {
    let html = "";
    for (let i = 1; i <= 5; i++) {
        const isFilled = i <= Math.round(rating);
        html += `<span style="color:${isFilled ? "#f59e0b" : "#d1d5db"}">★</span>`;
    }
    return html;
}

// Formats a number as a readable currency string
// e.g. 1234.5 → "1,234.50"
function formatNumber(number) {
    return number.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// Escapes special HTML characters to prevent XSS attacks
// Always use this before inserting user-provided text into the DOM
function esc(text) {
    return String(text)
        .replace(/&/g,  "&amp;")
        .replace(/</g,  "&lt;")
        .replace(/>/g,  "&gt;")
        .replace(/"/g,  "&quot;");
}

// Shakes an input field to signal that it is empty or invalid
function shake(element) {
    element.style.animation = "none";
    element.offsetHeight; // force the browser to reflow so the animation resets
    element.style.animation = "shake 0.32s ease";
    element.addEventListener("animationend", function() {
        element.style.animation = "";
    }, { once: true });
}


// ============================================================
//  EXPOSE FUNCTIONS TO index.html
//  Some functions are called directly from onclick attributes
//  in index.html. We need to attach them to window so the
//  browser can find them from outside this module.
// ============================================================

window.login          = login;
window.signup         = signup;
window.logout         = logout;
window.skipAuth       = skipAuth;
window.switchTab      = switchTab;
window.loadDeadlines  = loadDeadlines;


// ============================================================
//  READY
// ============================================================

console.log(
    "Rental Contract Helper loaded ✓ | " +
    (USE_BACKEND ? "Phase 2 — Java backend connected" : "Phase 1 — local calculations")
);
