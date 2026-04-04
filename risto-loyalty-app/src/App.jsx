import React, { useState, useEffect } from 'react';
import './App.css';
import Wheel from './Wheel';
import ScratchCard from './ScratchCard';
import SlotMachine from './SlotMachine';
import Login from './Login';
import Wallet from './Wallet';
import Leaderboard from './Leaderboard';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [activeGame, setActiveGame] = useState('wheel');
  const [isLoading, setIsLoading] = useState(true);
  const [rewards, setRewards] = useState([]);
  const [leaderboardTrigger, setLeaderboardTrigger] = useState(0);
  const [appSettings, setAppSettings] = useState(null);
  const [isMaintenance, setIsMaintenance] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        const settingsRes = await fetch(`${API_BASE_URL}/settings/`);
        if (settingsRes.ok) {
           const settingsData = await settingsRes.json();
           setAppSettings(settingsData);
        } else {
           setIsMaintenance(true);
           setIsLoading(false);
           return;
        }
      } catch (err) {
        setIsMaintenance(true);
        setIsLoading(false);
        return;
      }

      const savedUser = localStorage.getItem('ristoLoyaltyUser');
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        await fetchUserData(parsedUser.email);
      } else {
        setIsLoading(false);
      }
    };
    initApp();
  }, []);

  const fetchUserData = async (email, silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/user-data/?email=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser(prev => ({
            ...prev,
            punti: data.user.punti,
            punti_totali: data.user.punti_totali || prev.punti,
            nome: data.user.nome || prev.nome
          }));
          setRewards(data.rewards || []);
        }
      }
    } catch (e) {
      console.error('Errore sincronizzazione:', e);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const handleLogin = async (userData) => {
    setIsLoading(true);
    setUser(userData);
    localStorage.setItem('ristoLoyaltyUser', JSON.stringify(userData));
    await fetchUserData(userData.email);
  };

  const handleLogout = () => {
    localStorage.removeItem('ristoLoyaltyUser');
    setUser(null);
    setActiveTab('home');
  };

  const handleWheelWin = async (wonPoints, premio) => {
    // Aggiornamento ottimistico: aumenta i punti subito per l'animazione
    setUser(prev => ({ ...prev, punti: prev.punti + wonPoints }));
    
    try {
      // Background request to WordPress without blocking the UI
      const response = await fetch(`${API_BASE_URL}/process-win/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          points: wonPoints,
          premio_fisico: premio,
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          // Keep the true server sync value, which might differ slightly if there were other modifiers
          setUser(prev => ({ ...prev, punti: data.punti }));
        } else {
          console.error('❌ ERRORE Server:', data.message || data.code);
        }
      }
    } catch (err) {
      console.error("❌ ERRORE FETCH:", err);
    } finally {
      // Sincronizza portafoglio e altri dati silenziosamente (senza loader a schermo intero)
      await fetchUserData(user.email, true);
      setLeaderboardTrigger(prev => prev + 1);
    }
  };

  const removeReward = (codice) => {
    const el = document.getElementById(`reward-${codice}`);
    if (el) {
      el.classList.add('removing');
      setTimeout(() => {
        setRewards(prev => prev.filter(r => r.codice_univoco !== codice));
      }, 400);
    } else {
      setRewards(prev => prev.filter(r => r.codice_univoco !== codice));
    }
  };

  if (isMaintenance) {
    return (
      <div className="loyalty-app center-content">
        <div className="card-glass" style={{padding: '2rem'}}>
          <div style={{fontSize:'3rem', marginBottom:'1rem'}}>🚧</div>
          <h2>Manutenzione in corso</h2>
          <p>L'app è momentaneamente disconnessa. Controlla la tua connessione o riprova più tardi.</p>
        </div>
      </div>
    );
  }

  if (!user && !isLoading) {
    return <Login onLogin={handleLogin} signupBonus={appSettings?.signup_bonus || 150} />;
  }

  if (!user && isLoading) {
    return (
      <div className="loader-screen">
        <div className="spinner-small"></div>
        <p style={{marginTop:'1rem', color:'#fbbf24'}}>Caricamento Club...</p>
      </div>
    );
  }

  const targetPoints = appSettings?.milestones?.[1]?.points ? parseInt(appSettings.milestones[1].points) : 500;
  const progressPercent = Math.min((user.punti / targetPoints) * 100, 100);

  return (
    <div className="loyalty-app">
      {isLoading && (
        <div className="sync-overlay">
           <div className="spinner-small"></div>
           <span>Sincronizzazione API in corso...</span>
        </div>
      )}

      <div className="loyalty-container">
        <header className="loyalty-header">
          <div className="profile-info">
            <div className="avatar">{user.nome.charAt(0).toUpperCase()}</div>
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

        <div className="level-progress-section card-glass">
          <div className="level-header">
            <span className="current-level">Livello {user.livello || 'Silver'}</span>
            <span className="target-level">Gold 🏆</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <p className="progress-text">
            Mancano <strong>{Math.max(0, targetPoints - user.punti)} punti</strong> al Gold!
          </p>
        </div>

        <main className="loyalty-main">
          {activeTab === 'home' && (
            <>
              <div className="card-glass center-content" style={{marginBottom: '2rem'}}>
                <h2 className="section-title">Scegli il tuo gioco</h2>
                <p className="section-subtitle">Vinci premi esclusivi o raccogli punti fedeltà in tempo reale.</p>
                <div className={`game-selection-grid ${(appSettings?.game_type !== 'all' && appSettings?.game_type) ? 'single-game' : ''}`}>
                  {(appSettings?.game_type === 'all' || !appSettings?.game_type || appSettings?.game_type === 'ruota_fortuna') && (
                    <button className="game-btn" onClick={() => { setActiveGame('wheel'); setActiveTab('ruota'); }}>
                      <span className="game-icon">🎡</span> Ruota Fortunata
                    </button>
                  )}
                  {(appSettings?.game_type === 'all' || !appSettings?.game_type || appSettings?.game_type === 'gratta_e_vinci') && (
                    <button className="game-btn" onClick={() => { setActiveGame('scratch'); setActiveTab('ruota'); }}>
                      <span className="game-icon">🎟️</span> Gratta e Vinci
                    </button>
                  )}
                  {(appSettings?.game_type === 'all' || !appSettings?.game_type || appSettings?.game_type === 'slot_machine') && (
                    <button className="game-btn" onClick={() => { setActiveGame('slot'); setActiveTab('ruota'); }}>
                      <span className="game-icon">🎰</span> Slot Machine
                    </button>
                  )}
                </div>
              </div>

              <Wallet email={user.email} rewards={rewards} onRedeemSuccess={removeReward} />
            </>
          )}

          {activeTab === 'ruota' && (
            <div className="card-glass center-content" style={{ padding: '20px 10px' }}>
               {activeGame === 'wheel' && (
                 <Wheel 
                   onWin={handleWheelWin} 
                   settings={appSettings}
                   onGoToWallet={() => {
                     setActiveTab('home');
                     setTimeout(() => {
                       const walletEl = document.getElementById('wallet-section');
                       if (walletEl) walletEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                     }, 150);
                   }}
                 />
               )}
               {activeGame === 'scratch' && (
                 <ScratchCard 
                   onWin={handleWheelWin} 
                   settings={appSettings}
                   onGoToWallet={() => {
                     setActiveTab('home');
                     setTimeout(() => {
                       const walletEl = document.getElementById('wallet-section');
                       if (walletEl) walletEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                     }, 150);
                   }}
                 />
               )}
               {activeGame === 'slot' && (
                 <SlotMachine 
                   onWin={handleWheelWin} 
                   settings={appSettings}
                   onGoToWallet={() => {
                     setActiveTab('home');
                     setTimeout(() => {
                       const walletEl = document.getElementById('wallet-section');
                       if (walletEl) walletEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                     }, 150);
                   }}
                 />
               )}
            </div>
          )}

          {activeTab === 'classifica' && (
             <Leaderboard currentUser={user} refreshTrigger={leaderboardTrigger} />
          )}

          {activeTab === 'profilo' && (
            <div className="card-glass center-content">
               <div className="avatar" style={{width:'80px', height:'80px', fontSize:'2.5rem', marginBottom:'1rem'}}>{user.nome.charAt(0).toUpperCase()}</div>
               <h2>{user.nome}</h2>
               <p style={{marginTop: '0.5rem', color: '#a1a1aa'}}>{user.punti} Punti Totali • Livello {user.livello || 'Silver'}</p>
               <p style={{marginTop: '1rem', color: '#555', fontSize: '0.9rem'}}>{user.email}</p>
               
               <button 
                 className="btn-spin" 
                 onClick={handleLogout} 
                 style={{
                   marginTop: '2rem', 
                   padding: '12px 24px', 
                   fontSize: '0.9rem', 
                   background: 'transparent', 
                   border: '1px solid rgba(255,255,255,0.2)', 
                   color: '#fafafa', 
                   boxShadow: 'none'
                 }}
               >
                  LOGOUT
               </button>
            </div>
          )}
        </main>

        <div style={{ height: '90px' }}></div>
      </div>

      <nav className="bottom-nav">
        <button 
          className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Home</span>
        </button>
        <button 
          className={`nav-item ${activeTab === 'classifica' ? 'active' : ''}`}
          onClick={() => setActiveTab('classifica')}
        >
          <span className="nav-icon">🏆</span>
          <span className="nav-label">Classifica</span>
        </button>
        <button 
          className={`nav-item center-nav-action ${activeTab === 'ruota' ? 'active' : ''}`}
          onClick={() => setActiveTab('ruota')}
        >
          <div className="nav-icon-floating">🎲</div>
          <span className="nav-label">Gioca</span>
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
