import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster, ToastBar, toast } from 'react-hot-toast'
import { X } from 'lucide-react'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import NotificationSoundListener from './components/NotificationSoundListener'
import NotificationBadgeListener from './components/NotificationBadgeListener'
import App from './App'
import './index.css'

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.error('Unable to register the service worker.', error)
    })
  })
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider defaultTheme="system" storageKey="app-ui-theme">
            <>
              <NotificationSoundListener />
              <NotificationBadgeListener />
              <App />
            </>
            <Toaster
              position="top-right"
              containerStyle={{ zIndex: 11000 }}
              toastOptions={{
                duration: 3500,
                style: {
                  borderRadius: '12px',
                  background: '#1e293b',
                  color: '#f8fafc',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                },
                success: { iconTheme: { primary: '#10b981', secondary: '#f8fafc' } },
                error:   { iconTheme: { primary: '#ef4444', secondary: '#f8fafc' } },
              }}
            >
              {(t) => (
                <ToastBar toast={t}>
                  {({ icon, message }) => (
                    <>
                      {icon}
                      {message}
                      {t.type !== 'loading' && (
                        <button
                          onClick={() => toast.dismiss(t.id)}
                          className="ml-2 p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 rounded-full transition-colors flex-shrink-0"
                          aria-label="Close notification"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </ToastBar>
              )}
            </Toaster>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </>
)
