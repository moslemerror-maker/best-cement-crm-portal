import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
const ENTITIES = ['dealers','subdealers','employees']

function apiClient(token){
  return axios.create({ headers: { Authorization: `Bearer ${token}` } })
}

export default function Dashboard(){
  const [counts,setCounts] = useState({})
  const [birthdayList,setBirthdayList] = useState([])
  const [loading, setLoading] = useState(true)
  const [token] = useState(localStorage.getItem('token'))
  const navigate = useNavigate()

  useEffect(()=>{
    if (!token) return;
    const c = apiClient(token);
    async function load(){
      try{
        const all = await Promise.all(ENTITIES.map(e=>c.get(`${API}/${e}`)));
        const obj = {};
        ENTITIES.forEach((e,i)=> obj[e]=all[i].data.length);
        setCounts(obj);
        const b = await c.get(`${API}/birthdays?days=30`);
        setBirthdayList(b.data);
        setLoading(false);
      }catch(err){
        console.error(err);
        setLoading(false);
      }
    }
    load();
  },[token])

  function logout(){
    localStorage.removeItem('token');
    window.location.href = '/login';
  }

  return (
    <div className="dashboard-root">
      <header className="topbar">
        <div className="topbar-left">
          <h1>Best Cement CRM Portal</h1>
        </div>
        <nav className="topbar-center">
          <Link className="nav-link" to="/employees">Employees</Link>
          <Link className="nav-link" to="/dealers">Dealers</Link>
          <Link className="nav-link" to="/import">Import Data</Link>
        </nav>
        <div className="topbar-right">
          <button className="gold-btn logout-btn" onClick={logout}>Logout</button>
        </div>
      </header>
      <main>
        <section className="cards">
          {ENTITIES.map(e=> {
            const label = e === 'subdealers' ? 'Sub Dealers' : e.charAt(0).toUpperCase()+e.slice(1)
            const display = loading ? '…' : (counts[e] || 0)
            return (
              <div key={e} className="card gold-hover" role="button" tabIndex={0}
                onClick={() => navigate(`/${e}`)}
                onKeyDown={(ev)=>{ if(ev.key === 'Enter') navigate(`/${e}`) }}
                style={{cursor:'pointer'}}>
                <h3>{label}</h3>
                <div className="count">{display}{loading && <span className="spinner"/>}</div>
              </div>
            )
          })}
        </section>

        <section className="birthday-section">
          <h2>Upcoming Birthdays</h2>
          {birthdayList.length===0 ? <p>No birthdays in the next 30 days.</p> : (
            <ul className="birthday-list">
              {birthdayList.map((b,i)=> (
                <li key={i} className="gold-hover">
                  <strong>{b.name}</strong> ({b.entity}) — {b.nextBirthday} — in {b.daysAway} days
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
