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
import { Role } from './utils/roles'

function App() {
  return (
    <>
    <AuthProvider> 
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/batches" element={<BatchesPage />} />
          <Route element={<ProtectedRoute requiredRole={Role.WAREHOUSE_WORKER} />}>
            <Route path="/warehouse" element={<WarehousePage />} />
          </Route>
          <Route path="/batches/:id" element={<BatchDetailPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/customers" element={<CustomersPage />} />
        </Route>
      </Routes>
      </AuthProvider>
    </>
  )
}

export default App
