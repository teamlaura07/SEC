import { create } from 'zustand'
import api from '../lib/api'

const savedToken = localStorage.getItem('vr_access_token')
const savedRole  = localStorage.getItem('vr_role')

const useAuthStore = create((set, get) => ({
  user: savedToken ? { role: savedRole } : null,
  token: savedToken,
  role: savedRole,
  isAuthenticated: !!savedToken,
  loading: false,
  error: null,

  setAuth: (token, user) => {
    localStorage.setItem('vr_access_token', token)
    if (user?.role) localStorage.setItem('vr_role', user.role)
    set({
      token,
      role: user?.role || 'tourist',
      user,
      isAuthenticated: true,
    })
  },

  login: async (identifier, password) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/auth/login', { identifier, password })
      localStorage.setItem('vr_access_token', data.access_token)
      localStorage.setItem('vr_refresh_token', data.refresh_token)
      if (data.role) localStorage.setItem('vr_role', data.role)
      if (data.ranger_id) {
        localStorage.setItem('vr_ranger_id', data.ranger_id)
      }
      set({
        token: data.access_token,
        role: data.role,
        isAuthenticated: true,
        loading: false,
        user: { id: data.user_id, role: data.role },
      })
      return data
    } catch (err) {
      set({ error: err.response?.data?.detail || 'Login failed', loading: false })
      throw err
    }
  },

  register: async (payload) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/auth/register', payload)
      set({ loading: false })
      return data
    } catch (err) {
      set({ error: err.response?.data?.detail || 'Registration failed', loading: false })
      throw err
    }
  },

  verifyOTP: async (identifier, otp) => {
    set({ loading: true, error: null })
    try {
      const { data } = await api.post('/auth/verify-otp', { identifier, otp })
      localStorage.setItem('vr_access_token', data.access_token)
      localStorage.setItem('vr_refresh_token', data.refresh_token)
      if (data.role) localStorage.setItem('vr_role', data.role)
      if (data.ranger_id) {
        localStorage.setItem('vr_ranger_id', data.ranger_id)
      }
      set({
        token: data.access_token,
        role: data.role,
        isAuthenticated: true,
        loading: false,
        user: { id: data.user_id, role: data.role },
      })
      return data
    } catch (err) {
      set({ error: err.response?.data?.detail || 'OTP verification failed', loading: false })
      throw err
    }
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me')
      if (data.role) localStorage.setItem('vr_role', data.role)
      set({ user: data, role: data.role, isAuthenticated: true })
    } catch {
      get().logout()
    }
  },

  logout: () => {
    localStorage.removeItem('vr_access_token')
    localStorage.removeItem('vr_refresh_token')
    localStorage.removeItem('vr_ranger_id')
    localStorage.removeItem('vr_role')
    set({ user: null, token: null, role: null, isAuthenticated: false })
  },

  clearError: () => set({ error: null }),
}))

export default useAuthStore
