import pytest
import httpx
import uuid

BASE_URL = "http://localhost:8000"


def get_unique_phone():
    # Generate unique 10 digit number
    return f"+91{uuid.uuid4().int % 10000000000:010d}"


def get_unique_email():
    return f"user_{uuid.uuid4().hex[:8]}@vanrakshak.org"


def test_01_direct_intake():
    phone = get_unique_phone()
    password = "demopassword123"

    # Register
    r = httpx.post(f"{BASE_URL}/auth/register", json={"phone": phone, "password": password})
    assert r.status_code == 201, f"Reg failed: {r.text}"
    data = r.json()
    assert "user_id" in data
    otp = data["otp_demo"]

    # Verify OTP
    r = httpx.post(f"{BASE_URL}/auth/verify-otp", json={"identifier": phone, "otp": otp})
    assert r.status_code == 200, f"Verify OTP failed: {r.text}"
    auth_data = r.json()
    assert "access_token" in auth_data
    token = auth_data["access_token"]

    # Create SOS Incident
    headers = {"Authorization": f"Bearer {token}"}
    r = httpx.post(
        f"{BASE_URL}/incidents",
        json={
            "incident_type": "sos",
            "severity": "critical",
            "lat": 30.9010,
            "lng": 76.9458,
            "search_radius_m": 100,
        },
        headers=headers,
    )
    assert r.status_code == 201, f"Incident creation failed: {r.text}"
    inc_data = r.json()
    assert "id" in inc_data

    # List incidents
    r = httpx.get(f"{BASE_URL}/incidents", headers=headers)
    assert r.status_code == 200, f"List incidents failed: {r.text}"
    assert len(r.json()) > 0


def test_03_offline_fall_detection():
    # Register and verify user
    phone = get_unique_phone()
    password = "demopassword123"
    r = httpx.post(f"{BASE_URL}/auth/register", json={"phone": phone, "password": password})
    assert r.status_code == 201, f"Reg failed: {r.text}"
    data = r.json()
    otp = data["otp_demo"]

    r = httpx.post(f"{BASE_URL}/auth/verify-otp", json={"identifier": phone, "otp": otp})
    assert r.status_code == 200, f"Verify OTP failed: {r.text}"
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Post fall incident (offline queued simulation)
    r = httpx.post(
        f"{BASE_URL}/incidents",
        json={
            "incident_type": "fall",
            "severity": "critical",
            "lat": 30.9010,
            "lng": 76.9458,
            "fall_confidence": 0.88,
        },
        headers=headers,
    )
    assert r.status_code == 201, f"Incident creation failed: {r.text}"
    inc_id = r.json()["id"]

    # Verify incident details
    r = httpx.get(f"{BASE_URL}/incidents/{inc_id}", headers=headers)
    assert r.status_code == 200, f"Get incident failed: {r.text}"
    details = r.json()
    assert details["incident_type"] == "fall"
    assert details["fall_confidence"] == 0.88


def test_05_unit_dispatch():
    # Register control room user
    email = get_unique_email()
    r = httpx.post(
        f"{BASE_URL}/auth/register",
        json={"email": email, "password": "adminpassword", "role": "control_room"},
    )
    assert r.status_code == 201, f"Control room user registration failed: {r.text}"
    data = r.json()
    otp = data["otp_demo"]

    r = httpx.post(f"{BASE_URL}/auth/verify-otp", json={"identifier": email, "otp": otp})
    assert r.status_code == 200, f"Verify CR OTP failed: {r.text}"
    cr_token = r.json()["access_token"]
    cr_headers = {"Authorization": f"Bearer {cr_token}"}

    # Register tourist user and create incident
    phone = get_unique_phone()
    r = httpx.post(f"{BASE_URL}/auth/register", json={"phone": phone, "password": "demopassword"})
    assert r.status_code == 201, f"Tourist registration failed: {r.text}"
    otp_t = r.json()["otp_demo"]
    r = httpx.post(f"{BASE_URL}/auth/verify-otp", json={"identifier": phone, "otp": otp_t})
    assert r.status_code == 200, f"Verify tourist OTP failed: {r.text}"
    t_token = r.json()["access_token"]
    t_headers = {"Authorization": f"Bearer {t_token}"}

    r = httpx.post(
        f"{BASE_URL}/incidents",
        json={"incident_type": "medical", "severity": "high", "lat": 30.9010, "lng": 76.9458},
        headers=t_headers,
    )
    assert r.status_code == 201, f"Incident creation failed: {r.text}"
    inc_id = r.json()["id"]

    # Get nearby rangers
    r = httpx.post(
        f"{BASE_URL}/rangers/nearby",
        json={"lat": 30.9010, "lng": 76.9458, "radius_m": 50000},
        headers=cr_headers,
    )
    assert r.status_code == 200, f"Ranger nearby fetch failed: {r.text}"
    rangers_list = r.json()
    assert len(rangers_list) > 0
    ranger = rangers_list[0]

    # Dispatch ranger
    r = httpx.patch(
        f"{BASE_URL}/incidents/{inc_id}/dispatch",
        json={"ranger_id": ranger["id"], "ranger_unit": ranger["unit_id"], "eta_minutes": 15},
        headers=cr_headers,
    )
    assert r.status_code == 200, f"Dispatch failed: {r.text}"
    assert r.json()["assigned"] == ranger["unit_id"]

    # Verify status changed
    r = httpx.get(f"{BASE_URL}/incidents/{inc_id}", headers=t_headers)
    assert r.status_code == 200
    assert r.json()["status"] == "TEAM_ASSIGNED"


def test_06_identity_verification():
    phone = get_unique_phone()
    r = httpx.post(f"{BASE_URL}/auth/register", json={"phone": phone, "password": "demopassword"})
    assert r.status_code == 201, f"Reg failed: {r.text}"
    otp = r.json()["otp_demo"]
    r = httpx.post(f"{BASE_URL}/auth/verify-otp", json={"identifier": phone, "otp": otp})
    assert r.status_code == 200, f"Verify OTP failed: {r.text}"
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get initial status
    r = httpx.get(f"{BASE_URL}/identity/status", headers=headers)
    assert r.json()["verification_status"] == "not_submitted"

    # Submit Aadhaar identity
    r = httpx.post(f"{BASE_URL}/identity/aadhaar", json={"aadhaar_number": "999900001234"}, headers=headers)
    assert r.status_code == 200, f"Aadhaar submit failed: {r.text}"
    res = r.json()
    assert res["verification_status"] == "verified"
    assert "dtid_code" in res

    # Verify status updated
    r = httpx.get(f"{BASE_URL}/identity/status", headers=headers)
    assert r.json()["verification_status"] == "verified"

    # Get DTID
    r = httpx.get(f"{BASE_URL}/identity/dtid", headers=headers)
    assert r.status_code == 200, f"DTID fetch failed: {r.text}"
    assert r.json()["dtid_code"] == res["dtid_code"]
    assert "chain_hash" in r.json()


def test_07_danger_zones_and_intersection():
    # Register tourist
    phone = get_unique_phone()
    r = httpx.post(f"{BASE_URL}/auth/register", json={"phone": phone, "password": "demopassword"})
    assert r.status_code == 201, f"Reg failed: {r.text}"
    otp = r.json()["otp_demo"]
    r = httpx.post(f"{BASE_URL}/auth/verify-otp", json={"identifier": phone, "otp": otp})
    assert r.status_code == 200, f"Verify OTP failed: {r.text}"
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get danger zones
    r = httpx.get(f"{BASE_URL}/danger-zones")
    assert r.status_code == 200, f"Get danger-zones failed: {r.text}"
    assert "features" in r.json()

    # Route passing directly through Landslide Zone A (30.9010, 76.9458)
    route = {
        "type": "LineString",
        "coordinates": [
            [76.9400, 30.8950],
            [76.9458, 30.9010],
            [76.9500, 30.9050],
        ],
    }
    r = httpx.post(f"{BASE_URL}/danger-zones/intersect", json={"route": route}, headers=headers)
    assert r.status_code == 200, f"Danger-zones intersect failed: {r.text}"
    res = r.json()
    assert res["intersects"] is True
    assert len(res["zones"]) > 0
    assert any(z["name"] == "Kasauli Landslide Zone A" for z in res["zones"])


def test_08_dead_reckoning():
    # Register tourist and create SOS incident
    phone = get_unique_phone()
    r = httpx.post(f"{BASE_URL}/auth/register", json={"phone": phone, "password": "demopassword"})
    assert r.status_code == 201, f"Reg failed: {r.text}"
    otp = r.json()["otp_demo"]
    r = httpx.post(f"{BASE_URL}/auth/verify-otp", json={"identifier": phone, "otp": otp})
    assert r.status_code == 200, f"Verify OTP failed: {r.text}"
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    r = httpx.post(
        f"{BASE_URL}/incidents",
        json={"incident_type": "sos", "severity": "critical", "lat": 30.9010, "lng": 76.9458},
        headers=headers,
    )
    assert r.status_code == 201, f"Incident creation failed: {r.text}"
    inc_id = r.json()["id"]

    # Submit dead-reckoning position update
    r = httpx.patch(
        f"{BASE_URL}/incidents/{inc_id}/dead-reckoning",
        json={
            "estimated_lat": 30.9025,
            "estimated_lng": 76.9472,
            "radius_m": 75.5,
        },
        headers=headers,
    )
    assert r.status_code == 200, f"Dead-reckoning update failed: {r.text}"
    assert r.json()["ok"] is True

    # Get incident and check dead-reckoning fields
    r = httpx.get(f"{BASE_URL}/incidents/{inc_id}", headers=headers)
    assert r.status_code == 200
    inc_details = r.json()
    assert inc_details["dr_estimated_lat"] == 30.9025
    assert inc_details["dr_estimated_lng"] == 76.9472
    assert inc_details["dr_radius_m"] == 75.5
