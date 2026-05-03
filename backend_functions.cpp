// ══════════════════════════════════════════════
//  BackendFunctions.java
//  Rental Contract Helper — Backend
//
//  All calculation logic — translated from
//  script.js and original backend_functions.cpp
//  Runs standalone in terminal for demonstration
//  Phase 2: expose via HTTP server
// ══════════════════════════════════════════════

import java.util.ArrayList;
import java.util.List;

public class BackendFunctions {

    // ── Constants ─────────────────────────────────────────────────────────
    public static final double DEFAULT_INFLATION_RATE = 5.0;
    public static final int    MAX_MONTHS             = 600;


    // ══════════════════════════════════════════
    //  DATA CLASSES
    // ══════════════════════════════════════════

    // A single row in the rent breakdown table
    // Mirrors the rows[] array in script.js projectRent()
    public static class RentRow {
        public String label;
        public double rent;
        public double cumulative;

        public RentRow(String label, double rent, double cumulative) {
            this.label      = label;
            this.rent       = rent;
            this.cumulative = cumulative;
        }
    }

    // Full result of a rent projection
    // Mirrors the return value of projectRent() in script.js
    public static class ProjectionResult {
        public double        total;
        public double        finalRent;
        public double        increasePercent;
        public List<RentRow> rows;
        public boolean       budgetProvided;
        public boolean       overBudget;
        public double        overBy;
        public double        spareAmount;
        public int           feasibleMonths;

        public ProjectionResult() {
            this.rows           = new ArrayList<>();
            this.budgetProvided = false;
            this.overBudget     = false;
        }
    }


    // ══════════════════════════════════════════
    //  CORE FUNCTIONS
    //  Direct translation of backend_functions.cpp
    // ══════════════════════════════════════════

    /**
     * Calculates rent for the next billing period.
     * Mirrors: new_rent() in backend_functions.cpp
     */
    public static double newRent(double currentRent, double inflationRate) {
        double increase = inflationRate * 0.01 * currentRent;
        return currentRent + increase;
    }

    /**
     * Calculates total rent over a period with periodic billing.
     * Mirrors: get_total_rent() in backend_functions.cpp
     */
    public static double getTotalRent(double baseRent, int timePeriod,
                                       int chargesPerYear, double inflationRate) {
        int    billingBlocks = timePeriod * chargesPerYear;
        int    ctr           = 0;
        double totalRent     = 0;
        double currentRent   = baseRent;

        for (int i = 1; i <= billingBlocks; i++) {
            totalRent += currentRent;
            ctr++;
            if (ctr == chargesPerYear) {
                ctr         = 0;
                currentRent = newRent(currentRent, inflationRate);
            }
        }
        return totalRent;
    }

    /**
     * Returns true if projected rent exceeds the user's budget.
     * Mirrors: rent_flag() in backend_functions.cpp
     */
    public static boolean rentFlag(double currentRent, double inflationRate,
                                    int timePeriod, double chargesPerYear, double budget) {
        return getTotalRent(currentRent, timePeriod,
                            (int) chargesPerYear, inflationRate) > budget;
    }

    /**
     * Returns the maximum number of years affordable within a budget.
     * Mirrors: valid_years() in backend_functions.cpp
     */
    public static int validYears(double currentRent, double inflationRate,
                                  double chargesPerYear, double budget) {
        int    years = 0;
        double total;
        do {
            years++;
            total = getTotalRent(currentRent, years, (int) chargesPerYear, inflationRate);
        } while (total <= budget);
        return years - 1;
    }

    /**
     * Validates that a value is within a given range.
     * Mirrors: get_valid_number_inputs() in backend_functions.cpp
     */
    public static boolean isValidInput(double value, double lowerBound, double upperBound) {
        return value >= lowerBound && value <= upperBound;
    }


    // ══════════════════════════════════════════
    //  EXTENDED FUNCTIONS
    //  Migrated from script.js
    //  Month-by-month resolution for the website
    // ══════════════════════════════════════════

    /**
     * Core month-by-month rent projection engine.
     * Mirrors: projectRent() in script.js
     * Used by the website calculator and the quick estimate on the building page.
     */
    public static ProjectionResult projectRent(double initial, double rate,
                                                int months, double budget) {
        ProjectionResult result = new ProjectionResult();
        double total = 0;
        double rent  = initial;

        for (int m = 1; m <= months; m++) {
            // Apply annual increase at the start of each new year
            if (m > 1 && (m - 1) % 12 == 0) {
                rent *= (1.0 + rate / 100.0);
            }
            total += rent;

            // Snapshot at year end or final month
            if (m % 12 == 0 || m == months) {
                String label = (m % 12 == 0)
                    ? "Year " + (m / 12)
                    : "Month " + m + " (partial)";
                result.rows.add(new RentRow(label, rent, total));
            }
        }

        result.total           = total;
        result.finalRent       = rent;
        result.increasePercent = initial > 0
            ? ((rent - initial) / initial) * 100.0 : 0;

        // Budget evaluation — mirrors the budget alert in script.js
        if (budget > 0) {
            result.budgetProvided = true;
            if (total > budget) {
                result.overBudget     = true;
                result.overBy         = total - budget;
                result.feasibleMonths = feasibleDuration(initial, rate, budget);
            } else {
                result.overBudget  = false;
                result.spareAmount = budget - total;
            }
        }

        return result;
    }

    /**
     * Returns the maximum number of MONTHS affordable within a budget.
     * Mirrors: feasibleDuration() in script.js
     * Finer grain than validYears() — works in months not years.
     */
    public static int feasibleDuration(double initial, double rate, double budget) {
        double total  = 0;
        double rent   = initial;
        int    months = 0;

        while (true) {
            months++;
            if (months > 1 && (months - 1) % 12 == 0) {
                rent *= (1.0 + rate / 100.0);
            }
            total += rent;
            if (total > budget || months >= MAX_MONTHS) break;
        }

        return Math.max(0, months - 1);
    }


    // ══════════════════════════════════════════
    //  FORMATTING HELPERS
    // ══════════════════════════════════════════

    /** Formats a number as currency — mirrors fmt() in script.js */
    public static String formatCurrency(double amount) {
        return String.format("$%,.2f", amount);
    }

    /** Prints a full projection to the terminal */
    public static void printProjection(ProjectionResult r, double initial) {
        System.out.println("\n══ Rent Projection ══════════════════════════");
        System.out.printf("  Starting Rent:   %s/month%n",  formatCurrency(initial));
        System.out.printf("  Final Rent:      %s/month%n",  formatCurrency(r.finalRent));
        System.out.printf("  Total Cost:      %s%n",        formatCurrency(r.total));
        System.out.printf("  Total Increase:  +%.1f%%%n",   r.increasePercent);

        if (r.budgetProvided) {
            System.out.println("\n── Budget Check ─────────────────────────────");
            if (r.overBudget) {
                System.out.printf("  ⚠  Over budget by %s%n",                  formatCurrency(r.overBy));
                System.out.printf("  ⏱  Max affordable: %d months (%.1f yrs)%n",
                    r.feasibleMonths, r.feasibleMonths / 12.0);
            } else {
                System.out.printf("  ✓  Fits budget — %s to spare%n",          formatCurrency(r.spareAmount));
            }
        }

        System.out.println("\n── Year-by-Year Breakdown ───────────────────");
        System.out.printf("  %-24s %-16s %-18s%n", "Period", "Monthly Rent", "Cumulative Total");
        System.out.println("  " + "─".repeat(58));
        for (RentRow row : r.rows) {
            System.out.printf("  %-24s %-16s %-18s%n",
                row.label,
                formatCurrency(row.rent),
                formatCurrency(row.cumulative));
        }
        System.out.println();
    }


    // ══════════════════════════════════════════
    //  MAIN — terminal demonstration
    //  Compile:  javac BackendFunctions.java
    //  Run:      java BackendFunctions
    // ══════════════════════════════════════════

    public static void main(String[] args) {

        System.out.println("╔══════════════════════════════════════════╗");
        System.out.println("║   Rental Contract Helper — Backend       ║");
        System.out.println("║   BackendFunctions.java — Terminal Mode  ║");
        System.out.println("╚══════════════════════════════════════════╝");

        // Test 1: Core functions — matches original backend_functions.cpp tests
        System.out.println("\n── Test 1: Core Functions ───────────────────");
        double initRent = 1000.0;
        System.out.printf("  newRent($1000, 5%%):             %s%n",
            formatCurrency(newRent(initRent, DEFAULT_INFLATION_RATE)));
        System.out.printf("  getTotalRent(1yr,  1 cycle):   %s%n",
            formatCurrency(getTotalRent(initRent, 1, 1,  DEFAULT_INFLATION_RATE)));
        System.out.printf("  getTotalRent(1yr, 12 cycles):  %s%n",
            formatCurrency(getTotalRent(initRent, 1, 12, DEFAULT_INFLATION_RATE)));
        System.out.printf("  getTotalRent(2yr, 12 cycles):  %s%n",
            formatCurrency(getTotalRent(initRent, 2, 12, DEFAULT_INFLATION_RATE)));
        System.out.printf("  validYears (budget $24,600):   %d years%n",
            validYears(initRent, DEFAULT_INFLATION_RATE, 12, 24600));
        System.out.printf("  rentFlag   (budget $24,600):   %b%n",
            rentFlag(initRent, DEFAULT_INFLATION_RATE, 3, 12, 24600));

        // Test 2: Full projection within budget
        System.out.println("\n── Test 2: Projection — Within Budget ───────");
        ProjectionResult r1 = projectRent(1200.0, 5.0, 24, 35000.0);
        printProjection(r1, 1200.0);

        // Test 3: Full projection over budget
        System.out.println("── Test 3: Projection — Over Budget ─────────");
        ProjectionResult r2 = projectRent(1200.0, 5.0, 24, 20000.0);
        printProjection(r2, 1200.0);

        // Test 4: Feasible duration
        System.out.println("── Test 4: Feasible Duration ─────────────────");
        int maxMonths = feasibleDuration(1200.0, 5.0, 20000.0);
        System.out.printf("  Budget $20,000 → max: %d months (%.1f years)%n%n",
            maxMonths, maxMonths / 12.0);

        // Test 5: Input validation
        System.out.println("── Test 5: Input Validation ──────────────────");
        System.out.printf("  1200 in [0, 1000000]: %b%n", isValidInput(1200, 0, 1000000));
        System.out.printf("  150  in [0, 100]:     %b%n", isValidInput(150,  0, 100));
        System.out.printf("  5.0  in [0, 100]:     %b%n", isValidInput(5.0,  0, 100));
        System.out.println();
    }
}
