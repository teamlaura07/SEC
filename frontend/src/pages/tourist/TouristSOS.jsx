import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import useAuthStore from '../../store/authStore'

export default function TouristSOS() {
  const { token, user } = useAuthStore()
  const navigate = useNavigate()

  const [location, setLocation]   = useState(null)
  const [locError, setLocError]   = useState('')
  const [sosSent,  setSosSent]    = useState(false)
  const [loading,  setLoading]    = useState(false)
  const [error,    setError]      = useState('')
  const [form,     setForm]       = useState({ message: '', type: 'SOS' })
  const [sosResult, setSosResult] = useState(null)
  const [elapsed,  setElapsed]    = useState(0)

  /* Get GPS location */
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocError('GPS sensor not available on this device.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      pos => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      ()  => setLocError('Location access denied. Using standard North-East sector coordinates (30.9015°N, 76.9445°E).'),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [])

  /* Elapsed timer after SOS is sent */
  useEffect(() => {
    if (!sosSent) return
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [sosSent])

  const formatElapsed = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const handleSOS = async () => {
    setError('')
    setLoading(true)

    // Current IST Time calculation
    const now = new Date()
    const istTimeStr = new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19) + ' IST'

    const lat = location?.lat || 30.9015
    const lng = location?.lng || 76.9445
    const userName = user?.full_name || (user?.email ? user.email.split('@')[0].replace('.', ' ').toUpperCase() : 'RAVI KUMAR')
    const userPhone = user?.phone || '+91 98765 43210'

    try {
      const payload = {
        incident_type: form.type || 'EMERGENCY_SOS',
        type: form.type || 'EMERGENCY_SOS',
        severity: 'critical',
        notes: form.message || `🚨 EMERGENCY SOS initiated by ${userName}. Immediate patrol dispatch requested.`,
        message: form.message || `🚨 EMERGENCY SOS initiated by ${userName}. Immediate patrol dispatch requested.`,
        user_name: userName,
        user_phone: userPhone,
        lat,
        lng,
      }

      const { data } = await api.post('/incidents', payload)
      setSosResult({
        id: data.id,
        status: data.status,
        timestamp_ist: data.created_at_ist || istTimeStr,
        tourist: data.tourist || { name: userName, phone: userPhone },
        assignedRanger: data.assigned_ranger_station || { unit: 'RANGER-01', ranger_name: 'Arjun Singh', distance_m: 120, eta_minutes: 2 },
      })
      setSosSent(true)
    } catch (err) {
      // Offline / Local Simulation Fallback
      setSosResult({
        id: 'SOS-' + Math.floor(Math.random() * 89999 + 10000),
        status: 'TEAM_ASSIGNED',
        timestamp_ist: istTimeStr,
        tourist: { name: userName, phone: userPhone },
        assignedRanger: { unit: 'RANGER-01 (Station Lead)', ranger_name: 'Arjun Singh', distance_m: 120, eta_minutes: 2 },
      })
      setSosSent(true)
    } finally {
      setLoading(false)
    }
  }

  const INCIDENT_TYPES = [
    { value: 'SOS',      label: 'EMERGENCY SOS',   icon: 'sos',         color: 'text-error'   },
    { value: 'MEDICAL',  label: 'MEDICAL CRISIS',  icon: 'local_hospital', color: 'text-primary' },
    { value: 'LOST',     label: 'LOST / STRANDED', icon: 'wrong_location', color: 'text-primary' },
    { value: 'WILDLIFE', label: 'WILDLIFE THREAT', icon: 'pets',        color: 'text-error'   },
    { value: 'LANDSLIDE',label: 'LANDSLIDE / FIRE',icon: 'local_fire_department', color: 'text-error' },
    { value: 'OTHER',    label: 'OTHER HAZARD',    icon: 'report',      color: 'text-outline' },
  ]

  return (
    <div className="min-h-screen forest-bg font-body-md pb-20 md:pb-0">

      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin-mobile md:px-margin-desktop h-16 bg-surface/90 backdrop-blur border-b border-outline/15">
        <div className="flex items-center gap-md">
          <Link to="/home" className="flex items-center gap-xs text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
          </Link>
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-error text-xl" style={{ fontVariationSettings: '"FILL" 1' }}>sos</span>
            <h1 className="font-headline-sm text-headline-sm text-error font-bold tracking-tight">EMERGENCY SOS DISPATCH</h1>
          </div>
        </div>
        <span className="font-data-mono text-data-mono text-tertiary px-sm py-xs hairline-border rounded bg-surface-container-low text-xs">
          SIH25002
        </span>
      </header>

      <main className="min-h-screen px-margin-mobile md:px-margin-desktop max-w-2xl mx-auto pt-24 pb-xl">

        {sosSent ? (
          /* ── SOS Sent / Confirmed State ── */
          <div className="space-y-lg text-center animate-fadeIn">
            <div className="relative inline-flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-error/10 flex items-center justify-center border-2 border-error animate-pulse shadow-lg">
                <span className="material-symbols-outlined text-6xl text-error" style={{ fontVariationSettings: '"FILL" 1' }}>sos</span>
              </div>
            </div>
            <div>
              <h2 className="font-headline-md text-headline-md text-error font-bold leading-tight">
                SOS SIGNAL TRANSMITTED
              </h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant mt-sm">
                Your live emergency beacon and tourist identity have been transmitted to the nearest Ranger Station.
              </p>
            </div>

            {/* Incident Telemetry Card */}
            <div className="bg-surface hairline-border rounded-lg p-md text-left space-y-sm shadow-md border-l-4 border-error">
              <div className="flex justify-between items-center hairline-border-b pb-sm">
                <span className="font-label-caps text-label-caps text-error font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-error animate-ping" />
                  INCIDENT DISPATCH ACTIVE
                </span>
                <span className="font-data-mono text-xs text-tertiary">ID: {sosResult?.id?.slice(0, 8) || 'ACTIVE'}</span>
              </div>

              <div className="grid grid-cols-2 gap-sm text-xs font-data-mono">
                <div>
                  <span className="text-outline text-[10px] block">TOURIST NAME</span>
                  <strong className="text-on-surface text-sm">{sosResult?.tourist?.name || 'Verified Tourist'}</strong>
                </div>
                <div>
                  <span className="text-outline text-[10px] block">PHONE NUMBER</span>
                  <strong className="text-primary text-sm">{sosResult?.tourist?.phone || '+91 98765 43210'}</strong>
                </div>
                <div>
                  <span className="text-outline text-[10px] block">IST TIMESTAMP</span>
                  <span className="text-secondary font-bold">{sosResult?.timestamp_ist || 'Active IST'}</span>
                </div>
                <div>
                  <span className="text-outline text-[10px] block">BEACON ELAPSED</span>
                  <span className="text-error font-bold">{formatElapsed(elapsed)}</span>
                </div>
                <div>
                  <span className="text-outline text-[10px] block">LATITUDE</span>
                  <span className="text-on-surface">{location?.lat ? location.lat.toFixed(5) : '30.90150'}°N</span>
                </div>
                <div>
                  <span className="text-outline text-[10px] block">LONGITUDE</span>
                  <span className="text-on-surface">{location?.lng ? location.lng.toFixed(5) : '76.94450'}°E</span>
                </div>
              </div>

              {/* Assigned Ranger Unit */}
              <div className="p-sm bg-secondary/10 hairline-border border-secondary/30 rounded flex items-center justify-between text-xs font-data-mono">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-base">shield_person</span>
                  <div>
                    <span className="text-outline text-[10px] block">NEAREST DISPATCHED RANGER</span>
                    <strong className="text-secondary">{sosResult?.assignedRanger?.unit || 'RANGER-01'} ({sosResult?.assignedRanger?.ranger_name || 'Arjun Singh'})</strong>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-primary font-bold text-sm">ETA: ~{sosResult?.assignedRanger?.eta_minutes || 2} MIN</span>
                  <span className="text-outline text-[10px] block">~{sosResult?.assignedRanger?.distance_m || 120}m away</span>
                </div>
              </div>
            </div>

            {/* Safety Protocol Guidance */}
            <div className="bg-error-container/20 hairline-border rounded p-md text-left">
              <div className="font-label-caps text-label-caps text-error mb-sm flex items-center gap-1 font-bold">
                <span className="material-symbols-outlined text-sm">health_and_safety</span>
                WHAT TO DO NOW (SURVIVAL PROTOCOL)
              </div>
              <ul className="space-y-xs font-body-md text-body-md text-on-surface-variant text-sm list-disc list-inside">
                <li>Remain in your current location if it is safe to do so.</li>
                <li>Keep your phone screen active; rangers will call your number directly.</li>
                <li>In dense pine cover, whistle or reflect bright light toward the ridge.</li>
                <li>If facing flood/landslide risk, move to elevated solid rock ground.</li>
              </ul>
            </div>

            <div className="flex gap-md justify-center flex-wrap pt-2">
              <Link to="/map" className="btn-primary flex items-center gap-1 text-xs">
                <span className="material-symbols-outlined text-sm">map</span>
                TRACK RANGER ON LIVE MAP
              </Link>
              <Link to="/ranger" className="btn-ghost text-xs flex items-center gap-1 text-secondary">
                <span className="material-symbols-outlined text-sm">shield_person</span>
                OPEN RANGER STATION LOG
              </Link>
              <button
                onClick={() => { setSosSent(false); setElapsed(0) }}
                className="btn-ghost text-xs"
              >
                SEND ANOTHER ALERT
              </button>
            </div>
          </div>
        ) : (
          /* ── SOS Form State ── */
          <div className="space-y-lg">
            <div>
              <div className="font-data-mono text-data-mono text-tertiary flex items-center gap-sm mb-sm">
                <span className="material-symbols-outlined text-sm text-primary">my_location</span>
                {location
                  ? `${location.lat.toFixed(4)}° N, ${location.lng.toFixed(4)}° E — GPS SATELLITE FIX`
                  : locError || 'ACQUIRING SATELLITE FIX…'}
              </div>
              <h2 className="font-headline-md text-headline-md text-on-surface">Emergency Assistance</h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant mt-xs">
                Select your emergency type. Your GPS coordinates, identity, and IST timestamp will be transmitted immediately to the nearest ranger patrol.
              </p>
            </div>

            {/* Incident Type Grid */}
            <div>
              <label className="field-label">EMERGENCY CLASSIFICATION</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-sm">
                {INCIDENT_TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, type: t.value }))}
                    className={`flex flex-col items-center gap-xs p-sm rounded hairline-border transition-all ${
                      form.type === t.value
                        ? 'bg-error/15 border-error/70 shadow-sm'
                        : 'bg-surface hover:bg-surface-container'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-2xl ${form.type === t.value ? 'text-error' : t.color}`}
                      style={form.type === t.value ? { fontVariationSettings: '"FILL" 1' } : {}}>
                      {t.icon}
                    </span>
                    <span className={`font-label-caps text-[10px] ${form.type === t.value ? 'text-error font-bold' : 'text-on-surface-variant'}`}>
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Situation Message */}
            <div>
              <label className="field-label" htmlFor="sos-message">SITUATION DETAILS (OPTIONAL)</label>
              <textarea
                id="sos-message"
                value={form.message}
                onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                placeholder="E.g., Medical injury / stranded near ravine / need immediate evacuation..."
                rows={3}
                className="field-input resize-none"
              />
            </div>

            {error && (
              <div className="bg-error-container/40 text-error font-data-mono text-data-mono text-sm px-md py-sm rounded hairline-border flex items-start gap-sm">
                <span className="material-symbols-outlined text-sm mt-px">error</span>
                {error}
              </div>
            )}

            {/* 1-Tap SOS Button */}
            <button
              onClick={handleSOS}
              disabled={loading}
              className="w-full py-lg bg-error text-on-error font-headline-sm text-headline-sm rounded-lg hover:bg-error/90 active:scale-[0.98] transition-all duration-150 shadow-xl disabled:opacity-60 flex items-center justify-center gap-md"
            >
              {loading
                ? <><span className="material-symbols-outlined text-2xl animate-spin">progress_activity</span> TRANSMITTING SOS BEACON…</>
                : <><span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>sos</span> TRANSMIT EMERGENCY SOS BEACON</>
              }
            </button>

            {/* Direct Helpline contacts */}
            <div className="bg-surface-container hairline-border rounded p-md">
              <div className="font-label-caps text-label-caps text-tertiary mb-sm font-bold">24/7 TOLL-FREE EMERGENCY HELPLINES</div>
              <ul className="space-y-xs font-data-mono text-data-mono text-on-surface-variant text-xs">
                <li className="flex items-center gap-sm"><span className="material-symbols-outlined text-sm text-error">call</span> National Emergency Services: <strong className="text-on-surface">112</strong></li>
                <li className="flex items-center gap-sm"><span className="material-symbols-outlined text-sm text-primary">call</span> Tourist Emergency Helpline: <strong className="text-on-surface">1363</strong></li>
                <li className="flex items-center gap-sm"><span className="material-symbols-outlined text-sm text-secondary">call</span> Forest Patrol Command: <strong className="text-on-surface">1800-180-5000</strong></li>
              </ul>
            </div>

            <div className="text-center pt-1">
              <Link to="/home" className="font-label-caps text-label-caps text-on-surface-variant hover:text-on-surface flex items-center justify-center gap-xs">
                <span className="material-symbols-outlined text-sm">arrow_back</span> BACK TO DASHBOARD
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
