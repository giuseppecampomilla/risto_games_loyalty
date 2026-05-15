import React, { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_SECRET = 'sk_multigame_92a3b1d8f7e6c40a5b6c7d8e9f0a1b2c3d4e5f6';

export default function Wallet({ email, onRedeemSuccess }) {
  const [rewards, setRewards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReward, setSelectedReward] = useState(null);
  const [pin, setPin] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Caricamento premi
  useEffect(() => {
    const fetchRewards = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/get-user-rewards/?email=${encodeURIComponent(email)}&api_secret=${API_SECRET}`, {
          mode: 'cors',
          headers: { 'X-API-Secret': API_SECRET }
        });
        
        if (response.ok) {
          const data = await response.json();
          // Solo dati reali dal database
          if (data.success && data.rewards) {
            setRewards(data.rewards);
          } else {
            setRewards([]);
          }
        } else {
          setRewards([]);
        }
      } catch (e) {
        console.error("Errore fetch rewards:", e);
        setRewards([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRewards();
  }, [email]);

  const handleOpenPin = (reward) => {
    setSelectedReward(reward);
    setPin('');
    setErrorMsg('');
  };

  const closePinModal = () => {
    setSelectedReward(null);
    setPin('');
    setErrorMsg('');
  };

  const handleNumberClick = (num) => {
    // PIN limitato a 4 cifre (standard 0000)
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setErrorMsg('');
    }
  };

  const handleClear = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (pin.length < 4) {
        setErrorMsg('Inserisci un PIN a 4 cifre.');
        return;
    }
    
    setIsRedeeming(true);
    setErrorMsg('');

    try {
      const response = await fetch(`${API_BASE_URL}/redeem-reward/?api_secret=${API_SECRET}`, {
        method: 'POST',
        mode: 'cors',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Secret': API_SECRET 
        },
        body: JSON.stringify({
          email: email,
          code: selectedReward.codice_univoco,
          pin: pin
        })
      });

      const data = await response.json();
      if (data.success) {
        setRewards(prev => prev.filter(r => r.codice_univoco !== selectedReward.codice_univoco));
        onRedeemSuccess(selectedReward.codice_univoco);
        closePinModal();
      } else {
        setErrorMsg(data.message || 'PIN errato. Riprova.');
      }
    } catch (e) {
      setErrorMsg('Errore di connessione. Riprova.');
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="wallet-page-container">
      <div className="dash-hero-card" style={{marginBottom: '1.5rem', padding: '1.2rem'}}>
        <div className="dash-hero-left">
          <h2 style={{color:'#fbbf24', fontSize:'1.4rem', margin:0}}>I Tuoi Premi</h2>
          <p style={{color:'#a1a1aa', fontSize:'0.85rem', marginTop:'4px'}}>Tutti i vantaggi che hai sbloccato</p>
        </div>
        <div style={{fontSize:'2.5rem'}}>🎁</div>
      </div>
      
      {isLoading ? (
        <div className="dash-empty">
          <div className="spinner-small" style={{margin:'0 auto'}} />
          <p style={{marginTop:'1rem'}}>Caricamento premi...</p>
        </div>
      ) : (
        <div className="rewards-list">
          {rewards.length === 0 ? (
            <div className="dash-empty card-glass" style={{padding:'2rem'}}>
              <p style={{color: '#a1a1aa', fontSize: '0.9rem', textAlign: 'center'}}>
                Non hai ancora premi.<br/>Gioca per vincerne uno!
              </p>
            </div>
          ) : (
            rewards.map((reward) => (
              <div key={reward.codice_univoco} id={`reward-${reward.codice_univoco}`} className="reward-item card-glass">
                <div className="reward-icon-box">🏆</div>
                <div className="reward-details-box">
                  <h4 className="reward-name-text">{reward.premio}</h4>
                  <div className="reward-info-row">
                     <span className="reward-code-tag">{reward.codice_univoco}</span>
                     <span className="reward-date-text">{reward.data_vincita}</span>
                  </div>
                </div>
                <button 
                  className="btn-redeem-gold"
                  onClick={() => handleOpenPin(reward)}
                >
                  RISCATTA
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal PIN */}
      <div className={`modal-overlay ${selectedReward ? 'show' : ''}`}>
        <div className="modal-content pin-modal">
          <div className="modal-title">Riscatta Premio</div>
          <p style={{color: '#a1a1aa', marginBottom: '1.5rem', fontSize:'0.85rem'}}>
            Mostra questa schermata al cameriere.<br/>
            Inserisci il codice PIN del locale per confermare il ritiro di:<br/>
            <strong style={{color:'#fff'}}>{selectedReward?.premio}</strong>
          </p>
          
          <div className="pin-display-text">
            {pin ? pin.replace(/./g, '•') : <span style={{opacity:0.3}}>_ _ _ _</span>}
          </div>

          {errorMsg && <p style={{color: '#ef4444', marginBottom: '10px', fontSize:'0.85rem', fontWeight:600}}>{errorMsg}</p>}

          <div className="keypad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button key={num} className="key-btn" onClick={() => handleNumberClick(num.toString())}>
                {num}
              </button>
            ))}
            <button className="key-btn clear" onClick={handleClear}>⌫</button>
            <button className="key-btn" onClick={() => handleNumberClick('0')}>0</button>
            <button 
              className="key-btn submit" 
              onClick={handleSubmit} 
              disabled={isRedeeming || pin.length === 0}
            >
              {isRedeeming ? '...' : 'OK'}
            </button>
          </div>

          <button className="modal-btn close-only" style={{marginTop:'1.5rem', fontSize:'0.8rem', opacity:0.6}} onClick={closePinModal} disabled={isRedeeming}>Annulla</button>
        </div>
      </div>

      <style>{`
        .wallet-page-container {
          animation: fadeIn 0.4s ease-out;
        }
        .reward-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 1rem;
          margin-bottom: 0.8rem;
          border-radius: 18px;
          border: 1px solid rgba(251,191,36,0.1);
        }
        .reward-icon-box {
          width: 45px;
          height: 45px;
          background: rgba(251,191,36,0.1);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.4rem;
        }
        .reward-details-box {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .reward-name-text {
          font-size: 0.95rem;
          font-weight: 700;
          color: #fafafa;
          margin: 0;
        }
        .reward-info-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .reward-code-tag {
          font-size: 0.7rem;
          font-weight: 800;
          color: #fbbf24;
          background: rgba(251,191,36,0.1);
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.5px;
        }
        .reward-date-text {
          font-size: 0.7rem;
          color: #71717a;
        }
        .btn-redeem-gold {
          background: #fbbf24;
          color: #000;
          border: none;
          padding: 8px 12px;
          border-radius: 10px;
          font-size: 0.75rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-redeem-gold:hover {
          background: #d97706;
          transform: scale(1.05);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
