import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import Header from './Header'
import { useState } from 'react'

const titles = {
  '/admin/dashboard': 'Admin Dashboard',
  '/dashboard': 'My Dashboard',
  '/admin/users': 'Users',
  '/admin/employees': 'Employees',
  '/email-master': 'Email Master',
  '/profiles': 'Profiles',
  '/email-accounts': 'Email Accounts',
  '/campaigns': 'Campaigns',
  '/profile-emails': 'Profile Emails',
  '/templates': 'Templates',
  '/notifications': 'Notifications',
}

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const title = titles[pathname] || 'Email Marketing'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/20 selection:text-primary">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)} 
        />
      )}

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        <Header title={title} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        {/* The background pattern for that premium feel */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />

        <main className="flex-1 overflow-y-auto p-6 relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
