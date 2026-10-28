import { useState, useRef, useEffect, useLayoutEffect } from 'react'
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
  const [openUp, setOpenUp] = useState(false)
  const wrapRef = useRef(null)
  const triggerRef = useRef(null)
  const dropdownRef = useRef(null)
  const searchRef = useRef(null)
  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  )

  useLayoutEffect(() => {
    if (!open) return

    const updatePlacement = () => {
      const trigger = triggerRef.current
      const dropdown = dropdownRef.current
      if (!trigger || !dropdown) return

      let topBoundary = 0
      let bottomBoundary = window.innerHeight
      let ancestor = trigger.parentElement
      while (ancestor && ancestor !== document.body) {
        const { overflowY } = window.getComputedStyle(ancestor)
        if (overflowY === 'auto' || overflowY === 'scroll') {
          const bounds = ancestor.getBoundingClientRect()
          topBoundary = bounds.top + ancestor.clientTop
          bottomBoundary = topBoundary + ancestor.clientHeight
          break
        }
        ancestor = ancestor.parentElement
      }

      const triggerBounds = trigger.getBoundingClientRect()
      const dropdownHeight = dropdown.offsetHeight
      const spaceBelow = bottomBoundary - triggerBounds.bottom
      const spaceAbove = triggerBounds.top - topBoundary
      setOpenUp(spaceBelow < dropdownHeight && spaceAbove > spaceBelow)
    }

    updatePlacement()
    window.addEventListener('resize', updatePlacement)
    window.addEventListener('scroll', updatePlacement, true)
    return () => {
      window.removeEventListener('resize', updatePlacement)
      window.removeEventListener('scroll', updatePlacement, true)
    }
  }, [open, filtered.length])

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
          ref={triggerRef}
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
          <div
            ref={dropdownRef}
            className={clsx(
              'absolute left-0 z-50 flex w-full min-w-0 max-w-full max-h-[min(240px,60vh)] flex-col bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden',
              openUp ? 'bottom-full mb-1' : 'top-full mt-1'
            )}
          >
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
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1"
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
                    <span className="min-w-0 truncate pr-4">{o.label}</span>
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
