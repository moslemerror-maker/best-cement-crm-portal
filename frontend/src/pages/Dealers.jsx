import React, { useEffect, useState } from 'react'
import axios from 'axios'

const API = 'http://localhost:4000/api'

function apiClient(token){
  return axios.create({ headers: { Authorization: `Bearer ${token}` } })
}

export default function Dealers(){
  const token = localStorage.getItem('token')
  const [list,setList] = useState([])
  const [dealersList,setDealersList] = useState([])
  const [entityType,setEntityType] = useState('dealers') // 'dealers' or 'subdealers'
  const [form,setForm] = useState({name:'',address:'',phone:'',email:'',district:'',sales_promoter:'',dob:'',anniversary:'',birthday:'',dealer_id:'',area:'',potential:''})

  useEffect(()=>{
    if (!token) return;
    const c = apiClient(token);
    // always load dealers for dropdown
    c.get(`${API}/dealers`).then(r=>setDealersList(r.data)).catch(()=>setDealersList([]))
    // load current list based on selection
    if (entityType === 'dealers') {
      c.get(`${API}/dealers`).then(r=>setList(r.data)).catch(()=>setList([]))
    } else {
      c.get(`${API}/subdealers`).then(r=>setList(r.data)).catch(()=>setList([]))
    }
  },[token, entityType])

  async function submit(e){
    e.preventDefault();
    try{
      const c = apiClient(token)
      if (entityType === 'dealers') {
        await c.post(`${API}/dealers`,{ name: form.name, address: form.address, phone: form.phone, email: form.email, district: form.district, sales_promoter: form.sales_promoter, dob: form.dob, anniversary: form.anniversary })
      } else {
        await c.post(`${API}/subdealers`,{ name: form.name, dealer_id: form.dealer_id, area: form.area, district: form.district, potential: form.potential, phone: form.phone, email: form.email, birthday: form.birthday })
      }
      const r = await apiClient(token).get(`${API}/${entityType}`)
      setList(r.data)
      setForm({name:'',address:'',phone:'',email:'',district:'',sales_promoter:'',dob:'',anniversary:'',birthday:'',dealer_id:'',area:'',potential:''})
    }catch(err){console.error(err)}
  }

  return (
    <div className="dashboard-root">
      <header className="topbar">
        <h1>Dealers / Sub Dealers</h1>
        <div>
          <a className="gold-btn" href="/dashboard">Back</a>
        </div>
      </header>
      <main>
        <section className="birthday-section">
          <h2 className="decor-title">Add Entry</h2>
          <div className="add-form">
            <div style={{marginBottom:12, display:'flex', alignItems:'center', gap:12}}>
              <label style={{color:'#cfe3fb',marginRight:8}}>Type</label>
              <select className="select" value={entityType} onChange={e=>setEntityType(e.target.value)}>
                <option value="dealers">Dealer</option>
                <option value="subdealers">Sub Dealer</option>
              </select>
            </div>

            <form onSubmit={submit} className="login-box form-grid">
              <div className="field"><label>{entityType==='dealers'?'Dealer Name':'Sub Dealer Name'}</label><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
              <div className="field"><label>Mobile</label><input required value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} /></div>

              {entityType === 'dealers' ? (
                <>
                  <div className="field"><label>Address</label><input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} /></div>
                  <div className="field"><label>Email</label><input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></div>
                  <div className="field"><label>District</label><input value={form.district} onChange={e=>setForm({...form,district:e.target.value})} /></div>
                  <div className="field"><label>Sales Promoter</label><input value={form.sales_promoter} onChange={e=>setForm({...form,sales_promoter:e.target.value})} /></div>
                  <div className="field"><label>Date of Birth</label><input type="date" value={form.dob} onChange={e=>setForm({...form,dob:e.target.value})} /></div>
                  <div className="field"><label>Anniversary</label><input type="date" value={form.anniversary} onChange={e=>setForm({...form,anniversary:e.target.value})} /></div>
                </>
              ) : (
                <>
                  <div className="field"><label>Dealer</label>
                    <select required value={form.dealer_id} onChange={e=>setForm({...form,dealer_id:e.target.value})} className="select">
                      <option value="" disabled>-- select dealer --</option>
                      {dealersList.map(d=> (<option key={d.id} value={d.id}>{d.name}</option>))}
                    </select>
                  </div>
                  <div className="field"><label>Area</label><input value={form.area} onChange={e=>setForm({...form,area:e.target.value})} /></div>
                  <div className="field"><label>Date of Birth</label><input type="date" value={form.birthday} onChange={e=>setForm({...form,birthday:e.target.value})} /></div>
                  <div className="field"><label>District</label><input value={form.district} onChange={e=>setForm({...form,district:e.target.value})} /></div>
                  <div className="field"><label>Potential (MT)</label><input type="number" value={form.potential} onChange={e=>setForm({...form,potential:e.target.value})} /></div>
                  <div className="field"><label>Email</label><input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></div>
                </>
              )}

              <div style={{gridColumn:'1 / -1',display:'flex',justifyContent:'flex-end'}}>
                <button className="gold-btn">Add {entityType === 'dealers' ? 'Dealer' : 'Sub Dealer'}</button>
              </div>
            </form>
          </div>
        </section>

        <section style={{marginTop:20}} className="birthday-section">
          <h2>{entityType === 'dealers' ? 'Dealers List' : 'Sub Dealers List'}</h2>
          <ul className="birthday-list">
            {list.map(d=> (
              <li key={d.id} className="gold-hover"><strong>{d.name}</strong> — {d.phone} {d.email ? `— ${d.email}` : ''} {d.district ? `— ${d.district}` : ''}</li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
