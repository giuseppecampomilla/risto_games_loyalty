import React, { useState } from 'react';

const API_BASE_URL = 'https://soundframes.netsons.org/wp-json/loyalty/v1';

export default function Wallet({ email, rewards, onRedeemSuccess }) {
  const [selectedReward, setSelectedReward] = useState(null);
  const [pin, setPin] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
    if (pin.length < 8) {
      setPin(prev => prev + num);
      setErrorMsg('');
    }
  };

  const handleClear = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleSubmit = async () => {
    if (pin.length === 0) return;
    setIsRedeeming(true);
    setErrorMsg('');

    try {
      const response = await fetch(`${API_BASE_URL}/redeem-reward/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          reward_id: selectedReward.codice_univoco,
          pin: pin
        })
      });

      const data = await response.json();
      if (data.success) {
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
    <div className="rewards-section">
      <div className="rewards-header">
        <h3 className="section-title">I Miei Premi</h3>
      </div>
      
      <div className="rewards-list">
        {!rewards || rewards.length === 0 ? (
          <p style={{color: '#a1a1aa', fontSize: '0.9rem', textAlign: 'center', marginTop: '1rem'}}>
            Nessun premio nel Wallet. Gira la ruota per vincere!
          </p>
        ) : (
          rewards.map((reward) => (
            <div key={reward.codice_univoco} id={`reward-${reward.codice_univoco}`} className="reward-item card-glass wallet-item">
              <div className="reward-icon">🎁</div>
              <div className="reward-details">
                <h4 className="reward-name">{reward.premio}</h4>
                <div style={{display:'flex', alignItems:'center', gap:'8px', marginTop:'4px'}}>
                   <span className="reward-code">{reward.codice_univoco}</span>
                   <span className="reward-date">{reward.data_vincita}</span>
                </div>
              </div>
              <button 
                className="btn-redeem"
                onClick={() => handleOpenPin(reward)}
              >
                RISCATTA
              </button>
            </div>
          ))
        )}
      </div>

      <div className={`modal-overlay ${selectedReward ? 'show' : ''}`}>
        <div className="modal-content pin-modal">
          <div className="modal-title">Inserisci PIN</div>
          <p style={{color: '#a1a1aa', marginBottom: '1.5rem', fontSize:'0.9rem'}}>
            Chiedi al cameriere di inserire il PIN per ritirare "{selectedReward?.premio}"
          </p>
          
          <div className="pin-display-text">
            {pin ? pin.replace(/./g, '•') : <span style={{opacity:0.3}}>_ _ _ _</span>}
          </div>

          {errorMsg && <p style={{color: '#ef4444', marginBottom: '10px', fontSize:'0.9rem', fontWeight:600}}>{errorMsg}</p>}

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

          <button className="modal-btn close-only mt-4" style={{marginTop:'1.5rem'}} onClick={closePinModal} disabled={isRedeeming}>Annulla</button>
        </div>
      </div>
    </div>
  );
}
