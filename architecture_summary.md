# Smart Crop Punjab: Architecture & Technical Overview

This document provides a comprehensive technical overview of the "Smart Crop Punjab" project, detailing its architecture, database design, core engine mechanics, and user flow. It is designed to be shared with AI models (like ChatGPT or Gemini) for review and feedback.

## 1. Project Goal & Value Proposition
Smart Crop Punjab is a full-stack, automated agricultural advisory engine. Its primary goal is to help Indian farmers optimize irrigation by calculating precise, real-time "Evapotranspiration" (ET) metrics based on live satellite data (SoilGrids) and live weather APIs (Open-Meteo). 

Unlike static calculators, this system features a persistent backend database and a Midnight Background Scheduler that actively tracks soil depletion day-by-day, allowing a farmer to log in at any time and instantly know exactly how much water is currently in their soil and whether they need to irrigate today.

---

## 2. Technology Stack
*   **Backend:** Python 3.10+, FastAPI (Asynchronous, High-Performance)
*   **Database:** SQLite (via SQLAlchemy ORM)
*   **Scheduling:** APScheduler (Background task runner)
*   **Frontend:** Vanilla JavaScript, HTML5, Vanilla CSS (Custom Glassmorphism/Modern UI)
*   **External APIs:**
    *   **ISRIC SoilGrids REST API:** Live fetching of sub-100m soil composition (Sand/Silt/Clay).
    *   **Open-Meteo API:** Live weather data (Temperature, Humdity, Wind Speed, Solar Radiation) for ET calculations.
    *   **Fast2SMS:** Mockable integration for Indian mobile OTP login.

---

## 3. Database Schema (SQLAlchemy)
The system uses a 1-to-Many relational structure to allow a single farmer to track multiple independent plots of land simultaneously.

### A. `Farmer` Table
The root user entity.
*   `id` (Integer, Primary Key)
*   `phone_number` (String, Unique) - The primary authentication identifier (e.g., +919876543210).
*   `created_at` (DateTime)

### B. `FarmField` Table
Represents a specific plot of land owned by a `Farmer`.
*   `id` (Integer, Primary Key)
*   `farmer_id` (Integer, Foreign Key to `Farmer.id`)
*   `field_name` (String) - e.g., "Wheat Plot", "Potato Plot".
*   `lat`, `lon` (Float) - The exact GPS coordinates of the field.
*   `crop` (String) - The type of crop (wheat, potato, rice, etc.).
*   `sowing_date` (String) - ISO 8601 date of sowing.
*   `created_at` (DateTime)

### C. `DailySoilStatus` Table
The core telemetry log. Every day, the system inserts a new row for every active `FarmField`, tracking its live water state.
*   `id` (Integer, Primary Key)
*   `field_id` (Integer, Foreign Key to `FarmField.id`)
*   `date` (String) - ISO 8601 date.
*   `soil_water_mm` (Float) - The absolute amount of water currently in the root zone (in millimeters).
*   `etc_mm` (Float) - Water lost to Evapotranspiration on this specific day.
*   `rain_mm` (Float) - Water gained from rainfall.
*   `irrigation_mm` (Float) - Manual water added by the farmer via the UI.

---

## 4. Core Engine Mechanics

### A. The "Prediction Engine" (`water_balance_service.py`)
When a field is analyzed, the engine executes the following pipeline:
1.  **Soil API Call:** Fetches Sand, Silt, and Clay percentages from SoilGrids using the GPS coordinates.
2.  **Soil Properties Calculation:** Converts the sand/silt/clay mixture into `Field Capacity (FC)` and `Permanent Wilting Point (PWP)`. It calculates the `Total Available Water (TAW)`.
3.  **Weather API Call:** Fetches the last 7 days of live weather data from Open-Meteo for those exact GPS coordinates.
4.  **Penman-Monteith ET0:** Uses temperature, wind, solar radiation, and humidity to mathematically calculate the "Reference Evapotranspiration" ($ET_0$).
5.  **Crop Coefficient (Kc):** Uses the `sowing_date` to determine how old the crop is, and applies the correct stage coefficient (Initial, Mid, Late) to get the specific crop Evapotranspiration ($ET_c = ET_0 \times K_c$).
6.  **Water Balance:** Calculates if the current soil moisture has dropped below the "Management Allowed Depletion" (MAD) threshold. If it has, it triggers an "Irrigation Required" recommendation.

### B. The Midnight Scheduler (`scheduler_service.py`)
A background `APScheduler` job runs at exactly **00:00 (Midnight)** every day.
1.  Queries all `FarmField` entries in the DB.
2.  For each field, hits the Prediction Engine to calculate the exact evaporation ($ET_c$) that happened *that day*.
3.  Subtracts $ET_c$ from the previous day's `soil_water_mm`.
4.  Clamps the result (cannot go below 0 or above 100% capacity).
5.  Saves the new Daily Soil Status as a new row.
**Result:** The farmer wakes up to a dashboard displaying perfectly updated, mathematically accurate soil water depletion values without having to touch a button.

---

## 5. User Interface (UI) Workflow

1.  **OTP Login:** The user arrives at `index.html`. They enter their 10-digit mobile number and receive an OTP.
2.  **Dashboard:** Upon login, the Single Page Application (SPA) queries the API for their saved `FarmFields`. It dynamically renders a "Crop Card" for each field, showing the current water level and a recommendation.
3.  **Add Field Wizard:** To track a new plot, the user clicks "Add Field".
    *   **Step 1:** An interactive Map allows them to drop a pin on their exact farm.
    *   **Step 2:** They select the Crop type, Sowing Date, and Initial Irrigation Amount.
    *   **Step 3:** The backend initializes the field in the database and creates the Day-1 `DailySoilStatus` row.
4.  **Irrigation Timeline (Modal):** Users can click "View Irrigation History" on any Dashboard card. A dynamically populated CSS glassmorphic modal slides up, displaying a chronological timeline of every manual irrigation event they've logged, pulled directly from the `DailySoilStatus` telemetry table.

---

## 6. Recent Polish & Fixes
*   **Data Integrity:** All HTML `<input type="date">` fields are dynamically restricted by JavaScript so users cannot accidentally select dates in the future for sowing or irrigation.
*   **Custom Initialization:** Rather than assuming 50mm of water for every new crop, the UI now explicitly asks the user for the "Initial Irrigation Amount (mm)" during setup, passing it to the database for accurate Day-1 tracking.
*   **Visual Fidelity:** CSS Flexbox was rigorously applied to modals, dropdowns, and dashboard cards to ensure perfect cross-device alignment and a premium UI experience.
