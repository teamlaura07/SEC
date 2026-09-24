"""Updated main.py — sync startup for Python 3.12 + SQLite."""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import init_db
from routers import auth, identity, trips, incidents, danger_zones, rangers, weather, advisories, coverage
from websocket.manager import manager
import json, uuid
from datetime import datetime
from pathlib import Path

app = FastAPI(
    title="VanRakshak API",
    description="Smart Tourist Safety Monitoring & Incident Response System — SIH25002",
    version="2.5.0",
)

cors_origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()] if settings.ALLOWED_ORIGINS != "*" else ["*"]
if "*" not in cors_origins and "http://localhost:5173" not in cors_origins:
    cors_origins.extend(["http://localhost:5173", "http://localhost:3000"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(identity.router)
app.include_router(trips.router)
app.include_router(incidents.router)
app.include_router(danger_zones.router)
app.include_router(rangers.router)
app.include_router(weather.router)
app.include_router(advisories.router)
app.include_router(coverage.router)


@app.websocket("/ws/incidents")
async def ws_incidents(websocket: WebSocket, role: str = "_all"):
    await manager.connect(websocket, role=role)
    try:
        while True:
            data = await websocket.receive_json()
            await manager.broadcast({"type": "ECHO", "data": data}, role="_all")
    except WebSocketDisconnect:
        manager.disconnect(websocket, role=role)


@app.on_event("startup")
def startup():
    init_db()
    _seed_default_data()


def _seed_default_data():
    from database import SessionLocal
    from models.geofence import DangerZone
    from models.network_coverage import CoveragePoint
    from models.ranger import Ranger
    from models.advisory import Advisory

    db = SessionLocal()
    try:
        if not db.query(DangerZone).first():
            seed_file = Path(__file__).parent / "seed" / "danger_zones.geojson"
            if seed_file.exists():
                data = json.loads(seed_file.read_text())
                for f in data.get("features", []):
                    p = f["properties"]; coords = f["geometry"]["coordinates"]
                    db.add(DangerZone(id=str(uuid.uuid4()), name=p["name"], zone_type=p["zone_type"],
                                      center_lat=coords[1], center_lng=coords[0],
                                      radius_m=p.get("radius_m", 500), severity=p.get("severity", "medium"),
                                      description=p.get("description")))

        if not db.query(CoveragePoint).first():
            seed_file = Path(__file__).parent / "seed" / "coverage_points.json"
            if seed_file.exists():
                for pt in json.loads(seed_file.read_text()):
                    db.add(CoveragePoint(lat=pt["lat"], lng=pt["lng"], strength=pt["strength"]))

        from models.user import User
        from middleware.rbac import hash_password

        # Seed default users
        ranger_user_id = str(uuid.uuid4())
        if not db.query(User).first():
            db.add(User(id=str(uuid.uuid4()), email="admin@vanrakshak.org", password_hash=hash_password("admin123"), role="control_room", is_verified=True))
            db.add(User(id=ranger_user_id, email="ranger@vanrakshak.org", password_hash=hash_password("ranger123"), role="rescue_team", is_verified=True))
            db.add(User(id=str(uuid.uuid4()), email="tourist@vanrakshak.org", password_hash=hash_password("tourist123"), role="tourist", is_verified=True))
            db.commit()

        if not db.query(Ranger).first():
            ranger_user = db.query(User).filter(User.email == "ranger@vanrakshak.org").first()
            ranger_uid = ranger_user.id if ranger_user else None

            from models.ranger import RangerLocation
            for unit in [
                {"unit_id": "RANGER-01", "name": "Arjun Singh", "unit_type": "ranger", "lat": 30.9015, "lng": 76.9450, "user_id": ranger_uid},
                {"unit_id": "RANGER-02", "name": "Priya Sharma", "unit_type": "ranger", "lat": 30.8995, "lng": 76.9480},
                {"unit_id": "MED-01",    "name": "Dr. Kiran Rao", "unit_type": "medic", "lat": 30.9030, "lng": 76.9410},
                {"unit_id": "POLICE-04", "name": "Insp. Vikram Das", "unit_type": "police", "lat": 30.8970, "lng": 76.9500},
            ]:
                rid = str(uuid.uuid4())
                lat = unit.pop("lat")
                lng = unit.pop("lng")
                db.add(Ranger(id=rid, **unit))
                db.add(RangerLocation(id=str(uuid.uuid4()), ranger_id=rid, lat=lat, lng=lng))



        if not db.query(Advisory).first():
            for adv in [
                {"title": "Trail KD-3 Temporarily Closed",
                 "body": "Kasauli-Dharampur trail KD-3 closed due to erosion. Use KD-5 alternate.",
                 "category": "closure", "region": "Kasauli", "severity": "warning"},
                {"title": "Wildlife Alert: Leopard Sightings",
                 "body": "Increased leopard activity near Solan forest range. Stay on marked trails.",
                 "category": "ranger_advisory", "region": "Solan", "severity": "critical"},
                {"title": "Pre-Monsoon Advisory",
                 "body": "Heavy rainfall expected this weekend. Landslide zones flagged.",
                 "category": "weather_warning", "region": "Himachal Pradesh", "severity": "warning"},
            ]:
                db.add(Advisory(id=str(uuid.uuid4()), published_at=datetime.utcnow(), **adv))

        db.commit()
    finally:
        db.close()


@app.get("/")
def root():
    return {"service": "VanRakshak API", "version": "2.5.0", "status": "operational"}

@app.get("/health")
def health():
    return {"status": "ok"}
