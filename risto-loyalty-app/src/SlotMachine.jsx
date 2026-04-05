import React, { useState, useEffect, useMemo } from 'react';
import './Games.css';

const SYMBOLS = ['🍕', '🍷', '🍺', '🍝', '🍰', '🥩', '🥗', '☕'];
const REEL_HEIGHT = 100; // Altezza di ogni simbolo in px

export default function SlotMachine({ onWin, onGoToWallet, settings, canPlay = true }) {
  const basePoints = settings?.points_per_play || 10;
  const getRandomSymbol = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];

  const [reelsConfig, setReelsConfig] = useState([
    { symbols: [getRandomSymbol()], targetY: 0, duration: 0 },
    { symbols: [getRandomSymbol()], targetY: 0, duration: 0 },
    { symbols: [getRandomSymbol()], targetY: 0, duration: 0 }
  ]);
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [gameLocked, setGameLocked] = useState(false); // Nasconde il gioco solo dopo la chiusura del modal
  
  const [showModal, setShowModal] = useState(false);
  const [winMessage, setWinMessage] = useState('');
  const [prizeResult, setPrizeResult] = useState('');

  const spin = () => {
    if (isSpinning || isSubmitted || gameLocked || !canPlay) return;
    setIsSpinning(true);
    setIsSubmitted(true); // Blocca il pulsante istantaneamente
    setShowModal(false);
    
    // 1. Calcolo del risultato finale basato su WIN_CHANCE
    const winChance = settings?.win_chance || 20;
    const isWinner = Math.floor(Math.random() * 100) < winChance;
    
    const finalReels = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
    
    if (isWinner) {
      // Jackpot (3 match)
      finalReels[1] = finalReels[0];
      finalReels[2] = finalReels[0];
    } else {
      // 0 match o max 2 match (ma contiamo come perdita)
      while (finalReels[1] === finalReels[0] && finalReels[2] === finalReels[0]) {
          finalReels[1] = getRandomSymbol();
          finalReels[2] = getRandomSymbol();
      }
    }

    // 2. Creazione delle strisce CSS
    const newConfig = reelsConfig.map((col, i) => {
      const currentSymbol = col.symbols[col.symbols.length - 1] || getRandomSymbol();
      const numRotations = 25 + i * 15; 
      
      const newSymbols = [currentSymbol];
      for (let j = 0; j < numRotations - 2; j++) {
        newSymbols.push(getRandomSymbol());
      }
      newSymbols.push(finalReels[i]); 
      
      return {
        symbols: newSymbols,
        targetY: (newSymbols.length - 1) * REEL_HEIGHT,
        duration: 1.5 + i * 1.0 // 1.5s, 2.5s, 3.5s per ogni rullo
      };
    });

    setReelsConfig(newConfig);

    // 3. Attesa della fine delle animazioni
    const maxDuration = 1.5 + 2 * 1.0; 
    setTimeout(() => {
      finalizeSpin(finalReels, isWinner);
    }, (maxDuration * 1000) + 300);
  };

  const finalizeSpin = (final, isWinner) => {
    let wonPrizeStr = 'Ritenta';
    
    if (isWinner) {
        const backendPrizes = settings?.prizes?.filter(p => p && p.trim() !== '') || [];
        if (backendPrizes.length > 0) {
            wonPrizeStr = backendPrizes[Math.floor(Math.random() * backendPrizes.length)];
        }
    }
    
    setPrizeResult(wonPrizeStr);
    setIsSpinning(false);
    
    if (wonPrizeStr === 'Ritenta') {
      setWinMessage(`Nessuna combinazione. Hai guadagnato ${basePoints} Punti Fedeltà per la tua giocata!`);
      if (onWin) onWin(basePoints, null);
    } else {
      if (window.confetti) {
        window.confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
      }
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
      setWinMessage(`🎉 JACKPOT! Hai vinto: ${wonPrizeStr}! (+${basePoints} Punti inclusi)`);
      if (onWin) onWin(basePoints, wonPrizeStr);
    }
    
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setGameLocked(true); 
  };

  const handleGoWallet = () => {
    setShowModal(false);
    setGameLocked(true);
    if (onGoToWallet) onGoToWallet();
  };

  return (
    <div className="game-container-wrapper slot-wrapper center-content">
      {gameLocked ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
           <h3 style={{ color: '#4ade80', fontSize: '1.5rem', marginBottom: '1rem' }}>Vincita Registrata!</h3>
           <p style={{ color: '#a1a1aa' }}>Hai già effettuato la tua giocata alle Slot per ora. Torna alla Home per scegliere un altro minigioco!</p>
           <button className="btn-spin" style={{marginTop: '2rem'}} onClick={() => { if(onGoToWallet) onGoToWallet(); }}>Torna alla Home</button>
        </div>
      ) : (
        <>
          <div className="slot-machine-box card-glass">
            <div className="reels-container">
              {reelsConfig.map((config, i) => (
                <div key={i} className="reel card-glass">
                  <div 
                    className="reel-strip" 
                    style={{ 
                      transform: `translateY(-${config.targetY}px)`, 
                      transition: config.duration > 0 ? `transform ${config.duration}s cubic-bezier(0.15, 0.85, 0.35, 1.05)` : 'none' 
                    }}
                  >
                    {config.symbols.map((sym, j) => (
                      <div key={j} className="reel-symbol">{sym}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <button 
            className={`btn-spin btn-slot mt-4 ${(isSpinning || isSubmitted || !canPlay) ? 'disabled' : ''}`}
            onClick={spin}
            disabled={isSpinning || isSubmitted || !canPlay}
            style={{marginTop: '2.5rem', width: '100%', maxWidth: '300px', opacity: !canPlay && !isSubmitted ? 0.5 : 1}}
          >
            {isSpinning ? 'GIRANDO...' : (!canPlay && !isSubmitted ? 'LIMITE RAGGIUNTO' : 'TIRA LA LEVA')}
          </button>
        </>
      )}

      <div className={`modal-overlay ${showModal ? 'show' : ''}`}>
        <div className="modal-content">
          <div className="modal-title">{prizeResult === 'Ritenta' ? 'Peccato!' : 'JACKPOT!'}</div>
          <div className="modal-body">{winMessage}</div>
          
          {prizeResult === 'Ritenta' ? (
            <button className="modal-btn close-only" onClick={handleModalClose}>Chiudi</button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="modal-btn" onClick={handleGoWallet}>Vai al Wallet</button>
              <button className="modal-btn close-only" style={{ background: 'transparent', color: '#888', padding: '8px', boxShadow: 'none', border: 'none' }} onClick={handleModalClose}>Più tardi</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

