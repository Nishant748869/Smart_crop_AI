# Smart Crop Punjab
**Prepared by:** Nishant Kumar
chicmic studios,mohali

## 1. Project Description
Smart Crop Punjab is a full-stack, automated agricultural advisory engine. It is designed to help Indian farmers optimize irrigation and diagnose crop health. The system calculates precise, real-time Evapotranspiration (ET) metrics based on live satellite data and weather APIs, and also features a 3-Layer Crop Health Validation Engine to cross-validate AI vision model diagnoses with environmental risk factors.

## 2. Tech Stack
- **Frontend:** Vanilla JavaScript, HTML5, Vanilla CSS (Glassmorphism UI)
- **Backend:** Python 3.10+, FastAPI (Asynchronous, High-Performance)
- **Database:** SQLite via SQLAlchemy ORM (Strict Pydantic Validation)
- **Scheduling:** APScheduler (Background Midnight Cron Jobs for daily updates)

## 3. Key Technologies
FastAPI, Asynchronous Processing, Machine Learning / Computer Vision, ResNet50, CNN Inference, Open-Meteo REST API, ISRIC SoilGrids API, NDVI Satellite Spatial Stress, Penman-Monteith ET0 Algorithm, APScheduler Background Task Runner, SQLAlchemy ORM, Dependency Injection, Pydantic Data Validation, Microservices Architecture.

## 4. Deep Learning Pipeline & AI Models
Vision Model & Inference Pipeline: Designed and simulated a 3-Layer Diagnostic Hybrid Engine using ResNet50 architectures for Deep Learning Image Classification (detecting diseases like Yellow Rust, Leaf Blast, etc.).

- **Layer 1 (Satellite Data):** Fetches and aggregates NDVI spatial data to detect geographical crop stress.
- **Layer 2 (Environmental Matrix):** Constructs a dynamic Risk Matrix using real-time Open-Meteo temperature and humidity data, overlaid with database soil moisture thresholds.
- **Layer 3 (Vision AI):** Runs edge inference via CNN to spatially classify disease presence in leaf images.
- **Synthesis (Trust Logic Engine):** A custom heuristic rules engine evaluates outputs from the CNN vision AI, satellite telemetry, and environmental constraints to eliminate false positives and formulate a highly accurate, single prescriptive action.

## 6. Core Features Built & Value Delivered
- **Predictive Agronomy Engine:** Engineered a scalable backend connecting Open-Meteo and ISRIC SoilGrids to mathematically compute real-time ET0 using the precise Penman-Monteith algorithm.
- **3-Layer Crop Validation System:** Formulated and executed a hybrid decision matrix that significantly reduces diagnostic false positives by correlating AI visual features with macro-environmental weather constraints.
- **Midnight Background Telemetry:** Integrated an asynchronous APScheduler backend to automatically calculate and update daily soil water depletion for all user fields natively, requiring zero active inputs from farmers.
- **Architecture:** Restructured legacy logic into modular, type-safe Python micro-apps. Used advanced Dependency Injection for safe, leak-free database connections and complete data serialization via Python Pydantic.
- **Premium User Experience (UX):** Hand-coded a glassmorphic dashboard architecture integrated with Fast2SMS OTP endpoints, utilizing pure JavaScript to drive single-page app (SPA) performance and immersive visualizations.
