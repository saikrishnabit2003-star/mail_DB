/**
 * Admin Campaigns Page
 * 
 * Allows admins to view and manage campaigns for selected employees.
 * Admins can:
 * - Select which employee to manage
 * - View employee's campaigns
 * - Start, pause, resume campaigns on behalf of employee
 * - Detect and consolidate duplicate campaigns
 */

import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { EmployeeSelector } from '../../components/EmployeeSelector'
import { campaignsService } from '../../services/campaigns.service'
import { profilesService } from '../../services/profiles.service'
import Modal from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'

export default function AdminCampaigns() {
  const { user } = useAuth()
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [duplicateMessage, setDuplicateMessage] = useState(null)

  // Check if user is admin
  useEffect(() => {
    if (user?.role !== 'admin') {
      setError('Access denied. Admin only.')
    }
  }, [user])

  // Load campaigns when employee is selected
  useEffect(() => {
    if (selectedEmployee?.id) {
      loadCampaigns()
    }
  }, [selectedEmployee])

  const loadCampaigns = async () => {
    if (!selectedEmployee?.id) return

    try {
      setLoading(true)
      setError(null)
      const res = await campaignsService.list({
        employeeId: selectedEmployee.id,
        pageIndex: 0,
        pageSize: 100,
      })
      setCampaigns(res.data?.data?.data || [])
    } catch (err) {
      setError('Failed to load campaigns')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectEmployee = (employee) => {
    setSelectedEmployee(employee)
    setCampaigns([])
  }

  const handlePauseCampaign = async (campaignId) => {
    if (!selectedEmployee?.id) return
    try {
      await campaignsService.pause(campaignId, selectedEmployee.id)
      setSuccessMessage('Campaign paused')
      await loadCampaigns()
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError('Failed to pause campaign')
      console.error(err)
    }
  }

  const handleResumeCampaign = async (campaignId) => {
    if (!selectedEmployee?.id) return
    try {
      await campaignsService.resume(campaignId, selectedEmployee.id)
      setSuccessMessage('Campaign resumed')
      await loadCampaigns()
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError('Failed to resume campaign')
      console.error(err)
    }
  }

  const handleDetectDuplicates = async (profileId) => {
    try {
      const res = await campaignsService.detectDuplicates(profileId)
      const duplicates = res.data?.data?.campaigns || []
      if (duplicates.length > 1) {
        setDuplicateMessage(
          `Found ${duplicates.length} campaigns for this profile:\n\n` +
          duplicates
            .map((c) => `- ${c.campaignName} (${c.status})`)
            .join('\n') +
          '\n\nUse consolidation endpoint to merge them.'
        )
      } else {
        setDuplicateMessage('No duplicates found')
      }
    } catch (err) {
      setError('Failed to detect duplicates')
      console.error(err)
    }
  }

  if (user?.role !== 'admin') {
    return <div>Access denied</div>
  }

  return (
    <div className="admin-campaigns-page">
      <h1>Admin Campaigns Management</h1>

      <EmployeeSelector
        onSelectEmployee={handleSelectEmployee}
        selectedEmployeeId={selectedEmployee?.id}
      />

      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}

      {error && <div className="error-message">{error}</div>}

      {selectedEmployee && (
        <div className="campaigns-section">
          <h2>
            Campaigns for {selectedEmployee.name}
            {selectedEmployee.branch && ` (${selectedEmployee.branch})`}
          </h2>

          {loading ? (
            <div>Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div>No campaigns found</div>
          ) : (
            <table className="campaigns-table">
              <thead>
                <tr>
                  <th>Campaign Name</th>
                  <th>Status</th>
                  <th>Total Emails</th>
                  <th>Sent</th>
                  <th>Failed</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td>{campaign.campaignName}</td>
                    <td>
                      <span className={`status-badge status-${campaign.status}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td>{campaign.totalEmails}</td>
                    <td>{campaign.sent || 0}</td>
                    <td>{campaign.failed || 0}</td>
                    <td>{new Date(campaign.createdAt).toLocaleDateString()}</td>
                    <td className="action-cells">
                      {campaign.status === 'running' && (
                        <button
                          onClick={() => handlePauseCampaign(campaign.id)}
                          className="btn btn-small btn-warning"
                        >
                          Pause
                        </button>
                      )}
                      {campaign.status === 'paused' && (
                        <button
                          onClick={() => handleResumeCampaign(campaign.id)}
                          className="btn btn-small btn-info"
                        >
                          Resume
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <Modal open={!!duplicateMessage} onClose={() => setDuplicateMessage(null)} title="Duplicate Check Result">
        <div className="space-y-4">
          <p className="text-gray-700 whitespace-pre-wrap">{duplicateMessage}</p>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setDuplicateMessage(null)}>Close</Button>
          </div>
        </div>
      </Modal>

      <style jsx>{`
        .admin-campaigns-page {
          padding: 1rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        h1 {
          margin-bottom: 1.5rem;
          color: #333;
        }

        h2 {
          margin-top: 2rem;
          margin-bottom: 1rem;
          color: #555;
          font-size: 1.3rem;
        }

        .success-message {
          padding: 0.75rem 1rem;
          background-color: #4caf50;
          color: white;
          border-radius: 4px;
          margin-bottom: 1rem;
        }

        .error-message {
          padding: 0.75rem 1rem;
          background-color: #f44336;
          color: white;
          border-radius: 4px;
          margin-bottom: 1rem;
        }

        .campaigns-section {
          background-color: #f9f9f9;
          padding: 1.5rem;
          border-radius: 8px;
          border: 1px solid #ddd;
        }

        .campaigns-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
        }

        .campaigns-table thead {
          background-color: #f5f5f5;
        }

        .campaigns-table th {
          padding: 0.75rem;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #ddd;
        }

        .campaigns-table td {
          padding: 0.75rem;
          border-bottom: 1px solid #ddd;
        }

        .campaigns-table tbody tr:hover {
          background-color: #f5f5f5;
        }

        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .status-pending {
          background-color: #fff3cd;
          color: #856404;
        }

        .status-running {
          background-color: #d1ecf1;
          color: #0c5460;
        }

        .status-paused {
          background-color: #e2e3e5;
          color: #383d41;
        }

        .status-completed {
          background-color: #d4edda;
          color: #155724;
        }

        .status-failed {
          background-color: #f8d7da;
          color: #721c24;
        }

        .action-cells {
          display: flex;
          gap: 0.5rem;
        }

        .btn {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-small {
          padding: 0.35rem 0.75rem;
          font-size: 0.8rem;
        }

        .btn-warning {
          background-color: #ffc107;
          color: #333;
        }

        .btn-warning:hover {
          background-color: #e0a800;
        }

        .btn-info {
          background-color: #17a2b8;
          color: white;
        }

        .btn-info:hover {
          background-color: #138496;
        }
      `}</style>
    </div>
  )
}
