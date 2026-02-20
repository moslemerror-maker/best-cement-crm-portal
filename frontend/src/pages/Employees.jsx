import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { exportToExcel, exportToCSV } from '../utils/exportUtils'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

function apiClient(token){
  return axios.create({ headers: { Authorization: `Bearer ${token}` } })
}

export default function Employees(){
  const token = localStorage.getItem('token')
  const [list,setList] = useState([])
  const [form,setForm] = useState({name:'',area:'',district:'',phone:'',email:'',birthday:'',photoData:''})
  const [preview,setPreview] = useState(null)
  const [editingId,setEditingId] = useState(null)
  const [editForm,setEditForm] = useState({})

  useEffect(()=>{ if (!token) return; apiClient(token).get(`${API}/employees`).then(r=>setList(r.data)).catch(console.error)},[token])

  function handlePhoto(file){
    if (!file) { setPreview(null); setForm({...form,photoData:''}); return }
    const reader = new FileReader();
    reader.onload = ()=>{
      const b = reader.result;
      setPreview(b);
      // store base64 in meta for now
      setForm(prev=>({...prev, photoData: b}));
    };
    reader.readAsDataURL(file);
  }

  async function submit(e){
    e.preventDefault();
    try{
      const payload = { name: form.name, area: form.area, district: form.district, phone: form.phone, email: form.email, birthday: form.birthday, meta: JSON.stringify({ photo: form.photoData ? form.photoData : null }) }
      await apiClient(token).post(`${API}/employees`,payload)
      const r = await apiClient(token).get(`${API}/employees`)
      setList(r.data)
      setForm({name:'',area:'',district:'',phone:'',email:'',birthday:'',photoData:''})
      setPreview(null)
      alert('Employee added successfully!')
    }catch(err){
      console.error('Submit error:', err)
      const errMsg = err.response?.data?.error || err.message || 'Unknown error'
      alert('Error: ' + errMsg)
    }
  }

  function startEdit(item){
    setEditingId(item.id)
    setEditForm({
      id: item.id,
      name: item.name || '',
      area: item.area || '',
      district: item.district || '',
      phone: item.phone || '',
      email: item.email || '',
      birthday: item.birthday ? String(item.birthday).slice(0,10) : ''
    })
  }

  async function saveEdit(){
    if (!editingId) return
    try{
      await apiClient(token).put(`${API}/employees/${editingId}`, {
        name: editForm.name,
        area: editForm.area,
        district: editForm.district,
        phone: editForm.phone,
        email: editForm.email,
        birthday: editForm.birthday,
        meta: ''
      })
      const r = await apiClient(token).get(`${API}/employees`)
      setList(r.data)
      setEditingId(null)
      setEditForm({})
    }catch(err){console.error(err)}
  }

  return (
    <div className="dashboard-root">
      <header className="topbar">
        <h1>Employees</h1>
        <div>
          <a className="gold-btn" href="/dashboard">Back</a>
        </div>
      </header>
      <main>
        <section className="birthday-section">
          <h2>Add Employee</h2>
          <form onSubmit={submit} className="login-box form-grid" style={{alignItems:'start'}}>
            <div className="field"><label>Name</label><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
            <div className="field"><label>Date of Birth</label><input type="date" value={form.birthday} onChange={e=>setForm({...form,birthday:e.target.value})} /></div>
            <div className="field"><label>Area</label><input value={form.area} onChange={e=>setForm({...form,area:e.target.value})} /></div>
            <div className="field"><label>District</label><input value={form.district} onChange={e=>setForm({...form,district:e.target.value})} /></div>
            <div className="field"><label>Mobile</label><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} /></div>
            <div className="field"><label>Email</label><input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></div>

            <div style={{gridColumn:'2 / 3', justifySelf:'end'}}>
              <div className="photo-frame">
                {preview ? <img src={preview} alt="preview" /> : <div className="photo-placeholder">Employee Photo</div>}
                <input className="photo-input" type="file" accept="image/*" onChange={e=>handlePhoto(e.target.files[0])} />
              </div>
            </div>

            <div style={{gridColumn:'1 / -1',display:'flex',justifyContent:'flex-end'}}>
              <button className="gold-btn">Add Employee</button>
            </div>
          </form>
        </section>

        <section style={{marginTop:20}} className="birthday-section">
          <h2>Employees List</h2>
          <div style={{marginBottom:12, display:'flex', gap:8}}>
            <button className="gold-btn" onClick={()=>exportToExcel(list, `Employees_${new Date().toISOString().slice(0,10)}.xlsx`)}>Export to Excel</button>
            <button className="gold-btn" onClick={()=>exportToCSV(list, `Employees_${new Date().toISOString().slice(0,10)}.csv`)}>Export to CSV</button>
          </div>
          {editingId && (
            <div style={{marginBottom:20, padding:15, backgroundColor:'#0f3b61', borderRadius:8}}>
              <h3 style={{marginTop:0, color:'#d4af37'}}>Edit Employee</h3>
              <div className="form-grid login-box">
                <div className="field"><label>Name</label><input value={editForm.name || ''} onChange={e=>setEditForm({...editForm,name:e.target.value})} /></div>
                <div className="field"><label>Date of Birth</label><input type="date" value={editForm.birthday || ''} onChange={e=>setEditForm({...editForm,birthday:e.target.value})} /></div>
                <div className="field"><label>Area</label><input value={editForm.area || ''} onChange={e=>setEditForm({...editForm,area:e.target.value})} /></div>
                <div className="field"><label>District</label><input value={editForm.district || ''} onChange={e=>setEditForm({...editForm,district:e.target.value})} /></div>
                <div className="field"><label>Mobile</label><input value={editForm.phone || ''} onChange={e=>setEditForm({...editForm,phone:e.target.value})} /></div>
                <div className="field"><label>Email</label><input value={editForm.email || ''} onChange={e=>setEditForm({...editForm,email:e.target.value})} /></div>
                <div style={{gridColumn:'1 / -1',display:'flex',justifyContent:'flex-end',gap:10}}>
                  <button className="gold-btn" onClick={saveEdit}>Save</button>
                  <button className="gold-btn" onClick={()=>{setEditingId(null);setEditForm({})}}>Cancel</button>
                </div>
              </div>
            </div>
          )}
          <ul className="birthday-list">
            {list.map(d=> (
              <li key={d.id} className="gold-hover" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div><strong>{d.name}</strong> — {d.area} — {d.district} — {d.phone}</div>
                <div style={{display:'flex',gap:8}}>
                  <button className="gold-btn" onClick={()=>startEdit(d)}>Edit</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
