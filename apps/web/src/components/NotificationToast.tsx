import { useState, useEffect } from 'react'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
}

interface NotificationToastProps {
  notification: Notification
  onClose: (id: string) => void
}

export default function NotificationToast({ notification, onClose }: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    // Mostrar la notificación con animación
    const showTimer = setTimeout(() => setIsVisible(true), 100)
    
    // Auto-cerrar después del tiempo especificado
    const duration = notification.duration || 5000
    const closeTimer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onClose(notification.id), 300)
    }, duration)

    // Barra de progreso
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev <= 0) return 0
        return prev - (100 / (duration / 100))
      })
    }, 100)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(closeTimer)
      clearInterval(progressInterval)
    }
  }, [notification.id, notification.duration, onClose])

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return (
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M10.97 4.97a.235.235 0 0 0-.02.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-1.071-1.05z"/>
          </svg>
        )
      case 'error':
        return (
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </svg>
        )
      case 'warning':
        return (
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
          </svg>
        )
      case 'info':
        return (
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
          </svg>
        )
    }
  }

  const getTypeClasses = () => {
    switch (notification.type) {
      case 'success':
        return 'notification-success'
      case 'error':
        return 'notification-error'
      case 'warning':
        return 'notification-warning'
      case 'info':
        return 'notification-info'
      default:
        return 'notification-info'
    }
  }

  const tone = notification.type === 'success' ? { color: '#166534', background: '#f0fdf4' } : notification.type === 'error' ? { color: '#991b1b', background: '#fef2f2' } : notification.type === 'warning' ? { color: '#92400e', background: '#fffbeb' } : { color: '#1e40af', background: '#eff6ff' }

  return (
    <div 
      className={`toast-notification ${getTypeClasses()} ${isVisible ? 'show' : ''}`}
      style={{ zIndex: 9999, minWidth: 340, maxWidth: 'calc(100vw - 32px)', transition: 'opacity 0.3s, transform 0.3s', borderRadius: 14, boxShadow: '0 14px 36px rgba(15, 23, 42, .16)', border: '1px solid rgba(15, 23, 42, .08)', overflow: 'hidden', color: tone.color, background: tone.background }}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="d-flex align-items-start gap-3 p-3">
        <span className="notification-icon">{getIcon()}</span>
        <div className="flex-grow-1">
          <div className="fw-semibold">{notification.title}</div>
          <div className="small opacity-75">{notification.message}</div>
        </div>
        <button type="button" className="btn-close ms-2" aria-label="Cerrar" onClick={() => onClose(notification.id)}></button>
      </div>
      <div className="progress" style={{ height: 2 }}>
        <div
          className="progress-bar bg-light"
          role="progressbar"
          style={{ width: `${progress}%`, transition: 'width 0.1s linear' }}
        ></div>
      </div>
    </div>
  );
}
