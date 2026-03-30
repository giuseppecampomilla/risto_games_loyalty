import React, { useState } from 'react';
import './App.css';
import Wheel from './Wheel';

function App() {
  const [user, setUser] = useState({
    nome: 'Giuseppe',
    punti: 150,
    livello: 'Silver'
  });
  
  const [activeTab, setActiveTab] = useState('home');

  const [rewards, setRewards] = useState([
    { id: 1, name: 'Caffè Omaggio ☕', date: 'Oggi', code: 'CFX921' },
    { id: 2, name: 'Sconto 10% 🎫', date: 'Ieri', code: 'SCN10A' },
  ]);

  const targetPoints = 500;
  const progressPercent = Math.min((user.punti / targetPoints) * 100, 100);

  // Per ora simuliamo l'aggiunta di punti per test
  const handleSimulatePoints = () => {
    setUser(prev => ({ ...prev, punti: prev.punti + 50 }));
  };

  return (
    <div className="loyalty-app">
      <div className="loyalty-container">
        
        {/* Header Profile & Points */}
        <header className="loyalty-header">
          <div className="profile-info">
            <div className="avatar">{user.nome.charAt(0)}</div>
            <div className="welcome-text">
              <span className="greeting">Bentornato,</span>
              <h1 className="name">{user.nome}</h1>
            </div>
          </div>
          <div className="points-badge">
            <span className="points-value">{user.punti}</span>
            <span className="points-label">pt</span>
          </div>
        </header>

        {/* Progress Bar Livello */}
        <div className="level-progress-section card-glass">
          <div className="level-header">
            <span className="current-level">Livello {user.livello}</span>
            <span className="target-level">Gold 🏆</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <p className="progress-text">
            Mancano <strong>{Math.max(0, targetPoints - user.punti)} punti</strong> per raggiungere il livello Gold!
          </p>
        </div>

        {/* Main Action Area */}
        <main className="loyalty-main">
          {activeTab === 'home' && (
            <>
              <div className="card-glass center-content" style={{marginBottom: '2rem'}}>
                <h2 className="section-title">Premi Sempre Più Vicini</h2>
                <p className="section-subtitle">Continua a guadagnare punti e sblocca ricompense esclusive.</p>
                <button className="btn-spin" onClick={() => setActiveTab('ruota')}>
                  GIRA LA RUOTA
                </button>
              </div>

              {/* Recent Rewards */}
              <div className="rewards-section">
                <div className="rewards-header">
                  <h3 className="section-title">Ultimi Premi Vinti</h3>
                  <a href="#" className="see-all">Vedi tutti</a>
                </div>
                
                <div className="rewards-list">
                  {rewards.map(reward => (
                    <div key={reward.id} className="reward-item card-glass">
                      <div className="reward-icon">🎁</div>
                      <div className="reward-details">
                        <h4 className="reward-name">{reward.name}</h4>
                        <span className="reward-date">{reward.date}</span>
                      </div>
                      <div className="reward-code">
                        <span>{reward.code}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'ruota' && (
            <div className="card-glass center-content">
               <Wheel />
               <button className="btn-spin" onClick={handleSimulatePoints} style={{marginTop: '30px', padding: '10px 20px', fontSize: '0.9rem', width: 'auto'}}>
                  + SIMULA 50 PUNTI
               </button>
            </div>
          )}

          {activeTab === 'profilo' && (
            <div className="card-glass center-content">
               <div className="avatar" style={{width:'80px', height:'80px', fontSize:'2rem', marginBottom:'1rem'}}>{user.nome.charAt(0)}</div>
               <h2>{user.nome}</h2>
               <p style={{marginTop: '0.5rem', color: '#a1a1aa'}}>{user.punti} Punti Totali • Livello {user.livello}</p>
               <p style={{marginTop: '2rem', color: '#555', fontSize: '0.85rem'}}>Impostazioni e storico completo in arrivo...</p>
            </div>
          )}
        </main>

        {/* Spacer per Nav Bottom */}
        <div style={{ height: '90px' }}></div>
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button 
          className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Home</span>
        </button>
        <button 
          className={`nav-item center-nav-action ${activeTab === 'ruota' ? 'active' : ''}`}
          onClick={() => setActiveTab('ruota')}
        >
          <div className="nav-icon-floating">🎡</div>
          <span className="nav-label">Ruota</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'profilo' ? 'active' : ''}`}
          onClick={() => setActiveTab('profilo')}
        >
          <span className="nav-icon">👤</span>
          <span className="nav-label">Profilo</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
