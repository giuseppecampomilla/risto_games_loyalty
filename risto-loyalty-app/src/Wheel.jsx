import React, { useState, useMemo } from 'react';
import './Wheel.css';

export default function Wheel({ onWin, onGoToWallet, settings, canPlay = true }) {
  const basePoints = settings?.points_per_play || 10;
  
  // Construct prizes array from settings
  const wheelPrizes = useMemo(() => {
    const backendPrizes = settings?.prizes?.filter(p => p && p.trim() !== '') || [];
    const totalSlices = 12; // Use 12 slices for a standard look
    const list = [];
    
    if (backendPrizes.length === 0) {
      // Fallback
      return Array(totalSlices).fill('Ritenta');
    }

    // Distribute prizes across slices, fill rest with "Ritenta"
    for (let i = 0; i < totalSlices; i++) {
        if (i % 2 === 0 && list.filter(x => x !== 'Ritenta').length < backendPrizes.length * 2) {
            list.push(backendPrizes[Math.floor(i/2) % backendPrizes.length]);
        } else {
            list.push('Ritenta');
        }
    }
    return list;
  }, [settings]);

  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [winMessage, setWinMessage] = useState('');
  const [wonPrize, setWonPrize] = useState('');
  const [gameLocked, setGameLocked] = useState(false);

  const handleModalClose = () => {
    setShowModal(false);
    setGameLocked(true);
  };

  const handleGoWallet = () => {
    setShowModal(false);
    setGameLocked(true);
    if (onGoToWallet) onGoToWallet();
  };

  const spinWheel = () => {
    if (isSpinning || !canPlay) return;
    setIsSpinning(true);
    setShowModal(false);

    const winChance = Number(settings?.win_chance ?? 20);
    const isWinnerRoll = Math.floor(Math.random() * 100) < winChance;
    
    const sliceIndices = [];
    wheelPrizes.forEach((p, idx) => {
        if (isWinnerRoll) {
            if (p !== 'Ritenta') sliceIndices.push(idx);
        } else {
            if (p === 'Ritenta') sliceIndices.push(idx);
        }
    });

    if (sliceIndices.length === 0) {
        sliceIndices.push(Math.floor(Math.random() * wheelPrizes.length));
    }

    const prizeIndex = sliceIndices[Math.floor(Math.random() * sliceIndices.length)];
    
    const totalSlices = wheelPrizes.length;
    const sliceAngle = 360 / totalSlices;
    const baseSpins = 5 * 360; 

    const targetAngle = 360 - (prizeIndex * sliceAngle + sliceAngle / 2);
    
    // Add realistic offset to center
    const maxOffset = (sliceAngle / 2) - 2;
    const randomOffset = (Math.random() * maxOffset * 2) - maxOffset;

    const currentBase = rotation - (rotation % 360);
    const finalRotation = currentBase + baseSpins + targetAngle + randomOffset;

    setRotation(finalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      const wonPrizeStr = wheelPrizes[prizeIndex];
      setWonPrize(wonPrizeStr);
      if (wonPrizeStr === 'Ritenta') {
        setWinMessage(`Hai comunque guadagnato ${basePoints} Punti Fedeltà per aver giocato!`);
        if (onWin) {
          onWin(basePoints, null);
        }
      } else {
        if (window.confetti) {
          window.confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
        }
        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
        setWinMessage(`🎉 Hai vinto: ${wonPrizeStr}! Aggiunto al tuo Wallet! (+${basePoints} Punti Fedeltà inclusi)`);
        if (onWin) {
          onWin(basePoints, wonPrizeStr);
        }
      }
      setShowModal(true);
    }, 4000); 
  };


  return (
    <div className="game-container-wrapper wheel-wrapper center-content">
      {gameLocked ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
           <h3 style={{ color: '#4ade80', fontSize: '1.5rem', marginBottom: '1rem' }}>Vincita Registrata!</h3>
           <p style={{ color: '#a1a1aa' }}>Hai già effettuato la tua giocata alla Ruota per ora. Torna alla Home per scegliere un altro minigioco!</p>
           <button className="btn-spin" style={{marginTop: '2rem'}} onClick={() => { if(onGoToWallet) onGoToWallet(); }}>Torna alla Home</button>
        </div>
      ) : (
        <>
          <div className="wheel-container-wrapper">
            <div className="wheel-frame">
              <div className="wheel-pointer"></div>
              <div className="wheel-center-cap"></div>
              <svg className="wheel-svg" viewBox="0 0 400 400" style={{ transform: `rotate(${rotation}deg)` }}>
                <defs>
                  <radialGradient id="gold-grad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#b45309" />
                  </radialGradient>
                </defs>
                {wheelPrizes.map((prize, i) => {
                  const angle = 360 / wheelPrizes.length;
                  const rotateAngle = i * angle;
                  const isGold = i % 2 !== 0;
                  
                  return (
                    <g key={i} transform={`rotate(${rotateAngle} 200 200)`}>
                      <path 
                        d={`M 200 200 L 200 0 A 200 200 0 0 1 ${200 + 200 * Math.sin((angle * Math.PI) / 180)} ${200 - 200 * Math.cos((angle * Math.PI) / 180)} Z`} 
                        fill={isGold ? "url(#gold-grad)" : "#18181b"} 
                        stroke="#27272a" 
                        strokeWidth="2" 
                      />
                      <g transform={`translate(200, 200) rotate(${angle / 2})`}>
                        <text 
                          x="0" y="-120" 
                          transform="rotate(90 0 -120)" 
                          textAnchor="middle" 
                          fill={isGold ? "#000" : "#fbbf24"}
                          className="wheel-slice-text"
                          dominantBaseline="middle"
                          style={{ fontSize: prize.length > 15 ? '8px' : '10px' }}
                        >
                          {prize}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>
            </div>

            <button 
              className={`btn-spin ${(isSpinning || !canPlay) ? 'disabled' : ''}`}
              onClick={spinWheel}
              disabled={isSpinning || !canPlay}
              style={{marginTop: '2rem', opacity: !canPlay ? 0.5 : 1}}
            >
              {isSpinning ? 'GIRANDO...' : (!canPlay ? 'LIMITE RAGGIUNTO' : 'GIRA LA RUOTA')}
            </button>
          </div>

          <div className={`modal-overlay ${showModal ? 'show' : ''}`}>
            <div className="modal-content">
              <div className="modal-title">{wonPrize === 'Ritenta' ? 'Peccato!' : 'Vittoria!'}</div>
              <div className="modal-body">{winMessage}</div>
              
              {wonPrize === 'Ritenta' ? (
                <button className="modal-btn close-only" onClick={handleModalClose}>Chiudi</button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button className="modal-btn" onClick={handleGoWallet}>Vai al Wallet</button>
                  <button className="modal-btn close-only" style={{ background: 'transparent', color: '#888', padding: '8px', boxShadow: 'none', border: 'none' }} onClick={handleModalClose}>Più tardi</button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

