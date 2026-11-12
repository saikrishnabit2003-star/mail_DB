import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { notificationsService } from '../services/notifications.service'

const APP_TITLE = 'Mail Engine'
const ICON_PATH = '/app-icon.svg'

function createBadgeIcon(count) {
  const badgeLabel = count > 9 ? '9+' : String(count)
  const badgeWidth = count > 9 ? 25 : 20
  const badgeX = 64 - badgeWidth

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect x="4" y="12" width="56" height="40" rx="8" fill="#2563eb"/>
    <path d="m6 17 26 20 26-20" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="4"/>
    <rect x="${badgeX}" y="3" width="${badgeWidth}" height="18" rx="9" fill="#dc2626" stroke="#fff" stroke-width="2"/>
    <text x="${badgeX + badgeWidth / 2}" y="16" fill="#fff" font-family="Arial,sans-serif" font-size="12" font-weight="700" text-anchor="middle">${badgeLabel}</text>
  </svg>`

  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function setTaskbarBadge(count) {
  if (typeof navigator === 'undefined') return

  try {
    if (count > 0 && typeof navigator.setAppBadge === 'function') {
      navigator.setAppBadge(count).catch(error => {
        console.warn('Unable to update the application badge.', error)
      })
    } else if (count === 0 && typeof navigator.clearAppBadge === 'function') {
      navigator.clearAppBadge().catch(error => {
        console.warn('Unable to clear the application badge.', error)
      })
    } else if (count === 0 && typeof navigator.setAppBadge === 'function') {
      navigator.setAppBadge(0).catch(error => {
        console.warn('Unable to clear the application badge.', error)
      })
    }
  } catch (error) {
    console.warn('Unable to update the application badge.', error)
  }
}

export default function NotificationBadgeListener() {
  const { user } = useAuth()
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.list(),
    enabled: Boolean(user),
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  })

  const notifications = data?.data?.data || []
  const unread = user ? notifications.filter(notification => !notification.isRead).length : 0

  useEffect(() => {
    const titleCount = unread > 20 ? '20+' : unread
    document.title = unread > 0 ? `(${titleCount}) ${APP_TITLE}` : APP_TITLE

    const favicon = document.querySelector('link[rel~="icon"]')
    if (favicon) {
      favicon.href = unread > 0 ? createBadgeIcon(unread) : ICON_PATH
      favicon.type = 'image/svg+xml'
    }

    setTaskbarBadge(unread)
  }, [unread])

  return null
}
