import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { notificationsService } from '../services/notifications.service'
import { playNotificationSound } from '../lib/notificationSound'

function NotificationSoundWatcher() {
  const previousNotificationIds = useRef(null)
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.list(),
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  })

  useEffect(() => {
    if (!data) return

    const notifications = data.data?.data || []
    const currentIds = new Set(notifications.map(notification => notification.id))

    if (previousNotificationIds.current) {
      const hasNewUnreadNotification = notifications.some(
        notification => !notification.isRead && !previousNotificationIds.current.has(notification.id)
      )

      if (hasNewUnreadNotification && localStorage.getItem('notification_sound_enabled') !== 'false') {
        playNotificationSound().catch(error => {
          console.warn('Unable to play notification sound.', error)
        })
      }
    }

    previousNotificationIds.current = currentIds
  }, [data])

  return null
}

export default function NotificationSoundListener() {
  const { user } = useAuth()
  if (!user) return null

  return <NotificationSoundWatcher key={user.userId || user.email} />
}
