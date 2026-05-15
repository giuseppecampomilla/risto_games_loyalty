import React, { useState, useEffect } from 'react';
import './App.css';
import Wheel from './Wheel';
import ScratchCard from './ScratchCard';
import SlotMachine from './SlotMachine';
import Login from './Login';
import Wallet from './Wallet';
import Leaderboard from './Leaderboard';
import Dashboard from './Dashboard';
import CelebrationModal from './CelebrationModal';
import TotemGame from './TotemGame';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_SECRET = 'sk_multigame_92a3b1d8f7e6c40a5b6c7d8e9f0a1b2c3d4e5f6';

// Durata massima della sessione (in millisecondi)
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 giorni

/**
 * Restituisce il token di sessione salvato se ancora valido, altrimenti null.
 */
function getValidSession() {
  try {
    const raw = localStorage.getItem('ristoLoyaltySession');
    if (!raw) return null;
    const token = JSON.parse(raw);
    if (!token?.email || !token?.issued_at) return null;
    if (Date.now() - token.issued_at > SESSION_DURATION_MS) {
      // Token scaduto: pulisci
      localStorage.removeItem('ristoLoyaltySession');
      localStorage.removeItem('ristoLoyaltyUser');
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeGame, setActiveGame] = useState('wheel');
  const [isLoading, setIsLoading] = useState(true);
  const [rewards, setRewards] = useState([]);
  const [leaderboardTrigger, setLeaderboardTrigger] = useState(0);
  const [appSettings, setAppSettings] = useState(null);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [countdown, setCountdown] = useState("");
  
  // Stati per Soglie Fedeltà (Celebrazione)
  const [celebrationMilestone, setCelebrationMilestone] = useState(null);
  const [milestonesReached, setMilestonesReached] = useState(() => {
    const saved = localStorage.getItem('ristoLoyaltyMilestonesReached');
    return saved ? JSON.parse(saved) : [];
  });
  const [milestonesCelebrated, setMilestonesCelebrated] = useState(() => {
    const saved = localStorage.getItem('ristoLoyaltyMilestonesCelebrated');
    return saved ? JSON.parse(saved) : [];
  });
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [isProcessingMilestone, setIsProcessingMilestone] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('ristoLoyaltyUser', JSON.stringify(user));
    }
  }, [user]);

  useEffect(() => {
    const initApp = async () => {
      // 🔍 DEBUG SESSIONE: controlla subito il localStorage
      const rawSession = localStorage.getItem('ristoLoyaltySession');
      console.log('Sessione trovata:', rawSession);

      // ✅ PERSISTENZA SESSIONE: se esiste un token valido, impostalo SUBITO
      // prima di qualsiasi chiamata asincrona per evitare flash della login
      const session = getValidSession();
      if (session) {
        const baseUser = { email: session.email, nome: session.nome || '', punti: 0, livello: 'Silver' };
        setUser(baseUser); // ← utente attivo IMMEDIATAMENTE
        console.log('✅ Sessione valida per:', session.email, '– bypass login');
      }

      // Carica le impostazioni app (in parallelo con il ripristino sessione)
      try {
        const settingsRes = await fetch(`${API_BASE_URL}/config/`, {
          mode: 'cors',
          headers: { 'X-API-Secret': API_SECRET }
        });
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

      if (session) {
        // Sessione OTP valida → aggiorna i dati dal server
        await fetchUserData(session.email);
      } else {
        setIsLoading(false);
      }
    };
    initApp();
  }, []);

  // 🔄 SINCRONIZZAZIONE REAL-TIME (Multiplayer focus)
  useEffect(() => {
    const handleFocus = () => {
      // Se l'utente torna sulla tab (es. dopo Multiplayer), sincronizza punti
      if (user?.email) {
        console.log("🔄 App tornata in focus - Sincronizzazione punti...");
        fetchUserData(user.email, true);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user?.email]);

  // 🎨 APPLICAZIONE STILI DINAMICI (Colors dal Backend)
  useEffect(() => {
    if (appSettings) {
      const root = document.documentElement;
      root.style.setProperty('--bg-color', appSettings.color_bg || '#000000');
      root.style.setProperty('--accent-color', appSettings.color_accent || '#c5a35d');
      root.style.setProperty('--card-bg', appSettings.color_card || '#1a1a1a');
      root.style.setProperty('--text-color', appSettings.color_text || '#ffffff');
      root.style.setProperty('--btn-text', appSettings.color_btn_text || '#000000');
      
      // Aggiorna il titolo del documento per SEO/Branding
      if (appSettings.text_title) {
        document.title = appSettings.text_title;
      }
    }
  }, [appSettings]);

  // 🏆 MONITORAGGIO SOGLIE FEDELTÀ (Persistenza DB + Sequenza Popup)
  useEffect(() => {
    const handleMilestoneSync = async () => {
      if (user && appSettings?.milestones && appSettings.milestones.length > 0 && !isProcessingMilestone) {
        const currentPoints = parseInt(user.punti) || 0;
        
        // 1. Trova la soglia raggiunta non ancora salvata su DB
        const reached = appSettings.milestones
          .filter(m => currentPoints >= parseInt(m.points))
          .filter(m => !milestonesReached.includes(parseInt(m.points)))
          .sort((a, b) => parseInt(b.points) - parseInt(a.points))[0];

        if (reached) {
          setIsProcessingMilestone(true);
          console.log("🎯 Raggiunto traguardo:", reached.points, "punti. Salvataggio DB...");
          
          // BLOCCO IMMEDIATO: Aggiungiamo subito all'array locale per evitare loop se un altro effetto triggera prima della risposta API
          setMilestonesReached(prev => [...prev, parseInt(reached.points)]);

          try {
            await fetch(`${API_BASE_URL}/add-milestone-reward/`, {
              method: 'POST',
              mode: 'cors',
              headers: { 'Content-Type': 'application/json', 'X-API-Secret': API_SECRET },
              body: JSON.stringify({ email: user.email, milestone_points: reached.points, prize: reached.prize })
            });
            console.log("✅ Premio traguardo salvato su server.");
          } catch (err) {
            console.error("❌ Errore sincronizzazione traguardo:", err);
          } finally {
            setIsProcessingMilestone(false);
          }
        }
      }
    };

    // 2. LOGICA VISUALIZZAZIONE POPUP (Sincronizzata con i giochi)
    // Mostriamo il popup se una soglia è raggiunta E salvata (milestonesReached) MA non ancora celebrata a video (milestonesCelebrated)
    if (user && appSettings?.milestones && !isGameModalOpen && !celebrationMilestone) {
        const currentPoints = parseInt(user.punti) || 0;
        const waitingToBeCelebrated = appSettings.milestones
          .filter(m => currentPoints >= parseInt(m.points))
          .filter(m => milestonesReached.includes(parseInt(m.points)))
          .filter(m => !milestonesCelebrated.includes(parseInt(m.points)))
          .sort((a, b) => parseInt(b.points) - parseInt(a.points))[0];
          
        if (waitingToBeCelebrated) {
           console.log("🥳 Attivazione celebrazione per soglia:", waitingToBeCelebrated.points);
           setCelebrationMilestone(waitingToBeCelebrated);
        }
    }

    handleMilestoneSync();
  }, [user?.punti, appSettings?.milestones, milestonesReached, milestonesCelebrated, isGameModalOpen, isProcessingMilestone]);

  // Persistenza locale degli stati milestone
  useEffect(() => {
    localStorage.setItem('ristoLoyaltyMilestonesReached', JSON.stringify(milestonesReached));
  }, [milestonesReached]);

  useEffect(() => {
    localStorage.setItem('ristoLoyaltyMilestonesCelebrated', JSON.stringify(milestonesCelebrated));
  }, [milestonesCelebrated]);

  const fetchUserData = async (email, silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/user-data/?email=${encodeURIComponent(email)}`, {
        mode: 'cors',
        headers: { 'X-API-Secret': API_SECRET }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser(prev => ({
            ...prev,
            punti: data.user.punti,
            punti_totali: data.user.punti_totali || prev.punti,
            nome: data.user.nome || prev.nome,
            avatar: data.user.avatar || prev.avatar,
            play_count: data.user.play_count,
            period_start: data.user.period_start
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
    // 1. Svuota completamente il localStorage (tutti i dati di sessione)
    localStorage.clear();
    // 2. Redirect alla root della nuova Web App su Oracle
    window.location.href = 'http://130.110.6.128/';
  };

  const AVATAR_LIST = ['👤', '🐵', '🐿️', '🎮', '🏆', '🍕', '🍔', '🤖', '👻', '👽'];

  const handleAvatarSelect = async (avatar) => {
    setUser(prev => ({ ...prev, avatar }));
    try {
      const fd = new URLSearchParams();
      fd.append('email', user.email);
      fd.append('avatar', avatar);
      await fetch(`${API_BASE_URL}/update-avatar/`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-API-Secret': API_SECRET
        },
        body: fd
      });
    } catch (e) {
      console.error('Errore salvataggio avatar:', e);
    }
  };

  const handleWheelWin = async (wonPoints, premio) => {
    // Aggiornamento ottimistico: aumenta i punti subito per l'animazione
    setUser(prev => ({ ...prev, punti: prev.punti + wonPoints }));
    
    try {
      // Background request to WordPress without blocking the UI
      const response = await fetch(`${API_BASE_URL}/process-win/`, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Secret': API_SECRET
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
          // Sync all user data fields returned by process-win
          setUser(prev => ({ 
            ...prev, 
            punti: data.punti,
            play_count: parseInt(data.play_count || prev.play_count),
            period_start: data.period_start || prev.period_start
          }));
        } else {
          console.error('❌ ERRORE Server:', data.message || data.code);
        }
      } else if (response.status === 403) {
        // Limite raggiunto: BLOCCO TOTALE e redirect
        const data = await response.json();
        alert("⚠️ " + (data.message || "Hai già raggiunto il limite di giocate!"));
        
        await fetchUserData(user.email, true);
        setActiveTab('dashboard'); // Forza l'uscita dal gioco
        setIsGameModalOpen(false); // Chiude eventuali modali di vittoria
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

  const canUserPlay = () => {
    if (!user || !appSettings) return true;
    const maxPlays = appSettings.max_plays || 1;
    const playPeriod = appSettings.play_period || 24;
    const periodUnit = appSettings.play_period_unit || 'hours';
    const periodMs = (periodUnit === 'days' ? playPeriod * 24 : playPeriod) * 60 * 60 * 1000;
    if (!user.period_start) return true;
    const startTime = new Date(user.period_start).getTime();
    const now = new Date().getTime();
    if (now - startTime >= periodMs) return true;
    return user.play_count < maxPlays;
  };

  useEffect(() => {
    const updateCountdown = () => {
      if (!user || !appSettings || !user.period_start || canUserPlay()) {
        setCountdown("");
        return;
      }
      const playPeriod = appSettings.play_period || 24;
      const periodUnit = appSettings.play_period_unit || 'hours';
      const periodMs = (periodUnit === 'days' ? playPeriod * 24 : playPeriod) * 60 * 60 * 1000;
      const startTime = new Date(user.period_start).getTime();
      const nextPlayTime = startTime + periodMs;
      const remainingMs = nextPlayTime - new Date().getTime();
      if (remainingMs <= 0) {
        setCountdown("");
        return;
      }
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
      setCountdown(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [user, appSettings]);

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
    return <Login onLogin={handleLogin} signupBonus={appSettings?.signup_bonus || 150} disableAutoOtp={false} />;
  }

  // Utenti con token di sessione valido sono già stati verificati via OTP almeno una volta.
  // Il check is_verified === 0 non è necessario in quel caso (il session token garantisce l'identità).

  if (!user && isLoading) {
    return (
      <div className="loader-screen">
        <div className="spinner-small"></div>
        <p style={{marginTop:'1rem', color:'#fbbf24'}}>Caricamento Club...</p>
      </div>
    );
  }

  // Handler: dal Dashboard → vai alla selezione giochi
  const handlePlaySingoli = () => {
    // Seleziona il gioco di default in base alle impostazioni
    const gt = appSettings?.game_type;
    if (gt === 'gratta_e_vinci') setActiveGame('scratch');
    else if (gt === 'slot_machine') setActiveGame('slot');
    else setActiveGame('wheel');
    setActiveTab('gioca');
  };

  return (
    <div class="bg-background text-on-background font-body min-h-screen">
      {isLoading && (
        <div className="sync-overlay">
           <div className="spinner-small"></div>
           <span>Sincronizzazione...</span>
        </div>
      )}

      {/* TopAppBar */}
      <header
          class="bg-neutral-950/60 backdrop-blur-xl flex justify-between items-center w-full px-6 py-4 sticky top-0 z-50 shadow-[0_10px_40px_rgba(255,173,74,0.08)] bg-gradient-to-b from-neutral-900 to-transparent">
          <div class="flex items-center gap-3">
              <div class="relative cursor-pointer" onClick={() => setActiveTab('profilo')}>
                  <div class="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary font-bold border border-secondary/40 text-xl">
                    {user.avatar ? user.avatar : (user.nome || '?').charAt(0).toUpperCase()}
                  </div>
                  <div
                      class="absolute -top-1 -right-1 w-3 h-3 bg-secondary rounded-full border-2 border-surface shadow-[0_0_8px_#26fedc]">
                  </div>
              </div>
              <span
                  class="font-headline font-black text-2xl text-amber-500 tracking-[0.2em] drop-shadow-[0_0_10px_rgba(255,173,74,0.5)] uppercase cursor-pointer"
                  onClick={() => setActiveTab('dashboard')}>
                  ARCADE
              </span>
          </div>
          <button
              onClick={() => setActiveTab('wallet')}
              class="bg-surface-container-high px-4 py-2 rounded-full border border-outline-variant/15 active:scale-95 transition-transform">
              <span class="font-headline font-bold text-amber-500 tracking-tighter uppercase">{(user.punti || 0).toLocaleString()} PTS</span>
          </button>
      </header>

      <main class={`${activeTab === 'totem' ? 'pb-24' : 'pb-32'} px-4 max-w-5xl mx-auto`}>

        {/* ── DASHBOARD ── */}
        {activeTab === 'dashboard' && (
          <Dashboard
            user={user}
            rewards={rewards}
            appSettings={appSettings}
            onPlaySingoli={handlePlaySingoli}
            countdown={countdown}
            canPlay={canUserPlay()}
            onLogout={handleLogout}
            onPlayMultiplayer={() => setActiveTab('totem')}
          />
        )}

        {/* ── GIOCA (selezione gioco + gioco attivo) ── */}
        {activeTab === 'gioca' && (
          <div className="py-6">
            {/* Selezione gioco se nessun gioco è in corso */}
            <div className="bg-surface-container-low rounded-lg p-1 border border-outline-variant/10 overflow-hidden shadow-2xl">
              {activeGame === 'wheel' && (
                <Wheel
                  onWin={handleWheelWin}
                  settings={appSettings}
                  canPlay={canUserPlay()}
                  onGoToWallet={() => setActiveTab('wallet')}
                  onModalToggle={(open) => setIsGameModalOpen(open)}
                />
              )}
              {activeGame === 'scratch' && (
                <ScratchCard
                  onWin={handleWheelWin}
                  settings={appSettings}
                  canPlay={canUserPlay()}
                  onGoToWallet={() => setActiveTab('wallet')}
                  onModalToggle={(open) => setIsGameModalOpen(open)}
                />
              )}
              {activeGame === 'slot' && (
                <SlotMachine
                  onWin={handleWheelWin}
                  settings={appSettings}
                  canPlay={canUserPlay()}
                  onGoToWallet={() => setActiveTab('wallet')}
                  onModalToggle={(open) => setIsGameModalOpen(open)}
                />
              )}
            </div>

            {/* Switcher giochi (se game_type = 'all') */}
            {(appSettings?.game_type === 'all' || !appSettings?.game_type) && (
              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.5rem' }}>
                {[{id:'wheel', icon:'🎡', label:'Ruota'}, {id:'scratch', icon:'🎟️', label:'Scratch'}, {id:'slot', icon:'🎰', label:'Slot'}].map(g => (
                  <button
                    key={g.id}
                    onClick={() => setActiveGame(g.id)}
                    className={`px-6 py-3 rounded-full font-bold text-sm transition-all border ${
                      activeGame === g.id 
                        ? 'bg-primary/20 border-primary text-primary' 
                        : 'bg-surface-container-high border-outline-variant/20 text-on-surface-variant'
                    }`}
                  >
                    {g.icon} {g.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── WALLET ── */}
        {activeTab === 'wallet' && (
          <div className="py-6">
            <Wallet 
               email={user.email} 
               rewards={rewards} 
               onRedeemSuccess={(code) => {
                 removeReward(code);
                 fetchUserData(user.email, true);
               }} 
            />
          </div>
        )}

        {/* ── CLASSIFICA ── */}
        {activeTab === 'classifica' && (
          <div className="py-6">
            <Leaderboard currentUser={user} refreshTrigger={leaderboardTrigger} />
          </div>
        )}

        {/* ── PROFILO ── */}
        {activeTab === 'profilo' && (
          <div className="py-12 flex flex-col items-center">
            <div className="w-24 h-24 rounded-2xl bg-primary/20 flex items-center justify-center text-primary text-5xl border-2 border-primary/40 mb-6 shadow-[0_0_30px_rgba(255,173,74,0.2)]">
              {user.avatar ? user.avatar : (user.nome || '?').charAt(0).toUpperCase()}
            </div>
            <h2 className="text-3xl font-headline font-black uppercase tracking-tight">{user.nome}</h2>
            <p className="text-primary font-bold mt-2">{user.punti.toLocaleString()} PT • {user.livello || 'Silver'}</p>
            <p className="text-on-surface-variant text-sm mt-1 mb-8">{user.email}</p>
            
            {/* Galleria Avatar */}
            <div className="w-full max-w-sm mb-12">
               <h3 className="text-on-surface-variant font-label text-xs uppercase tracking-widest text-center mb-4">Scegli il tuo Avatar</h3>
               <div className="flex flex-wrap justify-center gap-3">
                  {AVATAR_LIST.map(av => (
                     <button
                        key={av}
                        onClick={() => handleAvatarSelect(av)}
                        className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all ${user.avatar === av ? 'bg-secondary/20 border-2 border-secondary scale-110 shadow-[0_0_15px_rgba(38,254,220,0.3)]' : 'bg-surface-container-high border border-outline-variant/10 hover:bg-surface-container-highest'}`}
                     >
                        {av}
                     </button>
                  ))}
               </div>
            </div>

            <button
              className="mt-12 w-full max-w-xs bg-error-container text-on-error-container py-4 rounded-xl font-bold border border-error/30 active:scale-95 transition-transform"
              onClick={handleLogout}
            >
              LOGOUT 🔓
            </button>
          </div>
        )}

        {/* ── TOTEM MULTIPLAYER ── */}
        {activeTab === 'totem' && (
           <div className="py-6">
             <TotemGame 
                user={user} 
                appSettings={appSettings} 
                onExit={() => setActiveTab('dashboard')}
                onDataRefresh={() => fetchUserData(user.email, true)}
             />
           </div>
        )}

      </main>

      {/* Bottom Navigation */}
      <nav
          class="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pt-4 pb-8 bg-neutral-900/90 backdrop-blur-2xl shadow-[0_-15px_50px_rgba(0,0,0,0.5)] rounded-t-[3rem]">
          <button 
            className={`flex flex-col items-center justify-center transition-all active:scale-90 duration-200 ${activeTab === 'dashboard' ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(255,173,74,0.8)] scale-110' : 'text-neutral-600'}`}
            onClick={() => setActiveTab('dashboard')}>
              <span className="material-symbols-outlined text-2xl mb-1" style={{ fontVariationSettings: activeTab === 'dashboard' ? "'FILL' 1" : "'FILL' 0" }}>sports_esports</span>
              <span class="font-body font-extrabold text-[10px] tracking-widest uppercase">Home</span>
          </button>
          <button 
            className={`flex flex-col items-center justify-center transition-all active:scale-90 duration-200 ${activeTab === 'gioca' ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(255,173,74,0.8)] scale-110' : 'text-neutral-600'}`}
            onClick={() => handlePlaySingoli()}>
              <span className="material-symbols-outlined text-2xl mb-1" style={{ fontVariationSettings: activeTab === 'gioca' ? "'FILL' 1" : "'FILL' 0" }}>videogame_asset</span>
              <span class="font-body font-extrabold text-[10px] tracking-widest uppercase">Play</span>
          </button>
          <button 
            className={`flex flex-col items-center justify-center transition-all active:scale-90 duration-200 ${activeTab === 'classifica' ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(255,173,74,0.8)] scale-110' : 'text-neutral-600'}`}
            onClick={() => setActiveTab('classifica')}>
              <span className="material-symbols-outlined text-2xl mb-1" style={{ fontVariationSettings: activeTab === 'classifica' ? "'FILL' 1" : "'FILL' 0" }}>leaderboard</span>
              <span class="font-body font-extrabold text-[10px] tracking-widest uppercase">Board</span>
          </button>
          <button 
            className={`flex flex-col items-center justify-center transition-all active:scale-90 duration-200 ${activeTab === 'wallet' ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(255,173,74,0.8)] scale-110' : 'text-neutral-600'}`}
            onClick={() => setActiveTab('wallet')}>
              <span className="material-symbols-outlined text-2xl mb-1" style={{ fontVariationSettings: activeTab === 'wallet' ? "'FILL' 1" : "'FILL' 0" }}>military_tech</span>
              <span class="font-body font-extrabold text-[10px] tracking-widest uppercase">Prizes</span>
          </button>
      </nav>

      {/* MODAL CELEBRAZIONE SOGLIA */}
      {celebrationMilestone && (
        <CelebrationModal 
          milestone={celebrationMilestone} 
          onGoToWallet={() => {
            const pts = parseInt(celebrationMilestone.points);
            if (!milestonesCelebrated.includes(pts)) {
              setMilestonesCelebrated(prev => [...prev, pts]);
            }
            setCelebrationMilestone(null);
            setActiveTab('wallet');
          }}
          onClose={() => {
            const pts = parseInt(celebrationMilestone.points);
            if (!milestonesCelebrated.includes(pts)) {
              setMilestonesCelebrated(prev => [...prev, pts]);
            }
            setCelebrationMilestone(null);
          }} 
        />
      )}
    </div>
  );
}

export default App;
