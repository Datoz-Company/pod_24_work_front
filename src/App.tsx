import { Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from '@/components/layout/MainLayout'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { OrdersPage } from '@/pages/OrdersPage'
import { WorkStatusPage } from '@/pages/WorkStatusPage'
import { ProcessesPage } from '@/pages/ProcessesPage'
import { ProductProcessesPage } from '@/pages/ProductProcessesPage'
import { CustomersPage } from '@/pages/CustomersPage'
import { ProductsPage } from '@/pages/ProductsPage'
import { WorkHistoryPage } from '@/pages/WorkHistoryPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { OptionsPage } from '@/pages/OptionsPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<MainLayout />}>
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/work-status" element={<WorkStatusPage />} />
        <Route path="/processes" element={<ProcessesPage />} />
        <Route path="/product-processes" element={<ProductProcessesPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/options" element={<OptionsPage />} />
        <Route path="/work-history" element={<WorkHistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/work-status" replace />} />
      <Route path="*" element={<Navigate to="/work-status" replace />} />
    </Routes>
  )
}

export default App
