import React, { useState } from 'react';
import './Login.css';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email && nome) {
      onLogin({ email, nome, punti: 150, livello: 'Silver' });
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
          <button type="submit" className="btn-spin" style={{marginTop: '1rem'}}>
            ENTRA ORA
          </button>
        </form>
      </div>
    </div>
  );
}
