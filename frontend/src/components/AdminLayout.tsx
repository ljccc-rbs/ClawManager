import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import LanguageSwitcher from './LanguageSwitcher';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

interface NavItem {
  path: string;
  label: string;
  icon: string;
  matchPaths?: string[];
  exact?: boolean;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
  const location = useLocation();
  const { t } = useI18n();
  const shellContainerClass = 'mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12';
  const [profileExpanded, setProfileExpanded] = useState(false);

  const isActive = (item: NavItem) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    const candidates = [item.path, ...(item.matchPaths ?? [])];
    return candidates.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));
  };

  const navItems: NavItem[] = [
    {
      path: '/',
      label: t('nav.agentSecurity'),
      icon: 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
      exact: true,
    },
  ];

  return (
    <div className="app-shell">
      <div className="md:hidden">
        <header className="app-topbar">
          <div className={shellContainerClass}>
            <div className="flex min-h-16 items-center justify-between gap-4 py-3">
              <Link
                to="/"
                className="flex items-center text-[#171212] transition-colors hover:text-[#dc2626]"
              >
                <img
                  src="/lobster_transparent.png"
                  alt="ClawManager logo"
                  className="mr-2 h-10 w-10 object-contain"
                />
                <span className="font-bold text-xl">{t('app.name')}</span>
              </Link>

              <div className="flex items-center gap-3">
                <LanguageSwitcher />
              </div>
            </div>
          </div>

          <div className="border-t border-[#eee5df]">
            <div className="px-2 py-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`app-nav-link text-base ${
                    isActive(item)
                      ? 'app-nav-link-active'
                      : ''
                  }`}
                >
                  <svg
                    className="mr-3 h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={item.icon}
                    />
                  </svg>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </header>

        <div className="app-subheader">
          <div className={`${shellContainerClass} py-4`}>
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-[#171212]">{title}</h1>
            </div>
          </div>
        </div>

        <main className={`${shellContainerClass} py-8`}>
          {children}
        </main>
      </div>

      <div className="hidden min-h-screen md:flex">
        <aside className="w-[248px] shrink-0 border-r border-[#eadfd8] bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(255,248,244,0.92)_100%)] shadow-[18px_0_50px_-44px_rgba(72,44,24,0.45)]">
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="flex h-[104px] items-center border-b border-[#efe2da] px-5">
              <Link
                to="/"
                className="flex items-center text-[#171212] transition-colors hover:text-[#dc2626]"
              >
                <img
                  src="/lobster_transparent.png"
                  alt="ClawManager logo"
                  className="mr-3 h-9 w-9 object-contain"
                />
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b46c50]">
                    Admin
                  </div>
                  <div className="mt-0.5 text-[1.45rem] font-bold leading-none">{t('app.name')}</div>
                </div>
              </Link>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 pb-6">
              <div className="px-3 pb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#b46c50]">
                Navigation
              </div>
              <div className="space-y-1.5">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                      isActive(item)
                        ? 'bg-[#fff1eb] text-red-600 shadow-[inset_0_0_0_1px_rgba(243,199,183,0.8),0_16px_30px_-24px_rgba(220,38,38,0.45)]'
                        : 'text-[#6e6763] hover:bg-[rgba(247,236,230,0.82)] hover:text-[#171212]'
                    }`}
                  >
                    <svg
                      className="mr-3 h-5 w-5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={item.icon}
                      />
                    </svg>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </nav>

            <div className="border-t border-[#efe2da] px-4 py-5">
              <div className="rounded-[26px] border border-[#eadfd8] bg-[rgba(255,250,247,0.95)] p-4 shadow-[0_18px_42px_-34px_rgba(72,44,24,0.42)]">
                <button
                  type="button"
                  onClick={() => setProfileExpanded((current) => !current)}
                  className="flex w-full items-center gap-3 rounded-2xl text-left transition-colors hover:bg-[rgba(255,243,237,0.8)] focus:outline-none"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ef6b4a_0%,#dc2626_100%)] text-base font-bold text-white shadow-[0_16px_28px_-22px_rgba(220,38,38,0.65)]">
                    A
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[#171212]">Admin</div>
                  </div>
                  <svg
                    className={`h-5 w-5 shrink-0 text-[#8f8681] transition-transform duration-200 ${profileExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {profileExpanded && (
                  <div className="mt-4 space-y-3">
                    <div className="col-span-2 rounded-2xl border border-[#eadfd8] bg-white/92 px-3 py-3 shadow-[0_12px_28px_-24px_rgba(72,44,24,0.35)]">
                      <LanguageSwitcher />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="app-subheader">
            <div className={`${shellContainerClass} flex h-[104px] items-center`}>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b46c50]">
                  Admin Workspace
                </div>
                <h1 className="mt-1 text-[1.8rem] font-bold tracking-[-0.04em] text-[#171212]">{title}</h1>
              </div>
            </div>
          </div>

          <main className={`${shellContainerClass} flex-1 py-8`}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
