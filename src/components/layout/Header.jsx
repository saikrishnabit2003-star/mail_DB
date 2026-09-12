import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Settings, Bell, LogOut, ChevronDown } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsService } from '../../services/notifications.service'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'

export default function Header({ title }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [dropOpen, setDropOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [prevNotifIds, setPrevNotifIds] = useState(null)
  
  const notifRef = useRef(null)
  const dropRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.list(),
    refetchInterval: 30000,
  })

  const notifs = notifData?.data?.data || []
  const unread = notifs.filter(n => !n.isRead).length || 0

  useEffect(() => {
    if (notifs) {
      if (prevNotifIds !== null) {
        const newNotifs = notifs.filter(n => !prevNotifIds.has(n.id) && !n.isRead)
        if (newNotifs.length > 0) {
          // Only show the latest 1 notification
          const latest = newNotifs[0]
          let toastId
          toastId = toast.custom((t) => (
            <div 
              className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-yellow-50 border border-yellow-200 shadow-lg rounded-xl pointer-events-auto flex relative p-4`}
            >
              <div className="flex-1 pr-8">
                <p className="text-sm font-medium text-gray-800 leading-relaxed line-clamp-3">
                  {latest.message || latest.title}
                </p>
                <p className="text-[11px] text-gray-400 mt-2 font-medium">
                  {latest.createdAt ? format(new Date(latest.createdAt), 'MMM d, yyyy, h:mm a') : 'Just now'}
                </p>
              </div>
              <button
                onClick={() => toast.dismiss(toastId)}
                className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-yellow-100 transition-colors text-xs font-bold"
                title="Close"
              >
                ✕
              </button>
            </div>
          ), { duration: 3000, position: 'top-right' })
        }
      }
      setPrevNotifIds(new Set(notifs.map(n => n.id)))
    }
  }, [notifs])

  const readAllMut = useMutation({
    mutationFn: () => notificationsService.readAll(),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  })

  const handleLogout = async () => {
    await logout()
    navigate('/login')
    toast.success('Logged out')
  }

  return (
    <header className="h-16 glass flex items-center justify-between px-6 shrink-0 sticky top-0 z-30">
      <h1 className="text-xl font-semibold text-foreground tracking-tight">{title}</h1>

      <div className="flex items-center gap-3">
        {user?.role === 'super_admin' && (
          <button
            onClick={() => navigate('/settings')}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors focus:outline-none"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        )}

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(v => !v)}
            className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors focus:outline-none"
          >
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center ring-2 ring-background">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-80 sm:w-96 bg-card rounded-2xl shadow-xl border border-border z-20 flex flex-col max-h-[450px] overflow-hidden"
                >
                  <div className="flex justify-between items-center px-5 py-4 border-b border-border bg-muted/30 shrink-0">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Notifications 
                    </span>
                    <button 
                      onClick={() => readAllMut.mutate()} 
                      disabled={unread === 0 || readAllMut.isPending}
                      className="text-xs text-blue-600 font-semibold hover:underline disabled:opacity-50"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="overflow-y-auto p-2 space-y-1">
                    {notifs.map(n => {
                      const dotColor = n.type === 'error' || n.message?.toLowerCase().includes('invalid') ? 'bg-orange-500' : 'bg-emerald-500'
                      
                      return (
                        <div key={n.id} className={`p-4 rounded-xl border transition-colors ${n.isRead ? 'bg-background border-transparent hover:bg-muted/50' : 'bg-green-50/50 border-green-100/50'} relative`}>
                          <p className={`text-sm pr-6 leading-relaxed ${n.isRead ? 'text-muted-foreground' : 'text-gray-800 font-medium'}`}>
                            {n.message || n.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground/70 mt-2 font-medium">
                            {n.createdAt ? format(new Date(n.createdAt), 'MMM d, yyyy, h:mm a') : ''}
                          </p>
                          {!n.isRead && <div className={`absolute top-5 right-4 w-2 h-2 rounded-full ${dotColor}`} />}
                        </div>
                      )
                    })}
                    {notifs.length === 0 && (
                      <div className="p-8 text-center text-muted-foreground text-sm font-medium">
                        No new notifications
                      </div>
                    )}
                  </div>
                </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile dropdown */}
        <div className="relative" ref={dropRef}>
          <button
            onClick={() => setDropOpen(v => !v)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-accent transition-colors focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold uppercase shadow-sm">
              {user?.name?.[0] || 'U'}
            </div>
            <span className="text-sm font-medium text-foreground max-w-[100px] truncate">{user?.name}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>

          <AnimatePresence>
            {dropOpen && (
              <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-56 bg-card rounded-xl shadow-xl border border-border z-20 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-border bg-muted/30">
                    <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">{user?.role}</p>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors focus:outline-none"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
