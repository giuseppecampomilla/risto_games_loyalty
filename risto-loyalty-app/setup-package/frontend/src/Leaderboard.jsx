import React, { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function Leaderboard({ currentUser, refreshTrigger }) {
  const [leaders, setLeaders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      console.log("🌐 Fetching Leaderboard from:", `${API_BASE_URL}/get-leaderboard/`);
      try {
        const response = await fetch(`${API_BASE_URL}/get-leaderboard/`, {
          headers: {
            'X-API-Secret': 'sk_multigame_92a3b1d8f7e6c40a5b6c7d8e9f0a1b2c3d4e5f6'
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setLeaders(data.leaderboard);
          } else {
            throw new Error('Dati non validi');
          }
        } else {
          throw new Error('Server error');
        }
      } catch (e) {
        console.warn("⚠️ Utilizzo dati mock per la Classifica:", e.message);
        // Fallback: Nomi italiani mock come richiesto
        const mockData = [
          { nome: "Marco", punti_totali: 5800 },
          { nome: "Giulia", punti_totali: 5200 },
          { nome: "Alessandro", punti_totali: 4950 },
          { nome: "Francesca", punti_totali: 4100 },
          { nome: "Lorenzo", punti_totali: 3850 },
          { nome: "Matteo", punti_totali: 3200 },
          { nome: "Elena", punti_totali: 2900 },
          { nome: "Chiara", punti_totali: 2450 },
          { nome: "Davide", punti_totali: 1900 },
          { nome: "Sofia", punti_totali: 1400 },
        ];
        setLeaders(mockData);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboard();
  }, [refreshTrigger]);

  return (
    <div className="space-y-12 py-6">
      <div className="text-center space-y-2">
        <h2 className="font-headline text-4xl font-bold tracking-tighter uppercase text-primary">Hall of Fame</h2>
        <p className="text-on-surface-variant text-sm uppercase tracking-widest font-label">I Campioni del RistoClub</p>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center gap-4">
          <div className="spinner-small"></div>
          <span className="text-on-surface-variant font-label text-xs uppercase tracking-widest">Caricamento Leggende...</span>
        </div>
      ) : (
        <>
          {/* Podiums Section */}
          {leaders.length >= 3 && (
            <section className="flex justify-center items-end gap-2 md:gap-8 pt-12 pb-8">
              {/* 2nd Place */}
              <div className="flex flex-col items-center group">
                <div className="relative mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-neutral-800 border-2 border-neutral-400/30 flex items-center justify-center overflow-hidden text-3xl">
                    {leaders[1]?.avatar ? leaders[1].avatar : <span className="text-2xl font-bold text-neutral-400">{(leaders[1]?.user_name || leaders[1]?.nome || '–').charAt(0).toUpperCase()}</span>}
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-neutral-400 rounded-full flex items-center justify-center text-on-surface font-bold border-2 border-surface shadow-lg">2</div>
                </div>
                <div className="h-24 w-20 md:w-28 bg-gradient-to-b from-neutral-400/20 to-transparent rounded-t-xl border-x border-t border-neutral-400/30 flex flex-col items-center justify-end pb-4 space-y-1">
                  <span className="font-headline font-bold text-xs uppercase truncate w-full px-2 text-center">{leaders[1]?.user_name || leaders[1]?.nome}</span>
                  <span className="font-label text-[10px] text-neutral-400 font-bold uppercase tracking-tighter">{leaders[1]?.punti_totali.toLocaleString()} PT</span>
                </div>
              </div>

              {/* 1st Place */}
              <div className="flex flex-col items-center group -mt-8">
                <div className="relative mb-6">
                  <div className="w-24 h-24 rounded-3xl bg-primary/20 border-4 border-primary flex items-center justify-center overflow-hidden shadow-[0_0_40px_rgba(255,173,74,0.3)] text-5xl">
                    {leaders[0]?.avatar ? leaders[0].avatar : <span className="text-4xl font-bold text-primary">{(leaders[0]?.user_name || leaders[0]?.nome || '–').charAt(0).toUpperCase()}</span>}
                  </div>
                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-primary rounded-full flex items-center justify-center text-on-primary font-bold border-4 border-surface shadow-xl">1</div>
                  <span className="absolute -top-12 left-1/2 -translate-x-1/2 text-4xl animate-bounce">👑</span>
                </div>
                <div className="h-40 w-24 md:w-32 bg-gradient-to-b from-primary/30 to-transparent rounded-t-2xl border-x border-t border-primary/40 flex flex-col items-center justify-end pb-6 space-y-1 shadow-[0_-20px_40px_rgba(255,173,74,0.1)]">
                  <span className="font-headline font-bold text-sm uppercase truncate w-full px-2 text-center text-primary">{leaders[0]?.user_name || leaders[0]?.nome}</span>
                  <span className="font-label text-xs text-primary font-black uppercase tracking-tighter">{leaders[0]?.punti_totali.toLocaleString()} PT</span>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="flex flex-col items-center group">
                <div className="relative mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-neutral-800 border-2 border-amber-800/30 flex items-center justify-center overflow-hidden text-3xl">
                    {leaders[2]?.avatar ? leaders[2].avatar : <span className="text-2xl font-bold text-amber-800">{(leaders[2]?.user_name || leaders[2]?.nome || '–').charAt(0).toUpperCase()}</span>}
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-800 rounded-full flex items-center justify-center text-on-surface font-bold border-2 border-surface shadow-lg">3</div>
                </div>
                <div className="h-16 w-20 md:w-28 bg-gradient-to-b from-amber-800/20 to-transparent rounded-t-xl border-x border-t border-amber-800/30 flex flex-col items-center justify-end pb-4 space-y-1">
                  <span className="font-headline font-bold text-xs uppercase truncate w-full px-2 text-center">{leaders[2]?.user_name || leaders[2]?.nome}</span>
                  <span className="font-label text-[10px] text-amber-800 font-bold uppercase tracking-tighter">{leaders[2]?.punti_totali.toLocaleString()} PT</span>
                </div>
              </div>
            </section>
          )}

          {/* Leaderboard List (Bento Style) */}
          <section className="space-y-3">
            {leaders.slice(3, 10).map((user, index) => {
              const isMe = currentUser && (user.user_name === currentUser.nome);
              const actualRank = index + 4;
              
              return (
                <div 
                  key={index} 
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    isMe 
                      ? 'bg-secondary/10 border-secondary shadow-[0_0_15px_rgba(38,254,220,0.1)]' 
                      : 'bg-surface-container-low border-outline-variant/10'
                  }`}
                >
                  <div className="w-8 font-headline font-black text-on-surface-variant text-center">{actualRank}</div>
                  <div className="w-10 h-10 rounded-lg bg-surface-container-highest flex items-center justify-center font-bold text-on-surface-variant text-xl">
                    {user.avatar ? user.avatar : (user.user_name || user.nome || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 flex flex-col">
                    <span className="font-headline font-bold text-sm uppercase tracking-tight flex items-center gap-2">
                      {user.user_name || user.nome}
                      {isMe && <span className="bg-secondary text-on-secondary-fixed text-[8px] px-1.5 py-0.5 rounded uppercase font-black tracking-tighter">YOU</span>}
                    </span>
                    <span className="text-[10px] font-label text-on-surface-variant uppercase tracking-widest">{actualRank <= 10 ? 'Top Contender' : 'Challenger'}</span>
                  </div>
                  <div className="text-right">
                    <span className="block font-headline font-black text-primary text-sm">{user.punti_totali.toLocaleString()}</span>
                    <span className="block text-[8px] font-label text-on-surface-variant uppercase tracking-widest">Points</span>
                  </div>
                </div>
              );
            })}
          </section>

          {/* Goal Message */}
          {currentUser && (
            <div className="bg-surface-container-high rounded-lg p-6 border border-primary/20 shadow-xl text-center">
              <span className="material-symbols-outlined text-primary mb-2 block">emoji_events</span>
              <p className="text-on-surface font-body text-sm">
                {(() => {
                  const myIndex = leaders.findIndex(u => u.user_name === currentUser.nome);
                  if (myIndex === 0) return "👑 Sei in vetta alla classifica! Difendi il tuo titolo!";
                  if (myIndex > 0) {
                    const nextPlayer = leaders[myIndex - 1];
                    const diff = nextPlayer.punti_totali - currentUser.punti_totali;
                    return <>Ti mancano <b>{(diff + 1).toLocaleString()} PT</b> per superare <b>{nextPlayer.user_name}</b>!</>;
                  }
                  const tenthPlayer = leaders[9] || { punti_totali: 0 };
                  const diff = tenthPlayer.punti_totali - (currentUser.punti_totali || 0);
                  return <>Hai bisogno di <b>{(Math.max(0, diff) + 1).toLocaleString()} PT</b> per entrare nella leggendaria Top 10!</>;
                })()}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
