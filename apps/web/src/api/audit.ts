import type { PaginatedAuditLogResponse } from '@peerspace/shared';

export const getAuditLogs = async (
  page = 1,
  limit = 20,
  action?: string,
  entityType?: string
): Promise<PaginatedAuditLogResponse> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (action) params.append('action', action);
  if (entityType) params.append('entityType', entityType);

  const res = await fetch(`/api/admin/audit-logs?${params}`, {
    credentials: 'include',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || 'Failed to fetch audit logs.');
  }
  return data.data;
};
