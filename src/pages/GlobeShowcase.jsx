import { lazy, Suspense, useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2, Globe2, Send } from 'lucide-react'

// Three.js stays out of the main bundle until this component actually mounts
const GlobeScene = lazy(() => import('./GlobeScene'))

const FEED = [
  'Welcome sequence delivered · Mumbai',
  'Product update delivered · London',
  'Invoice reminder delivered · New York',
  'Onboarding email delivered · Singapore',
  'Newsletter delivered · Sydney',
  'Re-engagement email delivered · São Paulo',
  'Order receipt delivered · Tokyo',
]

export default function GlobeShowcase() {
  const reduce = useReducedMotion()
  const [count, setCount] = useState(128431)
  const [i, setI] = useState(0)

  // live counter + rotating "delivered" feed
  useEffect(() => {
    if (reduce) return
    const a = setInterval(() => setCount(c => c + 1 + Math.floor(Math.random() * 4)), 700)
    const b = setInterval(() => setI(n => (n + 1) % FEED.length), 2200)
    return () => { clearInterval(a); clearInterval(b) }
  }, [reduce])

  return (
    <div className="relative w-full max-w-[560px]">
      <div className="relative h-[440px] w-full">
        <Suspense
          fallback={
            <div className="grid h-full place-items-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </div>
          }
        >
          <GlobeScene reduceMotion={!!reduce} />
        </Suspense>

        {/* floating glass chip: current delivery */}
        <div className="pointer-events-none absolute left-0 top-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-3.5 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-md"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              {FEED[i]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* stats bar */}
      <div className="mt-2 grid grid-cols-3 divide-x divide-white/25 rounded-2xl border border-white/30 bg-white/10 py-3 text-center text-white backdrop-blur-md">
        <div>
          <p className="flex items-center justify-center gap-1.5 text-xl font-bold tabular-nums">
            <Send className="h-4 w-4 text-white/70" />
            {count.toLocaleString()}
          </p>
          <p className="text-[11px] text-white/70">Emails delivered</p>
        </div>
        <div>
          <p className="text-xl font-bold">99.2%</p>
          <p className="text-[11px] text-white/70">Inbox rate</p>
        </div>
        <div>
          <p className="flex items-center justify-center gap-1.5 text-xl font-bold">
            <Globe2 className="h-4 w-4 text-white/70" />8
          </p>
          <p className="text-[11px] text-white/70">Regions live</p>
        </div>
      </div>
    </div>
  )
}