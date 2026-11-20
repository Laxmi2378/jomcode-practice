import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from './supabase'
import {
  createAppointment,
  deleteAppointment,
  listAppointments,
  listServices,
  updateAppointment,
} from './api'

const HOURLY_RATE = 200

function todayAsDateInput() {
  const today = new Date()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${today.getFullYear()}-${month}-${day}`
}

function displayDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString()
}

export default function App() {
  const [session, setSession] = useState(null)
  const [services, setServices] = useState([])
  const [appointments, setAppointments] = useState([])
  const [authMode, setAuthMode] = useState('signin')
  const [recoveryMode, setRecoveryMode] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [bookingDate, setBookingDate] = useState('')
  const [bookingTime, setBookingTime] = useState('')
  const [durationHours, setDurationHours] = useState('1')
  const [editingId, setEditingId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [appointmentsLoading, setAppointmentsLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!supabase) return undefined

    let active = true
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) setError(sessionError.message)
      setSession(data.session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabase) return undefined

    let active = true
    async function loadServices() {
      if (!active) return
      try {
        const data = await listServices()
        if (!active) return
        setServices(data ?? [])
        setServiceId((current) => current || data?.[0]?.id || '')
      } catch (servicesError) {
        if (active) setError(servicesError.message)
        return
      }
    }

    loadServices()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!supabase || !session?.user?.id) {
      setAppointments([])
      return undefined
    }

    let active = true
    async function loadAppointments() {
      setAppointmentsLoading(true)
      try {
        const data = await listAppointments(session)
        if (!active) return
        setAppointments(data ?? [])
      } catch (appointmentsError) {
        if (active) setError(appointmentsError.message)
      } finally {
        if (active) setAppointmentsLoading(false)
      }
    }

    loadAppointments()
    return () => {
      active = false
    }
  }, [session])

  function resetBookingForm() {
    setEditingId(null)
    setBookingDate('')
    setBookingTime('')
    setDurationHours('1')
  }

  async function handleAuth(event) {
    event.preventDefault()
    if (!supabase) {
      setError('Configure the Supabase URL and publishable key before signing in.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')

    const result =
      authMode === 'signup'
        ? await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName.trim() } },
          })
        : await supabase.auth.signInWithPassword({ email, password })

    setBusy(false)
    if (result.error) {
      setError(result.error.message)
      return
    }

    setPassword('')
    if (authMode === 'signup' && !result.data.session) {
      setNotice('Check your email to confirm your account, then sign in.')
    } else {
      setNotice(authMode === 'signup' ? 'Your account is ready.' : 'You are signed in.')
    }
  }

  async function handlePasswordRecovery(event) {
    event.preventDefault()
    if (!supabase) {
      setError('Configure the Supabase URL and publishable key before requesting a reset.')
      return
    }

    setBusy(true)
    setError('')
    setNotice('')
    const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    setBusy(false)

    if (recoveryError) {
      setError(recoveryError.message)
      return
    }
    setNotice('If an account exists for that email, a password reset link has been sent.')
  }

  async function handlePasswordUpdate(event) {
    event.preventDefault()
    if (!supabase) {
      setError('Supabase is not configured.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }

    setBusy(true)
    setError('')
    setNotice('')
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })
    setBusy(false)

    if (updateError) {
      setError(updateError.message)
      return
    }
    setRecoveryMode(false)
    setNewPassword('')
    setConfirmPassword('')
    setNotice('Your password has been updated.')
  }

  async function handleSignOut() {
    if (!supabase) return
    setError('')
    setNotice('')
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      setError(signOutError.message)
      return
    }
    resetBookingForm()
    setNotice('You are signed out.')
  }

  async function refreshAppointments() {
    if (!supabase || !session) return false
    try {
      const data = await listAppointments(session)
      setAppointments(data ?? [])
      return true
    } catch (appointmentsError) {
      setError(appointmentsError.message)
      return false
    }
  }

  async function handleBooking(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!supabase || !session) {
      setError('Sign in before requesting an appointment.')
      return
    }
    if (!serviceId || !bookingDate || !bookingTime) {
      setError('Choose a service, date, and time to continue.')
      return
    }
    if (bookingDate < todayAsDateInput()) {
      setError('Choose today or a future date.')
      return
    }

    setBusy(true)
    const booking = {
      service_id: serviceId,
      booking_date: bookingDate,
      booking_time: bookingTime,
      duration_hours: Number(durationHours),
    }
    try {
      if (editingId) {
        await updateAppointment(session, editingId, booking)
      } else {
        await createAppointment(session, booking)
      }
    } catch (bookingError) {
      setError(bookingError.message)
      setBusy(false)
      return
    }
    setBusy(false)
    const wasEditing = Boolean(editingId)
    resetBookingForm()
    setNotice(
      wasEditing
        ? 'Your appointment has been rescheduled.'
        : 'Your appointment request has been submitted. It is pending confirmation.',
    )
    await refreshAppointments()
  }

  async function handleCancel(appointmentId) {
    if (!window.confirm('Cancel this appointment request?')) return

    if (!supabase || !session) {
      setError('Sign in before cancelling an appointment.')
      return
    }
    setError('')
    setNotice('')
    if (!session) {
      setError('Sign in before cancelling an appointment.')
      return
    }
    setBusy(true)
    try {
      await deleteAppointment(session, appointmentId)
    } catch (cancelError) {
      setError(cancelError.message)
      setBusy(false)
      return
    }
    setBusy(false)
    setNotice('The appointment request has been cancelled.')
    await refreshAppointments()
  }

  function startRescheduling(appointment) {
    setEditingId(appointment.id)
    setServiceId(appointment.service_id)
    setBookingDate(appointment.booking_date)
    setBookingTime(appointment.booking_time.slice(0, 5))
    setDurationHours(String(appointment.duration_hours))
    setError('')
    setNotice('')
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <header className="topbar">
        <a className="brand" href="#home">Laxmi Legal Firm</a>
        <nav aria-label="Main navigation">
          <a href="#services">Services</a>
          <a href="#booking">Book</a>
          {session && <a href="#appointments">My appointments</a>}
        </nav>
        {recoveryMode ? (
          <div className="form-card account-card" id="account">
            <h3>Choose a new password</h3>
            <p className="muted">Enter and confirm your new password.</p>
            <form onSubmit={handlePasswordUpdate}>
              <label htmlFor="new-password">New password</label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
              <label htmlFor="confirm-password">Confirm new password</label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              <button className="primary-button" disabled={busy}>
                {busy ? 'Please wait…' : 'Update password'}
              </button>
            </form>
          </div>
        ) : session ? (
          <button className="nav-button" onClick={handleSignOut} type="button">
            Sign out
          </button>
        ) : (
          <a className="nav-button" href="#account">Client login</a>
        )}
      </header>

      <main>
        {!isSupabaseConfigured && (
          <div className="setup-notice" role="status">
            Add <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to{' '}
            <code>react-app/.env.local</code>, then run the SQL in{' '}
            <code>workbooks/Chapter15/booking_schema.sql</code>.
          </div>
        )}
        {error && <p className="feedback error" role="alert">{error}</p>}
        {notice && <p className="feedback success" role="status">{notice}</p>}

        <section className="hero" id="home">
          <p className="eyebrow">Practical legal guidance</p>
          <h1>Make your next step with confidence.</h1>
          <p>
            Explore our legal services and request a consultation with Laxmi
            Legal Firm.
          </p>
          <a className="button-link" href="#services">Explore our services</a>
        </section>

        <section className="section" id="services">
          <div className="section-title">
            <p className="eyebrow">How we can help</p>
            <h2>Legal services</h2>
          </div>
          {services.length ? (
            <div className="service-grid">
              {services.map((service) => (
                <article className="service-card" key={service.id}>
                  <h3>{service.service_name}</h3>
                  <p>{service.description}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">
              {isSupabaseConfigured
                ? 'Services will appear here after the database setup is complete.'
                : 'Connect your Supabase project to load the legal services.'}
            </p>
          )}
        </section>

        <section className="section booking-section" id="booking">
          <div className="section-title">
            <p className="eyebrow">Consultation</p>
            <h2>Book an appointment</h2>
            <p>
              Consultation rate: RM {HOURLY_RATE} per hour. Choose a duration
              from 1 to 3 hours.
            </p>
          </div>
          {session ? (
            <form className="form-card" onSubmit={handleBooking}>
              <label htmlFor="service">Legal service</label>
              <select
                id="service"
                required
                value={serviceId}
                onChange={(event) => setServiceId(event.target.value)}
              >
                <option value="" disabled>Select a service</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.service_name}
                  </option>
                ))}
              </select>

              <div className="field-grid">
                <div>
                  <label htmlFor="booking-date">Date</label>
                  <input
                    id="booking-date"
                    type="date"
                    min={todayAsDateInput()}
                    required
                    value={bookingDate}
                    onChange={(event) => setBookingDate(event.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="booking-time">Time</label>
                  <input
                    id="booking-time"
                    type="time"
                    required
                    value={bookingTime}
                    onChange={(event) => setBookingTime(event.target.value)}
                  />
                </div>
              </div>

              <label htmlFor="duration">Duration</label>
              <select
                id="duration"
                value={durationHours}
                onChange={(event) => setDurationHours(event.target.value)}
              >
                <option value="1">1 hour</option>
                <option value="2">2 hours</option>
                <option value="3">3 hours</option>
              </select>
              <p className="total">
                <span>Total charges</span>
                <strong>RM {Number(durationHours) * HOURLY_RATE}</strong>
              </p>
              <div className="form-actions">
                <button className="primary-button" disabled={busy || !services.length}>
                  {busy ? 'Please wait…' : editingId ? 'Save changes' : 'Request appointment'}
                </button>
                {editingId && (
                  <button
                    className="secondary-button"
                    onClick={resetBookingForm}
                    type="button"
                  >
                    Stop rescheduling
                  </button>
                )}
              </div>
            </form>
          ) : (
            <div className="form-card account-card" id="account">
              <h3>
                {authMode === 'signup'
                  ? 'Create your client account'
                  : authMode === 'recover'
                    ? 'Reset your password'
                    : 'Client sign in'}
              </h3>
              <p className="muted">
                {authMode === 'recover'
                  ? 'We’ll email you a secure link to choose a new password.'
                  : 'Sign in to book and manage your private appointments.'}
              </p>
              <form onSubmit={authMode === 'recover' ? handlePasswordRecovery : handleAuth}>
                {authMode === 'signup' && (
                  <>
                    <label htmlFor="full-name">Full name</label>
                    <input
                      id="full-name"
                      autoComplete="name"
                      required
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                    />
                  </>
                )}
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                {authMode !== 'recover' && (
                  <>
                    <label htmlFor="password">Password</label>
                    <input
                      id="password"
                      type="password"
                      autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                      minLength={6}
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </>
                )}
                <button
                  className="primary-button"
                  disabled={busy || !isSupabaseConfigured}
                >
                  {busy
                    ? 'Please wait…'
                    : authMode === 'signup'
                      ? 'Create account'
                      : authMode === 'recover'
                        ? 'Send reset link'
                        : 'Sign in'}
                </button>
              </form>
              <button
                className="link-button"
                onClick={() => {
                  setAuthMode(authMode === 'signin' ? 'signup' : 'signin')
                  setError('')
                  setNotice('')
                }}
                type="button"
              >
                {authMode === 'signup'
                  ? 'Already have an account? Sign in'
                  : authMode === 'recover'
                    ? 'Back to sign in'
                    : 'New client? Create an account'}
              </button>
              {authMode === 'signin' && (
                <button
                  className="link-button"
                  onClick={() => {
                    setAuthMode('recover')
                    setError('')
                    setNotice('')
                  }}
                  type="button"
                >
                  Forgot password?
                </button>
              )}
            </div>
          )}
        </section>

        {session && (
          <section className="section" id="appointments">
            <div className="section-title">
              <p className="eyebrow">Your account</p>
              <h2>My appointments</h2>
            </div>
            {appointmentsLoading ? (
              <p className="muted">Loading your appointments…</p>
            ) : appointments.length ? (
              <div className="appointment-list">
                {appointments.map((appointment) => (
                  <article className="appointment-card" key={appointment.id}>
                    <div>
                      <h3>{appointment.service?.service_name ?? 'Legal consultation'}</h3>
                      <p>
                        {displayDate(appointment.booking_date)} at{' '}
                        {appointment.booking_time.slice(0, 5)} ·{' '}
                        {appointment.duration_hours} hour
                        {appointment.duration_hours > 1 ? 's' : ''}
                      </p>
                      <span className="status">{appointment.status}</span>
                    </div>
                    <div className="appointment-actions">
                      <button
                        className="secondary-button"
                        disabled={busy || appointment.status !== 'Pending'}
                        onClick={() => startRescheduling(appointment)}
                        type="button"
                      >
                        Reschedule
                      </button>
                      <button
                        className="cancel-button"
                        disabled={busy}
                        onClick={() => handleCancel(appointment.id)}
                        type="button"
                      >
                        Cancel
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">You do not have any appointments yet.</p>
            )}
          </section>
        )}

        <section className="about-section" id="about">
          <div>
            <p className="eyebrow">About the firm</p>
            <h2>Guidance built around your needs.</h2>
          </div>
          <p>
            Contact Laxmi Legal Firm to discuss your legal matter and find out
            how we can help.
          </p>
        </section>

        <section className="contact-section" id="contact">
          <p className="eyebrow">Contact</p>
          <h2>Questions before booking?</h2>
          <p>Reach out to the firm directly to discuss your consultation.</p>
        </section>
      </main>

      <footer className="footer">
        <span>Laxmi Legal Firm</span>
        <span>Consultations from RM 200 per hour</span>
      </footer>
    </>
  )
}
