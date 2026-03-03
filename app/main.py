from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routes_prediction import router as prediction_router
from app.api.v1.routes_users import router as users_router
from app.api.v1.routes_gis import router as gis_router
from app.infrastructure.database import engine, Base
from app.models import db_models

# Create database tables if they do not exist
db_models.Base.metadata.create_all(bind=engine)

# Start background midnight scheduler for daily tracking (Check 2)
try:
    from app.services.scheduler_service import start_scheduler
    start_scheduler()
except Exception as e:
    print(f"Warning: Failed to start background scheduler - {e}")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(prediction_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(gis_router, prefix="/api/v1")