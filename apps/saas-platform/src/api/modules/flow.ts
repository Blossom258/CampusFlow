// src/api/modules/flow.ts
import { request } from '../request';

export function getProcessList() {
  return request<{ id: string; name: string }[]>({
    url: '/process/list',
    method: 'get',
  });
}