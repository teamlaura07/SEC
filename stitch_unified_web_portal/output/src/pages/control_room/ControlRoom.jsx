import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import useAuthStore from '../../store/authStore'

import { API_BASE } from '../../lib/api'
const API = API_BASE

function KpiCard({ label, value, icon, color = 'text-tertiary', trend }) {
  return (
    <div className="bg-surface hairline-border rounded p-md shadow-sm space-y-xs">
      <div className="flex justify-between items-start">
        <div className="font-label-caps text-label-caps text-outline text-[10px]">{label}</div>
        <span className={`material-symbols-outlined text-sm ${color}`}>{icon}</span>
      </div>
      <div className={`font-data-mono text-data-mono text-2xl font-bold ${color}`}>{value}</div>
      {trend && <div className="font-data-mono text-data-mono text-on-surface-variant text-xs">{trend}</div>}
    </div>
  )
}

function AdvisoryCard({ adv }) {
  const sev = adv.severity || 'info'
  const barColor  = sev === 'critical' ? 'bg-error' : sev === 'warning' ? 'bg-primary' : 'bg-secondary'
  const chipClass = sev === 'critical' ? 'chip-danger' : sev === 'warning' ? 'chip-warn' : 'chip-safe'
  return (
    <div className="bg-surface hairline-border rounded p-md relative overflow-hidden shadow-sm">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${barColor}`} />
      <div className="flex items-start justify-between gap-sm mb-xs">
        <h4 className="font-headline-sm text-headline-sm text-on-surface text-sm leading-snug">{adv.title}</h4>
        <span className={`font-label-caps text-[10px] px-sm py-unit rounded shrink-0 ${chipClass}`}>{sev.toUpperCase()}</span>
      </div>
      <p className="font-body-md text-body-md text-on-surface-variant text-sm">{adv.body}</p>
      <div className="font-data-mono text-data-mono text-outline text-xs mt-sm">
        {adv.region} · {adv.category?.replace('_', ' ').toUpperCase()}
      </div>
    </div>
  )
}

function IncidentTableRow({ inc, i }) {
  const sev = inc.severity || 'medium'
  const barColor = sev === 'critical' ? 'bg-error' : sev === 'high' ? 'bg-primary' : 'bg-secondary'
  const chip     = sev === 'critical' ? 'chip-danger' : sev === 'high' ? 'chip-warn' : 'chip-safe'
  return (
    <div className={`grid grid-cols-[2fr_1fr_1fr_auto] gap-sm items-center p-sm rounded hover:bg-surface-container transition-colors relative overflow-hidden ${i % 2 === 0 ? 'bg-surface-container-low/50' : ''}`}>
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${barColor}`} />
      <div className="truncate font-body-md text-body-md text-on-surface text-sm pl-sm">{inc.message || 'No description'}</div>
      <div className={`font-label-caps text-[10px] px-xs py-unit rounded text-center ${chip}`}>{sev.toUpperCase()}</div>
      <div className="font-data-mono text-data-mono text-on-surface-variant text-xs text-right">{inc.type?.toUpperCase()}</div>
      <div className="font-data-mono text-data-mono text-outline text-xs text-right">
        {inc.created_at ? new Date(inc.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
      </div>
    </div>
  )
}

export default function ControlRoom() {
  const { token, user, logout } = useAuthStore()
  const navigate = useNavigate()

  const [incidents,  setIncidents]  = useState([])
  const [rangers,    setRangers]    = useState([])
  const [advisories, setAdvisories] = useState([])
  const [coverage,   setCoverage]   = useState([])
  const [weather,    setWeather]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [tab,        setTab]        = useState('overview')

  const headers = { Authorization: `Bearer ${token}` }

  const fetchAll = useCallback(async () => {
    try {
      const [iR, rR, aR, cR, wR] = await Promise.allSettled([
        axios.get(`${API}/incidents`,    { headers }),
        axios.get(`${API}/rangers`,      { headers }),
        axios.get(`${API}/advisories`,   { headers }),
        axios.get(`${API}/coverage`,     { headers }),
        axios.get(`${API}/weather`,      { headers }),
      ])
      if (iR.status === 'fulfilled') setIncidents(iR.value.data || [])
      if (rR.status === 'fulfilled') setRangers(rR.value.data || [])
      if (aR.status === 'fulfilled') setAdvisories(aR.value.data || [])
      if (cR.status === 'fulfilled') setCoverage(cR.value.data || [])
      if (wR.status === 'fulfilled') setWeather(wR.value.data?.slice(0, 5) || [])
    } catch (_) {}
    setLoading(false)
  }, [token])

  useEffect(() => { fetchAll() }, [fetchAll])
  useEffect(() => {
    const id = setInterval(fetchAll, 20000)
    return () => clearInterval(id)
  }, [fetchAll])

  const handleLogout = () => { logout(); navigate('/') }

  const critical    = incidents.filter(i => i.severity === 'critical').length
  const activeR     = rangers.filter(r => r.status === 'active').length
  const weatherText = weather.map(w => `${w.city || w.location} ${w.temp || w.temperature}°C ${w.condition || w.description}`).join('   ·   ')

  return (
    <div className="min-h-screen font-body-md text-on-surface bg-surface antialiased">

      {/* Header */}
      <header className="sticky top-0 z-50 flex justify-between items-center px-margin-mobile md:px-margin-desktop h-16 bg-surface/90 backdrop-blur border-b border-outline/15">
        <div className="flex items-center gap-md">
          <span className="material-symbols-outlined text-tertiary text-xl" style={{ fontVariationSettings: '"FILL" 1' }}>monitoring</span>
          <div>
            <h1 className="font-headline-sm text-headline-sm text-on-surface leading-none">CONTROL ROOM</h1>
            <div className="font-data-mono text-data-mono text-secondary text-[10px] flex items-center gap-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse inline-block" />
              LIVE — AUTO-REFRESH 20s
            </div>
          </div>
        </div>
        <div className="flex items-center gap-gutter">
          <span className="font-data-mono text-data-mono text-tertiary text-xs hidden md:block">
            {user?.full_name?.toUpperCase() || user?.username?.toUpperCase()}
          </span>
          <button onClick={fetchAll} className="btn-ghost text-xs">
            <span className="material-symbols-outlined text-sm">refresh</span>
            <span className="hidden md:inline">REFRESH</span>
          </button>
          <button onClick={handleLogout} className="btn-ghost text-xs">
            <span className="material-symbols-outlined text-sm">logout</span>
          </button>
        </div>
      </header>

      {/* Weather ticker */}
      {weatherText && (
        <div className="bg-surface-container-low hairline-border-b flex items-center h-7">
          <div className="bg-tertiary text-on-tertiary font-label-caps text-label-caps px-sm h-full flex items-center whitespace-nowrap text-[10px]">
            WEATHER
          </div>
          <div className="ticker-wrap flex-1 h-full flex items-center">
            <div className="ticker-content font-data-mono text-data-mono text-tertiary text-xs">{weatherText}</div>
          </div>
        </div>
      )}

      <div className="px-margin-mobile md:px-margin-desktop py-lg max-w-7xl mx-auto space-y-lg">

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
          <KpiCard label="TOTAL INCIDENTS"  value={incidents.length} icon="report"         color="text-error"      trend="all types" />
          <KpiCard label="CRITICAL ALERTS"  value={critical}         icon="emergency"       color="text-error"      trend="immediate response required" />
          <KpiCard label="ACTIVE RANGERS"   value={activeR}          icon="shield_person"   color="text-secondary"  trend={`of ${rangers.length} deployed`} />
          <KpiCard label="LIVE ADVISORIES"  value={advisories.length}icon="campaign"        color="text-primary"    trend="public notices" />
        </div>

        {/* Tabs */}
        <div className="flex hairline-border-b gap-sm overflow-x-auto">
          {[
            { key: 'overview',  label: 'OVERVIEW',   icon: 'dashboard' },
            { key: 'incidents', label: 'INCIDENTS',  icon: 'report' },
            { key: 'rangers',   label: 'RANGERS',    icon: 'shield_person' },
            { key: 'advisory',  label: 'ADVISORIES', icon: 'campaign' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-xs px-md py-sm font-label-caps text-label-caps whitespace-nowrap transition-colors border-b-2 ${
                tab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-xl">
            <span className="material-symbols-outlined text-5xl text-outline animate-spin">progress_activity</span>
            <p className="font-data-mono text-data-mono text-on-surface-variant mt-md">LOADING CONTROL DATA…</p>
          </div>
        ) : (
          <>
            {/* OVERVIEW */}
            {tab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                {/* Recent incidents */}
                <div className="space-y-sm">
                  <div className="flex justify-between items-center hairline-border-b pb-sm">
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">Recent Incidents</h3>
                    <button onClick={() => setTab('incidents')} className="font-label-caps text-label-caps text-primary hover:underline text-xs flex items-center gap-xs">
                      VIEW ALL <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </div>
                  <div className="space-y-xs">
                    {incidents.slice(0, 5).map((inc, i) => <IncidentTableRow key={inc.id} inc={inc} i={i} />)}
                    {!incidents.length && (
                      <div className="text-center py-lg bg-surface hairline-border rounded">
                        <span className="material-symbols-outlined text-3xl text-secondary">check_circle</span>
                        <p className="font-data-mono text-data-mono text-on-surface-variant mt-sm text-sm">NO ACTIVE INCIDENTS</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rangers status */}
                <div className="space-y-sm">
                  <div className="flex justify-between items-center hairline-border-b pb-sm">
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">Ranger Status</h3>
                    <button onClick={() => setTab('rangers')} className="font-label-caps text-label-caps text-primary hover:underline text-xs flex items-center gap-xs">
                      VIEW ALL <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </div>
                  <div className="bg-surface hairline-border rounded p-md shadow-sm divide-y divide-outline/10">
                    {rangers.slice(0, 5).map(r => {
                      const online = r.status === 'active' || r.status === 'online'
                      return (
                        <div key={r.id} className="flex items-center gap-md py-sm first:pt-0 last:pb-0">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${online ? 'bg-secondary' : 'bg-outline'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="font-body-md text-body-md text-on-surface text-sm truncate">{r.name}</div>
                            <div className="font-data-mono text-data-mono text-on-surface-variant text-xs">{r.unit_type?.toUpperCase()}</div>
                          </div>
                          <span className={`font-label-caps text-[10px] px-sm py-unit rounded ${online ? 'chip-safe' : 'chip-warn'}`}>
                            {online ? 'ACTIVE' : 'STANDBY'}
                          </span>
                        </div>
                      )
                    })}
                    {!rangers.length && (
                      <p className="font-data-mono text-data-mono text-on-surface-variant text-sm py-md text-center">NO RANGERS ON RECORD</p>
                    )}
                  </div>
                </div>

                {/* Advisories preview */}
                <div className="md:col-span-2 space-y-sm">
                  <div className="flex justify-between items-center hairline-border-b pb-sm">
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">Active Advisories</h3>
                    <button onClick={() => setTab('advisory')} className="font-label-caps text-label-caps text-primary hover:underline text-xs flex items-center gap-xs">
                      VIEW ALL <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                    {advisories.slice(0, 4).map(a => <AdvisoryCard key={a.id} adv={a} />)}
                  </div>
                </div>
              </div>
            )}

            {/* INCIDENTS tab */}
            {tab === 'incidents' && (
              <div className="space-y-sm">
                <div className="font-label-caps text-label-caps text-outline text-[10px] grid grid-cols-[2fr_1fr_1fr_auto] gap-sm px-sm mb-sm">
                  <span className="pl-sm">DESCRIPTION</span><span>SEVERITY</span><span>TYPE</span><span>TIME</span>
                </div>
                {incidents.map((inc, i) => <IncidentTableRow key={inc.id} inc={inc} i={i} />)}
                {!incidents.length && (
                  <div className="text-center py-xl bg-surface hairline-border rounded">
                    <span className="material-symbols-outlined text-5xl text-secondary">check_circle</span>
                    <p className="font-data-mono text-data-mono text-on-surface-variant mt-md">ALL CLEAR — NO ACTIVE INCIDENTS</p>
                  </div>
                )}
              </div>
            )}

            {/* RANGERS tab */}
            {tab === 'rangers' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                {rangers.map(r => {
                  const online = r.status === 'active' || r.status === 'online'
                  return (
                    <div key={r.id} className="bg-surface hairline-border rounded p-md shadow-sm relative overflow-hidden">
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${online ? 'bg-secondary' : 'bg-outline'}`} />
                      <div className="flex justify-between items-start mb-sm">
                        <div>
                          <div className="font-headline-sm text-headline-sm text-on-surface text-sm">{r.name}</div>
                          <div className="font-data-mono text-data-mono text-outline text-xs">{r.unit_id || r.id?.slice(0,8)}</div>
                        </div>
                        <span className={`font-label-caps text-[10px] px-sm py-unit rounded ${online ? 'chip-safe' : 'chip-warn'}`}>
                          {online ? 'ACTIVE' : 'STANDBY'}
                        </span>
                      </div>
                      <div className="font-data-mono text-data-mono text-on-surface-variant text-xs">
                        {r.unit_type?.toUpperCase() || 'RANGER'}
                      </div>
                    </div>
                  )
                })}
                {!rangers.length && (
                  <div className="col-span-full text-center py-xl">
                    <p className="font-data-mono text-data-mono text-on-surface-variant">NO RANGERS ON RECORD</p>
                  </div>
                )}
              </div>
            )}

            {/* ADVISORY tab */}
            {tab === 'advisory' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                {advisories.map(a => <AdvisoryCard key={a.id} adv={a} />)}
                {!advisories.length && (
                  <div className="col-span-full text-center py-xl bg-surface hairline-border rounded">
                    <span className="material-symbols-outlined text-5xl text-secondary">check_circle</span>
                    <p className="font-data-mono text-data-mono text-on-surface-variant mt-md">NO ACTIVE ADVISORIES</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
