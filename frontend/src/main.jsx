import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Dealers from './pages/Dealers'
import Employees from './pages/Employees'
import Import from './pages/Import'
import Users from './pages/Users'
import './styles.css'

function App() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role') || 'user';
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={token ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/dealers" element={token ? <Dealers /> : <Navigate to="/login" />} />
        <Route path="/employees" element={token ? <Employees /> : <Navigate to="/login" />} />
        <Route path="/import" element={token ? <Import /> : <Navigate to="/login" />} />
        <Route path="/users" element={token && role === 'admin' ? <Users /> : <Navigate to="/dashboard" />} />
        <Route path="/" element={<Navigate to={token?'/dashboard':'/login'} />} />
      </Routes>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(<App />)
