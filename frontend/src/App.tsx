import { Route, Routes } from 'react-router-dom'
import './App.css'
import AppLayout from './components/AppLayout/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import BatchDetailPage from './pages/BatchDetailPage/BatchDetailPage'
import BatchesPage from './pages/BatchesPage/BatchesPage'
import CustomersPage from './pages/CustomersPage/CustomersPage'
import DashboardPage from './pages/DashboardPage/DashboardPage'
import LoginPage from './pages/LoginPage/LoginPage'
import OrdersPage from './pages/OrdersPage/OrdersPage'
import WarehousePage from './pages/WarehousePage/WarehousePage'
import ForbiddenPage from './pages/ForbiddenPage/ForbiddenPage'
import { Role } from './utils/roles'

function App() {
  return (
    <>
    <AuthProvider> 
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />

        {/* All app routes require login */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />

            <Route element={<ProtectedRoute allowedRoles={[Role.ADMIN, Role.MANAGER, Role.LOGIST, Role.WAREHOUSE_WORKER]} />}>
              <Route path="/batches" element={<BatchesPage />} />
              <Route path="/batches/:id" element={<BatchDetailPage />} />
              <Route path="/warehouse" element={<WarehousePage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[Role.ADMIN, Role.MANAGER, Role.LOGIST, Role.ACCOUNTANT, Role.CLIENT]} />}>
              <Route path="/orders" element={<OrdersPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={[Role.ADMIN, Role.MANAGER, Role.LOGIST, Role.ACCOUNTANT]} />}>
              <Route path="/customers" element={<CustomersPage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
      </AuthProvider>
    </>
  )
}

export default App
