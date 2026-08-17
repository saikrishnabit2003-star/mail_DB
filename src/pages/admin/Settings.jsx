import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { optionsService } from '../../services/options.service'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import toast from 'react-hot-toast'

export default function Settings() {
  const qc = useQueryClient()
  const [newBranch, setNewBranch] = useState('')
  const [editingIndex, setEditingIndex] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => optionsService.getSettings(),
  })

  const settings = data?.data?.data || []
  const branchSetting = settings.find(s => s.key === 'branch')
  const branches = branchSetting?.values || []

  const updateMut = useMutation({
    mutationFn: ({ id, d }) => optionsService.updateSettings(id, d),
    onSuccess: () => {
      qc.invalidateQueries(['settings'])
      setNewBranch('')
      setEditingIndex(null)
      setDeleteTarget(null)
      toast.success('Branch settings updated')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update settings')
  })

  const handleAdd = (e) => {
    e.preventDefault()
    if (!newBranch.trim() || !branchSetting) return
    const updatedValues = [...branches, newBranch.trim().toUpperCase()]
    updateMut.mutate({ id: branchSetting.id, d: { key: 'branch', values: updatedValues } })
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
      </div>
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 max-w-2xl">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Branch Management</h3>
        
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
              <Button type="submit" disabled={!newBranch.trim() || updateMut.isPending || !branchSetting}>
                <Plus className="w-4 h-4" /> Add
              </Button>
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
                      <tr key={index} className="hover:bg-gray-50/50">
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
                          <div className="flex items-center justify-end gap-1">
                            {editingIndex === index ? (
                              <>
                                <button onClick={() => handleSaveEdit(index)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Save">
                                  <Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => setEditingIndex(null)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Cancel">
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => startEdit(index, branch)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button onClick={() => setDeleteTarget({ index, branch })} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                  <Trash2 className="w-4 h-4" />
                                </button>
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
            
            {!branchSetting && !isLoading && (
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                Warning: Branch settings key not found in the database. Please ensure it is seeded.
              </p>
            )}
          </div>
        )}
      </div>

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
