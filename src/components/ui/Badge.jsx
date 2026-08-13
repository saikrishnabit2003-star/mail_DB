import clsx from 'clsx'

const variants = {
  running:   'bg-green-100 text-green-700',
  paused:    'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  failed:    'bg-red-100 text-red-700',
  pending:   'bg-gray-100 text-gray-600',
  active:    'bg-green-100 text-green-700',
  inactive:  'bg-red-100 text-red-700',
  admin:     'bg-purple-100 text-purple-700',
  employee:  'bg-blue-100 text-blue-700',
  sent:      'bg-green-100 text-green-700',
  skipped:   'bg-gray-100 text-gray-600',
  sending:   'bg-yellow-100 text-yellow-700',
}

export default function Badge({ label }) {
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', variants[String(label)?.toLowerCase()] || 'bg-gray-100 text-gray-600')}>
      {label}
    </span>
  )
}
