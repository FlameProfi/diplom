import { useNavigate } from "react-router"
import { Route, Routes } from 'react-router-dom'
import './App.css'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import BatchesPage from './pages/BatchesPage/BatchesPage'
import CustomersPage from './pages/CustomersPage/CustomersPage'
import LoginPage from './pages/LoginPage/LoginPage'
import OrdersPage from './pages/OrdersPage/OrdersPage'
import WarehousePage from './pages/WarehousePage/WarehousePage'
import { Role } from './utils/roles'

function App() {
  const navigate = useNavigate();
  return (
    <>
    <AuthProvider> 
      <Routes>
        <Route path="/" element={<div onClick={() => navigate("/warehouse")}>Главная</div>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/batches" element={<BatchesPage />} />
        <Route element={<ProtectedRoute requiredRole={Role.WAREHOUSE_WORKER} />}>
            <Route path="/warehouse" element={<WarehousePage />} />
          </Route>
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/customers" element={<CustomersPage />} />
      </Routes>
      </AuthProvider>
    </>
  )
}

export default App
