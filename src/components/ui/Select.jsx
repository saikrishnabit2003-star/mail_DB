import clsx from 'clsx'

export default function Select({ label, error, children, className, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
      <select
        className={clsx(
          'w-full px-3 py-2 rounded-lg border text-sm transition-colors outline-none bg-white',
          error
            ? 'border-red-400 focus:border-red-500'
            : 'border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
