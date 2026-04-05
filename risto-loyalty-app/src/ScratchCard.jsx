import React, { useState, useRef, useEffect } from 'react';
import './Games.css';

export default function ScratchCard({ onWin, onGoToWallet, settings, canPlay = true }) {
  const basePoints = settings?.points_per_play || 10;
  const canvasRef = useRef(null);
  const prizeRef = useRef('');
  const isSubmittedRef = useRef(false);

  const [isScratched, setIsScratched] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [prize, setPrize] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [winMessage, setWinMessage] = useState('');

  useEffect(() => {
    // DETERMINE PRIZE BASED ON WIN CHANCE
    const winChance = Number(settings?.win_chance ?? 20);
    const isWinner = Math.floor(Math.random() * 100) < winChance;
    
    let finalPrize = 'Ritenta';
    if (isWinner) {
        const backendPrizes = settings?.prizes?.filter(p => p && p.trim() !== '') || [];
        if (backendPrizes.length > 0) {
            finalPrize = backendPrizes[Math.floor(Math.random() * backendPrizes.length)];
        }
    }

    prizeRef.current = finalPrize;
    setPrize(finalPrize);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#94a3b8');
    gradient.addColorStop(0.5, '#e2e8f0');
    gradient.addColorStop(1, '#64748b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Gratta qui', canvas.width / 2, canvas.height / 2 - 12);
    ctx.fillText('per vincere!', canvas.width / 2, canvas.height / 2 + 16);

    let isDrawing = false;

    const scratch = (x, y) => {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, 25, 0, Math.PI * 2);
      ctx.fill();
      checkCompletion();
    };

    const checkCompletion = () => {
      if (isSubmittedRef.current) return;
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let transparentPixels = 0;
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] === 0) transparentPixels++;
      }
      const percent = (transparentPixels / (canvas.width * canvas.height)) * 100;
      
      // Se abbiamo superato la soglia e non abbiamo ancora inviato i dati
      if (percent > 45 && !isSubmittedRef.current) {
        isSubmittedRef.current = true;
        setIsSubmitted(true);
        setIsScratched(true);
        removeListeners();
        revealPrize(prizeRef.current);
      }
    };

    const handleStart = (e) => {
      if (isSubmittedRef.current) return;
      isDrawing = true;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      scratch(clientX - rect.left, clientY - rect.top);
    };

    const handleMove = (e) => {
      if (!isDrawing || isSubmittedRef.current) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      scratch(clientX - rect.left, clientY - rect.top);
    };

    const handleEnd = () => { isDrawing = false; };

    const removeListeners = () => {
      canvas.removeEventListener('mousedown', handleStart);
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mouseup', handleEnd);
      canvas.removeEventListener('mouseleave', handleEnd);
      canvas.removeEventListener('touchstart', handleStart);
      canvas.removeEventListener('touchmove', handleMove);
      canvas.removeEventListener('touchend', handleEnd);
    };

    canvas.addEventListener('mousedown', handleStart, {passive: false});
    canvas.addEventListener('mousemove', handleMove, {passive: false});
    canvas.addEventListener('mouseup', handleEnd);
    canvas.addEventListener('mouseleave', handleEnd);
    canvas.addEventListener('touchstart', handleStart, {passive: false});
    canvas.addEventListener('touchmove', handleMove, {passive: false});
    canvas.addEventListener('touchend', handleEnd);

    return removeListeners;
  }, [settings]);

  const revealPrize = (wonPrizeStr) => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.transition = 'opacity 0.6s ease';
      canvas.style.opacity = '0';
    }
    
    setTimeout(() => {
      if (wonPrizeStr === 'Ritenta') {
        setWinMessage(`Hai comunque guadagnato ${basePoints} Punti Fedeltà per aver giocato!`);
        if (onWin) onWin(basePoints, null);
      } else {
        if (window.confetti) {
          window.confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        }
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
        setWinMessage(`🎉 Hai vinto: ${wonPrizeStr}! Aggiunto al tuo Wallet! (+${basePoints} Punti Fedeltà inclusi)`);
        if (onWin) onWin(basePoints, wonPrizeStr);
      }
      setShowModal(true);
    }, 800);
  };

  return (
    <div className="game-container-wrapper scratch-wrapper center-content">
      {isSubmitted ? (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
           <h3 style={{ color: '#4ade80', fontSize: '1.5rem', marginBottom: '1rem' }}>Vincita Registrata!</h3>
           <p style={{ color: '#a1a1aa' }}>Hai già giocato a questo Gratta e Vinci. Torna alla Home per scegliere un altro gioco!</p>
           <button className="btn-spin" style={{marginTop: '2rem'}} onClick={() => { if(onGoToWallet) onGoToWallet(); }}>Torna alla Home</button>
        </div>
      ) : (
        <>
          <div className="scratch-card-box" style={{ position: 'relative' }}>
            {!canPlay && (
              <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                background: 'rgba(0,0,0,0.7)', zIndex: 10, borderRadius: '20px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 'bold', fontSize: '1.2rem', textAlign: 'center',
                padding: '1rem', backdropFilter: 'blur(4px)'
              }}>
                LIMITE GIOCATE RAGGIUNTO
              </div>
            )}
            <div className="scratch-prize-reveal">
              <span className={prize === 'Ritenta' ? '' : 'shimmer-text'} style={{ fontSize: '1.6rem', fontWeight: '800', textAlign: 'center' }}>
                {prize === 'Ritenta' ? <span style={{color: '#fbbf24'}}>Mancato!</span> : `🏆 ${prize}`}
              </span>
            </div>
            <canvas ref={canvasRef} width={300} height={150} className="scratch-canvas" />
          </div>
          <p style={{ marginTop: '1.5rem', color: '#a1a1aa' }}>Strofina l'area grigia per scoprire se hai vinto!</p>
        </>
      )}

      <div className={`modal-overlay ${showModal ? 'show' : ''}`}>
        <div className="modal-content">
          <div className="modal-title">{prize === 'Ritenta' ? 'Peccato!' : 'Vittoria!'}</div>
          <div className="modal-body">{winMessage}</div>
          
          {prize === 'Ritenta' ? (
            <button className="modal-btn close-only" onClick={() => setShowModal(false)}>Chiudi</button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="modal-btn" onClick={() => { setShowModal(false); if(onGoToWallet) onGoToWallet(); }}>Vai al Wallet</button>
              <button className="modal-btn close-only" style={{ background: 'transparent', color: '#888', padding: '8px', boxShadow: 'none', border: 'none' }} onClick={() => setShowModal(false)}>Più tardi</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

