import React, { useEffect, useState } from 'react';

// Nota: Utilizziamo window.confetti caricato via CDN in index.html per garantire la compatibilità del build.

export default function CelebrationModal({ milestone, onGoToWallet, onClose }) {
  useEffect(() => {
    // Lancia i coriandoli quando il modal si apre
    if (typeof window.confetti === 'function') {
      const duration = 5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

      const randomInRange = (min, max) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        window.confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        window.confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      return () => clearInterval(interval);
    }
  }, []);

  return (
    <div className="modal-overlay-celebration">
      <div className="celebration-card-content">
        <div style={{ fontSize: '4.5rem', marginBottom: '1rem' }}>🏆</div>
        
        <div className="milestone-badge">
          SOGLIA {milestone.points} PT RAGGIUNTA!
        </div>

        <h2 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '0.5rem', color: '#fbbf24', lineHeight: 1.1 }}>
          TRAGUARDO RAGGIUNTO!
        </h2>
        
        <p style={{ fontSize: '1.2rem', marginBottom: '2rem', color: '#fff', opacity: 0.9 }}>
          Complimenti! Hai sbloccato:<br/>
          <strong style={{ fontSize: '1.6rem', color: '#fff', display: 'block', marginTop: '10px' }}>
            {milestone.prize}
          </strong>
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button 
            className="btn-spin" 
            style={{ padding: '18px', fontSize: '1.2rem', width: '100%' }}
            onClick={onGoToWallet}
          >
            RISCATTA ORA 🎁
          </button>
          <button 
            onClick={onClose}
            style={{ 
              background: 'transparent', 
              border: '1px solid rgba(255,255,255,0.2)', 
              color: '#a1a1aa', 
              padding: '12px',
              borderRadius: '12px',
              fontWeight: 700, 
              cursor: 'pointer',
              fontSize: '0.95rem',
              transition: 'all 0.2s'
            }}
          >
            Continua l'accumulo
          </button>
        </div>
      </div>
    </div>
  );
}
