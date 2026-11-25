import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'

const ToastContext = createContext(null)
const MAX_VISIBLE_TOASTS = 3

const toastDefaults = {
  success: { duration: 3000, Icon: CheckCircle2 },
  error: { duration: 5000, Icon: XCircle },
  warning: { duration: 4500, Icon: AlertTriangle },
  info: { duration: 3500, Icon: Info },
}

function ToastItem({ toast, onExited }) {
  const [isExiting, setIsExiting] = useState(false)
  const closingRef = useRef(false)
  const exitTimerRef = useRef(null)
  const defaults = toastDefaults[toast.type]
  const Icon = defaults.Icon

  const beginExit = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setIsExiting(true)
    exitTimerRef.current = window.setTimeout(() => onExited(toast.id), 220)
  }, [onExited, toast.id])

  useEffect(() => {
    const timer = window.setTimeout(beginExit, toast.duration)
    return () => window.clearTimeout(timer)
  }, [beginExit, toast.duration])

  useEffect(() => () => window.clearTimeout(exitTimerRef.current), [])

  return (
    <article
      className={`toast-item toast-item--${toast.type}${isExiting ? ' is-exiting' : ''}`}
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <Icon className="toast-icon" size={20} aria-hidden="true" />
      <div className="toast-copy">
        <p className="toast-title">{toast.title}</p>
        <p className="toast-message">{toast.message}</p>
      </div>
      <button className="toast-close" type="button" aria-label="Tutup notifikasi" onClick={beginExit}>
        <X size={17} aria-hidden="true" />
      </button>
    </article>
  )
}

function ToastProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const nextIdRef = useRef(0)

  const notify = useCallback(({ type = 'info', title, message, duration } = {}) => {
    const defaults = toastDefaults[type] ?? toastDefaults.info
    const id = `toast-${Date.now()}-${nextIdRef.current + 1}`
    nextIdRef.current += 1
    setNotifications((current) => [...current, {
      id,
      type: toastDefaults[type] ? type : 'info',
      title: title || 'Informasi',
      message: message || '',
      duration: Number.isFinite(duration) && duration > 0 ? duration : defaults.duration,
    }])
    return id
  }, [])

  const dismiss = useCallback((id) => {
    setNotifications((current) => current.filter((toast) => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="toast-viewport" role="region" aria-label="Notifikasi aplikasi">
        {notifications.slice(0, MAX_VISIBLE_TOASTS).map((toast) => (
          <ToastItem key={toast.id} toast={toast} onExited={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast harus digunakan di dalam ToastProvider.')
  return context
}

export { ToastProvider, useToast }
