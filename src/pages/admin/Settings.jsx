import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { optionsService } from '../../services/options.service'
import { emailMasterService } from '../../services/emailMaster.service'
import { Plus, Pencil, Trash2, Check, X, RefreshCw, Building2, Clock, Database } from 'lucide-react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import toast from 'react-hot-toast'
import { motion, useReducedMotion } from 'framer-motion'

// ---- visual-only helpers (nothing starts invisible, so nothing can get stuck hidden) ----
const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}
const cardVariants = {
  hidden: { y: 24, rotateX: -15, transformPerspective: 1000 },
  show: { y: 0, rotateX: 0, transformPerspective: 1000, transition: { type: 'spring', stiffness: 260, damping: 24 } },
}

// card shell: gradient icon tile + title, soft lift on hover (no tilt, so inputs stay sharp)
const SettingCard = ({ icon: Icon, gradient, title, children, className }) => {
  const reduce = useReducedMotion()
  return (
    <motion.div variants={cardVariants} className={className}>
      <motion.div
        whileHover={reduce ? undefined : { y: -4 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-lg shadow-blue-900/5 hover:shadow-xl hover:shadow-blue-900/15 border border-slate-200/80 transition-shadow"
      >
        <div className={`pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-gradient-to-br ${gradient} opacity-10`} />
        <div className="relative mb-4 flex items-center gap-3">
          <motion.div
            animate={reduce ? {} : { y: [0, -3, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className={`inline-flex rounded-xl bg-gradient-to-br p-2.5 text-white shadow-lg ${gradient}`}
          >
            <Icon className="w-5 h-5" />
          </motion.div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="relative">{children}</div>
      </motion.div>
    </motion.div>
  )
}

export default function Settings() {
  const qc = useQueryClient()
  const reduce = useReducedMotion()
  const [newBranch, setNewBranch] = useState('')
  const [editingIndex, setEditingIndex] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const [cooldownValue, setCooldownValue] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => optionsService.getSettings(),
  })

  const settings = data?.data?.data || []
  
  const branchSetting = settings.find(s => s.key === 'branch')
  const branches = branchSetting?.values || []
  
  const cooldownSetting = settings.find(s => s.key === 'used_email_cooldown_days')

  useEffect(() => {
    if (cooldownSetting && cooldownSetting.values && cooldownSetting.values.length > 0) {
      setCooldownValue(cooldownSetting.values[0])
    }
  }, [cooldownSetting])

  const updateMut = useMutation({
    mutationFn: ({ id, d }) => optionsService.updateSettings(id, d),
    onSuccess: () => {
      qc.invalidateQueries(['settings'])
      setNewBranch('')
      setEditingIndex(null)
      setDeleteTarget(null)
      toast.success('Settings updated')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update settings')
  })

  const createMut = useMutation({
    mutationFn: (d) => optionsService.createSettings(d),
    onSuccess: () => {
      qc.invalidateQueries(['settings'])
      setNewBranch('')
      toast.success('Settings created')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to create settings')
  })

  const rebuildDropdownsMut = useMutation({
    mutationFn: () => emailMasterService.rebuildDropdowns(),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['email-master-options'] })
      toast.success(response.data?.message || 'Dropdowns refreshed')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to refresh dropdowns')
  })

  const handleAdd = (e) => {
    e.preventDefault()
    if (!newBranch.trim()) return
    const updatedValues = [...branches, newBranch.trim().toUpperCase()]
    
    if (!branchSetting) {
      createMut.mutate({ key: 'branch', values: updatedValues })
    } else {
      updateMut.mutate({ id: branchSetting.id, d: { key: 'branch', values: updatedValues } })
    }
  }

  const confirmDelete = () => {
    if (!branchSetting || deleteTarget === null) return
    const updatedValues = branches.filter((_, i) => i !== deleteTarget.index)
    updateMut.mutate({ id: branchSetting.id, d: { key: 'branch', values: updatedValues } })
  }

  const handleSaveEdit = (index) => {
    if (!editValue.trim() || !branchSetting) return
    const updatedValues = [...branches]
    updatedValues[index] = editValue.trim().toUpperCase()
    updateMut.mutate({ id: branchSetting.id, d: { key: 'branch', values: updatedValues } })
  }

  const startEdit = (index, value) => {
    setEditingIndex(index)
    setEditValue(value)
  }

  const handleSaveCooldown = (e) => {
    e.preventDefault()
    if (!cooldownValue.toString().trim()) return
    const updatedValues = [cooldownValue.toString().trim()]
    
    if (!cooldownSetting) {
      createMut.mutate({ key: 'used_email_cooldown_days', values: updatedValues })
    } else {
      updateMut.mutate({ id: cooldownSetting.id, d: { key: 'used_email_cooldown_days', values: updatedValues } })
    }
  }

  // small icon buttons turn in 3D on hover
  const actionHover = reduce ? undefined : { scale: 1.2, rotateY: 25, rotateX: -10 }
  const btnHover = reduce ? {} : { whileHover: { y: -3, rotateX: 8, scale: 1.04 }, style: { transformPerspective: 600 } }

  return (
    <div className="relative space-y-6 rounded-3xl border border-white/60 bg-gradient-to-br from-sky-100 via-indigo-100/70 to-cyan-100 p-5 shadow-inner">
      {/* soft light orbs */}
      <motion.div animate={reduce ? {} : { x: [0, -20, 0], y: [0, 15, 0] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} className="pointer-events-none absolute right-10 top-4 h-64 w-64 rounded-full bg-white/50 blur-3xl" />
      <motion.div animate={reduce ? {} : { x: [0, 20, 0], y: [0, -15, 0] }} transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }} className="pointer-events-none absolute bottom-6 left-10 h-56 w-56 rounded-full bg-violet-200/40 blur-3xl" />

      <div className="relative flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
      </div>
      
      <motion.div variants={gridVariants} initial="hidden" animate="show" className="relative grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Branch Management */}
        <SettingCard icon={Building2} gradient="from-blue-400 to-indigo-500" title="Branch Management">
          {isLoading ? (
            <p className="text-gray-500">Loading settings...</p>
          ) : (
            <div className="space-y-6">
              <form onSubmit={handleAdd} className="flex items-end gap-3">
                <div className="flex-1">
                  <Input 
                    label="Add New Branch" 
                    value={newBranch} 
                    onChange={e => setNewBranch(e.target.value)} 
                    placeholder="e.g., VELLORE" 
                  />
                </div>
                <motion.div {...btnHover}>
                  <Button type="submit" >
                    <Plus className="w-4 h-4" /> Add
                  </Button>
                </motion.div>
              </form>

              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 font-medium">
                    <tr>
                      <th className="px-4 py-3">Branch Name</th>
                      <th className="px-4 py-3 text-right w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {branches.length === 0 ? (
                      <tr>
                        <td colSpan="2" className="px-4 py-4 text-center text-gray-500">No branches found</td>
                      </tr>
                    ) : (
                      branches.map((branch, index) => (
                        <tr key={index} className="hover:bg-sky-50/60 transition-colors">
                          <td className="px-4 py-3">
                            {editingIndex === index ? (
                              <input 
                                autoFocus
                                type="text" 
                                className="w-full border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                value={editValue} 
                                onChange={e => setEditValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSaveEdit(index)
                                  if (e.key === 'Escape') setEditingIndex(null)
                                }}
                              />
                            ) : (
                              <span className="text-gray-700 font-medium">{branch}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1" style={{ perspective: 300 }}>
                              {editingIndex === index ? (
                                <>
                                  <motion.button whileHover={actionHover} onClick={() => handleSaveEdit(index)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Save">
                                    <Check className="w-4 h-4" />
                                  </motion.button>
                                  <motion.button whileHover={actionHover} onClick={() => setEditingIndex(null)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Cancel">
                                    <X className="w-4 h-4" />
                                  </motion.button>
                                </>
                              ) : (
                                <>
                                  <motion.button whileHover={actionHover} onClick={() => startEdit(index, branch)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                    <Pencil className="w-4 h-4" />
                                  </motion.button>
                                  <motion.button whileHover={actionHover} onClick={() => setDeleteTarget({ index, branch })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                    <Trash2 className="w-4 h-4" />
                                  </motion.button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </SettingCard>

        <div className="space-y-6">
          {/* Dropdown Refresh */}
          <SettingCard icon={Database} gradient="from-emerald-400 to-teal-500" title="Dropdown Options">
            <p className="text-sm text-gray-500 mb-4">Rebuild the dropdown options used in Email Master filters.</p>
            <motion.div {...btnHover} className="inline-block">
              <Button
                onClick={() => rebuildDropdownsMut.mutate()}
                loading={rebuildDropdownsMut.isPending}
                disabled={rebuildDropdownsMut.isPending}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Dropdowns
              </Button>
            </motion.div>
          </SettingCard>

          {/* Cooldown Days Management */}
          <SettingCard icon={Clock} gradient="from-amber-400 to-orange-500" title="Cooldown Days">
            {isLoading ? (
              <p className="text-gray-500">Loading settings...</p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">Set the global cooldown period (in days) before an email can be contacted again.</p>
                <form onSubmit={handleSaveCooldown} className="flex items-end gap-3">
                  <div className="flex-1">
                    <Input 
                      label="Cooldown Days" 
                      type="number"
                      value={cooldownValue} 
                      onChange={e => setCooldownValue(e.target.value)} 
                      placeholder="e.g., 20" 
                      min={2}
                      max={60}
                      required
                    />
                  </div>
                  <motion.div {...btnHover}>
                    <Button type="submit" loading={updateMut.isPending || createMut.isPending}>
                      <Check className="w-4 h-4 mr-2" /> Save
                    </Button>
                  </motion.div>
                </form>
              </div>
            )}
          </SettingCard>
        </div>
      </motion.div>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Confirm Delete">
        <div className="space-y-4">
          <p className="text-gray-700">Are you sure you want to delete the branch <strong>{deleteTarget?.branch}</strong>?</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white border-transparent" onClick={confirmDelete} loading={updateMut.isPending}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}