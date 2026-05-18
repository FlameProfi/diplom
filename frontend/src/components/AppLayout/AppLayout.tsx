import { NavLink, Outlet } from 'react-router-dom'
import './AppLayout.css'
import { useAuth } from '../../context/AuthContext'
import { hasPermission, Role } from '../../utils/roles'
import { useTranslation } from 'react-i18next'

const AppLayout = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  if (!user) return null;

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
            <button className="ghost-button">{t('layout.actions.export')}</button>
            <button className="primary-button">{t('layout.actions.create')}</button>
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
