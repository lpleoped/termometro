import { useNotifications } from '../context/NotificationContext'
import NotificationToast from './NotificationToast'

export default function NotificationContainer() {
  const { notifications, removeNotification } = useNotifications()

  if (notifications.length === 0) return null

  return (
    <div 
      className="notification-container position-fixed top-0 end-0 p-3 d-flex flex-column gap-2"
      style={{ 
        zIndex: 9999,
        maxWidth: '420px',
        width: '100%'
      }}
    >
      {notifications.map(notification => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onClose={removeNotification}
        />
      ))}
    </div>
  )
} 
