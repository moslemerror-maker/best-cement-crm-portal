import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Dealers from './pages/Dealers'
import Employees from './pages/Employees'
import './styles.css'

function App() {
  const token = localStorage.getItem('token');
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={token ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/dealers" element={token ? <Dealers /> : <Navigate to="/login" />} />
        <Route path="/employees" element={token ? <Employees /> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to={token?'/dashboard':'/login'} />} />
      </Routes>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(<App />)
