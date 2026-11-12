import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Filter, Search } from 'lucide-react'

function ColumnFilter({ options, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)
  const menuRef = useRef(null)
  const triggerRef = useRef(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const selectedValues = value || []
  const visibleOptions = options.filter(option =>
    option.label.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    if (!isOpen) return

    const handleClick = event => {
      const target = event.target
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setIsOpen(false)
        setSearch('')
      }
    }
    const updatePosition = () => {
      const bounds = triggerRef.current?.getBoundingClientRect()
      if (!bounds) return

      const menuWidth = Math.min(320, window.innerWidth - 16)
      setMenuPosition({
        top: bounds.bottom + 4,
        left: Math.max(8, Math.min(bounds.left, window.innerWidth - menuWidth - 8)),
      })
    }

    document.addEventListener('mousedown', handleClick)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    updatePosition()
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen])

  const toggleOption = optionValue => {
    onChange(
      selectedValues.includes(optionValue)
        ? selectedValues.filter(selectedValue => selectedValue !== optionValue)
        : [...selectedValues, optionValue]
    )
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Filter column"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(open => !open)}
        className={`inline-flex items-center rounded p-0.5 hover:bg-gray-100 ${selectedValues.length ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
      >
        <Filter className="h-3.5 w-3.5" />
      </button>
      {isOpen && createPortal(
        <div
          ref={menuRef}
          className="z-[1000] w-80 max-w-[calc(100vw-16px)] rounded-md border border-gray-200 bg-white p-2 shadow-lg"
          style={{ position: 'fixed', top: menuPosition.top, left: menuPosition.left }}
        >
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search..."
              className="w-full rounded-md border border-gray-200 py-2 pl-8 pr-3 text-sm font-normal text-gray-700 outline-none placeholder:text-gray-400 focus:border-primary-400"
            />
          </div>
          <button
            type="button"
            onClick={() => onChange([])}
            className="w-full px-2 py-1.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            All
          </button>
          <div className="max-h-48 overflow-y-auto">
            {visibleOptions.length ? visibleOptions.map(option => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm font-normal text-gray-700 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option.value)}
                  onChange={() => toggleOption(option.value)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="min-w-0 truncate">{option.label}</span>
              </label>
            )) : (
              <p className="px-2 py-2 text-sm font-normal text-gray-400">No results</p>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

const Table = React.memo(function Table({ columns, data, loading, emptyMsg = 'No data found', wrapperClassName = "overflow-y-auto max-h-[70vh] rounded-xl border border-gray-100 bg-white shadow-sm relative" }) {
  return (
    <div className={wrapperClassName}>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-white">
            {columns.map(col => (
              <th 
                key={col.key} 
                style={{ 
                  zIndex: 20,
                  width: col.width,
                  minWidth: col.minWidth || col.width || (['sno', 'select', 'actions'].includes(col.key) ? '60px' : '150px') 
                }} 
                className="sticky top-0 bg-white px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap shadow-[inset_0_-1px_0_0_#e5e7eb]"
              >
                <div className="flex items-center gap-1.5">
                  <span>{col.label}</span>
                  {col.filterOptions && (
                    <ColumnFilter
                      options={col.filterOptions}
                      value={col.filterValue}
                      onChange={col.onFilterChange}
                    />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600" />
                  Loading...
                </div>
              </td>
            </tr>
          ) : !data?.length ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">{emptyMsg}</td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={row.id || i} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-gray-700 max-w-[250px] whitespace-normal break-words">
                    {col.render ? col.render(row[col.key], row, i) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
})

export default Table
