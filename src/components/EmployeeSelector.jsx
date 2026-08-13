/**
 * EmployeeSelector Component
 * 
 * Used by admin pages to select which employee to act as.
 * Shows a dropdown of all employees and displays "Acting as [Name]" status.
 */

import { useEffect, useState } from 'react'
import { employeesService } from '../services/employees.service'

export function EmployeeSelector({ 
  onSelectEmployee, 
  selectedEmployeeId = null,
  className = ''
}) {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedEmployee, setSelectedEmployee] = useState(null)

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await employeesService.list()
      const emps = res.data?.data || []
      setEmployees(emps)

      // If selectedEmployeeId is provided, find and select it
      if (selectedEmployeeId) {
        const selected = emps.find(e => e.id === selectedEmployeeId)
        if (selected) {
          setSelectedEmployee(selected)
        }
      }
    } catch (err) {
      setError('Failed to load employees')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const empId = e.target.value
    if (!empId) {
      setSelectedEmployee(null)
      onSelectEmployee?.(null)
      return
    }

    const selected = employees.find(e => e.id === empId)
    setSelectedEmployee(selected)
    onSelectEmployee?.(selected)
  }

  return (
    <div className={`employee-selector ${className}`}>
      <div className="selector-wrapper">
        <label htmlFor="employee-select" className="selector-label">
          Select Employee:
        </label>
        <select
          id="employee-select"
          value={selectedEmployee?.id || ''}
          onChange={handleChange}
          disabled={loading}
          className="selector-input"
        >
          <option value="">-- Choose an employee --</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>
              {emp.name} ({emp.email})
            </option>
          ))}
        </select>

        {error && <div className="selector-error">{error}</div>}

        {selectedEmployee && (
          <div className="selector-status">
            Acting as <strong>{selectedEmployee.name}</strong>
            {selectedEmployee.branch && ` (${selectedEmployee.branch})`}
          </div>
        )}
      </div>

      <style jsx>{`
        .employee-selector {
          margin-bottom: 1rem;
        }

        .selector-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .selector-label {
          font-weight: 600;
          font-size: 0.9rem;
          color: #333;
        }

        .selector-input {
          padding: 0.5rem 0.75rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 0.9rem;
          background-color: #fff;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .selector-input:hover:not(:disabled) {
          border-color: #999;
        }

        .selector-input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .selector-input:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .selector-error {
          color: #d32f2f;
          font-size: 0.85rem;
          margin-top: 0.25rem;
        }

        .selector-status {
          padding: 0.5rem 0.75rem;
          background-color: #e3f2fd;
          border-left: 3px solid #2196f3;
          border-radius: 2px;
          font-size: 0.9rem;
          color: #1565c0;
        }
      `}</style>
    </div>
  )
}
