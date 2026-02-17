import React, { useEffect, useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

function apiClient(token){
  return axios.create({ headers: { Authorization: `Bearer ${token}` } })
}

export default function Employees(){
  const token = localStorage.getItem('token')
  const [list,setList] = useState([])
  const [form,setForm] = useState({name:'',area:'',district:'',phone:'',email:'',birthday:'',photoData:''})
  const [preview,setPreview] = useState(null)

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
          <ul className="birthday-list">
            {list.map(d=> (
              <li key={d.id}><strong>{d.name}</strong> — {d.area} — {d.district} — {d.phone}</li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
