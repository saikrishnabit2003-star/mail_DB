import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Users, Mail, Briefcase,
  Send, FileText, Settings, Database, ListChecks,
  ChevronRight, Zap, MessageSquare, X
} from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '../ui/Button'

const adminNav = [
  { to: '/admin/dashboard',   label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/admin/users',       label: 'Users',           icon: Users },
  { to: '/email-master',      label: 'Email Master',    icon: Database },
  { to: '/profiles',          label: 'Profiles',        icon: Briefcase },
  { to: '/email-accounts',    label: 'App Password',  icon: Mail },
  { to: '/campaigns',         label: 'Campaigns',       icon: Send },
  { to: '/profile-emails',    label: 'Profile Emails',  icon: ListChecks },
]

const employeeNav = [
  { to: '/dashboard',         label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/email-master',      label: 'Email Master',    icon: Database },
  { to: '/profiles',          label: 'Profiles',        icon: Briefcase },
  { to: '/campaigns',         label: 'Campaigns',       icon: Send },
  { to: '/profile-emails',    label: 'Profile Emails',  icon: ListChecks },
]

// 3D hover states shared by every nav row (parent variant -> icon variant)
const rowVariants = {
  rest: { rotateX: 0, rotateY: 0, x: 0, z: 0 },
  hover: { rotateX: 2, rotateY: -5, x: 2, z: 9 },
}
const iconVariants = {
  rest: { rotateY: 0, scale: 1 },
  hover: { rotateY: 360, scale: 1, transition: { duration: 1, ease: 'easeInOut' } },
}

export default function Sidebar({ isOpen, setIsOpen }) {
  const { user } = useAuth()
  const reduce = useReducedMotion()
  
  let nav = employeeNav
  if (['admin', 'super_admin'].includes(user?.role)) {
    const isFullAdmin = user?.role === 'super_admin' || (user?.role === 'admin' && user?.accessLevel === 'full')
    nav = adminNav.filter(item => {
      if (item.to === '/email-accounts') return isFullAdmin
      return true
    })
  }
  
  const roleLabel = user?.role === 'super_admin' ? 'Super Admin' : user?.role

  return (
    <aside className={cn(
      "w-64 h-full bg-card border-r border-border flex flex-col shrink-0 fixed lg:relative z-40 transition-transform duration-300 ease-in-out",
      isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border">
        <div className="flex items-center gap-3">
          {/* 3D swinging logo cube */}
          <div style={{ perspective: 300 }} className="relative">
            <div className="absolute inset-0 rounded-lg bg-primary/40 blur-md" />
            <motion.div
              className="relative bg-primary rounded-lg p-2 shadow-lg"
              style={{ transformStyle: 'preserve-3d' }}
              animate={reduce ? {} : { rotateY: [-25, 25, -25], rotateX: [8, -8, 8] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Zap className="w-5 h-5 text-primary-foreground" />
            </motion.div>
          </div>
          <div>
            <p className="font-bold text-sm leading-tight text-foreground tracking-tight">MailEngine</p>
            <p className="text-xs text-muted-foreground capitalize font-medium">{roleLabel}</p>
          </div>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="lg:hidden p-1 text-muted-foreground hover:bg-muted rounded-md"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(({ to, label, icon: Icon }, i) => (
          // perspective lives on the wrapper so each row tilts in its own 3D space
          <div key={to} style={{ perspective: 600 }}>
            <motion.div
              variants={rowVariants}
              initial="rest"
              animate="rest"
              whileHover={reduce ? undefined : 'hover'}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              style={{ transformStyle: 'preserve-3d', transformOrigin: 'left center' }}
            >
              <NavLink
                to={to}
                onClick={() => setIsOpen && setIsOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group focus:outline-none',
                    isActive
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 bg-primary rounded-lg shadow-lg shadow-primary/40 -z-10"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                    {/* icon spins on hover, floats gently when active */}
                    <motion.span
                      variants={iconVariants}
                      className="relative z-10 flex shrink-0"
                      style={{ transformStyle: 'preserve-3d' }}
                    >
                      <motion.span
                        className="flex"
                        animate={isActive && !reduce ? { y: [0, -2, 0] } : { y: 0 }}
                        transition={{ duration: 2, repeat: isActive ? Infinity : 0, ease: 'easeInOut' }}
                      >
                        <Icon className="w-4 h-4" />
                      </motion.span>
                    </motion.span>
                    <span className="flex-1 relative z-10">{label}</span>
                    <ChevronRight className={cn("w-3 h-3 transition-all relative z-10", isActive ? "opacity-100 text-primary-foreground/70" : "opacity-0 group-hover:opacity-60 group-hover:translate-x-0.5")} />
                  </>
                )}
              </NavLink>
            </motion.div>
          </div>
        ))}
      </nav>

      {/* User chip */}
      <div className="px-4 py-4 border-t border-border bg-muted/10">
        <div className="flex items-center gap-3">
          <div style={{ perspective: 200 }} className="relative">
            <motion.div
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground uppercase shadow-md cursor-default"
              style={{ transformStyle: 'preserve-3d' }}
              whileHover={reduce ? undefined : { rotateY: 360, scale: 1.1 }}
              transition={{ duration: 0.3, ease: 'easeIn' }}
            >
              {user?.name?.[0] || 'U'}
            </motion.div>
            {/* online dot */}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              {!reduce && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />}
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full border border-card bg-emerald-500" />
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}