"""
Database — Synchronous SQLAlchemy with SQLite
Using sync engine (no aiosqlite/greenlet) for Python 3.14 compatibility.
FastAPI endpoints use run_in_executor pattern for non-blocking I/O.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session
from config import settings
import threading

# Strip aiosqlite prefix if present — use plain sqlite for sync engine
db_url = settings.DATABASE_URL.replace("sqlite+aiosqlite", "sqlite")
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if "sqlite" in db_url else {}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=(settings.APP_ENV == "development"),
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency — yields a synchronous DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables. Call on startup."""
    from models import user, trip, incident, geofence, ranger, network_coverage, advisory  # noqa: F401
    Base.metadata.create_all(bind=engine)
