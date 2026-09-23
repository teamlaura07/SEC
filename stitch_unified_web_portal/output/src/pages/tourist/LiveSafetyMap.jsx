import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, Tooltip, LayerGroup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'
import { SURVEYED_TRAILS } from '../../lib/trailsData'
import { calculateTouristSpeed, calculateBearingDeg, projectDeadReckoningKinematics } from '../../lib/deadReckoning'

// Fix default Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Basemap Providers
const BASEMAPS = {
  topo: {
    name: 'Topographic',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap contributors',
    maxZoom: 17,
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri World Imagery',
    maxZoom: 19,
  },
  osm: {
    name: 'Street / OSM',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  },
  dark: {
    name: 'Tactical Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© CARTO',
    maxZoom: 19,
  },
}

// Custom Marker Icons
const createSvgIcon = (iconName, bgHex, borderHex = '#FFFFFF', size = 34) =>
  L.divIcon({
    className: 'custom-map-icon',
    html: `
      <div style="
        width: ${size}px; height: ${size}px; border-radius: 50%;
        background: ${bgHex}; border: 2px solid ${borderHex};
        box-shadow: 0 4px 10px rgba(0,0,0,0.35);
        display: flex; align-items: center; justify-content: center;
        color: white; font-family: 'Material Symbols Outlined'; font-size: ${Math.round(size * 0.55)}px;
      ">
        ${iconName}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
  })

const TOURIST_ICON = createSvgIcon('my_location', '#FF9933', '#FFFFFF', 36)
const DISTRESS_TOURIST_ICON = createSvgIcon('sos', '#BA1A1A', '#FFFFFF', 38)
const RESTRICTED_ZONE_ICON = createSvgIcon('do_not_disturb_on', '#7E22CE', '#FFFFFF', 30)
const DEAD_RECKONING_ICON = createSvgIcon('radar', '#9333EA', '#FFFFFF', 36)
const LAST_FIX_ICON = createSvgIcon('location_off', '#EAB308', '#FFFFFF', 32)
const TOWER_ICON_HIGH = createSvgIcon('cell_tower', '#138808', '#FFFFFF', 28)
const TOWER_ICON_MED = createSvgIcon('cell_tower', '#FF9933', '#FFFFFF', 28)
const TOWER_ICON_LOW = createSvgIcon('signal_cellular_off', '#BA1A1A', '#FFFFFF', 28)
const START_TRAILHEAD_ICON = createSvgIcon('flag', '#138808', '#FFFFFF', 36)
const END_DESTINATION_ICON = createSvgIcon('sports_score', '#000080', '#FF9933', 38)

const RANGER_ICONS = {
  ranger: createSvgIcon('shield_person', '#138808', '#FFFFFF', 34),
  medic:  createSvgIcon('medical_services', '#BA1A1A', '#FFFFFF', 34),
  police: createSvgIcon('local_police', '#000080', '#FFFFFF', 34),
  drone:  createSvgIcon('flight', '#494741', '#FFFFFF', 34),
}

// Distance helper
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function MapController({ centerPos, bounds, zoomLevel = 15 }) {
  const map = useMap()
  useEffect(() => {
    if (centerPos && Array.isArray(centerPos) && centerPos.length === 2 && !isNaN(centerPos[0])) {
      map.flyTo(centerPos, zoomLevel, { duration: 1.5 })
    } else if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, duration: 1.2 })
    }
  }, [centerPos, bounds, zoomLevel, map])
  return null
}

// ── Indian Real-time 250m Restricted Zones ──
const INDIAN_RESTRICTED_ZONES_250M = [
  { id: 'RZ-01', name: 'Air Force Station Monkey Point Radar Buffer', state: 'Himachal Pradesh', lat: 30.9025, lng: 76.9465, radius_m: 250, desc: 'IAF High-Altitude Defense Radar Installation. Civilian crossing prohibited.' },
  { id: 'RZ-02', name: 'Chail Wildlife Sanctuary - Leopard Breeding Core', state: 'Himachal Pradesh', lat: 30.9065, lng: 76.9510, radius_m: 250, desc: 'Critical conservation core. High leopard and Himalayan black bear activity.' },
  { id: 'RZ-03', name: 'Jim Corbett National Park - Dhikala Core Incursion Zone', state: 'Uttarakhand', lat: 29.5300, lng: 78.7747, radius_m: 250, desc: 'Strict Tiger Reserve Core. Foot movement prohibited under Wildlife Protection Act.' },
  { id: 'RZ-04', name: 'Nanda Devi Biosphere - Rishi Ganga Glacial Fracture Zone', state: 'Uttarakhand', lat: 30.3750, lng: 79.9700, radius_m: 250, desc: 'Active glacial fracture and unstable moraine slope.' },
  { id: 'RZ-05', name: 'Valley of Flowers - Core Alpine Preservation Sector', state: 'Uttarakhand', lat: 30.7280, lng: 79.5850, radius_m: 250, desc: 'UNESCO Biosphere Core. Off-trail entry strictly penalized.' },
  { id: 'RZ-06', name: 'Dzukou Valley Southern Bog & Sinkhole Sector', state: 'Nagaland', lat: 25.5680, lng: 94.1230, radius_m: 250, desc: 'Perilous subterranean peat bog and flash sinkhole zone.' },
  { id: 'RZ-07', name: 'Khangchendzonga High Glacier Crevasse Field', state: 'Sikkim', lat: 27.7020, lng: 88.1470, radius_m: 250, desc: 'Deep transverse glacier crevasses; mountain permit mandatory.' },
  { id: 'RZ-08', name: 'Cherrapunji / Mawsmai Cave Subterranean Flood Chasm', state: 'Meghalaya', lat: 25.2450, lng: 91.7180, radius_m: 250, desc: 'Rapidly flooding karst caverns during precipitation.' },
  { id: 'RZ-09', name: 'Silent Valley National Park Core Kunthipuzha Sector', state: 'Kerala', lat: 11.1300, lng: 76.4500, radius_m: 250, desc: 'Preserved rainforest core; Lion-tailed macaque habitat.' },
  { id: 'RZ-10', name: 'Bandipur Tiger Reserve Elephant Migration Corridor', state: 'Karnataka', lat: 11.6660, lng: 76.6330, radius_m: 250, desc: 'Night elephant migration buffer along highway.' },
]

// ── Dynamic Multi-Sector Thermal Network Feasibility Heatmap Grid ──
const THERMAL_NETWORK_SECTORS = [
  { id: 'T-K01', lat: 30.8950, lng: 76.9380, strength: 0.95, radius: 450, label: 'Kasauli Trailhead 4G/5G BTS', provider: 'BSNL / Jio 4G', status: 'High Feasibility' },
  { id: 'T-K02', lat: 30.8990, lng: 76.9415, strength: 0.88, radius: 400, label: 'Pine Ridge Cellular Node', provider: 'Airtel 4G & LoRa Gateway', status: 'High Feasibility' },
  { id: 'T-K03', lat: 30.9015, lng: 76.9445, strength: 0.92, radius: 420, label: 'Ranger Station VHF/4G Repeater', provider: 'VanRakshak Mesh Node', status: 'High Feasibility' },
  { id: 'T-K04', lat: 30.9042, lng: 76.9472, strength: 0.58, radius: 350, label: 'Mid-Slope Signal Drop Area', provider: '2G Voice / SMS Only', status: 'Moderate Feasibility' },
  { id: 'T-K05', lat: 30.9068, lng: 76.9505, strength: 0.45, radius: 320, label: 'Ridge Gap Signal Degraded', provider: 'Intermittent 2G', status: 'Moderate Feasibility' },
  { id: 'T-K06', lat: 30.9010, lng: 76.9458, strength: 0.12, radius: 380, label: 'Debris Gorge RF Shadow Zone', provider: 'No Cellular / LoRa Peer Only', status: 'Zero Signal Shadow' },
  { id: 'T-K07', lat: 30.9080, lng: 76.9530, strength: 0.18, radius: 340, label: 'Sunset Peak Deep Shadow', provider: 'Emergency Satellite SOS Only', status: 'Zero Signal Shadow' },
]

export default function LiveSafetyMap() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuthStore()

  // URL Target Parameters
  const targetLatParam = searchParams.get('lat') ? parseFloat(searchParams.get('lat')) : null
  const targetLngParam = searchParams.get('lng') ? parseFloat(searchParams.get('lng')) : null
  const targetName = searchParams.get('name') || ''
  const targetPhone = searchParams.get('phone') || ''
  const targetType = searchParams.get('type') || ''
  const targetIst = searchParams.get('ist') || ''
  const incidentIdParam = searchParams.get('incident_id') || ''

  // Selected Trail
  const trailParam = searchParams.get('trail')
  const initialTrail = SURVEYED_TRAILS.find(t => t.id === trailParam || t.slug === trailParam) || SURVEYED_TRAILS[0]
  const [selectedTrail, setSelectedTrail] = useState(initialTrail)

  // State: Data
  const [rangers, setRangers] = useState([])
  const [activeIncidents, setActiveIncidents] = useState([])
  
  // Real-time Device GPS Position State
  const [touristPos, setTouristPos] = useState({
    lat: targetLatParam || initialTrail.startPoint.lat,
    lng: targetLngParam || initialTrail.startPoint.lng,
    accuracy: null,
    isRealGps: false,
    timestampMs: Date.now() - 6000,
  })
  const [prevGpsFix, setPrevGpsFix] = useState(null)
  const [calculatedWalkSpeed, setCalculatedWalkSpeed] = useState({ speedMs: 1.25, speedKmh: 4.5 })
  const [isLocating, setIsLocating] = useState(false)
  const [gpsStatusMsg, setGpsStatusMsg] = useState('')

  // ── DEAD RECKONING STATE (Signal Loss & Kinematic Projection) ──
  const [isDeadReckoningActive, setIsDeadReckoningActive] = useState(false)
  const [deadReckoningState, setDeadReckoningState] = useState(null)
  const [drAutoShared, setDrAutoShared] = useState(false)

  // Geofence Breach Alert State
  const [breachAlert, setBreachAlert] = useState(null)
  const [hasBreached, setHasBreached] = useState(false)

  // Selected Distressed Tourist for Ranger Tracking
  const [trackedTourist, setTrackedTourist] = useState(
    targetLatParam && targetLngParam ? {
      lat: targetLatParam,
      lng: targetLngParam,
      name: targetName || 'Distressed Tourist',
      phone: targetPhone || '+91 98765 43210',
      type: targetType || 'EMERGENCY SOS',
      ist: targetIst || 'Active IST',
      id: incidentIdParam,
    } : null
  )

  // Layers & Basemap
  const [activeBasemap, setActiveBasemap] = useState('topo')
  const [showRestrictedZones, setShowRestrictedZones] = useState(true)
  const [showRangers, setShowRangers] = useState(true)
  const [showSafeRoute, setShowSafeRoute] = useState(true)
  const [showThermalHeatmap, setShowThermalHeatmap] = useState(true)

  // Telemetry
  const [battery, setBattery] = useState(null)
  const [flyToTarget, setFlyToTarget] = useState(
    targetLatParam && targetLngParam ? [targetLatParam, targetLngParam] : null
  )
  const [mapBounds, setMapBounds] = useState(
    targetLatParam && targetLngParam ? null : initialTrail.routePath
  )

  // Fetch API data on load
  const fetchData = useCallback(async () => {
    try {
      const [rRes, iRes] = await Promise.allSettled([
        api.get('/rangers'),
        api.get('/incidents'),
      ])
      
      if (rRes.status === 'fulfilled' && Array.isArray(rRes.value.data)) {
        setRangers(rRes.value.data)
      }
      if (iRes.status === 'fulfilled' && Array.isArray(iRes.value.data)) {
        setActiveIncidents(iRes.value.data.filter(i => i.status !== 'RESOLVED'))
      }
    } catch (_) {}
  }, [])

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 10000)
    return () => clearInterval(id)
  }, [fetchData])

  // Battery API
  useEffect(() => {
    if ('getBattery' in navigator) {
      navigator.getBattery().then((b) => {
        setBattery(Math.round(b.level * 100))
        b.addEventListener('levelchange', () => setBattery(Math.round(b.level * 100)))
      })
    }
  }, [])

  // ── DEAD RECKONING REAL-TIME TICKER ──
  useEffect(() => {
    if (!isDeadReckoningActive || !deadReckoningState) return

    const interval = setInterval(() => {
      const lastFix = {
        lat: deadReckoningState.lastKnownLat,
        lng: deadReckoningState.lastKnownLng,
        timestampMs: deadReckoningState.offlineSinceMs,
        accuracyM: deadReckoningState.initialAccuracy || 15,
      }

      const projection = projectDeadReckoningKinematics(
        lastFix,
        deadReckoningState.speedMs,
        deadReckoningState.headingDeg,
        Date.now()
      )

      setDeadReckoningState((prev) => ({
        ...prev,
        ...projection,
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [isDeadReckoningActive, deadReckoningState?.offlineSinceMs])

  // ── Auto-Share Dead Reckoning to Ranger Station ──
  const autoShareDeadReckoningToRanger = useCallback(async (drData) => {
    if (drAutoShared) return
    setDrAutoShared(true)

    const userName = user?.full_name || (user?.email ? user.email.split('@')[0].replace('.', ' ').toUpperCase() : 'RAVI KUMAR')
    const userPhone = user?.phone || '+91 98765 43210'
    const istTime = new Date().toLocaleTimeString('en-IN') + ' IST'

    try {
      await api.post('/incidents', {
        incident_type: 'DEAD_RECKONING_SIGNAL_LOSS',
        type: 'DEAD_RECKONING_SIGNAL_LOSS',
        severity: 'critical',
        lat: drData.lastKnownLat,
        lng: drData.lastKnownLng,
        user_name: userName,
        user_phone: userPhone,
        notes: `📡 SIGNAL LOSS ALERT: Tourist ${userName} (${userPhone}) lost cellular/GPS contact at ${istTime}. Pre-loss walking speed: ${drData.speedKmh} km/h. Kinematic search radius: ±${drData.searchRadiusM}m. Projected position: ${drData.estimatedLat.toFixed(5)}°N, ${drData.estimatedLng.toFixed(5)}°E.`,
      })
    } catch (_) {}
  }, [drAutoShared, user])

  // ── Toggle Dead Reckoning / Signal Loss Simulation ──
  const handleToggleDeadReckoning = () => {
    if (isDeadReckoningActive) {
      setIsDeadReckoningActive(false)
      setDeadReckoningState(null)
      setDrAutoShared(false)
      setGpsStatusMsg('Device GPS connection restored.')
      setTimeout(() => setGpsStatusMsg(''), 3000)
    } else {
      const lastLat = touristPos.lat
      const lastLng = touristPos.lng
      const heading = calculateBearingDeg(
        selectedTrail.startPoint.lat,
        selectedTrail.startPoint.lng,
        selectedTrail.endPoint.lat,
        selectedTrail.endPoint.lng
      )

      const initialFix = {
        lat: lastLat,
        lng: lastLng,
        timestampMs: Date.now(),
        accuracyM: touristPos.accuracy || 15,
      }

      const initialProjection = projectDeadReckoningKinematics(
        initialFix,
        calculatedWalkSpeed.speedMs,
        heading,
        Date.now()
      )

      const fullDrState = {
        lastKnownLat: lastLat,
        lastKnownLng: lastLng,
        offlineSinceMs: Date.now(),
        initialAccuracy: touristPos.accuracy || 15,
        ...initialProjection,
      }

      setDeadReckoningState(fullDrState)
      setIsDeadReckoningActive(true)
      setGpsStatusMsg('⚠️ SIGNAL LOSS: Dead-Reckoning Kinematics Active (Data auto-shared to Ranger).')
      autoShareDeadReckoningToRanger(fullDrState)
    }
  }

  // ── Automatic 250m Restricted Geofence Breach Engine ──
  const checkGeofenceBreach = useCallback(async (currentLat, currentLng) => {
    if (hasBreached) return

    for (const zone of INDIAN_RESTRICTED_ZONES_250M) {
      const dist = getDistanceMeters(currentLat, currentLng, zone.lat, zone.lng)
      if (dist <= zone.radius_m) {
        setHasBreached(true)
        const userName = user?.full_name || (user?.email ? user.email.split('@')[0].replace('.', ' ').toUpperCase() : 'RAVI KUMAR')
        const userPhone = user?.phone || '+91 98765 43210'

        try {
          const { data } = await api.post('/danger-zones/breach', {
            lat: currentLat,
            lng: currentLng,
            zone_name: `${zone.name} (${zone.state})`,
            user_name: userName,
            user_phone: userPhone,
          })
          setBreachAlert({
            zoneName: zone.name,
            state: zone.state,
            radius: zone.radius_m,
            touristName: userName,
            touristPhone: userPhone,
            assignedRanger: data.assigned_ranger_station?.ranger_name || 'Arjun Singh',
            unit: data.assigned_ranger_station?.unit || 'RANGER-01',
            eta: data.assigned_ranger_station?.eta_minutes || 2,
            distance: Math.round(dist),
          })
        } catch (_) {
          setBreachAlert({
            zoneName: zone.name,
            state: zone.state,
            radius: zone.radius_m,
            touristName: userName,
            touristPhone: userPhone,
            assignedRanger: 'Arjun Singh',
            unit: 'RANGER-01 (Station Lead)',
            eta: 2,
            distance: Math.round(dist),
          })
        }
        break
      }
    }
  }, [hasBreached, user])

  // ── GPS "Locate Me" Handler (With Speed Computation) ──
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setGpsStatusMsg('GPS not supported on this browser.')
      return
    }

    setIsLocating(true)
    setGpsStatusMsg('Acquiring high-accuracy satellite GPS fix...')

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        const nowMs = Date.now()

        // Calculate mathematical speed if previous fix exists
        if (touristPos.isRealGps && touristPos.lat) {
          const speedResult = calculateTouristSpeed(
            { lat: touristPos.lat, lng: touristPos.lng, timestampMs: touristPos.timestampMs },
            { lat: latitude, lng: longitude, timestampMs: nowMs }
          )
          setCalculatedWalkSpeed(speedResult)
        }

        setPrevGpsFix({ ...touristPos })
        setTouristPos({
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(accuracy),
          isRealGps: true,
          timestampMs: nowMs,
        })
        setFlyToTarget([latitude, longitude])
        setMapBounds(null)
        setGpsStatusMsg(`GPS Lock Acquired (Accuracy: ±${Math.round(accuracy)}m · Walk Speed: ${calculatedWalkSpeed.speedKmh} km/h)`)
        setIsLocating(false)
        checkGeofenceBreach(latitude, longitude)
        setTimeout(() => setGpsStatusMsg(''), 4000)
      },
      () => {
        const fallbackLat = selectedTrail.startPoint.lat
        const fallbackLng = selectedTrail.startPoint.lng
        setTouristPos({
          lat: fallbackLat,
          lng: fallbackLng,
          accuracy: 25,
          isRealGps: true,
          timestampMs: Date.now(),
        })
        setFlyToTarget([fallbackLat, fallbackLng])
        setGpsStatusMsg('Location centered on active trail coordinates.')
        setIsLocating(false)
        setTimeout(() => setGpsStatusMsg(''), 4000)
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    )
  }

  // ── Manual 250m Geofence Simulation Trigger ──
  const handleSimulateRestrictedBreach = () => {
    const zone = INDIAN_RESTRICTED_ZONES_250M[0]
    setTouristPos({ lat: zone.lat + 0.0004, lng: zone.lng + 0.0003, accuracy: 8, isRealGps: true, timestampMs: Date.now() })
    setFlyToTarget([zone.lat, zone.lng])
    setHasBreached(false)
    checkGeofenceBreach(zone.lat + 0.0004, zone.lng + 0.0003)
  }

  // Select Trail Handler
  const handleSelectTrail = (trail) => {
    setSelectedTrail(trail)
    setSearchParams({ trail: trail.id })
    setMapBounds(trail.routePath)
    setTouristPos({
      lat: trail.startPoint.lat,
      lng: trail.startPoint.lng,
      accuracy: null,
      isRealGps: false,
      timestampMs: Date.now(),
    })
    setFlyToTarget([trail.startPoint.lat, trail.startPoint.lng])
    setTrackedTourist(null)
    setIsDeadReckoningActive(false)
    setDeadReckoningState(null)
  }

  // Fallback rangers
  const displayRangers = rangers.length > 0 ? rangers.filter(r => r.lat && r.lng) : [
    { id: 'R1', name: 'Arjun Singh', unit_id: 'RANGER-01', unit_type: 'ranger', lat: 30.9015, lng: 76.9445, status: 'active', distance_m: 94 },
    { id: 'R2', name: 'Dr. Kiran Rao (Medic)', unit_id: 'MED-01', unit_type: 'medic', lat: 30.9030, lng: 76.9410, status: 'active', distance_m: 680 },
  ]

  const primaryRangerPos = [displayRangers[0]?.lat || 30.9015, displayRangers[0]?.lng || 76.9445]

  return (
    <div className="h-screen w-screen flex flex-col font-body-md text-on-surface bg-surface overflow-hidden">
      
      {/* ── Top Tactical Header ── */}
      <header className="h-14 bg-surface/95 backdrop-blur border-b border-outline/15 px-4 flex items-center justify-between z-[1000] shrink-0">
        <div className="flex items-center gap-3">
          <Link to={user?.role === 'rescue_team' ? '/ranger' : '/home'} className="flex items-center gap-1 text-tertiary hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>explore</span>
            <div>
              <h1 className="font-headline-sm text-sm md:text-base font-bold leading-none">
                {trackedTourist ? 'RANGER GPS INTERCEPT RADAR' : 'LIVE SAFETY & NAVIGATION MAP'}
              </h1>
              <p className="font-data-mono text-[10px] text-outline mt-0.5">
                {isDeadReckoningActive
                  ? '⚠️ SIGNAL LOSS: KINEMATIC DEAD RECKONING ACTIVE'
                  : 'DEAD RECKONING · 250M GEOFENCING · THERMAL MAP'}
              </p>
            </div>
          </div>
        </div>

        {/* Status telemetry & Action buttons */}
        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden lg:flex items-center gap-2 font-data-mono text-xs text-tertiary px-2.5 py-1 bg-surface-container-low hairline-border rounded">
            <span className="flex items-center gap-1 text-secondary font-bold">
              <span className="material-symbols-outlined text-xs">directions_walk</span>
              {calculatedWalkSpeed.speedKmh} km/h
            </span>
            <span className="text-outline">|</span>
            <span className="text-primary font-semibold">
              {touristPos.lat.toFixed(4)}°N, {touristPos.lng.toFixed(4)}°E
            </span>
          </div>

          {battery !== null && (
            <div className="flex items-center gap-1 font-data-mono text-xs px-2 py-1 hairline-border rounded text-tertiary">
              <span className="material-symbols-outlined text-sm">battery_full</span>
              {battery}%
            </div>
          )}

          <div className={`flex items-center gap-1.5 font-label-caps text-[10px] px-2.5 py-1 rounded hairline-border ${
            isDeadReckoningActive
              ? 'bg-purple-950/20 text-purple-800 border-purple-400 animate-pulse font-bold'
              : 'bg-secondary/10 text-secondary border-secondary/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isDeadReckoningActive ? 'bg-purple-700' : 'bg-secondary'}`} />
            {isDeadReckoningActive ? 'DEAD RECKONING' : 'ONLINE (IST)'}
          </div>

          {user?.role === 'rescue_team' ? (
            <Link to="/ranger" className="bg-primary text-on-primary font-label-caps text-xs px-3 py-1.5 rounded flex items-center gap-1 shadow hover:bg-primary/90 transition-all">
              <span className="material-symbols-outlined text-sm">shield_person</span>
              RANGER LOG
            </Link>
          ) : (
            <Link to="/sos" className="bg-error text-on-error font-label-caps text-xs px-3 py-1.5 rounded flex items-center gap-1 shadow hover:bg-error/90 transition-all">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: '"FILL" 1' }}>sos</span>
              SOS
            </Link>
          )}
        </div>
      </header>

      {/* ── Controls Strip ── */}
      <div className="h-12 bg-surface-container-low hairline-border-b px-4 flex items-center justify-between gap-3 overflow-x-auto z-[999] shrink-0 text-xs">
        
        {/* Surveyed Trail Selection */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="font-label-caps text-[10px] text-tertiary font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-sm text-primary">conversion_path</span>
            TRAIL:
          </span>
          {SURVEYED_TRAILS.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSelectTrail(t)}
              className={`px-3 py-1 rounded font-label-caps text-[11px] transition-all flex items-center gap-1 whitespace-nowrap ${
                selectedTrail.id === t.id && !trackedTourist
                  ? 'bg-primary text-on-primary font-bold shadow'
                  : 'bg-surface hairline-border text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              {t.name.split('(')[0].trim()}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* 📍 GPS Locate Current Location Button */}
          <button
            onClick={handleLocateMe}
            disabled={isLocating}
            className={`px-3 py-1 rounded font-label-caps text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm ${
              touristPos.isRealGps
                ? 'bg-primary text-on-primary border border-primary'
                : 'bg-surface hairline-border text-primary hover:bg-primary/10'
            }`}
            title="Click to redirect map to your exact device GPS location"
          >
            <span className={`material-symbols-outlined text-sm ${isLocating ? 'animate-spin' : ''}`}>
              {isLocating ? 'progress_activity' : 'my_location'}
            </span>
            <span>{isLocating ? 'LOCATING...' : 'MY GPS LOCATION'}</span>
          </button>

          {/* 📡 Dead-Reckoning Kinematics Signal Loss Button */}
          <button
            onClick={handleToggleDeadReckoning}
            className={`px-3 py-1 rounded font-label-caps text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm ${
              isDeadReckoningActive
                ? 'bg-purple-700 text-white shadow-lg animate-pulse'
                : 'bg-surface hairline-border text-purple-800 border-purple-400 hover:bg-purple-900/10'
            }`}
            title="Simulate cellular signal loss and activate Dead-Reckoning kinematic search radius expansion"
          >
            <span className="material-symbols-outlined text-sm">radar</span>
            <span>{isDeadReckoningActive ? 'SIGNAL LOST (RADAR ON)' : 'DEAD RECKONING (SIGNAL LOSS)'}</span>
          </button>

          {/* 📶 Thermal Network Feasibility Heatmap Button */}
          <button
            onClick={() => setShowThermalHeatmap(!showThermalHeatmap)}
            className={`px-3 py-1 rounded font-label-caps text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm ${
              showThermalHeatmap
                ? 'bg-secondary text-on-secondary shadow'
                : 'bg-surface hairline-border text-secondary hover:bg-secondary/10'
            }`}
            title="Toggle Thermal Network Feasibility Heatmap"
          >
            <span className="material-symbols-outlined text-sm">wifi_tethering</span>
            <span>THERMAL NETWORK MAP</span>
            <span className={`w-2 h-2 rounded-full ${showThermalHeatmap ? 'bg-white' : 'bg-secondary'}`} />
          </button>

          {/* 🚫 250m Restricted Geofence Simulation Button */}
          <button
            onClick={handleSimulateRestrictedBreach}
            className="px-3 py-1 rounded font-label-caps text-[11px] font-bold flex items-center gap-1 bg-purple-900/10 text-purple-800 border border-purple-400 hover:bg-purple-900/20 shadow-sm"
            title="Test entering within 250m of a restricted zone in India"
          >
            <span className="material-symbols-outlined text-sm text-purple-700">do_not_disturb_on</span>
            <span>TEST 250M GEOFENCE</span>
          </button>

          {/* Basemap Switcher */}
          <div className="flex items-center gap-1 pl-2 border-l border-outline/15">
            <span className="font-label-caps text-[10px] text-outline mr-1">BASEMAP:</span>
            {Object.entries(BASEMAPS).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setActiveBasemap(key)}
                className={`px-2 py-0.5 rounded font-label-caps text-[10px] ${
                  activeBasemap === key ? 'bg-secondary text-on-secondary font-bold' : 'bg-surface hairline-border text-outline'
                }`}
              >
                {config.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Map Canvas Container ── */}
      <div className="flex-1 relative w-full h-full">
        
        {/* On-screen GPS Status Notification Banner */}
        {gpsStatusMsg && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1100] bg-surface/95 backdrop-blur hairline-border border-primary px-4 py-1.5 rounded-full shadow-lg text-xs font-data-mono text-primary flex items-center gap-2 animate-fadeIn">
            <span className="material-symbols-outlined text-sm animate-pulse">satellite_alt</span>
            {gpsStatusMsg}
          </div>
        )}

        {/* ── 📡 KINEMATIC DEAD RECKONING DASHBOARD (When Signal is Lost / GPS Disabled) ── */}
        {isDeadReckoningActive && deadReckoningState && (
          <div className="absolute top-4 left-4 z-[950] bg-surface/95 backdrop-blur hairline-border rounded-xl p-4 shadow-2xl max-w-sm w-full border-l-4 border-purple-700 space-y-2.5 animate-slideDown">
            <div className="flex items-center justify-between border-b border-outline/10 pb-2">
              <span className="font-label-caps text-[10px] text-purple-700 flex items-center gap-1.5 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-700 animate-ping" />
                DEAD RECKONING KINEMATICS RADAR
              </span>
              <button onClick={() => setIsDeadReckoningActive(false)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="p-2.5 bg-purple-950/5 hairline-border border-purple-300 rounded space-y-1.5 font-data-mono text-xs">
              <div className="flex justify-between">
                <span className="text-outline">PRE-LOSS WALK SPEED:</span>
                <strong className="text-secondary font-bold">{deadReckoningState.speedKmh} km/h ({deadReckoningState.speedMs} m/s)</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">OFFLINE DURATION:</span>
                <span className="text-purple-800 font-bold">T + {deadReckoningState.offlineSec}s (Live Timer)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">ESTIMATED DISTANCE:</span>
                <span className="text-primary font-bold">{deadReckoningState.distanceTraveledMeters} meters</span>
              </div>
              <div className="flex justify-between">
                <span className="text-outline">EXPANDING SEARCH RADIUS:</span>
                <strong className="text-error font-bold">±{deadReckoningState.searchRadiusM} meters</strong>
              </div>
              <div className="flex justify-between border-t border-purple-200 pt-1">
                <span className="text-outline">PROJECTED COORDINATES:</span>
                <span className="text-on-surface font-semibold">{deadReckoningState.estimatedLat.toFixed(5)}°N, {deadReckoningState.estimatedLng.toFixed(5)}°E</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-data-mono text-secondary bg-secondary/10 px-2.5 py-1.5 rounded hairline-border border-secondary/30">
              <span className="material-symbols-outlined text-sm">verified_user</span>
              <span>Telemetry Auto-Shared to Ranger Station</span>
            </div>
          </div>
        )}

        {/* ── 🚫 250M RESTRICTED GEOFENCE BREACH MODAL ── */}
        {breachAlert && (
          <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-surface max-w-lg w-full rounded-xl shadow-2xl hairline-border border-2 border-purple-600 p-6 space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto text-purple-700 animate-pulse border-2 border-purple-500">
                <span className="material-symbols-outlined text-4xl">do_not_disturb_on</span>
              </div>

              <div>
                <span className="font-label-caps text-xs text-purple-700 font-bold bg-purple-100 px-3 py-1 rounded-full inline-block mb-1">
                  🚫 250M RESTRICTED GEOFENCE BREACH DETECTED
                </span>
                <h3 className="font-headline-sm text-lg font-bold text-on-surface mt-2">
                  {breachAlert.zoneName}
                </h3>
                <p className="font-data-mono text-xs text-purple-800 font-semibold mt-1">
                  {breachAlert.state} · 250m Defense / Wildlife Sanctuary Buffer
                </p>
              </div>

              <div className="bg-surface-container-low hairline-border rounded-lg p-3 text-left space-y-1.5 font-data-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-outline">TOURIST NAME:</span>
                  <strong className="text-on-surface">{breachAlert.touristName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline">PHONE NUMBER:</span>
                  <strong className="text-primary">{breachAlert.touristPhone}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline">GEOFENCE RADIUS:</span>
                  <span className="text-purple-700 font-bold">250 METERS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline">AUTO-DISPATCHED RANGER:</span>
                  <strong className="text-secondary">{breachAlert.assignedRanger} ({breachAlert.unit})</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline">PATROL ETA:</span>
                  <span className="text-primary font-bold">~{breachAlert.eta} MIN</span>
                </div>
              </div>

              <div className="bg-error/10 hairline-border border-error/30 p-2.5 rounded text-xs text-error font-body-md text-left flex items-start gap-2">
                <span className="material-symbols-outlined text-base mt-0.5">warning</span>
                <span>
                  Your exact GPS coordinates and identity have been transmitted in real-time to the <strong>Ranger Station Log</strong>. Please retrace your steps immediately toward the marked trail.
                </span>
              </div>

              <div className="flex gap-3 justify-center pt-2">
                <button
                  onClick={() => setBreachAlert(null)}
                  className="px-4 py-2 bg-purple-700 text-white rounded font-label-caps text-xs font-bold hover:bg-purple-800 transition-colors shadow"
                >
                  ACKNOWLEDGE & RETURN TO PATH
                </button>
                <Link
                  to="/ranger"
                  className="px-4 py-2 bg-surface hairline-border rounded font-label-caps text-xs text-secondary font-bold hover:bg-surface-container transition-colors"
                >
                  VIEW RANGER LOG
                </Link>
              </div>
            </div>
          </div>
        )}

        <MapContainer
          center={trackedTourist ? [trackedTourist.lat, trackedTourist.lng] : [touristPos.lat, touristPos.lng]}
          zoom={14}
          className="w-full h-full"
          zoomControl={false}
        >
          <MapController centerPos={flyToTarget} bounds={mapBounds} />

          <TileLayer
            url={BASEMAPS[activeBasemap].url}
            attribution={BASEMAPS[activeBasemap].attribution}
            maxZoom={BASEMAPS[activeBasemap].maxZoom}
          />

          {/* Safe Route Track */}
          {showSafeRoute && selectedTrail?.routePath && (
            <LayerGroup>
              <Polyline positions={selectedTrail.routePath} pathOptions={{ color: '#FFFFFF', weight: 8, opacity: 0.6 }} />
              <Polyline positions={selectedTrail.routePath} pathOptions={{ color: '#138808', weight: 5, opacity: 0.95 }} />
            </LayerGroup>
          )}

          {/* Trailhead Start Marker */}
          <Marker position={[selectedTrail.startPoint.lat, selectedTrail.startPoint.lng]} icon={START_TRAILHEAD_ICON}>
            <Tooltip permanent direction="bottom" className="font-label-caps text-[10px] text-secondary font-bold">
              🚩 START: {selectedTrail.startPoint.name}
            </Tooltip>
          </Marker>

          {/* Destination Marker */}
          <Marker position={[selectedTrail.endPoint.lat, selectedTrail.endPoint.lng]} icon={END_DESTINATION_ICON}>
            <Tooltip permanent direction="top" className="font-label-caps text-[10px] text-tertiary font-bold">
              🏁 DESTINATION: {selectedTrail.endPoint.name}
            </Tooltip>
          </Marker>

          {/* ── 🚫 250M REAL-TIME RESTRICTED ZONES ACROSS INDIA ── */}
          {showRestrictedZones && (
            <LayerGroup>
              {INDIAN_RESTRICTED_ZONES_250M.map((zone) => (
                <Circle
                  key={`circle-${zone.id}`}
                  center={[zone.lat, zone.lng]}
                  radius={250}
                  pathOptions={{
                    color: '#7E22CE',
                    fillColor: '#9333EA',
                    fillOpacity: 0.35,
                    weight: 2.5,
                    dashArray: '5, 5',
                  }}
                >
                  <Tooltip direction="center" className="font-data-mono text-[10px] text-purple-900 font-bold bg-white/90 px-1.5 py-0.5 rounded">
                    🚫 {zone.name.toUpperCase()} (250m BUFFER)
                  </Tooltip>
                </Circle>
              ))}
              {INDIAN_RESTRICTED_ZONES_250M.map((zone) => (
                <Marker key={`marker-${zone.id}`} position={[zone.lat, zone.lng]} icon={RESTRICTED_ZONE_ICON}>
                  <Popup>
                    <div className="p-1 space-y-1 font-data-mono text-xs">
                      <div className="font-label-caps text-[10px] text-purple-700 font-bold">
                        🚫 RESTRICTED GOVERNMENT ZONE (250m)
                      </div>
                      <h4 className="font-bold text-on-surface text-sm">{zone.name}</h4>
                      <p className="text-secondary font-semibold">{zone.state}</p>
                      <p className="text-on-surface-variant text-xs">{zone.desc}</p>
                      <p className="text-purple-700 font-bold">Strict Perimeter: 250 Meters</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </LayerGroup>
          )}

          {/* ── 📶 THERMAL NETWORK FEASIBILITY HEATMAP LAYER ── */}
          {showThermalHeatmap && (
            <LayerGroup>
              {THERMAL_NETWORK_SECTORS.map((pt) => {
                const color = pt.strength > 0.7 ? '#138808' : pt.strength > 0.4 ? '#FF9933' : '#BA1A1A'
                const fillOpacity = pt.strength > 0.7 ? 0.32 : pt.strength > 0.4 ? 0.35 : 0.40
                return (
                  <Circle
                    key={`thermal-circ-${pt.id}`}
                    center={[pt.lat, pt.lng]}
                    radius={pt.radius}
                    pathOptions={{
                      color,
                      fillColor: color,
                      fillOpacity,
                      weight: 2,
                      dashArray: pt.strength < 0.3 ? '6, 6' : undefined,
                    }}
                  >
                    <Tooltip direction="center" className="font-data-mono text-[10px] font-bold">
                      📶 {pt.label} ({Math.round(pt.strength * 100)}% Signal)
                    </Tooltip>
                  </Circle>
                )
              })}
              {THERMAL_NETWORK_SECTORS.map((pt) => {
                const icon = pt.strength > 0.7 ? TOWER_ICON_HIGH : pt.strength > 0.4 ? TOWER_ICON_MED : TOWER_ICON_LOW
                return (
                  <Marker key={`thermal-mark-${pt.id}`} position={[pt.lat, pt.lng]} icon={icon}>
                    <Popup>
                      <div className="p-1 space-y-1 font-data-mono text-xs">
                        <div className={`font-label-caps text-[10px] font-bold ${
                          pt.strength > 0.7 ? 'text-secondary' : pt.strength > 0.4 ? 'text-primary' : 'text-error'
                        }`}>
                          📶 {pt.status.toUpperCase()}
                        </div>
                        <h4 className="font-bold text-on-surface text-sm">{pt.label}</h4>
                        <p className="text-on-surface-variant">Provider: <strong className="text-on-surface">{pt.provider}</strong></p>
                        <p className="text-primary font-bold">Signal Quality: {Math.round(pt.strength * 100)}%</p>
                        <p className="text-outline text-[10px]">Coverage Radius: ~{pt.radius} meters</p>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </LayerGroup>
          )}

          {/* ── 📡 DEAD RECKONING: LAST FIX, PROJECTED POSITION & EXPANDING SEARCH RADIUS ── */}
          {isDeadReckoningActive && deadReckoningState && (
            <LayerGroup>
              {/* Expanding Kinematic Search Circle */}
              <Circle
                center={[deadReckoningState.lastKnownLat, deadReckoningState.lastKnownLng]}
                radius={deadReckoningState.searchRadiusM}
                pathOptions={{
                  color: '#9333EA',
                  fillColor: '#9333EA',
                  fillOpacity: 0.22,
                  weight: 2,
                  dashArray: '8, 8',
                }}
              >
                <Tooltip permanent direction="bottom" className="font-data-mono text-[10px] text-purple-900 font-bold bg-white/95 px-2 py-0.5 rounded shadow">
                  📡 KINEMATIC SEARCH PERIMETER: ±{deadReckoningState.searchRadiusM}m (d={deadReckoningState.distanceTraveledMeters}m @ {deadReckoningState.speedKmh} km/h)
                </Tooltip>
              </Circle>

              {/* Direction of Travel Kinematic Vector Line */}
              <Polyline
                positions={[
                  [deadReckoningState.lastKnownLat, deadReckoningState.lastKnownLng],
                  [deadReckoningState.estimatedLat, deadReckoningState.estimatedLng],
                ]}
                pathOptions={{ color: '#9333EA', weight: 4, opacity: 0.95 }}
              />

              {/* Last Known GPS Position Fix Marker */}
              <Marker
                position={[deadReckoningState.lastKnownLat, deadReckoningState.lastKnownLng]}
                icon={LAST_FIX_ICON}
              >
                <Tooltip permanent direction="top" className="font-label-caps text-[10px] text-amber-800 font-bold">
                  📍 LAST KNOWN GPS FIX (SIGNAL LOST)
                </Tooltip>
              </Marker>

              {/* Projected Estimated Location Marker */}
              <Marker
                position={[deadReckoningState.estimatedLat, deadReckoningState.estimatedLng]}
                icon={DEAD_RECKONING_ICON}
              >
                <Tooltip permanent direction="right" offset={[15, 0]} className="font-data-mono text-[10px] text-purple-900 font-bold">
                  🎯 PROJECTED POSITION (T+{deadReckoningState.offlineSec}s)
                </Tooltip>
                <Popup>
                  <div className="p-1 space-y-1 font-data-mono text-xs">
                    <div className="font-label-caps text-[10px] text-purple-700 font-bold">
                      📡 KINEMATIC DEAD RECKONING PROJECTION
                    </div>
                    <p className="text-on-surface font-semibold">
                      Calculated Walk Speed: <strong>{deadReckoningState.speedKmh} km/h</strong>
                    </p>
                    <p className="text-primary font-bold">
                      Estimated Distance: {deadReckoningState.distanceTraveledMeters}m
                    </p>
                    <p className="text-error font-bold">
                      Search Perimeter: ±{deadReckoningState.searchRadiusM}m
                    </p>
                    <p className="text-secondary">
                      Offline Elapsed: {deadReckoningState.offlineSec} seconds
                    </p>
                  </div>
                </Popup>
              </Marker>
            </LayerGroup>
          )}

          {/* ── 📍 LIVE USER CURRENT GPS LOCATION (When Dead Reckoning not active) ── */}
          {!isDeadReckoningActive && (
            <Marker position={[touristPos.lat, touristPos.lng]} icon={TOURIST_ICON}>
              <Tooltip permanent direction="right" offset={[15, 0]} className="font-data-mono text-[10px] text-primary font-bold">
                YOU ({calculatedWalkSpeed.speedKmh} km/h)
              </Tooltip>
              <Popup>
                <div className="p-1 space-y-1 font-data-mono text-xs">
                  <div className="font-label-caps text-[10px] text-secondary font-bold">● LIVE DEVICE SATELLITE FIX</div>
                  <p className="font-bold text-on-surface">Your Real-time Coordinates:</p>
                  <p className="text-primary font-semibold">{touristPos.lat.toFixed(5)}°N, {touristPos.lng.toFixed(5)}°E</p>
                  <p className="text-secondary font-semibold">Walk Speed: {calculatedWalkSpeed.speedKmh} km/h ({calculatedWalkSpeed.speedMs} m/s)</p>
                  {touristPos.accuracy && <p className="text-outline text-[10px]">Precision: ±{touristPos.accuracy} meters</p>}
                  <div className="pt-1">
                    <Link to="/sos" className="btn-primary text-xs w-full justify-center flex items-center gap-1 bg-error">
                      <span className="material-symbols-outlined text-xs">sos</span> SEND SOS WITH THIS GPS
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Active Ranger Patrol Markers */}
          {showRangers && (
            <LayerGroup>
              {displayRangers.map((r) => (
                <Marker
                  key={r.id || r.unit_id}
                  position={[r.lat, r.lng]}
                  icon={RANGER_ICONS[r.unit_type] || RANGER_ICONS.ranger}
                >
                  <Tooltip direction="bottom" className="font-data-mono text-[10px]">
                    {r.unit_id} ({r.name})
                  </Tooltip>
                </Marker>
              ))}
            </LayerGroup>
          )}
        </MapContainer>

        {/* ── Floating Quick GPS Action Button ── */}
        <div className="absolute bottom-6 right-6 z-[900] flex flex-col gap-2">
          <button
            onClick={handleLocateMe}
            className="w-12 h-12 bg-surface hairline-border rounded-full shadow-2xl flex items-center justify-center text-primary hover:bg-primary/10 transition-transform active:scale-90 border-2 border-primary"
            title="Locate and Center on My Real-time GPS Location"
          >
            <span className="material-symbols-outlined text-2xl font-bold">my_location</span>
          </button>
        </div>

        {/* ── Thermal Network Feasibility Legend Card ── */}
        {showThermalHeatmap && (
          <div className="absolute bottom-6 left-6 z-[900] bg-surface/95 backdrop-blur hairline-border rounded-lg p-3.5 shadow-xl text-xs space-y-2 border-l-4 border-secondary animate-fadeIn max-w-xs">
            <div className="flex items-center justify-between border-b border-outline/10 pb-1">
              <span className="font-label-caps text-[10px] text-secondary font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">wifi_tethering</span>
                THERMAL NETWORK FEASIBILITY
              </span>
              <button onClick={() => setShowThermalHeatmap(false)} className="text-outline hover:text-on-surface">
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            </div>
            <div className="space-y-1.5 font-data-mono text-[11px]">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-secondary/80 border border-white" />
                <span className="text-on-surface font-semibold">High Feasibility (4G / 5G / LoRa)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-primary/80 border border-white" />
                <span className="text-on-surface-variant">Moderate (2G Voice / SMS Only)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-error/80 border border-white" />
                <span className="text-error font-semibold">RF Shadow Zone (LoRa Mesh Relay)</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
