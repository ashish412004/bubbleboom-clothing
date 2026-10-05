import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { MOCK_AUDIT_LOGS } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

export default async function AdminAuditLogsPage() {
  let logsList: any[] = MOCK_AUDIT_LOGS

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createServiceClient()
      const { data: logs } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (logs && logs.length > 0) {
        logsList = logs
      }
    } catch {
      // Fallback
    }
  }

  const logs = logsList

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight">System Audit Trail</h1>
        <p className="text-xs text-neutral-600 font-mono mt-1">
          Immutable event log tracking administrative adjustments, fulfillment changes, and price edits.
        </p>
      </div>

      <div className="border border-black bg-white">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[650px] text-left text-xs font-mono">
            <thead>
              <tr className="border-b-2 border-black bg-neutral-100 uppercase">
                <th className="p-3">Timestamp</th>
                <th className="p-3">Admin ID</th>
                <th className="p-3">Action</th>
                <th className="p-3">Entity Target</th>
                <th className="p-3">Metadata Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {logs && logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50">
                    <td className="p-3 text-neutral-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 font-bold">
                      {log.admin_id ? `${String(log.admin_id).slice(0, 8)}...` : 'SYSTEM'}
                    </td>
                    <td className="p-3">
                      <span className="bg-black text-white text-[10px] uppercase px-2 py-0.5 font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-neutral-700">
                      {log.entity || log.entity_type || '—'} {log.entity_id ? `(#${String(log.entity_id).slice(0, 8)})` : ''}
                    </td>
                    <td className="p-3 text-neutral-600 max-w-xs truncate">
                      {JSON.stringify(log.metadata || log.details || {})}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-neutral-500 font-mono">
                    No administrative audit actions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
