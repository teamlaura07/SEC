import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import api from '../../lib/api'

const ROLES = [
  { value: 'tourist',      label: 'Tourist / Hiker',        icon: 'hiking',           color: 'text-primary' },
  { value: 'rescue_team',  label: 'Forest Ranger / Rescue', icon: 'shield_person',    color: 'text-secondary' },
  { value: 'control_room', label: 'Control Room Officer',   icon: 'desktop_windows',  color: 'text-tertiary' },
]

const COUNTRIES = [
  'United States', 'United Kingdom', 'Germany', 'France', 'Australia',
  'Canada', 'Japan', 'Singapore', 'Switzerland', 'Netherlands', 'Other'
]

export default function Register() {
  const navigate = useNavigate()
  const { register: registerUser, login, loading } = useAuthStore()

  const [step, setStep] = useState(1) // 1: Credentials, 2: ID Auth & PDF Upload, 3: Role
  const [error, setError] = useState('')

  // Step 1: Account
  const [form, setForm] = useState({
    email: '',
    password: '',
    role: 'tourist',
  })

  // Step 2: ID Authentication & PDF Document
  const [idType, setIdType] = useState('aadhaar') // 'aadhaar' | 'passport'
  const [idData, setIdData] = useState({
    fullName: '',
    phone: '',
    aadhaarNumber: '',
    passportNumber: '',
    nationality: 'United States',
    visaRef: '',
  })
  const [pdfFile, setPdfFile] = useState(null)
  const [pdfBase64, setPdfBase64] = useState('')
  const [pdfError, setPdfError] = useState('')

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
  const handleIdChange = (e) => setIdData((p) => ({ ...p, [e.target.name]: e.target.value }))

  // Format Aadhaar with spaces: XXXX-XXXX-XXXX
  const handleAadhaarInput = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 12)
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1-')
    setIdData((p) => ({ ...p, aadhaarNumber: formatted }))
  }

  // Handle PDF File Upload
  const handlePdfUpload = (e) => {
    setPdfError('')
    const file = e.target.files?.[0]
    if (!file) return

    // Verify PDF MIME type or extension
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setPdfError('Only official PDF documents are accepted (.pdf format).')
      setPdfFile(null)
      setPdfBase64('')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setPdfError('PDF file size must be under 5 MB.')
      setPdfFile(null)
      setPdfBase64('')
      return
    }

    setPdfFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      setPdfBase64(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleNextToStep2 = () => {
    if (!form.email.trim()) { setError('Email address is required.'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setError('')
    setStep(2)
  }

  const handleNextToStep3 = () => {
    setError('')
    if (!idData.fullName.trim()) { setError('Full legal name is required.'); return }
    if (!idData.phone.trim()) { setError('Contact phone number is required.'); return }

    if (idType === 'aadhaar') {
      const cleanAadhaar = idData.aadhaarNumber.replace(/\D/g, '')
      if (cleanAadhaar.length !== 12) {
        setError('Please enter a valid 12-digit Aadhaar number.')
        return
      }
    } else {
      if (!idData.passportNumber.trim()) {
        setError('Passport number is required for international tourists.')
        return
      }
    }

    if (!pdfFile) {
      setError('Please upload your official ID document in PDF format.')
      return
    }

    setStep(3)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      // 1. Register User Account
      await registerUser({
        email: form.email,
        password: form.password,
        role: form.role,
      })

      // 2. Login to obtain access token
      const authData = await login(form.email, form.password)
      const token = authData.access_token

      // 3. Submit Identity Verification & Store PDF Document
      if (token) {
        if (idType === 'aadhaar') {
          await api.post(
            '/identity/aadhaar',
            {
              aadhaar_number: idData.aadhaarNumber.replace(/\D/g, ''),
              full_name: idData.fullName,
              phone: idData.phone,
              pdf_document_base64: pdfBase64,
              document_filename: pdfFile?.name || 'aadhaar_card.pdf',
            },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        } else {
          await api.post(
            '/identity/passport',
            {
              passport_number: idData.passportNumber,
              nationality: idData.nationality,
              full_name: idData.fullName,
              phone: idData.phone,
              visa_ref: idData.visaRef,
              pdf_document_base64: pdfBase64,
              document_filename: pdfFile?.name || 'passport_document.pdf',
            },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        }
      }

      // Redirect to appropriate role screen
      if (form.role === 'tourist') {
        navigate('/home')
      } else if (form.role === 'rescue_team') {
        navigate('/ranger')
      } else {
        navigate('/control-room')
      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'Registration & ID verification failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center forest-bg px-margin-mobile py-xl font-body-md">
      <div className="w-full max-w-lg">

        {/* Brand Header */}
        <div className="text-center mb-xl">
          <div className="flex items-center justify-center gap-sm mb-sm">
            <span className="material-symbols-outlined text-secondary text-4xl"
              style={{ fontVariationSettings: '"FILL" 1' }}>forest</span>
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface">VANRAKSHAK</h1>
          </div>
          <p className="font-data-mono text-data-mono text-tertiary text-sm">
            SMART TOURIST SAFETY PORTAL — REGISTRATION & ID VERIFICATION
          </p>
        </div>

        {/* 3-Step Indicator */}
        <div className="flex items-center justify-center gap-sm mb-lg">
          {[
            { num: 1, label: 'Account' },
            { num: 2, label: 'ID & PDF' },
            { num: 3, label: 'Role' },
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center gap-sm">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-label-caps transition-all ${
                step === s.num
                  ? 'bg-primary text-on-primary font-bold shadow'
                  : step > s.num
                    ? 'bg-secondary text-on-secondary'
                    : 'bg-surface-container hairline-border text-on-surface-variant'
              }`}>
                <span>{s.num}.</span>
                <span>{s.label}</span>
              </div>
              {idx < 2 && <div className={`w-8 h-px ${step > s.num ? 'bg-secondary' : 'bg-outline/30'}`} />}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-surface hairline-border rounded-xl p-lg shadow-xl space-y-lg border-t-4 border-primary">
          <div className="hairline-border-b pb-md">
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              {step === 1 && 'Step 1: Account Credentials'}
              {step === 2 && 'Step 2: Identity Authentication (Aadhaar / Passport & PDF)'}
              {step === 3 && 'Step 3: Confirm Role & Digital Tourist ID (DTID)'}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant text-xs mt-xs">
              {step === 1 && 'Enter your login credentials to create your secure portal account.'}
              {step === 2 && 'Authenticate using government ID and upload proof in PDF format for tamper-evident ledger storage.'}
              {step === 3 && 'Select your access role to finalize registration and mint your Digital Tourist ID.'}
            </p>
          </div>

          {/* ── STEP 1: ACCOUNT CREDENTIALS ── */}
          {step === 1 && (
            <div className="space-y-md">
              <div>
                <label className="field-label" htmlFor="reg-email">EMAIL ADDRESS</label>
                <input
                  id="reg-email"
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="tourist@example.com"
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="reg-password">PASSWORD</label>
                <input
                  id="reg-password"
                  name="password"
                  type="password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Minimum 6 characters"
                  className="field-input"
                />
              </div>

              {error && (
                <div className="bg-error-container/40 text-error font-data-mono text-xs px-md py-sm rounded hairline-border flex items-start gap-sm">
                  <span className="material-symbols-outlined text-sm mt-px">error</span>
                  {error}
                </div>
              )}

              <button
                onClick={handleNextToStep2}
                type="button"
                className="btn-primary w-full justify-center flex items-center gap-sm shadow-md"
              >
                NEXT: AUTHENTICATE ID & UPLOAD PDF
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          )}

          {/* ── STEP 2: ID AUTHENTICATION & PDF UPLOAD ── */}
          {step === 2 && (
            <div className="space-y-md animate-fadeIn">
              {/* ID Type Switcher */}
              <div>
                <label className="field-label">NATIONALITY / ID DOCUMENT TYPE</label>
                <div className="grid grid-cols-2 gap-sm">
                  <button
                    type="button"
                    onClick={() => { setIdType('aadhaar'); setError('') }}
                    className={`py-2 px-3 rounded-lg hairline-border text-xs font-label-caps flex items-center justify-center gap-2 transition-all ${
                      idType === 'aadhaar'
                        ? 'bg-primary/15 border-primary text-primary font-bold shadow-sm'
                        : 'bg-surface hover:bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    <span>🇮🇳</span>
                    <span>INDIAN (AADHAAR)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIdType('passport'); setError('') }}
                    className={`py-2 px-3 rounded-lg hairline-border text-xs font-label-caps flex items-center justify-center gap-2 transition-all ${
                      idType === 'passport'
                        ? 'bg-secondary/15 border-secondary text-secondary font-bold shadow-sm'
                        : 'bg-surface hover:bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    <span>🌐</span>
                    <span>FOREIGN (PASSPORT)</span>
                  </button>
                </div>
              </div>

              {/* Full Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
                <div>
                  <label className="field-label" htmlFor="id-name">FULL LEGAL NAME</label>
                  <input
                    id="id-name"
                    name="fullName"
                    type="text"
                    required
                    value={idData.fullName}
                    onChange={handleIdChange}
                    placeholder="As on official ID"
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="id-phone">MOBILE PHONE NUMBER</label>
                  <input
                    id="id-phone"
                    name="phone"
                    type="tel"
                    required
                    value={idData.phone}
                    onChange={handleIdChange}
                    placeholder="+91 98765 43210"
                    className="field-input"
                  />
                </div>
              </div>

              {/* Indian Aadhaar Branch */}
              {idType === 'aadhaar' ? (
                <div className="space-y-sm bg-primary/5 p-3 rounded-lg hairline-border border-primary/20">
                  <div className="flex items-center justify-between">
                    <label className="field-label !mb-0 text-primary font-bold" htmlFor="id-aadhaar">
                      12-DIGIT AADHAAR NUMBER
                    </label>
                    <span className="text-[10px] font-data-mono text-tertiary">DigiLocker Mock Tokenized</span>
                  </div>
                  <input
                    id="id-aadhaar"
                    name="aadhaarNumber"
                    type="text"
                    maxLength={14}
                    value={idData.aadhaarNumber}
                    onChange={handleAadhaarInput}
                    placeholder="XXXX-XXXX-XXXX"
                    className="field-input font-data-mono text-sm tracking-wider"
                  />
                  <p className="text-[10px] font-data-mono text-outline">
                    🔒 Raw number is salted & converted to SHA-256 token. Zero raw numbers stored.
                  </p>
                </div>
              ) : (
                /* Foreign Passport Branch */
                <div className="space-y-sm bg-secondary/5 p-3 rounded-lg hairline-border border-secondary/20">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
                    <div>
                      <label className="field-label text-secondary font-bold" htmlFor="id-passport">
                        PASSPORT NUMBER
                      </label>
                      <input
                        id="id-passport"
                        name="passportNumber"
                        type="text"
                        value={idData.passportNumber}
                        onChange={handleIdChange}
                        placeholder="A12345678"
                        className="field-input font-data-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="field-label" htmlFor="id-nat">NATIONALITY</label>
                      <select
                        id="id-nat"
                        name="nationality"
                        value={idData.nationality}
                        onChange={handleIdChange}
                        className="field-input"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="field-label" htmlFor="id-visa">VISA / ENTRY PERMIT REF (OPTIONAL)</label>
                    <input
                      id="id-visa"
                      name="visaRef"
                      type="text"
                      value={idData.visaRef}
                      onChange={handleIdChange}
                      placeholder="EV-2026-IND-XXXX"
                      className="field-input font-data-mono uppercase"
                    />
                  </div>
                </div>
              )}

              {/* ── PDF DOCUMENT UPLOAD SECTION ── */}
              <div>
                <label className="field-label flex items-center justify-between">
                  <span>UPLOAD OFFICIAL ID DOCUMENT (PDF FORMAT ONLY)</span>
                  <span className="text-[10px] text-primary font-bold">MAX 5 MB</span>
                </label>
                <div className="relative border-2 border-dashed border-outline/30 hover:border-primary rounded-xl p-4 text-center bg-surface-container-low transition-colors">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handlePdfUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {pdfFile ? (
                    <div className="flex items-center justify-center gap-3 text-left">
                      <span className="material-symbols-outlined text-3xl text-secondary">picture_as_pdf</span>
                      <div className="font-data-mono text-xs">
                        <strong className="text-on-surface block truncate max-w-xs">{pdfFile.name}</strong>
                        <span className="text-secondary font-bold">
                          {(pdfFile.size / 1024).toFixed(1)} KB · PDF Ready for SHA-256 Storage
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-secondary text-xl">check_circle</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="material-symbols-outlined text-3xl text-outline">upload_file</span>
                      <p className="font-body-md text-xs text-on-surface">
                        Click or drag & drop your <strong>{idType === 'aadhaar' ? 'Aadhaar Card' : 'Passport'} PDF</strong> here
                      </p>
                      <p className="font-data-mono text-[10px] text-outline">
                        Only valid .pdf files are accepted
                      </p>
                    </div>
                  )}
                </div>
                {pdfError && (
                  <p className="text-error font-data-mono text-[10px] mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">error</span>
                    {pdfError}
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-error-container/40 text-error font-data-mono text-xs px-md py-sm rounded hairline-border flex items-start gap-sm">
                  <span className="material-symbols-outlined text-sm mt-px">error</span>
                  {error}
                </div>
              )}

              <div className="flex gap-sm pt-2">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError('') }}
                  className="btn-ghost flex-1 justify-center text-xs"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span> BACK
                </button>
                <button
                  type="button"
                  onClick={handleNextToStep3}
                  className="btn-primary flex-1 justify-center flex items-center gap-sm text-xs shadow-md"
                >
                  NEXT: CONFIRM ROLE
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: ROLE SELECTION & REGISTRATION COMPLETION ── */}
          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-md animate-fadeIn">
              <div className="space-y-sm">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, role: r.value }))}
                    className={`w-full flex items-center gap-md p-md rounded-lg hairline-border transition-all text-left ${
                      form.role === r.value
                        ? 'bg-primary/10 border-primary/60 shadow-sm'
                        : 'bg-surface hover:bg-surface-container'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-2xl ${form.role === r.value ? r.color : 'text-outline'}`}
                      style={form.role === r.value ? { fontVariationSettings: '"FILL" 1' } : {}}
                    >
                      {r.icon}
                    </span>
                    <div className="flex-1">
                      <div className="font-label-caps text-[11px] text-on-surface font-bold">
                        {r.label.toUpperCase()}
                      </div>
                    </div>
                    {form.role === r.value && (
                      <span className="material-symbols-outlined text-sm text-primary">check_circle</span>
                    )}
                  </button>
                ))}
              </div>

              {/* ID Verification Summary Preview */}
              <div className="p-3 bg-surface-container-low hairline-border rounded-lg space-y-1 font-data-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-outline">AUTHENTICATED USER:</span>
                  <strong className="text-on-surface">{idData.fullName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline">ID TYPE & DOCUMENT:</span>
                  <span className="text-primary font-bold uppercase">{idType} ({pdfFile?.name || 'Document.pdf'})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-outline">VERIFICATION METHOD:</span>
                  <span className="text-secondary font-bold">SHA-256 Hash Chain DTID</span>
                </div>
              </div>

              {error && (
                <div className="bg-error-container/40 text-error font-data-mono text-xs px-md py-sm rounded hairline-border flex items-start gap-sm">
                  <span className="material-symbols-outlined text-sm mt-px">error</span>
                  {error}
                </div>
              )}

              <div className="flex gap-sm pt-2">
                <button
                  type="button"
                  onClick={() => { setStep(2); setError('') }}
                  className="btn-ghost flex-1 justify-center text-xs"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span> BACK
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 justify-center flex items-center gap-sm text-xs shadow-md disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                      STORING PDF & CREATING DTID…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">verified</span>
                      COMPLETE REGISTRATION
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Bottom sign-in switch */}
          <div className="hairline-border-t pt-md flex items-center justify-between">
            <p className="font-data-mono text-data-mono text-on-surface-variant text-xs">
              Already registered?
            </p>
            <Link
              to="/"
              className="font-label-caps text-label-caps text-secondary hover:underline flex items-center gap-xs text-xs"
            >
              SIGN IN <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
        </div>

        <p className="text-center font-data-mono text-data-mono text-outline text-xs mt-lg">
          VANRAKSHAK FOREST SAFETY PORTAL | OFFICIAL GOVT USE ONLY<br />
          <span className="text-outline/60">SIH Hackathon Prototype — Safe SHA-256 Digital Tourist ID Ledger</span>
        </p>
      </div>
    </div>
  )
}
