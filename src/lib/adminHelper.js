/**
 * Admin helper utilities for managing employee context in requests
 */

/**
 * Add employeeId query parameter to request params for admin actions
 * 
 * Usage:
 *   // In admin pages
 *   const params = { pageIndex: 0, pageSize: 10 }
 *   const paramsWithEmployee = addEmployeeParam(params, selectedEmployeeId, isAdmin)
 *   await api.get('/campaigns', { params: paramsWithEmployee })
 * 
 * @param {Object} params - Existing query parameters
 * @param {string} employeeId - Employee ID (required for admins)
 * @param {boolean} isAdmin - Whether current user is admin
 * @returns {Object} Updated params with employeeId if admin
 */
export function addEmployeeParam(params = {}, employeeId, isAdmin) {
  if (!isAdmin) {
    return params
  }
  
  if (!employeeId) {
    console.warn('[Admin] employeeId is required for admin requests but was not provided')
    return params
  }
  
  return {
    ...params,
    employeeId,
  }
}

/**
 * Build query string with employeeId for admin requests
 * 
 * @param {Object} params - Base parameters
 * @param {string} employeeId - Employee ID
 * @returns {string} Query string (e.g., "?employeeId=123&pageIndex=0")
 */
export function buildQueryString(params, employeeId) {
  const searchParams = new URLSearchParams()
  
  if (employeeId) {
    searchParams.append('employeeId', employeeId)
  }
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value)
    }
  }
  
  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

/**
 * Create a context object for admin operations
 * Used to track which employee is being acted upon
 * 
 * @param {Object} user - Current user from auth context
 * @param {string} selectedEmployeeId - Employee ID selected in admin UI
 * @returns {Object} Admin context with isAdmin flag and employeeId
 */
export function getAdminContext(user, selectedEmployeeId) {
  return {
    isAdmin: user?.role === 'admin',
    employeeId: selectedEmployeeId || user?.employeeId,
    currentUserId: user?.userId,
  }
}

/**
 * Show admin acting status in UI
 * Returns a friendly string like "Acting as John Doe"
 * 
 * @param {string} employeeName - Name of employee admin is acting as
 * @param {boolean} isAdmin - Whether user is admin
 * @returns {string} Status message
 */
export function getAdminActingStatus(employeeName, isAdmin) {
  if (!isAdmin || !employeeName) {
    return ''
  }
  return `Acting as ${employeeName}`
}
