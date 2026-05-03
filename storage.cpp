// ══════════════════════════════════════════════
//  Storage.java
//  Rental Contract Helper — Backend
//
//  All data management — buildings, reviews,
//  deadlines. Translated from storage.cpp and
//  script.js. Uses JSON for file storage.
//  Phase 2: connects to Firebase Firestore.
//
//  Compile:  javac Storage.java
//  Run:      java Storage
// ══════════════════════════════════════════════

import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.time.*;
import java.time.format.*;

// NOTE: In Phase 2, add the Firebase Admin SDK
// and replace the JSON file methods with
// Firestore calls. The class structure stays
// exactly the same — only the read/write
// methods change.

public class Storage {

    // ── File paths ────────────────────────────────────────────────────────
    // Phase 2: these are replaced by Firestore collections
    private static final String DATA_DIR       = "data/";
    private static final String BUILDINGS_FILE = DATA_DIR + "buildings.json";
    private static final String REVIEWS_FILE   = DATA_DIR + "reviews.json";
    private static final String DEADLINES_FILE = DATA_DIR + "deadlines.json";


    // ══════════════════════════════════════════
    //  REVIEW CLASS
    //  Mirrors the review objects in script.js:
    //  { stars, date, text, userId }
    //  and the Review class in storage.cpp
    // ══════════════════════════════════════════

    public static class Review {
        public String id;
        public int    stars;
        public int    day;
        public int    month;
        public int    year;
        public String text;
        public String userId;     // anonymous if not logged in
        public String buildingId; // which building this belongs to

        // Default constructor
        public Review() {
            this.userId = "anonymous";
        }

        // Full constructor
        public Review(String buildingId, int stars, int day,
                       int month, int year, String text, String userId) {
            this.id         = UUID.randomUUID().toString();
            this.buildingId = buildingId;
            this.stars      = stars;
            this.day        = day;
            this.month      = month;
            this.year       = year;
            this.text       = text;
            this.userId     = userId != null ? userId : "anonymous";
        }

        /** Returns a formatted date string e.g. "Apr 2025" — mirrors script.js date format */
        public String getFormattedDate() {
            String[] months = {"Jan","Feb","Mar","Apr","May","Jun",
                               "Jul","Aug","Sep","Oct","Nov","Dec"};
            if (month >= 1 && month <= 12)
                return months[month - 1] + " " + year;
            return String.valueOf(year);
        }

        /** Serialize to a simple JSON string */
        public String toJSON() {
            return String.format(
                "{\"id\":\"%s\",\"buildingId\":\"%s\",\"stars\":%d," +
                "\"day\":%d,\"month\":%d,\"year\":%d," +
                "\"date\":\"%s\",\"text\":\"%s\",\"userId\":\"%s\"}",
                esc(id), esc(buildingId), stars,
                day, month, year,
                esc(getFormattedDate()), esc(text), esc(userId)
            );
        }

        /** Print to terminal */
        public void print() {
            System.out.printf("    [%d★] %s — %s%n",
                stars, getFormattedDate(), text);
        }
    }


    // ══════════════════════════════════════════
    //  BUILDING CLASS
    //  Mirrors the building objects in script.js:
    //  { id, name, address, type, monthlyRent,
    //    bedrooms, bathrooms, sqft, available,
    //    amenities, description, reviews,
    //    imageUrl, avgRating, reviewCount }
    //  and the Building class in storage.cpp
    // ══════════════════════════════════════════

    public static class Building {
        public String       id;
        public String       name;
        public String       address;
        public String       type;
        public String       imageUrl;    // Firebase Storage URL in Phase 2
        public String       emoji;
        public int          monthlyRent;
        public int          bedrooms;
        public int          bathrooms;
        public int          sqft;
        public boolean      available;
        public List<String> amenities;
        public String       description;
        public List<Review> reviews;
        public double       avgRating;
        public int          reviewCount;
        public String       addedBy;

        // Default constructor — mirrors Building() in storage.cpp
        public Building() {
            this.id          = UUID.randomUUID().toString();
            this.name        = "Unnamed";
            this.address     = "";
            this.type        = "Apartment";
            this.imageUrl    = "";
            this.emoji       = "🏢";
            this.monthlyRent = 0;
            this.bedrooms    = 0;
            this.bathrooms   = 0;
            this.sqft        = 0;
            this.available   = true;
            this.amenities   = new ArrayList<>();
            this.description = "";
            this.reviews     = new ArrayList<>();
            this.avgRating   = 0;
            this.reviewCount = 0;
            this.addedBy     = "admin";
        }

        // Full constructor
        public Building(String name, String address, String type,
                         String imageUrl, String emoji, int monthlyRent,
                         int bedrooms, int bathrooms, int sqft, boolean available,
                         List<String> amenities, String description) {
            this();
            this.name        = name;
            this.address     = address;
            this.type        = type;
            this.imageUrl    = imageUrl;
            this.emoji       = emoji;
            this.monthlyRent = monthlyRent;
            this.bedrooms    = bedrooms;
            this.bathrooms   = bathrooms;
            this.sqft        = sqft;
            this.available   = available;
            this.amenities   = amenities;
            this.description = description;
        }

        /** Adds a review and updates avgRating and reviewCount */
        public void addReview(Review r) {
            reviews.add(r);
            reviewCount = reviews.size();
            double total = 0;
            for (Review rev : reviews) total += rev.stars;
            avgRating = reviewCount > 0 ? total / reviewCount : 0;
        }

        /** Serialize to a simple JSON string */
        public String toJSON() {
            StringBuilder sb = new StringBuilder();
            sb.append("{");
            sb.append(String.format("\"id\":\"%s\",", esc(id)));
            sb.append(String.format("\"name\":\"%s\",", esc(name)));
            sb.append(String.format("\"address\":\"%s\",", esc(address)));
            sb.append(String.format("\"type\":\"%s\",", esc(type)));
            sb.append(String.format("\"imageUrl\":\"%s\",", esc(imageUrl)));
            sb.append(String.format("\"emoji\":\"%s\",", esc(emoji)));
            sb.append(String.format("\"monthlyRent\":%d,", monthlyRent));
            sb.append(String.format("\"bedrooms\":%d,", bedrooms));
            sb.append(String.format("\"bathrooms\":%d,", bathrooms));
            sb.append(String.format("\"sqft\":%d,", sqft));
            sb.append(String.format("\"available\":%b,", available));
            sb.append(String.format("\"avgRating\":%.2f,", avgRating));
            sb.append(String.format("\"reviewCount\":%d,", reviewCount));
            sb.append(String.format("\"description\":\"%s\",", esc(description)));
            sb.append(String.format("\"addedBy\":\"%s\",", esc(addedBy)));

            // amenities array
            sb.append("\"amenities\":[");
            for (int i = 0; i < amenities.size(); i++) {
                sb.append("\"").append(esc(amenities.get(i))).append("\"");
                if (i < amenities.size() - 1) sb.append(",");
            }
            sb.append("],");

            // reviews array
            sb.append("\"reviews\":[");
            for (int i = 0; i < reviews.size(); i++) {
                sb.append(reviews.get(i).toJSON());
                if (i < reviews.size() - 1) sb.append(",");
            }
            sb.append("]");
            sb.append("}");
            return sb.toString();
        }

        /** Print summary to terminal */
        public void print() {
            System.out.printf("  [%s] %s%n", id.substring(0,8), name);
            System.out.printf("       %s | %s | $%d/mo%n", address, type, monthlyRent);
            System.out.printf("       %dbed/%dbath | %d sqft | %s%n",
                bedrooms, bathrooms, sqft, available ? "Available" : "Unavailable");
            System.out.printf("       Rating: %.1f/5 (%d reviews)%n",
                avgRating, reviewCount);
        }
    }


    // ══════════════════════════════════════════
    //  DEADLINE CLASS
    //  Mirrors the deadline objects in script.js
    //  { id, label, date, type, userId }
    // ══════════════════════════════════════════

    public static class Deadline {
        public String id;
        public String label;
        public String date;    // format: "YYYY-MM-DD"
        public String type;    // renewal, payment, inspection, notice, other
        public String userId;

        public Deadline() {}

        public Deadline(String label, String date, String type, String userId) {
            this.id     = UUID.randomUUID().toString();
            this.label  = label;
            this.date   = date;
            this.type   = type;
            this.userId = userId != null ? userId : "guest";
        }

        /** Returns days until this deadline (negative = past) */
        public long daysUntil() {
            try {
                LocalDate target = LocalDate.parse(date);
                return LocalDate.now().until(target, java.time.temporal.ChronoUnit.DAYS);
            } catch (Exception e) {
                return 0;
            }
        }

        /** Returns a human-readable countdown — mirrors renderDeadlines() in script.js */
        public String getCountdown() {
            long days = daysUntil();
            if (days < 0)        return Math.abs(days) + "d ago";
            else if (days == 0)  return "Today!";
            else if (days <= 7)  return days + "d left";
            else if (days <= 30) return days + "d left";
            else if (days >= 60) return "~" + Math.round(days / 30.0) + "mo";
            else                 return "~" + Math.round(days / 7.0) + "wk";
        }

        /** Returns urgency level — mirrors urgencyClass in script.js */
        public String getUrgency() {
            long days = daysUntil();
            if      (days < 0)   return "PAST";
            else if (days <= 7)  return "URGENT";
            else if (days <= 30) return "SOON";
            else                 return "FUTURE";
        }

        public String toJSON() {
            return String.format(
                "{\"id\":\"%s\",\"label\":\"%s\",\"date\":\"%s\"," +
                "\"type\":\"%s\",\"userId\":\"%s\"}",
                esc(id), esc(label), esc(date), esc(type), esc(userId)
            );
        }

        public void print() {
            System.out.printf("  [%s] %s — %s (%s) %s%n",
                getUrgency(), label, date, type, getCountdown());
        }
    }


    // ══════════════════════════════════════════
    //  IN-MEMORY STORE
    //  Phase 1: data lives here and in JSON files
    //  Phase 2: replace with Firestore calls
    // ══════════════════════════════════════════

    private static List<Building> buildings = new ArrayList<>();
    private static List<Deadline> deadlines = new ArrayList<>();


    // ══════════════════════════════════════════
    //  BUILDING OPERATIONS
    //  Mirrors the Firestore operations in script.js
    // ══════════════════════════════════════════

    /**
     * Add a new building to the store and save to file.
     * Phase 2: addDoc(collection(db, "buildings"), ...) in script.js
     */
    public static Building addBuilding(Building b) {
        buildings.add(b);
        saveBuildings();
        return b;
    }

    /**
     * Find a building by its id.
     * Phase 2: getDoc(doc(db, "buildings", id)) in script.js
     */
    public static Building findBuildingById(String id) {
        for (Building b : buildings)
            if (b.id.equals(id)) return b;
        return null;
    }

    /**
     * Search buildings by name, address, or type.
     * Phase 2: getDocs + filter in script.js searchBuilding()
     * Mirrors: searchBuildings() in storage.cpp
     */
    public static List<Building> searchBuildings(String query) {
        String q = query.toLowerCase().trim();
        List<Building> results = new ArrayList<>();
        for (Building b : buildings) {
            if (b.name.toLowerCase().contains(q)    ||
                b.address.toLowerCase().contains(q) ||
                b.type.toLowerCase().contains(q)) {
                results.add(b);
            }
        }
        return results;
    }

    /**
     * Get all buildings.
     * Phase 2: getDocs(collection(db, "buildings")) in script.js
     */
    public static List<Building> getAllBuildings() {
        return new ArrayList<>(buildings);
    }


    // ══════════════════════════════════════════
    //  REVIEW OPERATIONS
    //  Mirrors Firestore subcollection in script.js
    // ══════════════════════════════════════════

    /**
     * Add a review to a building and update its average rating.
     * Phase 2: addDoc(collection(db, "buildings", id, "reviews"), ...) in script.js
     * Mirrors: addReviewToBuilding() in storage.cpp
     */
    public static boolean addReview(String buildingId, int stars,
                                     int day, int month, int year,
                                     String text, String userId) {
        Building b = findBuildingById(buildingId);
        if (b == null) {
            System.out.println("Building not found: " + buildingId);
            return false;
        }
        Review r = new Review(buildingId, stars, day, month, year, text, userId);
        b.addReview(r);
        saveBuildings();
        return true;
    }

    /**
     * Get all reviews for a building.
     * Phase 2: getDocs(collection(db, "buildings", id, "reviews")) in script.js
     */
    public static List<Review> getReviews(String buildingId) {
        Building b = findBuildingById(buildingId);
        if (b == null) return new ArrayList<>();
        return new ArrayList<>(b.reviews);
    }


    // ══════════════════════════════════════════
    //  DEADLINE OPERATIONS
    //  Mirrors Firestore user subcollection in script.js
    // ══════════════════════════════════════════

    /**
     * Add a deadline for a user.
     * Phase 2: addDoc(collection(db, "users", uid, "deadlines"), ...) in script.js
     */
    public static Deadline addDeadline(String label, String date,
                                        String type, String userId) {
        Deadline d = new Deadline(label, date, type, userId);
        deadlines.add(d);
        // Sort by date
        deadlines.sort(Comparator.comparing(dl -> dl.date));
        saveDeadlines();
        return d;
    }

    /**
     * Get all deadlines for a user, sorted by date.
     * Phase 2: getDocs(collection(db, "users", uid, "deadlines")) in script.js
     */
    public static List<Deadline> getDeadlines(String userId) {
        List<Deadline> result = new ArrayList<>();
        for (Deadline d : deadlines)
            if (d.userId.equals(userId)) result.add(d);
        result.sort(Comparator.comparing(d -> d.date));
        return result;
    }

    /**
     * Remove a deadline by id.
     * Phase 2: deleteDoc(doc(db, "users", uid, "deadlines", id)) in script.js
     */
    public static boolean removeDeadline(String id) {
        return deadlines.removeIf(d -> d.id.equals(id));
    }


    // ══════════════════════════════════════════
    //  FILE STORAGE (JSON)
    //  Phase 1: reads/writes local JSON files
    //  Phase 2: replaced by Firebase Firestore
    // ══════════════════════════════════════════

    /** Save all buildings to buildings.json */
    public static void saveBuildings() {
        try {
            Files.createDirectories(Paths.get(DATA_DIR));
            StringBuilder sb = new StringBuilder("[\n");
            for (int i = 0; i < buildings.size(); i++) {
                sb.append("  ").append(buildings.get(i).toJSON());
                if (i < buildings.size() - 1) sb.append(",");
                sb.append("\n");
            }
            sb.append("]");
            Files.writeString(Paths.get(BUILDINGS_FILE), sb.toString());
            System.out.println("Saved " + buildings.size() + " buildings to " + BUILDINGS_FILE);
        } catch (IOException e) {
            System.err.println("Error saving buildings: " + e.getMessage());
        }
    }

    /** Save all deadlines to deadlines.json */
    public static void saveDeadlines() {
        try {
            Files.createDirectories(Paths.get(DATA_DIR));
            StringBuilder sb = new StringBuilder("[\n");
            for (int i = 0; i < deadlines.size(); i++) {
                sb.append("  ").append(deadlines.get(i).toJSON());
                if (i < deadlines.size() - 1) sb.append(",");
                sb.append("\n");
            }
            sb.append("]");
            Files.writeString(Paths.get(DEADLINES_FILE), sb.toString());
        } catch (IOException e) {
            System.err.println("Error saving deadlines: " + e.getMessage());
        }
    }

    /** Print all buildings.json contents to terminal */
    public static void printJsonFile() {
        try {
            String content = Files.readString(Paths.get(BUILDINGS_FILE));
            System.out.println(content);
        } catch (IOException e) {
            System.out.println("No buildings file found yet.");
        }
    }


    // ══════════════════════════════════════════
    //  SEED DATA
    //  Populates the store with the 4 buildings
    //  that were previously hardcoded in script.js
    //  Run once to create buildings.json
    // ══════════════════════════════════════════

    public static void seedBuildings() {
        buildings.clear();

        // Building 1 — Sunrise Apartments
        Building b1 = new Building(
            "Sunrise Apartments", "142 Oak Street, Downtown",
            "Apartment", "", "🌅",
            1200, 2, 1, 850, true,
            Arrays.asList("Parking", "Gym", "Laundry", "Air Conditioning", "Storage Unit"),
            "A well-maintained complex in the heart of downtown. Close to public transport and major shopping. Management is responsive and the community is quiet."
        );
        b1.addReview(new Review(b1.id, 5, 15, 3, 2025, "Great location, responsive landlord. Heating works perfectly all winter.", "user1"));
        b1.addReview(new Review(b1.id, 4, 10, 1, 2025, "Nice building overall. A bit pricey but worth it for the amenities.", "user2"));
        b1.addReview(new Review(b1.id, 3, 5,  11, 2024, "Maintenance can be slow on weekends, but they do fix things eventually.", "user3"));
        buildings.add(b1);

        // Building 2 — Greenview Tower
        Building b2 = new Building(
            "Greenview Tower", "78 Elm Avenue, Midtown",
            "Condo", "", "🏢",
            1800, 3, 2, 1200, true,
            Arrays.asList("24/7 Concierge", "Rooftop Terrace", "Pool", "Gym", "Underground Parking"),
            "Modern high-rise with panoramic city views. Ideal for professionals. Note: elevator had issues in 2024 — worth asking management about current status."
        );
        b2.addReview(new Review(b2.id, 2, 20, 2, 2025, "Landlord ignored multiple requests about the broken elevator for weeks.", "user4"));
        b2.addReview(new Review(b2.id, 4, 12, 12, 2024, "Great views and modern interiors. Street noise can be an issue at night.", "user5"));
        b2.addReview(new Review(b2.id, 4, 8,  10, 2024, "Generally a good place. Management improved a lot in the past year.", "user6"));
        buildings.add(b2);

        // Building 3 — Lakeside Studios
        Building b3 = new Building(
            "Lakeside Studios", "9 Lakeview Road, West End",
            "Studio", "", "🏡",
            900, 1, 1, 480, false,
            Arrays.asList("Lake View", "Pet Friendly", "Bike Storage", "Laundry", "Garden Access"),
            "Cosy studios with stunning lake views. Perfect for students or solo professionals. The landlord is highly responsive."
        );
        b3.addReview(new Review(b3.id, 5, 2,  4, 2025, "Best landlord I have ever had. Issues fixed same day. Highly recommend.", "user7"));
        b3.addReview(new Review(b3.id, 5, 18, 2, 2025, "Super quiet, beautiful views, management genuinely cares about tenants.", "user8"));
        buildings.add(b3);

        // Building 4 — Heritage Flats
        Building b4 = new Building(
            "Heritage Flats", "33 Maple Lane, Old Town",
            "Apartment", "", "🏛️",
            1050, 2, 1, 720, true,
            Arrays.asList("Historic Building", "Shared Garden", "Hardwood Floors", "High Ceilings"),
            "Charming apartments inside a restored 1920s heritage building. High ceilings, original hardwood floors, and a shared garden."
        );
        b4.addReview(new Review(b4.id, 4, 22, 3, 2025, "Beautiful building. The character is unmatched. Old heating but it works fine.", "user9"));
        b4.addReview(new Review(b4.id, 3, 14, 1, 2025, "Lovely place but the pipes are noisy at night. Management was responsive.", "user10"));
        buildings.add(b4);

        saveBuildings();
        System.out.println("Seed complete — " + buildings.size() + " buildings written to " + BUILDINGS_FILE);
    }


    // ══════════════════════════════════════════
    //  HELPER
    // ══════════════════════════════════════════

    /** Escapes special characters for JSON strings */
    private static String esc(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }


    // ══════════════════════════════════════════
    //  MAIN — terminal demonstration
    //  Compile:  javac Storage.java
    //  Run:      java Storage
    // ══════════════════════════════════════════

    public static void main(String[] args) {

        System.out.println("╔══════════════════════════════════════════╗");
        System.out.println("║   Rental Contract Helper — Backend       ║");
        System.out.println("║   Storage.java — Terminal Mode           ║");
        System.out.println("╚══════════════════════════════════════════╝");

        // Test 1: Seed the 4 buildings from script.js into JSON
        System.out.println("\n── Test 1: Seed Buildings ────────────────────");
        seedBuildings();

        // Test 2: Print all buildings
        System.out.println("\n── Test 2: All Buildings ─────────────────────");
        for (Building b : getAllBuildings()) b.print();

        // Test 3: Search
        System.out.println("\n── Test 3: Search 'studio' ───────────────────");
        for (Building b : searchBuildings("studio")) b.print();

        // Test 4: Add a new review
        System.out.println("\n── Test 4: Add Review to Building 1 ──────────");
        String bid = buildings.get(0).id;
        addReview(bid, 5, 1, 5, 2025, "Absolutely loved living here.", "testUser");
        Building updated = findBuildingById(bid);
        if (updated != null) {
            System.out.printf("  Updated rating: %.1f/5 (%d reviews)%n",
                updated.avgRating, updated.reviewCount);
            for (Review r : updated.reviews) r.print();
        }

        // Test 5: Deadlines
        System.out.println("\n── Test 5: Deadlines ─────────────────────────");
        addDeadline("Lease Renewal",  "2025-12-01", "renewal",    "testUser");
        addDeadline("Rent Due",       "2025-05-05", "payment",    "testUser");
        addDeadline("Inspection",     "2025-05-20", "inspection", "testUser");
        List<Deadline> userDeadlines = getDeadlines("testUser");
        System.out.println("  Deadlines for testUser:");
        for (Deadline d : userDeadlines) d.print();

        // Test 6: Print the JSON file
        System.out.println("\n── Test 6: buildings.json contents ───────────");
        printJsonFile();

        // Test 7: Combined — use BackendFunctions with a building from Storage
        System.out.println("── Test 7: Combined — Rent Projection for Building 1 ──");
        Building b1 = buildings.get(0);
        System.out.printf("  Building: %s ($%d/mo)%n", b1.name, b1.monthlyRent);
        BackendFunctions.ProjectionResult proj =
            BackendFunctions.projectRent(b1.monthlyRent, 5.0, 24, 30000.0);
        BackendFunctions.printProjection(proj, b1.monthlyRent);
    }
}
