// ══════════════════════════════════════════════
//  storage.cpp
//  Rental Contract Helper — Phase 2 backend
//
//  Building and Review classes with JSON
//  file storage using nlohmann/json.hpp
//  Migrated and expanded from storage.cpp stub
// ══════════════════════════════════════════════

#include <iostream>
#include <fstream>
#include <vector>
#include <string>
#include <stdexcept>
#include "header_files/json.hpp"

using namespace std;
using json = nlohmann::json;

// File paths for persistent storage
// These JSON files act as the database for Phase 2
const string BUILDINGS_FILE = "data/buildings.json";
const string REVIEWS_FILE   = "data/reviews.json";


// ══════════════════════════════════════════════
//  REVIEW CLASS
//  Mirrors the review objects in script.js:
//  { stars, date, text }
// ══════════════════════════════════════════════

class Review {
private:
    int    stars;    // 1–5
    int    day;
    int    month;
    int    year;
    string text;

public:
    // Default constructor
    Review() : stars(0), day(0), month(0), year(0), text("") {}

    // Full constructor
    Review(int s, int d, int mo, int y, string t)
        : stars(s), day(d), month(mo), year(y), text(t) {}

    // Getters
    int    getStars() const { return stars; }
    int    getDay()   const { return day; }
    int    getMonth() const { return month; }
    int    getYear()  const { return year; }
    string getText()  const { return text; }

    // Setters
    void setStars(int s)    { if (s >= 1 && s <= 5) stars = s; }
    void setDay(int d)      { day   = d; }
    void setMonth(int mo)   { month = mo; }
    void setYear(int y)     { year  = y; }
    void setText(string t)  { text  = t; }

    // Returns a formatted date string e.g. "Apr 2025"
    // Mirrors the date field format used in script.js reviews
    string getFormattedDate() const {
        const string months[] = {
            "Jan","Feb","Mar","Apr","May","Jun",
            "Jul","Aug","Sep","Oct","Nov","Dec"
        };
        if (month >= 1 && month <= 12)
            return months[month - 1] + " " + to_string(year);
        return to_string(year);
    }

    // Serialize to JSON
    // Mirrors: { stars, date, text } in script.js
    json toJSON() const {
        return {
            {"stars", stars},
            {"day",   day},
            {"month", month},
            {"year",  year},
            {"date",  getFormattedDate()},
            {"text",  text}
        };
    }

    // Deserialize from JSON
    static Review fromJSON(const json& j) {
        Review r;
        r.stars = j.value("stars", 0);
        r.day   = j.value("day",   0);
        r.month = j.value("month", 0);
        r.year  = j.value("year",  0);
        r.text  = j.value("text",  "");
        return r;
    }

    // Print to console
    void print() const {
        cout << "  [" << stars << "/5] " << getFormattedDate()
             << " — " << text << endl;
    }
};


// ══════════════════════════════════════════════
//  BUILDING CLASS
//  Mirrors the building objects in script.js:
//  { id, name, address, type, monthlyRent,
//    bedrooms, bathrooms, sqft, available,
//    amenities, description, reviews }
// ══════════════════════════════════════════════

class Building {
private:
    static int ctr;   // auto-increment id counter

    int            id;
    string         name;
    string         address;
    string         type;         // "Apartment", "Condo", "Studio" etc.
    string         image;        // filename, empty string if none
    string         emoji;        // fallback display character
    int            monthlyRent;
    int            bedrooms;
    int            bathrooms;
    int            sqft;
    bool           available;
    vector<string> amenities;
    string         description;
    vector<Review> reviews;

public:
    // Default constructor — mirrors the stub in storage.cpp
    Building() {
        id          = ctr++;
        name        = "Unnamed";
        address     = "";
        type        = "";
        image       = "";
        emoji       = "🏢";
        monthlyRent = 0;
        bedrooms    = 0;
        bathrooms   = 0;
        sqft        = 0;
        available   = true;
        description = "";
    }

    // Full constructor
    Building(string nm, string addr, string tp, string img, string em,
             int cost, int beds, int baths, int sz, bool avail,
             vector<string> amen, string desc)
    {
        id          = ctr++;
        name        = nm;
        address     = addr;
        type        = tp;
        image       = img;
        emoji       = em;
        monthlyRent = cost;
        bedrooms    = beds;
        bathrooms   = baths;
        sqft        = sz;
        available   = avail;
        amenities   = amen;
        description = desc;
    }

    // ── Getters ──────────────────────────────

    int            getId()          const { return id; }
    string         getName()        const { return name; }
    string         getAddress()     const { return address; }
    string         getType()        const { return type; }
    string         getImage()       const { return image; }
    string         getEmoji()       const { return emoji; }
    int            getMonthlyRent() const { return monthlyRent; }
    int            getBedrooms()    const { return bedrooms; }
    int            getBathrooms()   const { return bathrooms; }
    int            getSqft()        const { return sqft; }
    bool           isAvailable()    const { return available; }
    vector<string> getAmenities()   const { return amenities; }
    string         getDescription() const { return description; }
    vector<Review> getReviews()     const { return reviews; }

    // ── Setters ──────────────────────────────

    void setName(string n)           { name        = n; }
    void setAddress(string a)        { address     = a; }
    void setType(string t)           { type        = t; }
    void setImage(string i)          { image       = i; }
    void setEmoji(string e)          { emoji       = e; }
    void setMonthlyRent(int r)       { if (r >= 0) monthlyRent = r; }
    void setBedrooms(int b)          { if (b >= 0) bedrooms    = b; }
    void setBathrooms(int b)         { if (b >= 0) bathrooms   = b; }
    void setSqft(int s)              { if (s >= 0) sqft        = s; }
    void setAvailable(bool a)        { available   = a; }
    void setDescription(string d)    { description = d; }
    void addAmenity(string amenity)  { amenities.push_back(amenity); }

    // ── Review management ─────────────────────

    // Add a new review
    // Mirrors: userReviews[id].push({ stars, date, text }) in script.js
    void addReview(const Review& r) {
        reviews.push_back(r);
    }

    // Calculate average star rating across all reviews
    // Mirrors: avgRating() in script.js
    double getAverageRating() const {
        if (reviews.empty()) return 0.0;
        double total = 0;
        for (const Review& r : reviews)
            total += r.getStars();
        return total / reviews.size();
    }

    // ── Serialization ─────────────────────────

    // Serialize to JSON
    // Mirrors the BUILDINGS array structure in script.js
    json toJSON() const {
        json j;
        j["id"]          = id;
        j["name"]        = name;
        j["address"]     = address;
        j["type"]        = type;
        j["image"]       = image;
        j["emoji"]       = emoji;
        j["monthlyRent"] = monthlyRent;
        j["bedrooms"]    = bedrooms;
        j["bathrooms"]   = bathrooms;
        j["sqft"]        = sqft;
        j["available"]   = available;
        j["description"] = description;

        json amenitiesArr = json::array();
        for (const string& a : amenities)
            amenitiesArr.push_back(a);
        j["amenities"] = amenitiesArr;

        json reviewsArr = json::array();
        for (const Review& r : reviews)
            reviewsArr.push_back(r.toJSON());
        j["reviews"] = reviewsArr;

        return j;
    }

    // Deserialize from JSON
    static Building fromJSON(const json& j) {
        Building b;
        b.id          = j.value("id",          0);
        b.name        = j.value("name",        "");
        b.address     = j.value("address",     "");
        b.type        = j.value("type",        "");
        b.image       = j.value("image",       "");
        b.emoji       = j.value("emoji",       "🏢");
        b.monthlyRent = j.value("monthlyRent", 0);
        b.bedrooms    = j.value("bedrooms",    0);
        b.bathrooms   = j.value("bathrooms",   0);
        b.sqft        = j.value("sqft",        0);
        b.available   = j.value("available",   true);
        b.description = j.value("description", "");

        if (j.contains("amenities")) {
            for (const auto& a : j["amenities"])
                b.amenities.push_back(a.get<string>());
        }

        if (j.contains("reviews")) {
            for (const auto& r : j["reviews"])
                b.reviews.push_back(Review::fromJSON(r));
        }

        return b;
    }

    // Print summary to console
    void print() const {
        cout << "[" << id << "] " << name << " — " << address << endl;
        cout << "     Type: " << type << " | Rent: $" << monthlyRent
             << "/mo | " << bedrooms << "bed/" << bathrooms << "bath"
             << " | " << sqft << " sqft" << endl;
        cout << "     Available: " << (available ? "Yes" : "No") << endl;
        cout << "     Rating: " << fixed << setprecision(1)
             << getAverageRating() << "/5 (" << reviews.size() << " reviews)" << endl;
    }
};

// Initialize static counter
int Building::ctr = 1;


// ══════════════════════════════════════════════
//  STORAGE FUNCTIONS
//  Read and write buildings + reviews to JSON
//  files — this replaces the in-memory arrays
//  in script.js (BUILDINGS, userReviews)
// ══════════════════════════════════════════════

// Save all buildings to JSON file
// Mirrors: the BUILDINGS const array in script.js
// but persists across sessions using a file
void saveBuildings(const vector<Building>& buildings) {
    json arr = json::array();
    for (const Building& b : buildings)
        arr.push_back(b.toJSON());

    ofstream file(BUILDINGS_FILE);
    if (!file.is_open())
        throw runtime_error("Could not open file: " + BUILDINGS_FILE);

    file << arr.dump(2);
    file.close();
    cout << "Saved " << buildings.size() << " buildings to " << BUILDINGS_FILE << endl;
}

// Load all buildings from JSON file
// Called on server startup in Phase 2
vector<Building> loadBuildings() {
    vector<Building> buildings;
    ifstream file(BUILDINGS_FILE);

    if (!file.is_open()) {
        cout << "No existing buildings file found. Starting fresh." << endl;
        return buildings;
    }

    json arr;
    try {
        file >> arr;
    } catch (const json::parse_error& e) {
        cerr << "JSON parse error in buildings file: " << e.what() << endl;
        return buildings;
    }
    file.close();

    for (const auto& j : arr)
        buildings.push_back(Building::fromJSON(j));

    cout << "Loaded " << buildings.size() << " buildings from " << BUILDINGS_FILE << endl;
    return buildings;
}

// Find a building by id
// Mirrors: BUILDINGS.find(b => b.id === id) in script.js
Building* findBuildingById(vector<Building>& buildings, int id) {
    for (Building& b : buildings) {
        if (b.getId() == id)
            return &b;
    }
    return nullptr;
}

// Search buildings by query string — name, address, or type
// Mirrors: searchBuilding() filter in script.js
vector<Building> searchBuildings(const vector<Building>& buildings, const string& query) {
    vector<Building> results;
    string q = query;

    // Convert query to lowercase
    for (char& c : q) c = tolower(c);

    for (const Building& b : buildings) {
        string name    = b.getName();
        string address = b.getAddress();
        string type    = b.getType();

        // Convert fields to lowercase for comparison
        for (char& c : name)    c = tolower(c);
        for (char& c : address) c = tolower(c);
        for (char& c : type)    c = tolower(c);

        if (name.find(q)    != string::npos ||
            address.find(q) != string::npos ||
            type.find(q)    != string::npos)
        {
            results.push_back(b);
        }
    }
    return results;
}

// Add a new review to a building and save to file
// Mirrors: submitReview() in script.js
// but persists the review to disk instead of memory
bool addReviewToBuilding(vector<Building>& buildings, int buildingId,
                          int stars, int day, int month, int year, const string& text)
{
    Building* b = findBuildingById(buildings, buildingId);
    if (!b) {
        cerr << "Building with id " << buildingId << " not found." << endl;
        return false;
    }

    Review r(stars, day, month, year, text);
    b->addReview(r);
    saveBuildings(buildings);
    return true;
}

// Returns all buildings as a JSON array
// This is what Phase 2 will send to the frontend
// as the response to a search API call
json buildingsToJSON(const vector<Building>& buildings) {
    json arr = json::array();
    for (const Building& b : buildings)
        arr.push_back(b.toJSON());
    return arr;
}


// ══════════════════════════════════════════════
//  SEED DATA
//  Populates the JSON file with the same 4
//  buildings that currently live in script.js
//  Run once to create buildings.json
// ══════════════════════════════════════════════

void seedBuildings() {
    vector<Building> buildings;

    // Building 1 — Sunrise Apartments
    Building b1("Sunrise Apartments", "142 Oak Street, Downtown",
                "Apartment", "", "🌅",
                1200, 2, 1, 850, true,
                {"Parking", "Gym", "Laundry", "Air Conditioning", "Storage Unit"},
                "A well-maintained complex in the heart of downtown. Close to public transport and major shopping. Management is responsive and the community is quiet.");
    b1.addReview(Review(5, 15, 3, 2025, "Great location, responsive landlord. Heating works perfectly all winter."));
    b1.addReview(Review(4, 10, 1, 2025, "Nice building overall. A bit pricey but worth it for the amenities."));
    b1.addReview(Review(3, 5,  11, 2024, "Maintenance can be slow on weekends, but they do fix things eventually."));
    buildings.push_back(b1);

    // Building 2 — Greenview Tower
    Building b2("Greenview Tower", "78 Elm Avenue, Midtown",
                "Condo", "", "🏢",
                1800, 3, 2, 1200, true,
                {"24/7 Concierge", "Rooftop Terrace", "Pool", "Gym", "Underground Parking"},
                "Modern high-rise with panoramic city views and upscale finishes. Ideal for professionals. Note: elevator had issues in 2024.");
    b2.addReview(Review(2, 20, 2, 2025, "Landlord ignored multiple requests about the broken elevator for weeks."));
    b2.addReview(Review(4, 12, 12, 2024, "Great views and modern interiors. Street noise can be an issue at night."));
    b2.addReview(Review(4, 8,  10, 2024, "Generally a good place. Management improved a lot in the past year."));
    buildings.push_back(b2);

    // Building 3 — Lakeside Studios
    Building b3("Lakeside Studios", "9 Lakeview Road, West End",
                "Studio", "", "🏡",
                900, 1, 1, 480, false,
                {"Lake View", "Pet Friendly", "Bike Storage", "Laundry", "Garden Access"},
                "Cosy studios with stunning lake views. Perfect for students or solo professionals. The landlord is highly responsive.");
    b3.addReview(Review(5, 2,  4, 2025, "Best landlord I have ever had. Issues fixed same day. Highly recommend."));
    b3.addReview(Review(5, 18, 2, 2025, "Super quiet, beautiful views, management genuinely cares about tenants."));
    buildings.push_back(b3);

    // Building 4 — Heritage Flats
    Building b4("Heritage Flats", "33 Maple Lane, Old Town",
                "Apartment", "", "🏛️",
                1050, 2, 1, 720, true,
                {"Historic Building", "Shared Garden", "Hardwood Floors", "High Ceilings"},
                "Charming apartments inside a restored 1920s heritage building. High ceilings, original hardwood floors, and a shared garden.");
    b4.addReview(Review(4, 22, 3, 2025, "Beautiful building. The character is unmatched. Old heating but it works fine."));
    b4.addReview(Review(3, 14, 1, 2025, "Lovely place but the pipes are noisy at night. Management was responsive."));
    buildings.push_back(b4);

    saveBuildings(buildings);
    cout << "Seed complete — 4 buildings written to " << BUILDINGS_FILE << endl;
}


// ── Main — for testing ────────────────────────────────────────────────────

int main() {
    cout << "══ Storage Test ══════════════════════" << endl;

    // Seed the JSON file with the 4 buildings from script.js
    seedBuildings();

    // Load them back and verify
    vector<Building> buildings = loadBuildings();

    cout << "\n── All buildings ────────────────────" << endl;
    for (const Building& b : buildings)
        b.print();

    // Test search — mirrors searchBuilding() in script.js
    cout << "\n── Search: 'studio' ─────────────────" << endl;
    vector<Building> results = searchBuildings(buildings, "studio");
    for (const Building& b : results)
        b.print();

    // Test adding a review — mirrors submitReview() in script.js
    cout << "\n── Add review to building 1 ─────────" << endl;
    addReviewToBuilding(buildings, 1, 5, 1, 5, 2025, "Absolutely loved living here.");
    Building* b = findBuildingById(buildings, 1);
    if (b) {
        cout << "Updated rating: " << b->getAverageRating() << "/5" << endl;
        cout << "Reviews:" << endl;
        for (const Review& r : b->getReviews())
            r.print();
    }

    // Test JSON output for frontend
    cout << "\n── JSON for building 3 ──────────────" << endl;
    Building* b3 = findBuildingById(buildings, 3);
    if (b3)
        cout << b3->toJSON().dump(2) << endl;

    return 0;
}
