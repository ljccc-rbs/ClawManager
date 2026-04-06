import axios from 'axios';

const agentSecurityApi = axios.create({
  baseURL: '/api/agent-security',
  headers: { 'Content-Type': 'application/json' },
});

export interface ModuleState {
  key: string;
  enabled: boolean;
  policyLabel: string;
  selectedPolicies: string[];
}

export interface SysLog {
  id: number;
  type: string;
  level: string;
  title: string;
  description: string;
  time: string;
  result: string;
}

export async function fetchModules(): Promise<ModuleState[]> {
  const { data } = await agentSecurityApi.get<ModuleState[]>('/modules');
  return data;
}

export async function updateModule(key: string, body: { enabled?: boolean; policy_label?: string; selected_policies?: string[] }) {
  await agentSecurityApi.patch(`/modules/${key}`, body);
}

export async function fetchLogs(type?: string): Promise<SysLog[]> {
  const params = type ? { type } : {};
  const { data } = await agentSecurityApi.get<SysLog[]>('/logs', { params });
  return data;
}
