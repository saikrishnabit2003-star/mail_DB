import { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown, Check } from 'lucide-react'
import clsx from 'clsx'

/**
 * SearchableSelect – a fully custom dropdown that:
 *  - shows a search box at the top of the list
 *  - scrolls the option list when it exceeds maxHeight
 *  - matches the same label/wrapper API as the existing Select component
 *
 * Props
 *  label        – string, rendered above the trigger
 *  value        – currently selected value
 *  onChange     – (value: string) => void
 *  options      – [{ label, value }]
 *  placeholder  – text shown when nothing is selected
 *  maxHeight    – px height before the list scrolls (default 200)
 *  disabled     – boolean
 */
export default function SearchableSelect({
  label,
  value,
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

  const selected = options.find(o => o.value === value)

  const handleSelect = (val) => {
    onChange(val)
    setOpen(false)
    setSearch('')
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
          <span className={clsx(selected ? 'text-gray-900' : 'text-gray-400', 'truncate')}>
            {selected ? selected.label : placeholder}
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
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full pl-7 pr-3 py-1.5 text-xs rounded-md border border-gray-200 focus:outline-none focus:border-primary-400 bg-gray-50"
                />
              </div>
            </div>

            {/* Options list – scrolls after maxHeight */}
            <ul
              className="overflow-y-auto overscroll-contain py-1"
              style={{ maxHeight: `${maxHeight}px` }}
            >
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-xs text-gray-400 text-center">No results</li>
              ) : (
                filtered.map(o => (
                  <li
                    key={o.value}
                    onClick={() => handleSelect(o.value)}
                    className={clsx(
                      'flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors',
                      o.value === value
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <span className="truncate">{o.label}</span>
                    {o.value === value && <Check className="w-3.5 h-3.5 flex-shrink-0 text-primary-600" />}
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
