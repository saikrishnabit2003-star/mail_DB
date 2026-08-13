import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Users, Mail, Briefcase,
  Send, FileText, Settings, Database, ListChecks,
  ChevronRight, Zap
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '../ui/Button'

const adminNav = [
  { to: '/admin/dashboard',   label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/admin/users',       label: 'Users',           icon: Users },
  { to: '/email-master',      label: 'Email Master',    icon: Database },
  { to: '/profiles',          label: 'Profiles',        icon: Briefcase },
  { to: '/email-accounts',    label: 'Email Accounts',  icon: Mail },
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

export default function Sidebar() {
  const { user } = useAuth()
  // super_admin gets the same nav as admin
  const nav = ['admin', 'super_admin'].includes(user?.role) ? adminNav : employeeNav
  const roleLabel = user?.role === 'super_admin' ? 'Super Admin' : user?.role

  return (
    <aside className="w-64 min-h-screen bg-card border-r border-border flex flex-col shrink-0 relative z-40 transition-colors">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="bg-primary rounded-lg p-2 shadow-sm">
          <Zap className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <p className="font-bold text-sm leading-tight text-foreground tracking-tight">MailEngine</p>
          <p className="text-xs text-muted-foreground capitalize font-medium">{roleLabel}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
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
                    className="absolute inset-0 bg-primary rounded-lg shadow-sm -z-10"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <Icon className="w-4 h-4 shrink-0 relative z-10" />
                <span className="flex-1 relative z-10">{label}</span>
                <ChevronRight className={cn("w-3 h-3 transition-opacity relative z-10", isActive ? "opacity-100 text-primary-foreground/70" : "opacity-0 group-hover:opacity-60")} />
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User chip */}
      <div className="px-4 py-4 border-t border-border bg-muted/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground uppercase shadow-sm">
            {user?.name?.[0] || 'U'}
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
