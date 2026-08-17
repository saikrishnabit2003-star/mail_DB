import { ChevronUp, ChevronDown } from 'lucide-react'

export default function Table({ columns, data, loading, emptyMsg = 'No data found', wrapperClassName = "overflow-y-auto max-h-[500px] rounded-xl border border-gray-100 bg-white shadow-sm relative" }) {
  return (
    <div className={wrapperClassName}>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-white">
            {columns.map((col, i) => (
              <th 
                key={col.key} 
                style={{ 
                  zIndex: 20 - i, 
                  width: col.width,
                  minWidth: col.minWidth || col.width || (['sno', 'select', 'actions'].includes(col.key) ? '60px' : '150px') 
                }} 
                className="sticky top-0 bg-white px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap shadow-[inset_0_-1px_0_0_#e5e7eb]"
              >
                <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-700">
                  <span>{col.label}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600" />
                  Loading...
                </div>
              </td>
            </tr>
          ) : !data?.length ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">{emptyMsg}</td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={row.id || i} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-gray-700 max-w-[250px] whitespace-normal break-words">
                    {col.render ? col.render(row[col.key], row, i) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
