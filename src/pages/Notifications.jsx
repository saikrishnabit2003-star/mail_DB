import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsService } from '../services/notifications.service'
import Button from '../components/ui/Button'
import { Bell, CheckCheck } from 'lucide-react'
import { format } from 'date-fns'
import clsx from 'clsx'

const typeColor = {
  success: 'bg-green-50 border-green-100 text-green-700',
  error:   'bg-red-50 border-red-100 text-red-700',
  warning: 'bg-yellow-50 border-yellow-100 text-yellow-700',
  info:    'bg-blue-50 border-blue-100 text-blue-700',
}

export default function Notifications() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.list(),
    refetchInterval: 30000,
  })

  const notifications = data?.data?.data || []
  const unread = notifications.filter(n => !n.isRead).length

  const readAllMut = useMutation({
    mutationFn: () => notificationsService.readAll(),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  })

  const readOneMut = useMutation({
    mutationFn: (id) => notificationsService.readOne(id),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  })

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-gray-500" />
          <p className="text-sm text-gray-500">{unread} unread</p>
        </div>
        {unread > 0 && (
          <Button variant="ghost" size="sm" onClick={() => readAllMut.mutate()} loading={readAllMut.isPending}>
            <CheckCheck className="w-4 h-4" /> Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : !notifications.length ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <Bell className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => !n.isRead && readOneMut.mutate(n.id)}
              className={clsx(
                'bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-sm',
                !n.isRead ? 'border-primary-200 bg-primary-50/30' : 'border-gray-100',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full capitalize', typeColor[n.type] || typeColor.info)}>
                      {n.type}
                    </span>
                    {!n.isRead && <span className="w-2 h-2 bg-primary-500 rounded-full" />}
                  </div>
                  <p className="text-sm text-gray-700">{n.message}</p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                  {n.createdAt ? format(new Date(n.createdAt), 'MMM d, HH:mm') : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
