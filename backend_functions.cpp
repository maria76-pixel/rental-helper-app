// ══════════════════════════════════════════════
//  backend_functions.cpp
//  Rental Contract Helper — Phase 2 backend
//
//  All calculation logic migrated from script.js
//  Preserves and extends backend_functions.hpp
// ══════════════════════════════════════════════

#include <iostream>
#include <fstream>
#include <vector>
#include <string>
#include <iomanip>
#include <sstream>
#include "header_files/json.hpp"

using namespace std;
using json = nlohmann::json;

// ── Constants ─────────────────────────────────────────────────────────────
// Default inflation rate — can be overridden by user input
const double DEFAULT_INFLATION_RATE = 5.0;




// Calculates the projected rent for the next billing period

double new_rent(double current_rent, double rent_inflation_rate) {
    double rent_increase = rent_inflation_rate * 0.01 * current_rent;
    return rent_increase + current_rent;
}

// Calculates total rent over a time period

double get_total_rent(double base_rent, int time_period, int charges_per_year, double rent_inflation_rate) {
    int billing_blocks = time_period * charges_per_year;
    int year(0), ctr(0);
    double total_rent(0), current_rent(base_rent);
    for (int i = 1; i <= billing_blocks; i++) {
        total_rent += current_rent;
        if (++ctr == charges_per_year) {
            ctr = 0;
            current_rent = new_rent(current_rent, rent_inflation_rate);
        }
    }
    return total_rent;
}

// Returns true if total projected rent exceeds the user's budget

bool rent_flag(double current_rent, double inflation_rate, int time_period, double charges_per_year, double budget) {
    if (get_total_rent(current_rent, time_period, charges_per_year, inflation_rate) > budget) {
        return true;
    }
    return false;
}

// Returns the maximum number of years the user can rent within their budget

int valid_years(double current_rent, double inflation_rate, double charges_per_year, double budget) {
    int years(0);
    double total;
    do {
        years++;
        total = get_total_rent(current_rent, years, charges_per_year, inflation_rate);
    } while (total <= budget);
    return years - 1;
}

// Validates numeric input within a range

void get_valid_number_inputs(double lower_bound, double upper_bound, double& destination) {
    do {
        cout << "Input value: " << endl;
        cin >> destination;
    } while (!((destination >= lower_bound) && (destination <= upper_bound)));
}


// ══════════════════════════════════════════════
//  NEW FUNCTIONS — migrated from script.js


// Struct to hold a single row of the rent projection table

struct RentRow {
    string label;       // e.g. "Year 1", "Month 14 (partial)"
    double rent;        // monthly rent at that point
    double cumulative;  // total spent so far
};

// Struct to hold the full result of a projection
struct ProjectionResult {
    double total;
    double finalRent;
    vector<RentRow> rows;
};

// Core projection engine — month-by-month rent accumulation
ProjectionResult projectRent(double initial, double rate, int months) {
    ProjectionResult result;
    result.total     = 0;
    result.finalRent = initial;
    double rent      = initial;

    for (int m = 1; m <= months; m++) {
        // Apply annual increase at the start of each new year
        // Matches: if (m > 1 && (m - 1) % 12 === 0) in script.js
        if (m > 1 && (m - 1) % 12 == 0) {
            rent *= (1.0 + rate / 100.0);
        }
        result.total += rent;

        // Snapshot at end of each year or at the final month
        if (m % 12 == 0 || m == months) {
            RentRow row;
            if (m % 12 == 0) {
                row.label = "Year " + to_string(m / 12);
            } else {
                row.label = "Month " + to_string(m) + " (partial)";
            }
            row.rent       = rent;
            row.cumulative = result.total;
            result.rows.push_back(row);
        }
    }

    result.finalRent = rent;
    return result;
}

// Returns the maximum number of MONTHS affordable within a budget

int feasibleDuration(double initial, double rate, double budget) {
    double total = 0;
    double rent  = initial;
    int months   = 0;

    while (true) {
        months++;
        // Apply annual increase at start of each new year
        if (months > 1 && (months - 1) % 12 == 0) {
            rent *= (1.0 + rate / 100.0);
        }
        total += rent;
        if (total > budget || months >= 600) break;
    }

    // Step back one — the month that pushed us over is not affordable
    return max(0, months - 1);
}

// Formats a double as a currency string: e.g. 1234.5 -> "$1,234.50"
string formatCurrency(double amount) {
    ostringstream oss;
    oss << fixed << setprecision(2) << amount;
    string s = oss.str();

    // Insert commas every 3 digits before the decimal
    int dot = s.find('.');
    int insert_pos = dot - 3;
    while (insert_pos > 0) {
        s.insert(insert_pos, ",");
        insert_pos -= 3;
    }
    return "$" + s;
}

// Prints a full rent projection to the console
void calculateRent(double initial, double rate, int months, double budget) {
    if (initial <= 0 || rate < 0 || months < 1) {
        cout << "Error: invalid inputs." << endl;
        return;
    }

    ProjectionResult proj = projectRent(initial, rate, months);
    double pct = ((proj.finalRent - initial) / initial) * 100.0;

    cout << "\n══ Rent Projection ══════════════════" << endl;
    cout << "Total Cost:      " << formatCurrency(proj.total)     << endl;
    cout << "Final Monthly:   " << formatCurrency(proj.finalRent) << endl;
    cout << "Total Increase:  +" << fixed << setprecision(1) << pct << "%" << endl;

    // Budget check — mirrors the budget alert in script.js
    if (budget > 0) {
        cout << "\n── Budget Check ─────────────────────" << endl;
        if (proj.total > budget) {
            double over = proj.total - budget;
            cout << "⚠  Over budget by " << formatCurrency(over) << endl;
            int maxMonths = feasibleDuration(initial, rate, budget);
            cout << "⏱  Max affordable: " << maxMonths << " months ("
                 << fixed << setprecision(1) << (maxMonths / 12.0) << " years)" << endl;
        } else {
            double under = budget - proj.total;
            cout << "✓  Fits budget — " << formatCurrency(under) << " to spare" << endl;
        }
    }

    // Year-by-year breakdown table — mirrors buildTable() in script.js
    cout << "\n── Breakdown ────────────────────────" << endl;
    cout << left << setw(20) << "Period"
         << setw(16) << "Monthly Rent"
         << setw(18) << "Cumulative Total" << endl;
    cout << string(54, '-') << endl;

    for (const RentRow& row : proj.rows) {
        cout << left << setw(20) << row.label
             << setw(16) << formatCurrency(row.rent)
             << setw(18) << formatCurrency(row.cumulative) << endl;
    }
    cout << endl;
}

// Outputs the projection as a JSON object
// This will be used to send data to the frontend in Phase 2
json calculateRentJSON(double initial, double rate, int months, double budget) {
    ProjectionResult proj = projectRent(initial, rate, months);
    double pct = ((proj.finalRent - initial) / initial) * 100.0;

    json result;
    result["total"]      = proj.total;
    result["finalRent"]  = proj.finalRent;
    result["increase"]   = pct;
    result["overBudget"] = false;

    if (budget > 0) {
        result["budgetProvided"] = true;
        if (proj.total > budget) {
            result["overBudget"]     = true;
            result["overBy"]         = proj.total - budget;
            result["feasibleMonths"] = feasibleDuration(initial, rate, budget);
        } else {
            result["overBudget"] = false;
            result["spareAmount"] = budget - proj.total;
        }
    } else {
        result["budgetProvided"] = false;
    }

    // Build breakdown rows array
    json rows = json::array();
    for (const RentRow& row : proj.rows) {
        rows.push_back({
            {"label",      row.label},
            {"rent",       row.rent},
            {"cumulative", row.cumulative}
        });
    }
    result["rows"] = rows;

    return result;
}


// ── Main — for testing ────────────────────────────────────────────────────

int main() {
    // Test 1: basic projection (matches original backend_functions.hpp tests)
    double init_rent = 1000.0;
    cout << "new_rent:         " << new_rent(init_rent, DEFAULT_INFLATION_RATE) << endl;
    cout << "get_total_rent (1yr, 1 cycle):  " << get_total_rent(init_rent, 1, 1,  DEFAULT_INFLATION_RATE) << endl;
    cout << "get_total_rent (1yr, 12 cycle): " << get_total_rent(init_rent, 1, 12, DEFAULT_INFLATION_RATE) << endl;
    cout << "get_total_rent (2yr, 12 cycle): " << get_total_rent(init_rent, 2, 12, DEFAULT_INFLATION_RATE) << endl;
    cout << "valid_years (budget 24600):     " << valid_years(init_rent, DEFAULT_INFLATION_RATE, 12, 24600) << endl;

    cout << "\n─────────────────────────────────────" << endl;

    // Test 2: full projection with budget (matches calculateRent() in script.js)
    calculateRent(1200.0, 5.0, 24, 30000.0);

    // Test 3: JSON output (for Phase 2 frontend connection)
    json j = calculateRentJSON(1200.0, 5.0, 24, 30000.0);
    cout << "JSON output:\n" << j.dump(2) << endl;

    // Test 4: feasible duration
    int months = feasibleDuration(1200.0, 5.0, 20000.0);
    cout << "\nMax affordable months (budget $20,000): " << months << endl;

    return 0;
}
