import React, { useState } from 'react';
import './Login.css';

export default function Login({ onLogin, signupBonus = 150 }) {
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (email && nome) {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const API_BASE_URL = 'https://soundframes.netsons.org/wp-json/loyalty/v1';
        const res = await fetch(`${API_BASE_URL}/check-nickname/?nome=${encodeURIComponent(nome)}&email=${encodeURIComponent(email)}`);
        
        if (res.ok) {
            const data = await res.json();
            if (data.taken) {
                setErrorMsg('Questo Nickname è già in uso. Scegline un altro!');
                setIsLoading(false);
                return; // Ferma il login
            }
        }
      } catch (err) {
        console.error("Errore validazione nickname", err);
      }
      
      setIsLoading(false);
      onLogin({ email, nome, punti: signupBonus, livello: 'Silver' });
    }
  };

  return (
    <div className="login-container">
      <div className="login-card card-glass">
        <div className="login-header">
           <div className="login-avatar">👑</div>
           <h2>Benvenuto al Club</h2>
           <p>Inserisci i tuoi dati per accedere al programma fedeltà e ai premi esclusivi.</p>
        </div>
        
        {errorMsg && (
            <div style={{ background: '#ef444420', color: '#fca5a5', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center', border: '1px solid #ef4444' }}>
                {errorMsg}
            </div>
        )}
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label>Nickname</label>
            <input 
              type="text" 
              placeholder="Come ti chiami?" 
              value={nome} 
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Email</label>
            <input 
              type="email" 
              placeholder="La tua email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit" className={`btn-spin ${isLoading ? 'disabled' : ''}`} style={{marginTop: '1rem'}} disabled={isLoading}>
            {isLoading ? 'ATTENDERE...' : 'ENTRA ORA'}
          </button>
        </form>

      </div>
    </div>
  );
}
