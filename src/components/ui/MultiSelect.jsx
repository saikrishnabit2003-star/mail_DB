import { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown, Check } from 'lucide-react'
import clsx from 'clsx'

export default function MultiSelect({
  label,
  value = [],
  onChange,
  options = [],
  placeholder = 'Select…',
  maxHeight = 200,
  disabled = false,
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapRef = useRef(null)
  const searchRef = useRef(null)

  // Close when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Focus search input when opened
  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus()
  }, [open])

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (val) => {
    if (value.includes(val)) {
      onChange(value.filter(v => v !== val))
    } else {
      onChange([...value, val])
    }
  }

  const handleSelectAll = () => {
    onChange(filtered.map(o => o.value))
  }

  const handleClearAll = () => {
    onChange([])
  }

  return (
    <div className="space-y-1.5" ref={wrapRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">{label}</label>
      )}

      {/* Relative container so dropdown anchors to trigger */}
      <div className="relative">
        {/* Trigger */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(prev => !prev)}
          className={clsx(
            'w-full flex items-center justify-between gap-2',
            'px-3 py-2 rounded-lg border text-sm transition-colors outline-none bg-white text-left',
            open
              ? 'border-primary-500 ring-2 ring-primary-100'
              : 'border-gray-300 hover:border-gray-400',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span className={clsx(value.length > 0 ? 'text-gray-900' : 'text-gray-400', 'truncate')}>
            {value.length > 0 ? `${value.length} selected` : placeholder}
          </span>
          <ChevronDown
            className={clsx(
              'w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200',
              open && 'rotate-180'
            )}
          />
        </button>

        {/* Dropdown panel */}
        {open && (
          <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
            {/* Search box */}
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-sm border-none bg-gray-50 rounded-lg focus:ring-0 outline-none"
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex justify-between items-center px-3 py-2 border-b border-gray-100 bg-gray-50 text-xs">
              <button type="button" onClick={handleSelectAll} className="text-primary-600 hover:text-primary-700 font-medium">Select All</button>
              <button type="button" onClick={handleClearAll} className="text-gray-500 hover:text-gray-700 font-medium">Clear All</button>
            </div>

            {/* List */}
            <ul
              className="overflow-y-auto py-1"
              style={{ maxHeight }}
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-sm text-gray-500 text-center">
                  No matches found
                </li>
              ) : (
                filtered.map(o => {
                  const isSelected = value.includes(o.value)
                  return (
                    <li
                      key={o.value}
                      onClick={() => handleSelect(o.value)}
                      className={clsx(
                        'px-3 py-2 text-sm cursor-pointer flex items-center justify-between',
                        isSelected ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      <span className="truncate pr-2">{o.label}</span>
                      {isSelected && (
                        <Check className="w-4 h-4 flex-shrink-0" />
                      )}
                    </li>
                  )
                })
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
