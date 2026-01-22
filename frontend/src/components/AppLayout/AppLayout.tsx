import { NavLink, Outlet } from 'react-router-dom'
import './AppLayout.css'

const AppLayout = () => {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <span className="brand-title">Metal Factory ERP</span>
          <span className="brand-subtitle">Склад и производство</span>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Обзор
          </NavLink>
          <NavLink to="/warehouse" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Склад
          </NavLink>
          <NavLink to="/batches" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Партии
          </NavLink>
          <NavLink to="/orders" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Заказы
          </NavLink>
          <NavLink to="/customers" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            Клиенты
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <span className="footer-label">Версия системы</span>
          <span className="footer-value">MVP</span>
        </div>
      </aside>

      <div className="app-content">
        <header className="app-topbar">
          <div>
            <p className="topbar-title">Рабочая панель</p>
            <p className="topbar-subtitle">Данные по производству и складу</p>
          </div>
          <div className="topbar-actions">
            <button className="ghost-button">Экспорт</button>
            <button className="primary-button">Создать заявку</button>
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
