import React, { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function Leaderboard({ currentUser, refreshTrigger }) {
  const [leaders, setLeaders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/leaderboard/`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setLeaders(data.leaderboard);
          }
        }
      } catch (e) {
        console.error("Errore fetch Classifica:", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboard();
  }, [refreshTrigger]);

  return (
    <div className="leaderboard-container">
      <div className="center-content" style={{marginBottom: '1.5rem'}}>
        <h2 className="section-title">Top 10 Fedeltà 🏆</h2>
        <p className="section-subtitle" style={{ color: '#a1a1aa', fontSize: '0.9rem' }}>Scopri chi ha guadagnato più punti finora!</p>
      </div>
      
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem', display: 'flex', justifyContent: 'center' }}>
          <div className="spinner-small"></div>
        </div>
      ) : (
        <div className="leaderboard-list">
          {leaders.length === 0 ? (
             <p style={{ textAlign: 'center', color: '#a1a1aa' }}>Nessun giocatore in classifica.</p>
          ) : (
            leaders.map((user, index) => {
              let icon = '';
              if (index === 0) icon = '🥇';
              else if (index === 1) icon = '🥈';
              else if (index === 2) icon = '🥉';

              // Usiamo il nome per evidenziare l'utente loggato
              const isMe = currentUser && (user.nome === currentUser.nome);
              
              return (
                <div key={index} className={`leaderboard-item card-glass ${isMe ? 'highlight-me' : ''}`}>
                  <div className="rank">
                    {icon ? <span className="rank-icon" style={{fontSize: '1.4rem'}}>{icon}</span> : <span className="rank-number">{index + 1}°</span>}
                  </div>
                  <div className="name-box">
                    <span className="name" style={{fontWeight: 600}}>{user.nome}</span>
                    {isMe && <span className="badge-me">Tu</span>}
                  </div>
                  <div className="points-box">
                    <span className="points" style={{ color: '#fbbf24', fontWeight: 800 }}>{user.punti_totali}</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.7, marginLeft: '2px' }}>pt</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Messaggio Obiettivo Successivo */}
      {!isLoading && currentUser && leaders.length > 0 && (
        <div className="leaderboard-goal card-glass" style={{ marginTop: '1.5rem', textAlign: 'center', padding: '1rem' }}>
          {(() => {
            const myIndex = leaders.findIndex(u => u.nome === currentUser.nome);
            if (myIndex === 0) {
              return <span style={{ color: '#fbbf24', fontWeight: 600 }}>Sei al primo posto assoluto! Continua così! 🥇</span>;
            } else if (myIndex > 0) {
              const nextPlayer = leaders[myIndex - 1];
              const diff = nextPlayer.punti_totali - currentUser.punti_totali;
              const needed = diff >= 0 ? diff + 1 : 1;
              return <span>Ti mancano solo <strong style={{color: '#fbbf24'}}>{needed} punti</strong> per superare {nextPlayer.nome}! 🚀</span>;
            } else {
              if (leaders.length === 10) {
                const tenthPlayer = leaders[9];
                const diff = tenthPlayer.punti_totali - (currentUser.punti_totali || 0);
                const needed = diff >= 0 ? diff + 1 : 1;
                return <span>Ti mancano <strong style={{color: '#fbbf24'}}>{needed} punti</strong> per entrare in Top 10! 🔥</span>;
              } else {
                return <span>Continua a giocare per entrare in classifica! 💫</span>;
              }
            }
          })()}
        </div>
      )}
    </div>
  );
}
