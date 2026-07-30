"""FastAPI application entry point."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.config.settings import settings
from app.core.logging_config import configure_logging
from app.database.session import SessionLocal
from app.middleware.exception_handlers import register_exception_handlers
from app.middleware.logging_middleware import RequestLoggingMiddleware
from app.repositories.token_blacklist_repository import TokenBlacklistRepository

configure_logging(debug=settings.DEBUG)


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        TokenBlacklistRepository(db).purge_expired()
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="A Smart Parking Lot Management System backend API.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLoggingMiddleware)

register_exception_handlers(app)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["Health"])
def root():
    return {"success": True, "message": f"{settings.APP_NAME} is running.", "data": {"status": "ok"}}


@app.get("/health", tags=["Health"])
def health_check():
    return {"success": True, "message": "Healthy.", "data": {"status": "ok"}}
