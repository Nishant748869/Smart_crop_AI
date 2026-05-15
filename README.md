# Smart Crop Punjab

A FastAPI-based precision agriculture backend for Punjab farmers, with live weather analysis, soil tracking, irrigation recommendations, and crop health diagnostics.

## Project structure

- `backend/` - backend application package and runtime files
  - `app/` - FastAPI backend package
    - `api/v1/` - FastAPI routes for prediction, user management, GIS, and health diagnostics
    - `services/` - business logic, prediction engine, soil services, and scheduled jobs
    - `models/` - data models and domain schemas
    - `infrastructure/` - database and external API clients
    - `utils/` - reusable helper utilities
  - `requirements.txt` - backend Python dependencies
  - `generate_pdf.py`, `update_script.py` - backend utility scripts
  - log files, database file, and backend tests

- `frontend/` - static web UI assets and frontend tests

## Setup

1. Create a virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
3. Run the server:
   ```bash
   uvicorn backend.app.main:app --reload --port 8000
   ```

## Notes

- The project now separates backend and frontend assets into `backend/` and `frontend/`.
- The FastAPI app lifecycle uses startup/shutdown events to manage the scheduler.
- Backend dependencies are listed in `backend/requirements.txt`.
