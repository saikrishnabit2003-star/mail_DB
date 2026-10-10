import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Settings, Bell, LogOut, ChevronDown, Menu, XCircle, CheckCircle2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsService } from '../../services/notifications.service'
import toast from 'react-hot-toast'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { format } from 'date-fns'

export default function Header({ title, toggleSidebar }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const reduce = useReducedMotion()
  const [dropOpen, setDropOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [prevNotifIds, setPrevNotifIds] = useState(null)
  const [centerNotif, setCenterNotif] = useState(null)
  
  const notifRef = useRef(null)
  const dropRef = useRef(null)

  // ---- 3D animation helpers (visual only) ----
  // icon buttons lift and tilt toward the cursor
  const iconHover = reduce ? undefined : { rotateY: 18, rotateX: -10, scale: 1.12, z: 20 }
  const iconTap = reduce ? undefined : { scale: 0.9, rotateY: 0 }
  const iconStyle = { transformPerspective: 400, transformStyle: 'preserve-3d' }
  // dropdown panels fold open from the top edge
  // (nothing starts invisible, so the panels can never get stuck hidden)
  const panelMotion = reduce
    ? {}
    : {
        initial: { y: -8, rotateX: -35, scale: 0.95 },
        animate: { y: 0, rotateX: 0, scale: 1 },
        transition: { type: 'spring', stiffness: 380, damping: 28 },
      }
  const panelStyle = { transformPerspective: 900, transformOrigin: 'top right' }

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

  // Auto-close center notification after 3 seconds
  useEffect(() => {
    if (centerNotif) {
      const timer = setTimeout(() => setCenterNotif(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [centerNotif])

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.list(),
    refetchInterval: 30000,
  })

  const notifs = notifData?.data?.data || []
  const unread = notifs.filter(n => !n.isRead).length || 0

  useEffect(() => {
    // Only run the logic if we actually have data loaded
    if (notifData) {
      if (prevNotifIds !== null) {
        const newNotifs = notifs.filter(n => !prevNotifIds.has(n.id) && !n.isRead)
        if (newNotifs.length > 0) {
          // Only show the latest 1 notification
          const latest = newNotifs[0]
          
          // Existing yellow toast
          toast.custom((t) => (
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
                onClick={() => toast.dismiss(t.id)}
                className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-yellow-100 transition-colors text-xs font-bold"
                title="Close"
              >
                ✕
              </button>
            </div>
          ), { duration: 8000, position: 'top-right' })

          // Center notification for error/info types
          if (latest.type === 'error' || latest.type === 'info') {
            setCenterNotif(latest)
          }
        }
      }
      setPrevNotifIds(new Set(notifs.map(n => n.id)))
    }
  }, [notifData])

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
    <>
      <motion.header
        className="h-16 bg-background border-b border-border flex items-center justify-between px-4 sm:px-6 shrink-0 sticky top-0 z-30"
      >
        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
          <motion.button 
            onClick={toggleSidebar}
            whileHover={iconHover}
            whileTap={iconTap}
            style={iconStyle}
            className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors focus:outline-none shrink-0"
          >
            <Menu className="w-5 h-5" />
          </motion.button>
          {/* title flips in whenever the page changes */}
          <div style={{ perspective: 600 }} className="min-w-0">
            <motion.h1
              key={title}
              initial={reduce ? false : { rotateX: -40, y: 6 }}
              animate={{ opacity: 1, rotateX: 0, y: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              style={{ transformOrigin: 'bottom center' }}
              className="text-lg sm:text-xl font-semibold text-foreground tracking-tight truncate"
            >
              {title}
            </motion.h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user?.role === 'super_admin' && (
            <motion.button
              onClick={() => navigate('/settings')}
              whileHover={reduce ? undefined : { rotateZ: 90, scale: 1.12 }}
              whileTap={iconTap}
              transition={{ type: 'spring', stiffness: 200, damping: 14 }}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors focus:outline-none"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </motion.button>
          )}

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <motion.button
              onClick={() => setNotifOpen(v => !v)}
              whileHover={iconHover}
              whileTap={iconTap}
              style={iconStyle}
              className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors focus:outline-none"
            >
              {/* bell swings from the top while there are unread items */}
              <motion.span
                className="flex"
                style={{ transformOrigin: 'top center' }}
                animate={unread > 0 && !reduce ? { rotate: [0, 16, -14, 10, -6, 0] } : { rotate: 0 }}
                transition={{ duration: 1.2, repeat: unread > 0 ? Infinity : 0, repeatDelay: 3 }}
              >
                <Bell className="w-5 h-5" />
              </motion.span>
              {unread > 0 && (
                <motion.span
                  key={unread}
                  initial={reduce ? false : { scale: 0.7, rotateY: 90 }}
                  animate={{ scale: 1, rotateY: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center ring-2 ring-background"
                >
                  {!reduce && <span className="absolute inset-0 rounded-full bg-destructive opacity-60 animate-ping" />}
                  <span className="relative">{unread > 9 ? '9+' : unread}</span>
                </motion.span>
              )}
            </motion.button>

            <AnimatePresence>
              {notifOpen && (
                <motion.div
                    {...panelMotion}
                    style={panelStyle}
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
                      {notifs.map((n, i) => {
                        const dotColor = n.type === 'error' || n.message?.toLowerCase().includes('invalid') ? 'bg-orange-500' : 'bg-emerald-500'
                        
                        return (
                          <motion.div
                            key={n.id}
                            initial={reduce ? false : { rotateX: -30, y: -6 }}
                            animate={{ opacity: 1, rotateX: 0, y: 0 }}
                            whileHover={reduce ? undefined : { scale: 1.02, z: 12, rotateX: 2 }}
                            transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.04 }}
                            style={{ transformPerspective: 700, transformOrigin: 'top center' }}
                            className={`p-4 rounded-xl border transition-colors ${n.isRead ? 'bg-background border-transparent hover:bg-muted/50' : 'bg-green-50/50 border-green-100/50'} relative`}
                          >
                            <p className={`text-sm pr-6 leading-relaxed ${n.isRead ? 'text-muted-foreground' : 'text-gray-800 font-medium'}`}>
                              {n.message || n.title}
                            </p>
                            <p className="text-[11px] text-muted-foreground/70 mt-2 font-medium">
                              {n.createdAt ? format(new Date(n.createdAt), 'MMM d, yyyy, h:mm a') : ''}
                            </p>
                            {!n.isRead && <div className={`absolute top-5 right-4 w-2 h-2 rounded-full ${dotColor}`} />}
                          </motion.div>
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
            <motion.button
              onClick={() => setDropOpen(v => !v)}
              whileTap={iconTap}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full hover:bg-accent transition-colors focus:outline-none"
            >
              <motion.div
                whileHover={reduce ? undefined : { rotateY: 360 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                style={{ transformPerspective: 300 }}
                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold uppercase shadow-sm"
              >
                {user?.name?.[0] || 'U'}
              </motion.div>
              <span className="text-sm font-medium text-foreground max-w-[100px] truncate">{user?.name}</span>
              <motion.span animate={{ rotateX: dropOpen ? 180 : 0 }} transition={{ duration: 0.3 }} className="flex" style={{ transformPerspective: 200 }}>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </motion.span>
            </motion.button>

            <AnimatePresence>
              {dropOpen && (
                <motion.div
                    {...panelMotion}
                    style={panelStyle}
                    className="absolute right-0 mt-2 w-56 bg-card rounded-xl shadow-xl border border-border z-20 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-border bg-muted/30">
                      <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">{user?.role}</p>
                    </div>
                    <div className="p-1">
                      <motion.button
                        onClick={handleLogout}
                        whileHover={reduce ? undefined : { x: 4, rotateY: -6 }}
                        style={{ transformPerspective: 500 }}
                        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors focus:outline-none"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </motion.button>
                    </div>
                  </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.header>

      {/* Center Notification Modal */}
      <AnimatePresence>
        {centerNotif && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
            onClick={() => setCenterNotif(null)}
          >
            <motion.div
              initial={{ scale: 0.85, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 30 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full flex flex-col items-center text-center"
            >
              {centerNotif.type === 'error' ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                    <XCircle className="w-10 h-10 text-red-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-red-500 mb-2">Error</h2>
                  <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                    {centerNotif.message || centerNotif.title}
                  </p>
                  <button
                    onClick={() => setCenterNotif(null)}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-full transition-colors"
                  >
                    Close
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-green-500 mb-2">Done</h2>
                  <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                    {centerNotif.message || centerNotif.title}
                  </p>
                  <button
                    onClick={() => setCenterNotif(null)}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-full transition-colors"
                  >
                    Close
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}