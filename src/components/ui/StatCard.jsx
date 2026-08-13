import { motion } from 'framer-motion'
import { cn } from './Button'

export default function StatCard({ label, value, icon: Icon, color = 'blue', variant = 'outline', sub, onDoubleClick }) {
  const styles = {
    purple: {
      solid: 'bg-[#f4ebff] border-transparent',
      outline: 'bg-white border-gray-100',
      iconBg: 'bg-[#e9d5ff]',
      iconText: 'text-[#9333ea]',
      valueText: 'text-[#a855f7]',
    },
    blue: {
      solid: 'bg-[#eff6ff] border-transparent',
      outline: 'bg-white border-gray-100',
      iconBg: 'bg-[#dbeafe]',
      iconText: 'text-[#3b82f6]',
      valueText: 'text-[#3b82f6]',
    },
    yellow: {
      solid: 'bg-[#fffbeb] border-transparent',
      outline: 'bg-white border-gray-100',
      iconBg: 'bg-[#fef3c7]',
      iconText: 'text-[#f59e0b]',
      valueText: 'text-[#f59e0b]',
    },
    green: {
      solid: 'bg-[#ecfdf5] border-transparent',
      outline: 'bg-white border-gray-100',
      iconBg: 'bg-[#d1fae5]',
      iconText: 'text-[#10b981]',
      valueText: 'text-[#10b981]',
    },
    cyan: {
      solid: 'bg-[#ecfeff] border-transparent',
      outline: 'bg-white border-gray-100',
      iconBg: 'bg-[#cffafe]',
      iconText: 'text-[#06b6d4]',
      valueText: 'text-[#06b6d4]',
    },
    pink: {
      solid: 'bg-[#fdf2f8] border-transparent',
      outline: 'bg-white border-gray-100',
      iconBg: 'bg-[#fce7f3]',
      iconText: 'text-[#ec4899]',
      valueText: 'text-[#f43f5e]',
    },
    gray: {
      solid: 'bg-gray-50 border-transparent',
      outline: 'bg-white border-gray-100',
      iconBg: 'bg-gray-100',
      iconText: 'text-gray-500',
      valueText: 'text-gray-700',
    }
  }

  const s = styles[color] || styles.blue

  return (
    <motion.div 
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn(
        "rounded-2xl border p-5 flex flex-col items-start shadow-sm transition-shadow relative overflow-hidden group",
        s[variant],
        onDoubleClick && 'cursor-pointer'
      )}
      onDoubleClick={onDoubleClick}
    >
      <div className={cn('p-2.5 rounded-xl mb-4', s.iconBg, s.iconText)}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>
      <p className={cn("text-4xl font-bold mb-1 tracking-tight", s.valueText)}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 font-medium">{sub}</p>}
    </motion.div>
  )
}
