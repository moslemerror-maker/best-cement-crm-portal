import React, { useEffect, useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

function apiClient(token){
  return axios.create({ headers: { Authorization: `Bearer ${token}` } })
}

export default function Users(){
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')
  const [list,setList] = useState([])
  const [form,setForm] = useState({ name:'', email:'', password:'' })
  const [err,setErr] = useState('')
  const [editingId,setEditingId] = useState(null)
  const [editForm,setEditForm] = useState({ name:'', email:'', password:'' })

  useEffect(()=>{
    if (!token || role !== 'admin') return;
    apiClient(token).get(`${API}/users`).then(r=>setList(r.data)).catch((e)=>{
      setErr(e?.response?.data?.error || 'Failed to load users')
    })
  },[token, role])

  async function submit(e){
    e.preventDefault();
    setErr('')
    try{
      await apiClient(token).post(`${API}/users`, form)
      const r = await apiClient(token).get(`${API}/users`)
      setList(r.data)
      setForm({ name:'', email:'', password:'' })
    }catch(e){
      setErr(e?.response?.data?.error || 'Failed to create user')
    }
  }

  function startEdit(item){
    setEditingId(item.id)
    setEditForm({ name: item.name || '', email: item.email || '', password: '' })
  }

  async function saveEdit(){
    if (!editingId) return
    setErr('')
    try{
      await apiClient(token).put(`${API}/users/${editingId}`, {
        name: editForm.name,
        email: editForm.email,
        password: editForm.password
      })
      const r = await apiClient(token).get(`${API}/users`)
      setList(r.data)
      setEditingId(null)
      setEditForm({ name:'', email:'', password:'' })
    }catch(e){
      setErr(e?.response?.data?.error || 'Failed to update user')
    }
  }

  async function deleteUser(id){
    if (!window.confirm('Delete this user?')) return
    setErr('')
    try{
      await apiClient(token).delete(`${API}/users/${id}`)
      const r = await apiClient(token).get(`${API}/users`)
      setList(r.data)
      if (editingId === id) {
        setEditingId(null)
        setEditForm({ name:'', email:'', password:'' })
      }
    }catch(e){
      setErr(e?.response?.data?.error || 'Failed to delete user')
    }
  }

  if (role !== 'admin') {
    return (
      <div className="dashboard-root">
        <header className="topbar">
          <h1>User Management</h1>
          <div><a className="gold-btn" href="/dashboard">Back</a></div>
        </header>
        <main>
          <section className="birthday-section">
            <p>Only admin can manage users.</p>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="dashboard-root">
      <header className="topbar">
        <h1>User Management</h1>
        <div><a className="gold-btn" href="/dashboard">Back</a></div>
      </header>
      <main>
        <section className="birthday-section">
          <h2>Create User</h2>
          <form onSubmit={submit} className="login-box form-grid">
            <div className="field"><label>Name</label><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
            <div className="field"><label>Email</label><input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></div>
            <div className="field"><label>Password</label><input required minLength={6} type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} /></div>
            <div style={{gridColumn:'1 / -1',display:'flex',justifyContent:'flex-end'}}>
              <button className="gold-btn">Create User</button>
            </div>
          </form>
          {err && <div className="error" style={{marginTop:12}}>{err}</div>}
        </section>

        <section style={{marginTop:20}} className="birthday-section">
          <h2>Users List</h2>
          {editingId && (
            <div style={{marginBottom:20, padding:15, backgroundColor:'#0f3b61', borderRadius:8}}>
              <h3 style={{marginTop:0, color:'#d4af37'}}>Edit User</h3>
              <div className="form-grid login-box">
                <div className="field"><label>Name</label><input value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})} /></div>
                <div className="field"><label>Email</label><input type="email" value={editForm.email} onChange={e=>setEditForm({...editForm,email:e.target.value})} /></div>
                <div className="field"><label>New Password (optional)</label><input type="password" value={editForm.password} onChange={e=>setEditForm({...editForm,password:e.target.value})} /></div>
                <div style={{gridColumn:'1 / -1',display:'flex',justifyContent:'flex-end',gap:10}}>
                  <button className="gold-btn" onClick={saveEdit}>Save</button>
                  <button className="gold-btn" onClick={()=>{setEditingId(null);setEditForm({ name:'', email:'', password:'' })}}>Cancel</button>
                </div>
              </div>
            </div>
          )}
          <ul className="birthday-list">
            {list.map(u=> (
              <li key={u.id} className="gold-hover" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><strong>{u.name}</strong> — {u.email}</div>
                <div style={{display:'flex',gap:8}}>
                  <button className="gold-btn" onClick={()=>startEdit(u)}>Edit</button>
                  <button className="gold-btn" style={{backgroundColor:'#c41e3a'}} onClick={()=>deleteUser(u.id)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
