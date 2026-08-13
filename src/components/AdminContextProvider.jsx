/**
 * AdminContextProvider Component
 * 
 * Wraps admin pages to provide employee selection context.
 * Manages which employee the admin is currently acting as.
 */

import { createContext, useContext, useState } from 'react'
import { EmployeeSelector } from './EmployeeSelector'

const AdminContext = createContext(null)

export function AdminContextProvider({ children, showSelector = true }) {
  const [selectedEmployee, setSelectedEmployee] = useState(null)

  const handleSelectEmployee = (employee) => {
    setSelectedEmployee(employee)
  }

  return (
    <AdminContext.Provider value={{ selectedEmployee }}>
      <div className="admin-context-provider">
        {showSelector && (
          <EmployeeSelector
            onSelectEmployee={handleSelectEmployee}
            selectedEmployeeId={selectedEmployee?.id}
            className="admin-header-selector"
          />
        )}
        {children}
      </div>
    </AdminContext.Provider>
  )
}

/**
 * Hook to access admin context in child components
 */
export function useAdminContext() {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdminContext must be used within AdminContextProvider')
  }
  return context
}

/**
 * HOC to inject admin context into a component
 */
export function withAdminContext(Component) {
  return function AdminContextComponent(props) {
    return (
      <AdminContextProvider showSelector={true}>
        <Component {...props} />
      </AdminContextProvider>
    )
  }
}
