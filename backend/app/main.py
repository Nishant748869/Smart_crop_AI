from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.v1.routes_prediction import router as prediction_router
from backend.app.api.v1.routes_users import router as users_router
from backend.app.api.v1.routes_gis import router as gis_router
from backend.app.api.v1.api_v1_health import router as health_router
from backend.app.infrastructure.database import engine
from backend.app.models import db_models
from backend.app.services.scheduler_service import start_scheduler, stop_scheduler

# Create database tables if they do not exist
db_models.Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.on_event("startup")
async def startup_event():
    try:
        start_scheduler()
    except Exception as e:
        print(f"Warning: Failed to start background scheduler - {e}")


@app.on_event("shutdown")
async def shutdown_event():
    try:
        stop_scheduler()
    except Exception as e:
        print(f"Warning: Failed to stop background scheduler - {e}")

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
app.include_router(health_router, prefix="/api/v1")