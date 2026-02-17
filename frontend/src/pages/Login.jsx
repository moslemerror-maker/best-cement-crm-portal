import React, { useState } from 'react'
import axios from 'axios'

export default function Login(){
  const [email,setEmail] = useState('admin@bestcement.local')
  const [password,setPassword] = useState('admin123')
  const [err,setErr] = useState('')

  async function submit(e){
    e.preventDefault();
    setErr('')
    try{
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const res = await axios.post(`${apiUrl}/login`,{ email, password })
      localStorage.setItem('token', res.data.token)
      window.location.href = '/dashboard'
    }catch(err){
      setErr(err?.response?.data?.error || 'Login failed')
    }
  }

  return (
    <div className="login-page">
      <form className="login-box" onSubmit={submit}>
        <h2>Best Cement CRM Portal</h2>
        <div className="field">
          <label>Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        </div>
        <button className="gold-btn">Login</button>
        {err && <div className="error">{err}</div>}
      </form>
    </div>
  )
}
