import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import './AppLayout.css'
import { useAuth } from '../../context/AuthContext'
import { hasPermission, Role } from '../../utils/roles'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'

const AppLayout = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
        setShowCreateMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const handleExport = async () => {
    const path = location.pathname;
    let endpoint = '';
    let filename = 'export.csv';

    if (path.startsWith('/batches')) {
      endpoint = '/batches';
      filename = `batches_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (path.startsWith('/orders')) {
      endpoint = '/orders';
      filename = `orders_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (path.startsWith('/customers')) {
      endpoint = '/customers';
      filename = `customers_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (path.startsWith('/warehouse')) {
      endpoint = '/stock';
      filename = `stock_${new Date().toISOString().split('T')[0]}.csv`;
    }

    if (!endpoint) {
      alert(t('layout.actions.exportUnavailable'));
      return;
    }

    try {
      const res = await api.get(endpoint);
      const data = res.data;
      if (!Array.isArray(data) || data.length === 0) {
        alert(t('layout.actions.exportEmpty'));
        return;
      }

      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(item =>
        Object.values(item).map(val =>
          typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
        ).join(',')
      );
      const csvContent = [headers, ...rows].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed', error);
      alert(t('layout.actions.exportError'));
    }
  };

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <span className="brand-title">Metal Factory ERP</span>
          <span className="brand-subtitle">{t('layout.brandSubtitle')}</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            {t('layout.nav.dashboard')}
          </NavLink>

          {hasPermission(user.role, [Role.ADMIN, Role.MANAGER, Role.LOGIST, Role.WAREHOUSE_WORKER]) && (
            <>
              <NavLink to="/warehouse" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                {t('layout.nav.warehouse')}
              </NavLink>
              <NavLink to="/batches" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                {t('layout.nav.batches')}
              </NavLink>
            </>
          )}

          {hasPermission(user.role, [Role.ADMIN, Role.MANAGER, Role.LOGIST, Role.ACCOUNTANT, Role.CLIENT]) && (
            <NavLink to="/orders" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              {t('layout.nav.orders')}
            </NavLink>
          )}

          {hasPermission(user.role, [Role.ADMIN, Role.MANAGER, Role.LOGIST, Role.ACCOUNTANT]) && (
            <NavLink to="/customers" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              {t('layout.nav.customers')}
            </NavLink>
          )}
        </nav>
        <div className="sidebar-footer">
          <span className="footer-label">{t('layout.footerLabel')}</span>
          <span className="footer-value">MVP</span>
        </div>
      </aside>

      <div className="app-content">
        <header className="app-topbar">
          <div>
            <p className="topbar-title">{t('layout.topbarTitle')}</p>
            <p className="topbar-subtitle">{t('layout.topbarSubtitle')}</p>
          </div>
          <div className="topbar-actions">
            <div className="language-switcher">
              <button
                className={`lang-btn ${i18n.language === 'ru' ? 'active' : ''}`}
                onClick={() => i18n.changeLanguage('ru')}
              >
                RU
              </button>
              <button
                className={`lang-btn ${i18n.language === 'en' ? 'active' : ''}`}
                onClick={() => i18n.changeLanguage('en')}
              >
                EN
              </button>
            </div>
            <button className="ghost-button" onClick={handleExport}>{t('layout.actions.export')}</button>
            <div className="create-dropdown-container" ref={createMenuRef}>
              <button
                className="primary-button"
                onClick={() => setShowCreateMenu(!showCreateMenu)}
              >
                {t('layout.actions.create')}
              </button>
              {showCreateMenu && (
                <div className="create-dropdown-menu">
                  <Link to="/batches?create=true" className="dropdown-item" onClick={() => setShowCreateMenu(false)}>
                    {t('batches.actions.new')}
                  </Link>
                  <Link to="/orders?create=true" className="dropdown-item" onClick={() => setShowCreateMenu(false)}>
                    {t('orders.actions.new')}
                  </Link>
                  <Link to="/customers?create=true" className="dropdown-item" onClick={() => setShowCreateMenu(false)}>
                    {t('customers.actions.new')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
