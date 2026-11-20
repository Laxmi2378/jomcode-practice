const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

async function request(path, { session, ...options } = {}) {
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers })
  if (response.status === 204) return null

  const payload = await response.json()
  if (!response.ok) {
    const detail = typeof payload.detail === 'string'
      ? payload.detail
      : 'The API request failed.'
    throw new Error(detail)
  }
  return payload
}

export function listServices() {
  return request('/services')
}

export function listAppointments(session) {
  return request('/appointments', { session })
}

export function createAppointment(session, booking) {
  return request('/appointments', {
    method: 'POST',
    session,
    body: JSON.stringify(booking),
  })
}

export function updateAppointment(session, appointmentId, booking) {
  return request(`/appointments/${appointmentId}`, {
    method: 'PUT',
    session,
    body: JSON.stringify(booking),
  })
}

export function deleteAppointment(session, appointmentId) {
  return request(`/appointments/${appointmentId}`, {
    method: 'DELETE',
    session,
  })
}
