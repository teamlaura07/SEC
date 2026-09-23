# 🌲 VanRakshak: Technical Architecture & Engineering Specification Report
### **Project Code**: SIH25002 | **Version**: 2.5.0  
**Authors**: Team VanRakshak (Smart India Hackathon)  
**Target Environment**: Low-Connectivity Mountainous & Forest Wilderness (Himalayas & North-East India)

---

## 1. Executive Summary & Problem Context

### 1.1 The Wilderness Safety Challenge
In high-altitude alpine ridges, dense pine canopies, and remote forest reserves, millions of tourists, trekkers, and field researchers encounter life-threatening emergencies annually (sudden landslides, severe hypothermia, acute mountain sickness, flash floods, wildlife encounters, or trail disorientation).

Standard consumer safety applications suffer from three fatal flaws:
1. **Network Fragility**: They assume persistent 4G/5G cellular connectivity. In deep valleys and ravines, signal is zero. When signal drops, apps stop recording, fail to alert, or crash.
2. **Static Search Coordinates**: When an SOS is transmitted at the last point of connectivity, search and rescue (SAR) teams search *only* that static coordinate. However, a lost hiker continues walking, quickly moving kilometers away from the last known fix.
3. **Disjointed Operational Silos**: Tourists, field rescue units, and government command centres use disconnected communication tools, causing critical rescue delays.

### 1.2 The VanRakshak Solution
**VanRakshak (वनरक्षक)** is a unified, expedition-grade wilderness safety platform that guarantees operational continuity across the entire connectivity spectrum (Online $\rightarrow$ Intermittent $\rightarrow$ Full Blackout).

Key capabilities:
- **Kinematic Dead-Reckoning Engine**: Reconstructs motion vectors during network dropouts to project current coordinates.
- **Dynamic Search Radius (Uncertainty Cone)**: Calculates expanding probability polygons based on pre-loss velocity and elapsed offline time.
- **Web Accelerometer Fall Sensor**: Detects impact spikes ($>0.85$ confidence) directly in-browser and initiates automated safety countdowns.
- **Geofenced Danger Zone Engine**: Real-time line-string route intersection testing against active hazard areas.
- **Cryptographically Tamper-Proof Audit Chain**: SHA-256 state chaining for government incident accountability.
- **Tripartite Synchronous Control**: WebSocket-driven real-time interaction between Tourists, Rangers, and Command Operators.

---

## 2. High-Level Architecture & Communication Topology

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT LAYER (PWA)                                   │
│                                                                                        │
│   ┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐   │
│   │     Tourist Portal     │  │     Ranger Terminal    │  │  Control Room Console  │   │
│   │  - Live Safety Map     │  │  - Tactical Triage     │  │  - Fleet Geospatial COP│   │
│   │  - Fall Sensor (IMU)   │  │  - Incident Dispatch   │  │  - Nearest-Unit Match  │   │
│   │  - Dead-Reckoning Math │  │  - Offline Cache       │  │  - Threat Broadcast    │   │
│   └───────────┬────────────┘  └───────────┬────────────┘  └───────────┬────────────┘   │
│               │ (HTTP / WS / Offline)     │ (HTTP / WS)               │ (HTTP / WS)    │
└───────────────┼───────────────────────────┼───────────────────────────┼────────────────┘
                │                           │                           │
                ▼                           ▼                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                             BACKEND ENGINE (FASTAPI ASGI)                              │
│                                                                                        │
│   ┌────────────────────────────────────────────────────────────────────────────────┐   │
│   │                          REST API & RBAC MIDDLEWARE                            │   │
│   │   - OAuth2 Bearer + JWT Token Extraction                                       │   │
│   │   - Role Guards: ['tourist', 'rescue_team', 'control_room']                    │   │
│   └───────────────────────────────────────┬────────────────────────────────────────┘   │
│                                           │                                            │
│   ┌───────────────────┬───────────────────┼───────────────────┬────────────────────┐   │
│   │  Incident Engine  │  Spatial Geodesy  │  Identity (DTID)  │  Audit Hash Chain  │   │
│   │  - SOS Intake     │  - Haversine Dist │  - Aadhaar Hash   │  - SHA-256 Chaining│   │
│   │  - State Machine  │  - Geofence Test  │  - Digital Pass   │  - Ledger Anchor   │   │
│   └───────────────────┴───────────────────┼───────────────────┴────────────────────┘   │
│                                           │                                            │
│   ┌───────────────────────────────────────┴────────────────────────────────────────┐   │
│   │                     REAL-TIME WEBSOCKET CONNECTION MANAGER                     │   │
│   │   - Broadcast Channels: `_all`, `control_room`, `rescue_team`, `tourist`       │   │
│   └───────────────────────────────────────┬────────────────────────────────────────┘   │
└───────────────────────────────────────────┼────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              DATA & PERSISTENCE LAYER                                  │
│                                                                                        │
│   ┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐   │
│   │     SQLAlchemy ORM     │  │     GeoJSON Engine     │  │    Client IndexedDB    │   │
│   │  - SQLite (Local Dev)  │  │  - Danger Zones Polys  │  │  - Offline SOS Packets │   │
│   │  - Postgres/PostGIS    │  │  - Elevation Profiles  │  │  - Dead-Reckoning Sync │   │
│   └────────────────────────┘  └────────────────────────┘  └────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Mathematical Models & Core Algorithms

### 3.1 Kinematic Dead-Reckoning & Uncertainty Cone
When a hiker moves beyond cellular coverage, their position cannot be updated via server telemetry. The VanRakshak client executes local dead-reckoning kinematics.

#### Step 1: Pre-Loss Walking Speed Calculation
Given two consecutive timestamped GPS fixes $P_1(\phi_1, \lambda_1, t_1)$ and $P_2(\phi_2, \lambda_2, t_2)$ recorded prior to signal loss:
$$\Delta\phi = \phi_2 - \phi_1, \quad \Delta\lambda = \lambda_2 - \lambda_1$$
$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$
$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right)$$
$$d_{\text{traveled}} = R_{\text{earth}} \cdot c \quad (R_{\text{earth}} = 6,371,000\text{ m})$$
$$v_{\text{walk}} = \text{clamp}\left( \frac{d_{\text{traveled}}}{t_2 - t_1}, \; 0.6\text{ m/s}, \; 2.8\text{ m/s} \right)$$

#### Step 2: Forward Azimuth / Heading Computation
$$\theta = \text{atan2}\left(\sin(\Delta\lambda)\cos(\phi_2), \; \cos(\phi_1)\sin(\phi_2) - \sin(\phi_1)\cos(\phi_2)\cos(\Delta\lambda)\right)$$
$$\text{Heading}^{\circ} = (\theta \cdot \frac{180}{\pi} + 360) \pmod{360}$$

#### Step 3: Coordinate Projection During Offline Period ($\Delta t_{\text{offline}}$)
$$d_{\text{offline}} = v_{\text{walk}} \times \Delta t_{\text{offline}}$$
$$\phi_{\text{estimated}} = \phi_0 + \frac{d_{\text{offline}} \cdot \cos(\theta)}{111,320}$$
$$\lambda_{\text{estimated}} = \lambda_0 + \frac{d_{\text{offline}} \cdot \sin(\theta)}{111,320 \cdot \cos(\phi_0)}$$

#### Step 4: Expanding Search Radius (Uncertainty Bounds)
Because terrain slope and minor route deviations introduce spatial error over time, search radius $R_{\text{search}}$ expands dynamically at a rate proportional to velocity with a $1.15\times$ terrain variance factor:
$$R_{\text{search}} = \text{clamp}\left( R_{\text{base}} + (v_{\text{walk}} \cdot \Delta t_{\text{offline}} \cdot 1.15), \; 30\text{ m}, \; 3,000\text{ m} \right)$$

---

### 3.2 Sensor-Fused Fall Detection Algorithm
The client captures device tri-axial accelerations from the Web Motion API ($a_x, a_y, a_z$ in $\text{m/s}^2$):

$$||\mathbf{a}|| = \sqrt{a_x^2 + a_y^2 + a_z^2}$$

A fall impact event is registered when:
1. **Freefall Signature**: $||\mathbf{a}|| < 3.0\text{ m/s}^2$ for $\Delta t \in [100\text{ms}, 400\text{ms}]$
2. **High-G Impact Spike**: $||\mathbf{a}|| > 24.5\text{ m/s}^2$ ($2.5g$) within $500\text{ms}$ of freefall.
3. **Post-Impact Inactivity**: $||\mathbf{a}|| \approx 9.8\text{ m/s}^2 \pm 0.8$ for $> 3.0\text{s}$.

When all three criteria are satisfied, the system computes the fall confidence coefficient:
$$C_{\text{fall}} = \min\left(1.0, \; \frac{||\mathbf{a}_{\text{max}}|| - 24.5}{15.0} + 0.85\right)$$

If $C_{\text{fall}} > 0.85$, a visual/audio 30-second abort countdown begins. If not cancelled by the user, an emergency SOS packet is automatically generated and queued.

---

### 3.3 Cryptographic Hash-Chained Audit Ledger
To guarantee non-repudiation and prevent tampering with rescue response records during post-incident investigations, every incident state mutation computes a SHA-256 block hash linked to its predecessor:

$$B_n = \{ \text{incident\_id}, \; \text{status}_{n}, \; \text{actor\_id}, \; \text{lat}, \; \text{lng}, \; \text{timestamp}, \; H_{n-1} \}$$
$$H_n = \text{SHA-256}\left( \text{CanonicalJSON}(B_n) \right)$$

If any parameter is modified in the database directly, the hash chain breaks, alerting the system administrator during automated verification.

---

## 4. Software Architecture & Implementation Details

### 4.1 Backend Module Breakdown (`backend/`)

| Module / File | Responsibility |
| :--- | :--- |
| `main.py` | FastAPI application initialization, CORS middleware, WebSocket endpoint routing, database table initialization, and bootstrap data seeding. |
| `database.py` | SQLAlchemy database engine creation, connection pooling, and `SessionLocal` dependency provider. |
| `middleware/rbac.py` | Extracts JWT Bearer tokens, decodes user claims, verifies role privileges, and provides password hashing helpers. |
| `models/user.py` | SQLAlchemy model representing system users, authentication roles, and Digital Tourist ID (DTID) state. |
| `models/incident.py` | Incident entity with status lifecycle (`OPEN`, `TEAM_ASSIGNED`, `EN_ROUTE`, `ON_SCENE`, `RESOLVED`, `CANCELLED`), GPS coordinates, fall confidence, and cryptographic hash chain anchor. |
| `models/ranger.py` | Forest ranger and rescue unit profiles with unit classification (`ranger`, `medic`, `police`) and real-time GPS history tracking. |
| `models/geofence.py` | Danger zone geofence entities (landslides, flash floods, wildlife encounters) with centroid coordinates and alert radii. |
| `routers/auth.py` | User registration, mock SMS/OTP generation, credential validation, and JWT token issuance. |
| `routers/identity.py` | Aadhaar/Passport tokenization, cryptographic SHA-256 verification, and Digital Tourist ID QR issuance. |
| `routers/incidents.py` | Distress SOS submission, nearest ranger dispatch assignment, status progression, and dead-reckoning coordinate updates. |
| `routers/danger_zones.py` | Spatial intersection testing between proposed hiking routes (`LineString`) and active danger zones (`Polygon` / `Circle`). |
| `routers/rangers.py` | Ranger registry, status updates, and proximity query (`/rangers/nearby`) returning nearest units sorted by distance. |
| `services/hash_chain.py` | Cryptographic hash generation and verification utilities for tamper-evident incident ledgers. |
| `websocket/manager.py` | Connection pool handling bidirectional WebSocket subscriptions, connection lifecycle, and targeted role-based event broadcasts. |

---

### 4.2 Frontend Module Breakdown (`frontend/src/`)

| File / Component | Responsibility |
| :--- | :--- |
| `App.jsx` | Client-side routing, route protection (`PrivateRoute`), and dynamic layout wrapping. |
| `index.css` | Design system styling, custom typography definitions, topographic background textures, and status color utilities. |
| `lib/api.js` | Axios HTTP client configured with base URL and automatic `Authorization: Bearer <token>` request interceptors. |
| `lib/deadReckoning.js` | Implementation of Haversine distance, forward bearing, offline kinematic projection, and GeoJSON uncertainty circle generation. |
| `lib/trailsData.js` | Geodatabase of surveyed wilderness trails with coordinate paths, elevation profiles, waypoints, and permit metadata. |
| `lib/wsClient.js` | Persistent WebSocket client with automatic exponential backoff reconnection. |
| `store/authStore.js` | Zustand state store managing user authentication tokens, active user profiles, and session persistence. |
| `pages/tourist/LiveSafetyMap.jsx` | Interactive geospatial map rendering safe trail routes, active ranger markers, danger zones, and live user tracking. |
| `pages/tourist/TouristSOS.jsx` | Full-screen distress interface with instant SOS dispatch, automated fall detection countdown, and offline queue status. |
| `pages/ranger/RangerTerminal.jsx` | High-contrast field interface for rangers displaying assigned distress missions, navigation waypoints, and triage controls. |
| `pages/control_room/ControlRoom.jsx` | Multi-stream command centre console with live incident queues, fleet tracking, danger zone breach alerts, and broadcast tools. |
| `pages/scenario/ScenarioRunner.jsx` | Automated validation engine running 8 full integration test scenarios directly against the live backend. |

---

## 5. UI/UX Design System Specification

Adhering strictly to the **Expedition-Grade Field Survey Design System**:

### 5.1 Color Tokens
```css
--bg-surface: #0C1510;            /* Deep Moss Charcoal */
--bg-surface-elevated: #18221C;   /* Elevated Slate */
--bg-surface-high: #222C26;       /* Card Container */
--text-primary: #DAE5DC;          /* Warm Parchment */
--text-secondary: #D6C3B6;        /* Dusty Sage */
--accent-ochre: #FBB981;          /* Tiranga Primary Accent */
--status-safe: #AAD0AE;           /* Verified Green */
--status-warning: #FBB981;        /* Advisory Ochre */
--status-danger: #FFB4AB;         /* Critical SOS Red */
--border-hairline: rgba(232, 228, 216, 0.15); /* 1px Tactile Border */
```

### 5.2 Typography Scale
- **Headlines (`Literata`)**: Authoritative, literary serif for official government headings and section titles.
- **Body Text (`Hanken Grotesk`)**: Clean, contemporary sans-serif engineered for maximum legibility in harsh sunlight or extreme low light.
- **Data & Telemetry (`JetBrains Mono`)**: Strict monospace for GPS coordinates, timestamps, battery percentages, and sensor telemetry tickers.

---

## 6. Real-Time WebSocket Protocol Specification

The WebSocket server operates at `ws://127.0.0.1:8000/ws/incidents?role={role}`.

### Event Definitions

| Event Type | Direction | Payload Structure | Description |
| :--- | :--- | :--- | :--- |
| `INCIDENT_CREATED` | Server $\rightarrow$ Client | `{ id, incident_type, severity, lat, lng, search_radius_m, timestamp }` | Broadcast immediately to Control Room when a new SOS or fall is received. |
| `DISPATCH_ASSIGNED` | Server $\rightarrow$ Client | `{ incident_id, ranger_id, ranger_unit, eta_minutes }` | Notifies tourist and assigned ranger of rescue dispatch. |
| `STATUS_UPDATED` | Server $\rightarrow$ Client | `{ incident_id, status, updated_by, notes }` | Updates incident status across all active consoles in real time. |
| `DEAD_RECKONING_UPDATE` | Server $\rightarrow$ Client | `{ incident_id, estimated_lat, estimated_lng, search_radius_m }` | Transmits updated uncertainty bounds calculated by offline dead reckoning. |
| `BROADCAST_ADVISORY` | Server $\rightarrow$ Client | `{ title, body, severity, region, expires_at }` | Pushes high-priority weather or hazard alerts to all connected devices. |

---

## 7. Automated Integration Test Scenarios

The VanRakshak platform includes an in-browser automated verification runner (`/scenario`) testing 8 comprehensive mission-critical paths:

```
[Scenario 01: Direct Intake]
  ✓ POST /auth/register ➔ User created
  ✓ POST /auth/verify-otp ➔ JWT issued
  ✓ POST /incidents ➔ SOS created with search_radius_m=100
  ✓ WebSocket broadcasts INCIDENT_CREATED to control room
  ✓ GET /incidents ➔ Confirmed incident present in queue

[Scenario 02: Drop Signal & Reconnection]
  ✓ Active session established
  ✓ Network offline simulated ➔ Incident update queued in local IndexedDB
  ✓ Network restored ➔ Sync queue drained automatically with zero data loss

[Scenario 03: Offline Fall Detection]
  ✓ Web accelerometer mock trigger (confidence=0.88)
  ✓ Offline fall event written to local store
  ✓ Network re-established ➔ Fall incident synced with fall_confidence score

[Scenario 04: Multi-Packet Queue Flush]
  ✓ 3 sequential telemetry packets generated offline
  ✓ Connectivity restored ➔ FIFO queue flushed and acknowledged by server

[Scenario 05: Control Room Unit Dispatch]
  ✓ Incident created ➔ Control room identifies RANGER-01 via /rangers/nearby
  ✓ PATCH /incidents/{id}/dispatch ➔ Status updated to TEAM_ASSIGNED with ETA=12 min
  ✓ WebSocket broadcasts DISPATCH event to ranger and tourist terminals

[Scenario 06: Identity Verification & DTID Issuance]
  ✓ User registered ➔ Mock Aadhaar tokenized with SHA-256
  ✓ POST /identity/aadhaar ➔ Verifiable DTID code issued
  ✓ SHA-256 audit hash chain anchored to user record

[Scenario 07: Danger Zone Proximity Intersection]
  ✓ Active danger zones loaded (Kasauli Landslide Zone A)
  ✓ POST /danger-zones/intersect ➔ Route intersection flagged
  ✓ Tourist moves away ➔ Alert automatically cleared

[Scenario 08: Kinematic Dead-Reckoning Extrapolation]
  ✓ Last GPS fix recorded at (30.9010, 76.9458)
  ✓ 30-second offline period simulated with constant walk vector (1.2 m/s, 45°)
  ✓ Uncertainty search radius dynamically expands from 10m to ~70m
  ✓ Reconnect ➔ Dead-reckoning report synced to incident record
```

---

## 8. Verification & Execution Guide

### Starting the Full Stack

1. **Start Backend**:
   ```bash
   cd backend
   python -m uvicorn main:app --host 127.0.0.1 --port 8000
   ```
2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```
3. **Access Portals**:
   - **Frontend Application**: `http://localhost:5173`
   - **Backend API & Swagger Docs**: `http://127.0.0.1:8000/docs`
   - **Scenario Test Runner**: `http://localhost:5173/scenario`

---

## 9. Conclusion

**VanRakshak** represents a modern paradigm in wilderness public safety. By replacing passive, connectivity-dependent apps with **active kinematic extrapolation**, **sensor-fused edge intelligence**, **cryptographic audit trails**, and a **unified multi-stakeholder operational picture**, VanRakshak ensures that no hiker or forest ranger is left unprotected in India's most challenging terrains.
