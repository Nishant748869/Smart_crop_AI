# 🌾 Smart Crop Punjab

**Smart Crop Punjab** is a FastAPI-based precision agriculture platform designed to help farmers make data-driven decisions about **irrigation, soil conditions, weather, and crop health**.

The platform combines real-time environmental data, soil information, agricultural calculations, automated background processing, and AI-based crop disease diagnostics to provide actionable insights at the field level.

---

## 🚀 Key Features

### 💧 Smart Irrigation Recommendations
- Fetches live weather data based on field location.
- Retrieves soil composition and related information using external soil data services.
- Calculates crop water requirements using **evapotranspiration (ET₀)** and crop coefficients.
- Tracks daily soil water depletion and field-level water balance.
- Generates irrigation recommendations based on configurable depletion thresholds.

### 🌱 Crop Health & Disease Diagnostics
- Supports crop health analysis using environmental and vegetation information.
- Uses satellite-derived **NDVI (Normalized Difference Vegetation Index)** for vegetation health assessment.
- Integrates image-based disease classification using deep-learning models.
- Combines environmental conditions and model predictions through a rule-based diagnostic layer.

### 🌦️ Weather & Soil Integration
- Integrates external weather APIs for:
  - Temperature
  - Humidity
  - Wind speed
  - Solar radiation
  - Precipitation
- Integrates soil information based on geographical coordinates.
- Uses field GPS coordinates to provide location-specific agricultural analysis.

### ⏰ Automated Daily Processing
- Uses **APScheduler** for scheduled background processing.
- Automatically processes registered fields on a daily basis.
- Updates soil and water status without requiring farmers to manually open the application.
- Stores daily field-level status for historical tracking.

### 📱 User Management & Authentication
- FastAPI-based user management APIs.
- Mobile OTP-based authentication.
- Integration with **Fast2SMS** for OTP delivery.
- Simulation/fallback modes for development and external-service failures.

### 🛡️ Resilient External API Handling
- External API integrations are isolated inside the infrastructure layer.
- Handles failures from third-party services gracefully.
- Supports fallback/simulation responses during development and service outages.
- Prevents external API failures from directly breaking application workflows.

---

# 🏗️ System Architecture

```text
                         ┌─────────────────────┐
                         │      Frontend       │
                         │ HTML / CSS / JS     │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │      FastAPI        │
                         │   REST API Layer    │
                         └──────────┬──────────┘
                                    │
                   ┌────────────────┼────────────────┐
                   │                │                │
                   ▼                ▼                ▼
             ┌──────────┐    ┌─────────────┐   ┌──────────────┐
             │ Services │    │   Models    │   │ Infrastructure│
             │  Layer   │    │ & Schemas   │   │ DB/API Client │
             └────┬─────┘    └─────────────┘   └───────┬──────┘
                  │                                     │
        ┌─────────┼─────────┐                 ┌─────────┼─────────┐
        ▼         ▼         ▼                 ▼         ▼         ▼
   Irrigation  Soil     Disease          Database   Weather    Soil API
    Engine    Service   Diagnostics                 API       Services
        │
        ▼
   APScheduler
   Daily Jobs
```

---

# 📂 Project Structure

```text
Smart-Crop-Punjab/
│
├── backend/
│   │
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── prediction/
│   │   │       ├── users/
│   │   │       ├── gis/
│   │   │       └── health/
│   │   │
│   │   ├── services/
│   │   │   ├── prediction/
│   │   │   ├── soil/
│   │   │   └── scheduled_jobs/
│   │   │
│   │   ├── models/
│   │   │   └── domain_models/
│   │   │
│   │   ├── infrastructure/
│   │   │   ├── database/
│   │   │   └── external_clients/
│   │   │
│   │   ├── utils/
│   │   └── main.py
│   │
│   ├── requirements.txt
│   ├── generate_pdf.py
│   ├── update_script.py
│   └── tests/
│
├── frontend/
│   ├── assets/
│   └── tests/
│
└── README.md
```

---

# 🔄 Irrigation Recommendation Flow

The irrigation engine follows a location-based data processing pipeline:

```text
Farmer / Field GPS
        │
        ▼
   Soil Data API
        │
        ▼
   Soil Properties
        │
        ├──────────────────┐
        │                  │
        ▼                  ▼
 Weather API          Crop Information
        │                  │
        └────────┬─────────┘
                 ▼
        ET₀ Calculation
                 │
                 ▼
       Crop Coefficient (Kc)
                 │
                 ▼
       Crop Water Demand
                 │
                 ▼
      Soil Water Depletion
                 │
                 ▼
       MAD Threshold Check
                 │
          ┌──────┴──────┐
          ▼             ▼
     Water OK      Irrigation
                    Required
```

The system continuously evaluates the field's estimated water status and determines whether irrigation is required based on configured agricultural thresholds.

---

# 🤖 Crop Disease Diagnostic Flow

```text
             Field / Crop
                  │
       ┌──────────┼──────────┐
       ▼          ▼          ▼
     NDVI      Weather    Leaf Image
       │          │          │
       │          │          ▼
       │          │      CNN Model
       │          │          │
       └──────────┼──────────┘
                  ▼
        Diagnostic Rules Engine
                  │
                  ▼
        Crop Health Assessment
```

The diagnostic layer combines multiple signals rather than relying exclusively on image classification.

---

# ⏰ Automated Daily Processing

The application uses **APScheduler** to execute scheduled background jobs.

At the configured execution time, the scheduler:

1. Retrieves registered fields.
2. Gets location-specific weather information.
3. Processes the latest environmental data.
4. Calculates daily water depletion.
5. Updates the field's soil/water status.
6. Stores the daily result for historical tracking.

This allows field information to remain updated even when the farmer is not actively using the application.

---

# 🧩 Backend Architecture

The backend follows a layered architecture:

### API Layer

Contains FastAPI routes and handles:

- HTTP requests
- Request validation
- Response serialization
- Dependency injection
- API versioning

### Service Layer

Contains the application's business logic:

- Irrigation calculations
- Soil processing
- Crop prediction
- Disease diagnostics
- Scheduled jobs

Keeping business logic outside route handlers makes the application easier to maintain and test.

### Models Layer

Contains domain/data models used throughout the application.

### Infrastructure Layer

Responsible for external dependencies such as:

- Database connectivity
- Weather APIs
- Soil APIs
- SMS/OTP services
- Other third-party integrations

This separation prevents external integrations from being tightly coupled with business logic.

---

# 🛠️ Technology Stack

| Category | Technology |
|---|---|
| Backend | Python, FastAPI |
| ORM / Database Access | SQLAlchemy |
| Database | SQLite |
| Validation | Pydantic |
| Scheduling | APScheduler |
| Machine Learning | ResNet50 / InceptionV3 |
| Weather Data | Open-Meteo |
| Soil Data | ISRIC SoilGrids |
| Authentication | Mobile OTP |
| SMS Gateway | Fast2SMS |
| Frontend | HTML5, CSS3, JavaScript |
| Server | Uvicorn |

---

# ⚙️ Installation

## 1. Clone the Repository

```bash
git clone <repository-url>
cd Smart-Crop-Punjab
```

## 2. Create a Virtual Environment

```bash
python3 -m venv .venv
```

Activate it:

### Linux / macOS

```bash
source .venv/bin/activate
```

### Windows

```bash
.venv
