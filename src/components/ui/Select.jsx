import React, { useState, useRef, useEffect } from 'react'
import clsx from 'clsx'
import { ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Select({ label, error, children, className, value, onChange, disabled, ...props }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const options = []
  const parseChildren = (nodes) => {
    React.Children.forEach(nodes, child => {
      if (!React.isValidElement(child)) return
      if (child.type === 'option') {
        options.push({
          value: child.props.value,
          label: child.props.children,
          disabled: child.props.disabled
        })
      } else if (child.type === React.Fragment) {
        parseChildren(child.props.children)
      } else if (child.props && child.props.children) {
        parseChildren(child.props.children)
      }
    })
  }
  parseChildren(children)

  const selectedOption = options.find(opt => String(opt.value) === String(value)) || options[0]

  const handleSelect = (val) => {
    if (onChange) {
      onChange({ target: { value: val } })
    }
    setIsOpen(false)
  }

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={clsx(
            'w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors outline-none bg-white',
            error
              ? 'border-red-400 focus:border-red-500'
              : 'border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100',
            disabled && 'opacity-60 cursor-not-allowed bg-gray-50',
            className
          )}
        >
          <span className="truncate">{selectedOption ? selectedOption.label : 'Select...'}</span>
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="absolute z-50 min-w-full w-max max-w-[90vw] mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
            >
              <ul className="max-h-56 overflow-y-auto py-1">
                {options.map((opt, i) => (
                  <li
                    key={i}
                    onClick={() => !opt.disabled && handleSelect(opt.value)}
                    className={clsx(
                      'px-3 py-2 text-sm cursor-pointer hover:bg-primary-50 transition-colors whitespace-nowrap',
                      String(opt.value) === String(value) && 'bg-primary-50 text-primary-700 font-medium',
                      opt.disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent text-gray-400'
                    )}
                  >
                    {opt.label}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      
      {/* Hidden native select for form compatibility */}
      <select className="hidden" value={value} disabled={disabled} onChange={() => {}} {...props}>
        {children}
      </select>
    </div>
  )
}
