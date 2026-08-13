import { useState, useEffect } from 'react'
import { X, ChevronRight } from 'lucide-react'
import Button from './ui/Button'
import Select from './ui/Select'
import Modal from './ui/Modal'

/**
 * Field Mapping Modal - MANUAL MAPPING ONLY
 * User manually maps their file columns to database fields
 * No auto-detection - user has full control
 */
export default function FieldMappingModal({ isOpen, onClose, headers, onConfirm, isLoading, fileName }) {
  const [mapping, setMapping] = useState({})
  const [errorMsg, setErrorMsg] = useState(null)

  // Database fields that can be mapped to
  const dbFields = [
    { value: 'email', label: 'Email (Required)' },
    { value: 'fullName', label: 'Full Name' },
    { value: 'company', label: 'University' },
    { value: 'country', label: 'Country' },
    { value: 'state', label: 'State' },
    { value: 'city', label: 'City' },
    { value: 'domain', label: 'Domain' },
    { value: 'industry', label: 'Industry' },
    { value: 'designation', label: 'Designation' },
    { value: 'phone', label: 'Phone' },
    { value: 'website', label: 'Website' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'citation', label: 'Citation' },
    { value: 'mailSource', label: 'Mail Source' },
    { value: null, label: 'Skip this column' },
  ]

  // Initialize mapping - start with all empty (user must choose)
  useEffect(() => {
    if (headers && headers.length > 0) {
      const emptyMapping = {}
      headers.forEach(header => {
        emptyMapping[header] = null // Start empty - user must map manually
      })
      setMapping(emptyMapping)
    }
  }, [headers])

  const handleMapChange = (header, dbField) => {
    setMapping(prev => ({
      ...prev,
      [header]: dbField
    }))
  }
  const handleConfirm = () => {
    // Validate that email is mapped
    if (!Object.values(mapping).includes('email')) {
      setErrorMsg('Email column is REQUIRED - please map at least one column to "Email"')
      return
    }

    onConfirm(mapping)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Map Your Columns</h2>
            <p className="text-sm text-gray-500 mt-1">
              {fileName && <span className="font-mono text-xs">{fileName}</span>}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mapping Table - MANUAL ONLY */}
        <div className="p-4">
          <div className="space-y-3">
            {headers?.map((header, idx) => (
              <div key={header} className="flex items-center gap-3 p-3 bg-gray-50 rounded border border-gray-200">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm truncate" title={header}>
                    {header}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Column {idx + 1}</div>
                </div>

                <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />

                <Select
                  value={mapping[header] || ''}
                  onChange={(e) => handleMapChange(header, e.target.value || null)}
                  options={dbFields.map(f => ({
                    value: f.value === null ? '' : f.value,
                    label: f.label
                  }))}
                  className="min-w-48 flex-shrink-0"
                />
              </div>
            ))}
          </div>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-yellow-50 rounded border border-yellow-200">
            <h4 className="text-sm font-bold text-yellow-900 mb-2">⚠️ Manual Mapping Required</h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>✓ You must map at least one column to <strong>Email</strong> (required)</li>
              <li>✓ Select the database field for each of your columns</li>
              <li>✓ Use "Skip this column" for columns you don't need</li>
              <li>✓ No auto-detection - you have full control</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t p-4 flex gap-2 justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            isLoading={isLoading}
          >
            Upload with This Mapping
          </Button>
        </div>
      </div>

      <Modal open={!!errorMsg} onClose={() => setErrorMsg(null)} title="Validation Error">
        <div className="space-y-4">
          <p className="text-gray-700">{errorMsg}</p>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setErrorMsg(null)}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
