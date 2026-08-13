import { motion } from 'framer-motion'
import clsx from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...classes) {
  return twMerge(clsx(classes))
}

export default function Button({ children, variant = 'primary', size = 'md', className, loading, ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
  const variants = {
    primary:   'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
    danger:    'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
    ghost:     'hover:bg-accent hover:text-accent-foreground',
    outline:   'border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-sm',
  }
  const sizes = { sm: 'h-8 px-3 text-xs', md: 'h-10 px-4 py-2 text-sm', lg: 'h-12 px-8 py-2.5 text-base' }

  return (
    <motion.button 
      whileTap={(!loading && !props.disabled) ? { scale: 0.95 } : {}}
      className={cn(base, variants[variant], sizes[size], className)} 
      disabled={loading || props.disabled} 
      {...props}
    >
      {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />}
      {children}
    </motion.button>
  )
}
