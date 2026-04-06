import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import {
  fetchModules,
  fetchLogs,
  updateModule as apiUpdateModule,
  type SysLog,
  type ModuleState,
} from '../../services/agentSecurityApi';

type SecurityModuleKey =
  | 'skillAcquisition'
  | 'runtimeProtection'
  | 'compliance'
  | 'environment';

type SecurityStatus = 'healthy' | 'warning' | 'disabled';

interface SecurityModuleMeta {
  key: SecurityModuleKey;
  title: string;
  description: string;
  policyOptions: string[];
}

const MODULE_META: SecurityModuleMeta[] = [
  {
    key: 'skillAcquisition',
    title: '虾苗获取安全',
    description:
      '在安装 Skill 时检测恶意代码与高风险行为，及时阻止危险 Skill 进入虾的运行环境。',
    policyOptions: ['KSecure扫描引擎'],
  },
  {
    key: 'runtimeProtection',
    title: '养虾过程安全',
    description:
      '在虾使用上传资料、知识库内容或外部引用语料时，识别被投毒内容并及时阻断。',
    policyOptions: ['企业级安全扫描', '开源安全扫描'],
  },
  {
    key: 'compliance',
    title: '安全合规',
    description:
      '通过敏感信息防护、数据隐私保护与响应规则，保障虾的输入输出符合企业合规要求。',
    policyOptions: ['敏感信息防护策略', '数据隐私保护策略', '输出响应规则'],
  },
  {
    key: 'environment',
    title: '环境安全',
    description:
      '在主机遭遇勒索病毒或异常环境攻击时，保护虾的技能、记忆、材料与输出结果不被破坏。',
    policyOptions: ['勒索病毒防护', '入侵检测', '风险发现', '文件/进程保护'],
  },
];

interface ModuleDisplay {
  key: SecurityModuleKey;
  title: string;
  description: string;
  enabled: boolean;
  status: SecurityStatus;
  policyLabel: string;
  policyOptions: string[];
  selectedPolicies: string[];
  logs: SysLog[];
}

const AgentSecurityPage: React.FC = () => {
  const [moduleStates, setModuleStates] = useState<Record<string, ModuleState>>({});
  const [logs, setLogs] = useState<SysLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [modulesData, logsData] = await Promise.all([fetchModules(), fetchLogs()]);
      const stateMap: Record<string, ModuleState> = {};
      for (const m of modulesData) {
        stateMap[m.key] = m;
      }
      setModuleStates(stateMap);
      setLogs(logsData);
    } catch (err) {
      console.error('Failed to load agent security data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const modules: ModuleDisplay[] = useMemo(() => {
    return MODULE_META.map((meta) => {
      const state = moduleStates[meta.key];
      const enabled = state?.enabled ?? true;
      const moduleLogs = logs.filter((l) => l.type === meta.title);
      const hasHighRisk = moduleLogs.some((l) => l.level === '高危');

      let status: SecurityStatus = 'healthy';
      if (!enabled) status = 'disabled';
      else if (hasHighRisk) status = 'warning';

      return {
        ...meta,
        enabled,
        status,
        policyLabel: state?.policyLabel ?? meta.policyOptions[0],
        selectedPolicies: state?.selectedPolicies ?? [...meta.policyOptions],
        logs: moduleLogs.slice(0, 2),
      };
    });
  }, [moduleStates, logs]);

  const handleToggle = async (key: SecurityModuleKey) => {
    const current = moduleStates[key];
    const newEnabled = !(current?.enabled ?? true);
    setModuleStates((prev) => ({
      ...prev,
      [key]: { ...prev[key], key, enabled: newEnabled, policyLabel: prev[key]?.policyLabel ?? '' },
    }));
    try {
      await apiUpdateModule(key, { enabled: newEnabled });
    } catch (err) {
      console.error('Failed to toggle module:', err);
      setModuleStates((prev) => ({
        ...prev,
        [key]: { ...prev[key], enabled: !newEnabled },
      }));
    }
  };

  const handlePolicyToggle = async (key: SecurityModuleKey, option: string) => {
    const current = moduleStates[key]?.selectedPolicies ?? [];
    const next = current.includes(option)
      ? current.filter((p) => p !== option)
      : [...current, option];
    setModuleStates((s) => ({
      ...s,
      [key]: { ...s[key], key, selectedPolicies: next, enabled: s[key]?.enabled ?? true, policyLabel: s[key]?.policyLabel ?? '' },
    }));
    try {
      await apiUpdateModule(key, { selected_policies: next });
    } catch (err) {
      console.error('Failed to update policies:', err);
      setModuleStates((s) => ({
        ...s,
        [key]: { ...s[key], selectedPolicies: current },
      }));
    }
  };

  const dashboardStats = useMemo(() => {
    const enabledCount = modules.filter((item) => item.enabled).length;
    const totalPolicies = modules.reduce(
      (sum, item) => sum + item.policyOptions.length,
      0
    );
    const allLogs = modules.flatMap((item) => item.logs);
    const todayAlerts = allLogs.length;
    const highRiskAlerts = allLogs.filter((log) => log.level === '高危').length;

    return { enabledCount, totalCount: modules.length, totalPolicies, todayAlerts, highRiskAlerts };
  }, [modules]);

  const mergedLogs = useMemo(() => {
    return logs.slice(0, 8);
  }, [logs]);

  const getStatusBadge = (status: SecurityStatus, enabled: boolean) => {
    if (!enabled || status === 'disabled') {
      return 'bg-[#f4efeb] text-[#8a817b] border-[#e8ddd6]';
    }
    if (status === 'warning') {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  const getStatusText = (status: SecurityStatus, enabled: boolean) => {
    if (!enabled || status === 'disabled') return '已关闭';
    if (status === 'warning') return '有告警';
    return '运行正常';
  };

  const getRiskDotClass = (level: string) => {
    if (level === '高危') return 'bg-red-500';
    return 'bg-sky-500';
  };

  const getRiskTextClass = (level: string) => {
    if (level === '高危') return 'text-red-600';
    return 'text-sky-600';
  };

  if (loading) {
    return (
      <AdminLayout title="养虾安全">
        <div className="flex items-center justify-center py-20 text-[#8a817b]">加载中…</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="养虾安全">
      <div className="space-y-8">
        <section className="rounded-[28px] border border-[#eadfd8] bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(255,246,241,0.96)_100%)] p-6 shadow-[0_28px_60px_-40px_rgba(72,44,24,0.35)] md:p-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full border border-[#f1d8cb] bg-[#fff5ef] px-3 py-1 text-xs font-semibold text-[#c65b3d]">
                Agent Security Center
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#171212]">
                养虾安全控制台
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#6e6763] md:text-[15px]">
                覆盖虾苗获取、养虾过程、安全合规、环境安全四类防护能力，支持开关控制、策略选择与最新告警查看，
                帮助你从安装、使用、输出到运行环境，完整保护虾的安全。
              </p>
            </div>

            <div className="grid w-full grid-cols-2 gap-3 xl:max-w-[420px]">
              <div className="rounded-2xl border border-[#eadfd8] bg-white/90 p-4 shadow-[0_20px_40px_-38px_rgba(72,44,24,0.45)]">
                <div className="text-xs font-medium text-[#8b817b]">已开启模块</div>
                <div className="mt-2 text-2xl font-bold text-[#171212]">
                  {dashboardStats.enabledCount}/{dashboardStats.totalCount}
                </div>
              </div>
              <div className="rounded-2xl border border-[#eadfd8] bg-white/90 p-4 shadow-[0_20px_40px_-38px_rgba(72,44,24,0.45)]">
                <div className="text-xs font-medium text-[#8b817b]">当前策略项</div>
                <div className="mt-2 text-2xl font-bold text-[#171212]">
                  {dashboardStats.totalPolicies}
                </div>
              </div>
              <div className="rounded-2xl border border-[#eadfd8] bg-white/90 p-4 shadow-[0_20px_40px_-38px_rgba(72,44,24,0.45)]">
                <div className="text-xs font-medium text-[#8b817b]">今日告警</div>
                <div className="mt-2 text-2xl font-bold text-[#ef6b4a]">
                  {dashboardStats.todayAlerts}
                </div>
              </div>
              <div className="rounded-2xl border border-[#eadfd8] bg-white/90 p-4 shadow-[0_20px_40px_-38px_rgba(72,44,24,0.45)]">
                <div className="text-xs font-medium text-[#8b817b]">高风险告警</div>
                <div className="mt-2 text-2xl font-bold text-red-600">
                  {dashboardStats.highRiskAlerts}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {modules.map((module) => (
            <div
              key={module.key}
              className="rounded-[28px] border border-[#eadfd8] bg-white p-6 shadow-[0_24px_54px_-40px_rgba(72,44,24,0.35)] transition-all duration-200 hover:shadow-[0_28px_64px_-42px_rgba(72,44,24,0.42)]"
            >
              <div className="flex flex-col gap-4 border-b border-[#f2e7e0] pb-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="pr-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#fff1eb_0%,#ffe4d8_100%)] text-[#dc5a37] shadow-[inset_0_0_0_1px_rgba(239,107,74,0.12)]">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                            d="M12 3l7 4v5c0 4.9-3 9.1-7 10.7C8 21.1 5 16.9 5 12V7l7-4zm0 5v4m0 4h.01" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-[#171212]">{module.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-[#6e6763]">{module.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadge(module.status, module.enabled)}`}>
                      {getStatusText(module.status, module.enabled)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggle(module.key)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ${module.enabled ? 'bg-[#ef6b4a]' : 'bg-[#d8cec8]'}`}
                    >
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${module.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-5">
                <div className="rounded-2xl border border-[#f0e6df] bg-[#fffaf7] p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-[#171212]">安全策略配置</div>
                      <div className="mt-1 text-xs leading-6 text-[#8a817b]">
                        已启用 {module.selectedPolicies.length}/{module.policyOptions.length} 项策略
                      </div>
                      <div className="mt-4 space-y-2.5">
                        {module.policyOptions.map((option) => (
                          <label
                            key={option}
                            className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm transition ${
                              !module.enabled
                                ? 'cursor-not-allowed border-[#e8ddd6] bg-[#f5f1ee] text-[#a49a95]'
                                : module.selectedPolicies.includes(option)
                                  ? 'cursor-pointer border-[#ef6b4a]/30 bg-white text-[#171212]'
                                  : 'cursor-pointer border-[#e7dcd5] bg-white text-[#6e6763]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={module.selectedPolicies.includes(option)}
                              disabled={!module.enabled}
                              onChange={() => handlePolicyToggle(module.key, option)}
                              className="h-4 w-4 rounded border-[#d8cec8] text-[#ef6b4a] accent-[#ef6b4a] focus:ring-[#ef6b4a] disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            {option}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-[#171212]">最新告警日志</div>
                      <div className="mt-1 text-xs text-[#8a817b]">及时查看该模块最近的安全事件与处理结果</div>
                    </div>
                    <button type="button" className="text-sm font-medium text-[#dc5a37] transition hover:text-[#b64223]">
                      查看全部
                    </button>
                  </div>
                  <div className="space-y-3">
                    {module.logs.length === 0 && (
                      <div className="rounded-2xl border border-[#f1e7e1] bg-[#fffdfb] p-4 text-center text-sm text-[#8a817b]">暂无告警</div>
                    )}
                    {module.logs.map((log) => (
                      <div key={log.id} className="rounded-2xl border border-[#f1e7e1] bg-[#fffdfb] p-4 transition hover:bg-[#fff8f4]">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`h-2.5 w-2.5 rounded-full ${getRiskDotClass(log.level)}`} />
                              <span className={`text-xs font-semibold ${getRiskTextClass(log.level)}`}>{log.level}</span>
                              <span className="text-sm font-semibold text-[#171212]">{log.title}</span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-[#6e6763]">{log.description}</p>
                          </div>
                          <div className="shrink-0 text-left lg:text-right">
                            <div className="text-xs font-medium text-[#8a817b]">{log.time}</div>
                            <div className="mt-1 text-sm font-semibold text-[#171212]">{log.result}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-[28px] border border-[#eadfd8] bg-white p-6 shadow-[0_24px_54px_-40px_rgba(72,44,24,0.35)]">
          <div className="flex flex-col gap-2 border-b border-[#f2e7e0] pb-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-xl font-bold text-[#171212]">最新安全告警</h3>
              <p className="mt-1 text-sm text-[#6e6763]">汇总四类安全模块最近的告警与处理动作，方便统一查看整体风险状态。</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {mergedLogs.map((log) => (
              <div key={`${log.type}-${log.id}`}
                className="flex flex-col gap-4 rounded-2xl border border-[#f1e7e1] bg-[#fffdfb] p-4 transition hover:bg-[#fff8f4] lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${getRiskDotClass(log.level)}`} />
                    <span className={`text-xs font-semibold ${getRiskTextClass(log.level)}`}>{log.level}</span>
                    <span className="rounded-full bg-[#f7efe9] px-2.5 py-1 text-xs font-medium text-[#8b5f4d]">{log.type}</span>
                    <span className="text-sm font-semibold text-[#171212]">{log.title}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#6e6763]">{log.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs font-medium text-[#8a817b]">{log.time}</div>
                    <div className="mt-1 text-sm font-semibold text-[#171212]">{log.result}</div>
                  </div>
                  <button type="button"
                    className="inline-flex items-center rounded-2xl border border-[#e7dcd5] bg-white px-4 py-2 text-sm font-medium text-[#5f5753] transition hover:border-[#ef6b4a] hover:text-[#171212]">
                    查看详情
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
};

export default AgentSecurityPage;
