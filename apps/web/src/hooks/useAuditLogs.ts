import { useQuery } from '@tanstack/react-query';
import { getAuditLogs } from '../api/audit';

export const useAuditLogs = (page = 1, limit = 20, action?: string, entityType?: string) => {
  return useQuery({
    queryKey: ['auditLogs', page, limit, action, entityType],
    queryFn: () => getAuditLogs(page, limit, action, entityType),
  });
};
