import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import FinancialStatement from './pages/FinancialStatement'
import MonthlyLedger from './pages/MonthlyLedger'
import LoanAnalysis from './pages/LoanAnalysis'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/cash-flow">
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<FinancialStatement />} />
            <Route path="ledger" element={<MonthlyLedger />} />
            <Route path="loan" element={<LoanAnalysis />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
