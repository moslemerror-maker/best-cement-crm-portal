import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function apiClient(token) {
  return axios.create({
    baseURL: API,
    headers: { Authorization: `Bearer ${token}` }
  });
}

export default function Import() {
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const [dealersFile, setDealersFile] = useState(null);
  const [employeesFile, setEmployeesFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleDealersFile = (e) => {
    setDealersFile(e.target.files[0]);
  };

  const handleEmployeesFile = (e) => {
    setEmployeesFile(e.target.files[0]);
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!dealersFile && !employeesFile) {
      setError('Please select at least one file');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      if (dealersFile) formData.append('dealers', dealersFile);
      if (employeesFile) formData.append('employees', employeesFile);

      const response = await apiClient(token).post(`${API}/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setResult(response.data);
      setDealersFile(null);
      setEmployeesFile(null);
      
      // Clear file inputs
      document.getElementById('dealersInput').value = '';
      document.getElementById('employeesInput').value = '';
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    navigate('/login');
    return null;
  }

  return (
    <div className="app-container">
      <header className="top-nav">
        <h1>Bulk Import Excel Data</h1>
        <div>
          <a className="gold-btn" href="/dashboard">Back</a>
        </div>
      </header>
      <main>
        <section className="birthday-section" style={{ maxWidth: '600px' }}>
          <h2 className="decor-title">Upload Excel Files</h2>
          
          <div style={{ marginBottom: 20, padding: 15, backgroundColor: '#0f3b61', borderRadius: 8 }}>
            <p style={{ color: '#cfe3fb', marginTop: 0 }}>
              Upload your Excel files (Excel format: .xlsx or .xls)
            </p>
            <p style={{ color: '#aaa', fontSize: '14px' }}>
              Missing columns will be left blank. Only name and phone are required.
            </p>
          </div>

          <form onSubmit={handleImport} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Dealers File */}
            <div style={{ border: '2px dashed #d4af37', padding: 20, borderRadius: 8, textAlign: 'center' }}>
              <label style={{ color: '#d4af37', fontWeight: 'bold', display: 'block', marginBottom: 10 }}>
                📊 Dealers File (optional)
              </label>
              <input
                id="dealersInput"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleDealersFile}
                style={{
                  display: 'block',
                  margin: '0 auto 10px',
                  padding: '10px',
                  backgroundColor: '#0f3b61',
                  color: '#d4af37',
                  border: '1px solid #d4af37',
                  borderRadius: 5,
                  cursor: 'pointer'
                }}
              />
              {dealersFile && (
                <p style={{ color: '#90EE90', marginTop: 10 }}>
                  ✅ Selected: {dealersFile.name}
                </p>
              )}
              <p style={{ color: '#999', fontSize: '12px', marginTop: 10 }}>
                Columns: name, phoneNo, address, region, district, email, dateOfBirth, anniversaryDate, associatedSalesmanName, area, pinCode, latitude, longitude
              </p>
            </div>

            {/* Employees File */}
            <div style={{ border: '2px dashed #d4af37', padding: 20, borderRadius: 8, textAlign: 'center' }}>
              <label style={{ color: '#d4af37', fontWeight: 'bold', display: 'block', marginBottom: 10 }}>
                👥 Employees File (optional)
              </label>
              <input
                id="employeesInput"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleEmployeesFile}
                style={{
                  display: 'block',
                  margin: '0 auto 10px',
                  padding: '10px',
                  backgroundColor: '#0f3b61',
                  color: '#d4af37',
                  border: '1px solid #d4af37',
                  borderRadius: 5,
                  cursor: 'pointer'
                }}
              />
              {employeesFile && (
                <p style={{ color: '#90EE90', marginTop: 10 }}>
                  ✅ Selected: {employeesFile.name}
                </p>
              )}
              <p style={{ color: '#999', fontSize: '12px', marginTop: 10 }}>
                Columns: Name, Phone, email id, Zone, Designation, DOJ, Employee id
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                padding: 15,
                backgroundColor: '#c41e3a',
                color: 'white',
                borderRadius: 8,
                fontSize: '14px'
              }}>
                ❌ {error}
              </div>
            )}

            {/* Success Message */}
            {result && (
              <div style={{
                padding: 15,
                backgroundColor: '#0f7d3a',
                color: 'white',
                borderRadius: 8,
                fontSize: '14px'
              }}>
                <p style={{ marginTop: 0 }}>✅ Import completed successfully!</p>
                {result.dealers && (
                  <p>📊 Dealers: {result.dealers.inserted} inserted, {result.dealers.skipped} skipped</p>
                )}
                {result.employees && (
                  <p>👥 Employees: {result.employees.inserted} inserted, {result.employees.skipped} skipped</p>
                )}
              </div>
            )}

            {result && (result.employees?.details || result.dealers?.details) && (
              <div style={{marginTop:12}}>
                <h3 style={{color:'#d4af37'}}>Import Details</h3>
                {result.employees?.details && result.employees.details.length > 0 && (
                  <div style={{background:'#07293f',padding:10,borderRadius:6,marginBottom:10}}>
                    <strong>Employees (first 100 rows):</strong>
                    <ul style={{maxHeight:220,overflow:'auto',paddingLeft:18}}>
                      {result.employees.details.slice(0,100).map((d,i)=> (
                        <li key={i} style={{color:'#cfe3fb',marginBottom:6}}>
                          {d.status === 'inserted' ? `Inserted: ${d.name || d.phone}` : `Skipped: ${d.reason} ${d.phone?`(phone: ${d.phone})`:''}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.dealers?.details && result.dealers.details.length > 0 && (
                  <div style={{background:'#07293f',padding:10,borderRadius:6}}>
                    <strong>Dealers (first 100 rows):</strong>
                    <ul style={{maxHeight:220,overflow:'auto',paddingLeft:18}}>
                      {result.dealers.details.slice(0,100).map((d,i)=> (
                        <li key={i} style={{color:'#cfe3fb',marginBottom:6}}>
                          {d.status === 'inserted' ? `Inserted: ${d.name || d.phone}` : `Skipped: ${d.reason} ${d.phone?`(phone: ${d.phone})`:''}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="gold-btn"
              style={{
                padding: '12px 20px',
                fontSize: '16px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? '⏳ Importing...' : '🚀 Import Data'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
