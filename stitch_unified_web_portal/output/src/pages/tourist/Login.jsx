import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

export default function Login() {
  const navigate = useNavigate()
  const { login, loading } = useAuthStore()

  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    try {
      // authStore.login(identifier, password) — password is now optional on backend
      const data = await login(email, undefined)
      const role = data.role
      if (role === 'tourist')           navigate('/home')
      else if (role === 'rescue_team')  navigate('/ranger')
      else if (role === 'control_room') navigate('/control-room')
      else navigate('/home')
    } catch (err) {
      setError(err?.response?.data?.detail || 'No account found. Please register first.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center forest-bg px-margin-mobile font-body-md">
      <div className="w-full max-w-md">

        {/* Brand */}
        <div className="text-center mb-xl">
          <div className="flex items-center justify-center gap-sm mb-sm">
            <span className="material-symbols-outlined text-secondary text-4xl"
              style={{ fontVariationSettings: '"FILL" 1' }}>forest</span>
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface">VANRAKSHA</h1>
          </div>
          <p className="font-data-mono text-data-mono text-tertiary text-sm">
            FOREST SAFETY PORTAL — SIH25002
          </p>
          <div className="mt-sm font-data-mono text-[10px] text-outline hairline-border inline-block px-sm py-unit rounded">
            AUTHORIZED PERSONNEL ONLY
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface hairline-border rounded p-lg shadow-sm space-y-lg">
          <div className="hairline-border-b pb-md">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Sign in</h2>
            <p className="font-body-md text-body-md text-on-surface-variant text-sm mt-xs">
              Enter your registered email to access the portal.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-md">
            <div>
              <label className="field-label" htmlFor="login-email">EMAIL ADDRESS</label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tourist@vanrakshak.org"
                className="field-input"
              />
            </div>

            {error && (
              <div className="bg-error-container/40 text-error font-data-mono text-data-mono text-sm px-md py-sm rounded hairline-border flex items-start gap-sm">
                <span className="material-symbols-outlined text-sm mt-px">error</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center flex items-center gap-sm disabled:opacity-60"
            >
              {loading
                ? <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> SIGNING IN…</>
                : <><span className="material-symbols-outlined text-sm">login</span> SIGN IN</>
              }
            </button>
          </form>

          {/* Quick-access demo accounts */}
          <div className="bg-surface-container-low hairline-border rounded p-sm space-y-xs">
            <div className="font-label-caps text-[10px] text-tertiary mb-xs">DEMO ACCOUNTS — click to fill</div>
            {[
              { label: 'Tourist',      email: 'tourist@vanrakshak.org' },
              { label: 'Ranger',       email: 'ranger@vanrakshak.org'  },
              { label: 'Control Room', email: 'admin@vanrakshak.org'   },
            ].map(a => (
              <button
                key={a.email}
                type="button"
                onClick={() => setEmail(a.email)}
                className="w-full text-left flex items-center justify-between px-sm py-xs rounded hover:bg-surface-container transition-colors"
              >
                <span className="font-data-mono text-data-mono text-on-surface-variant text-xs">{a.email}</span>
                <span className="font-label-caps text-[10px] text-tertiary">{a.label.toUpperCase()}</span>
              </button>
            ))}
          </div>

          <div className="hairline-border-t pt-md flex items-center justify-between">
            <p className="font-data-mono text-data-mono text-on-surface-variant text-xs">
              New to VanRaksha?
            </p>
            <Link to="/register"
              className="font-label-caps text-label-caps text-secondary hover:underline flex items-center gap-xs">
              REGISTER <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
        </div>

        <p className="text-center font-data-mono text-data-mono text-outline text-xs mt-lg">
          VANRAKSHA FOREST SAFETY PORTAL | OFFICIAL GOVT USE ONLY<br/>
          <span className="text-outline/60">SIH Hackathon Prototype – Not Official Govt Site</span>
        </p>
      </div>
    </div>
  )
}
