import React, { useEffect, useState } from 'react'
import axios from 'axios'

const API = 'http://localhost:4000/api'
const ENTITIES = ['dealers','subdealers','employees']

function apiClient(token){
  return axios.create({ headers: { Authorization: `Bearer ${token}` } })
}

export default function Dashboard(){
  const [counts,setCounts] = useState({})
  const [birthdayList,setBirthdayList] = useState([])
  const [token] = useState(localStorage.getItem('token'))

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
      }catch(err){
        console.error(err);
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
        <h1>Best Cement CRM Portal</h1>
        <div>
          <a className="gold-btn" href="/employees">Employees</a>
          <a style={{marginLeft:8}} className="gold-btn" href="/dealers">Dealers</a>
          <button style={{marginLeft:8}} className="gold-btn" onClick={logout}>Logout</button>
        </div>
      </header>
      <main>
        <section className="cards">
          {ENTITIES.map(e=> (
            <div key={e} className="card">
              <h3>{e === 'subdealers' ? 'Sub Dealers' : e.charAt(0).toUpperCase()+e.slice(1)}</h3>
              <div className="count">{counts[e] || 0}</div>
            </div>
          ))}
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
