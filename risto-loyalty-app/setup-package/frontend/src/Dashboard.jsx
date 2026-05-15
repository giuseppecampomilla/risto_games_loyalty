import React, { useState, useEffect } from 'react';
import './Dashboard.css';

const MULTIPLAYER_BASE = 'http://130.110.6.128:3000';

export default function Dashboard({ user, rewards, appSettings, onPlaySingoli, countdown, canPlay, onLogout, onPlayMultiplayer }) {
  const [matchHistory, setMatchHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Fetch storico partite multiplayer dall'API Oracle
  useEffect(() => {
    if (!user?.email) return;
    setHistoryLoading(true);
    fetch(`${MULTIPLAYER_BASE}/api/user-history/${encodeURIComponent(user.email)}`, {
      headers: { 'X-API-Secret': 'sk_multigame_92a3b1d8f7e6c40a5b6c7d8e9f0a1b2c3d4e5f6' }
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => setMatchHistory(Array.isArray(data) ? data.slice(0, 5) : []))
      .catch(() => setMatchHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [user?.email]);

  // Calcolo dinamico della soglia successiva
  const getNextMilestone = () => {
    if (!appSettings?.milestones || appSettings.milestones.length === 0) return { points: 500, label: 'Gold 🏆' };
    
    const currentPoints = user?.punti || 0;
    // Ordina le soglie per punti
    const sortedMilestones = [...appSettings.milestones].sort((a, b) => a.points - b.points);
    
    // Trova la prima soglia che l'utente non ha ancora raggiunto
    const next = sortedMilestones.find(m => m.points > currentPoints);
    
    if (next) {
      return { 
        points: parseInt(next.points), 
        label: next.prize || 'Prossimo Livello',
        isFidelity: true 
      };
    } else {
      // Se ha superato tutto, puntiamo a un obiettivo simbolico o al reset
      const lastMilestone = sortedMilestones[sortedMilestones.length - 1];
      return { 
        points: parseInt(lastMilestone.points) + 1000, 
        label: 'Obiettivo Bonus 🚀',
        isFidelity: false 
      };
    }
  };

  const nextMilestone = getNextMilestone();
  const targetPoints = nextMilestone.points;
  const progressPercent = Math.min(((user?.punti || 0) / targetPoints) * 100, 100);
  const isGold = (user?.punti_totali || 0) > 1000;
  const missingPoints = Math.max(0, targetPoints - (user?.punti || 0));

  const getResultBadge = (result) => {
    if (!result) return { label: '–', cls: 'badge-draw' };
    const r = result.toLowerCase();
    if (r.includes('vittoria') || r === 'win') return { label: 'VITTORIA', cls: 'badge-win' };
    if (r.includes('pareggio') || r === 'draw') return { label: 'PAREGGIO', cls: 'badge-draw' };
    return { label: 'SCONFITTA', cls: 'badge-loss' };
  };

  return (
    <div className="space-y-12 py-6">
        {/* Daily Quest Card (Hero) */}
        <section className="relative">
            <div className="bg-surface-container-low rounded-lg p-8 relative overflow-hidden border-l-4 border-primary shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">
                    <div className="flex-1 space-y-6">
                        <div>
                            <span className="font-label text-primary font-bold tracking-widest uppercase text-xs mb-2 block">
                                {isGold ? 'Membro Gold 🏆' : 'Membro Silver ⭐'}
                            </span>
                            <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tighter leading-none mb-4 uppercase">
                                {nextMilestone.label}
                            </h1>
                            <p className="text-on-surface-variant text-lg max-w-md">
                                {missingPoints > 0 
                                    ? `Ti mancano solo ${missingPoints.toLocaleString()} punti per sbloccare il prossimo premio!` 
                                    : 'Hai raggiunto il traguardo massimo! Continua così 🚀'}
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => onPlaySingoli()}
                                className="bg-primary text-on-primary h-[64px] px-8 rounded-lg font-bold text-xl hover:shadow-[0_0_20px_rgba(255,173,74,0.4)] active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                                <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>stars</span>
                                GUADAGNA PUNTI
                            </button>
                        </div>
                    </div>
                    {/* Pint Glass Progress */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="relative w-24 h-40 bg-surface-container-highest rounded-t-sm pint-glass-mask border-x border-t border-outline-variant/20 shadow-inner">
                            {/* Pint Fill */}
                            <div 
                                className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-secondary to-secondary-dim transition-all duration-1000"
                                style={{ height: `${progressPercent}%` }}
                            >
                                {/* Fizz Bubbles */}
                                <div className="absolute top-1 left-2 w-1.5 h-1.5 bg-on-secondary-container/60 rounded-full animate-bounce"></div>
                                <div className="absolute top-3 left-8 w-1 h-1 bg-on-secondary-container/40 rounded-full animate-pulse"></div>
                                <div className="absolute top-2 right-4 w-2 h-2 bg-on-secondary-container/50 rounded-full"></div>
                                {/* Head of the Beer */}
                                <div className="absolute -top-1 left-0 w-full h-2 bg-white/20 blur-sm"></div>
                            </div>
                        </div>
                        <div className="text-center">
                            <span className="font-headline font-bold text-2xl text-secondary">{Math.round(progressPercent)}%</span>
                            <span className="block text-[10px] font-label text-on-surface-variant uppercase tracking-[0.2em]">Pint Progress</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* Popular Games (Bento Grid) */}
        <section className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="font-headline text-3xl font-bold tracking-tighter uppercase">Minigiochi</h2>
                    <p className="text-on-surface-variant text-sm uppercase tracking-widest font-label">Solo Missions</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Large Card: Multiplayer */}
                <div 
                    onClick={() => canPlay && onPlayMultiplayer()}
                    className={`md:col-span-2 relative group cursor-pointer overflow-hidden rounded-lg bg-surface-container-low border border-outline-variant/10 ${!canPlay ? 'opacity-50 grayscale' : ''}`}
                >
                    <img alt="Retro Arcade"
                        className="w-full h-72 object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuA55uoEB5BczWEcCcYprTHWHKN2ifQZva_E9zE1NlaPk0Sz1Lzp6ZtSTh22dYBEuS5cGb__vz_KwMK6KBScLQ2-OG1cyNakLi1-bhya7gP_SZO-Iloxc9HhdHyxDZ0C2qxuzcmO0YiHMF6O24YrX04K9X98YhCdd5Xuw_TU_-25EHUiQceMWGfKt1mMtoJ9Uw5qFIG9b1-4BBmWmB0lV28jSy81p9iqfKGnYOEa7nYax43MsuYeHD6W4Q0a3vQ4PM-2ZazdgfUtlA" />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent"></div>
                    <div className="absolute bottom-0 left-0 p-8 space-y-2">
                        <div className="flex items-center gap-2 bg-primary/20 backdrop-blur-md px-3 py-1 rounded-full w-fit">
                            <span className="material-symbols-outlined text-primary text-sm" style={{fontVariationSettings: "'FILL' 1"}}>trending_up</span>
                            <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">Sfida Reale</span>
                        </div>
                        <h3 className="font-headline text-3xl font-extrabold tracking-tighter uppercase">TOTEM POLE MULTI</h3>
                        <div className="flex items-center gap-4 text-on-surface-variant font-label text-xs tracking-widest uppercase">
                            <span>{!canPlay ? `Sblocca tra: ${countdown}` : 'Disponibile Ora'}</span>
                            <span className="w-1 h-1 bg-outline rounded-full"></span>
                            <span>Multiplayer</span>
                        </div>
                    </div>
                </div>

                {/* Vertical Card: Giochi Singoli */}
                <div 
                    onClick={() => canPlay && onPlaySingoli()}
                    className={`bg-surface-container-high rounded-lg p-6 flex flex-col justify-between border border-outline-variant/10 relative group cursor-pointer ${!canPlay ? 'opacity-50' : ''}`}
                >
                    <div className="space-y-4">
                        <div className="w-16 h-16 bg-tertiary/10 rounded-xl flex items-center justify-center text-tertiary shadow-[0_0_20px_rgba(197,126,255,0.2)]">
                            <span className="material-symbols-outlined text-4xl" style={{fontVariationSettings: "'FILL' 1"}}>casino</span>
                        </div>
                        <div>
                            <h3 className="font-headline text-xl font-bold uppercase tracking-tighter">GIOCHI SINGOLI</h3>
                            <p className="text-on-surface-variant text-sm mt-1">Ruota, Gratta e Vinci e Slot Machine per vincere punti extra.</p>
                        </div>
                    </div>
                    <div className="pt-6 border-t border-outline-variant/10 flex justify-between items-center">
                        <span className="font-label text-[10px] text-tertiary font-bold tracking-widest uppercase">
                            {!canPlay ? `Attesa: ${countdown}` : 'GIOCA ORA'}
                        </span>
                        <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </div>
                </div>
            </div>
        </section>

        {/* Table Challenges (Match History) */}
        <section className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="font-headline text-3xl font-bold tracking-tighter uppercase text-secondary">Ultime Sfide</h2>
                    <p className="text-on-surface-variant text-sm uppercase tracking-widest font-label">Multiplayer History</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {historyLoading ? (
                    <div className="col-span-2 py-12 text-center text-on-surface-variant">Caricamento sfide...</div>
                ) : matchHistory.length === 0 ? (
                    <div className="col-span-2 py-12 text-center text-on-surface-variant">Nessuna sfida registrata.</div>
                ) : (
                    matchHistory.map((match, i) => {
                        const badge = getResultBadge(match.result);
                        return (
                            <div key={i} className="bg-surface-container-low rounded-lg p-1 flex items-stretch border border-outline-variant/10 hover:border-secondary/30 transition-colors">
                                <div className="w-1/3 min-h-[120px] relative overflow-hidden rounded-l-md bg-neutral-800 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-4xl text-secondary/40">groups</span>
                                    <div className="absolute inset-0 bg-secondary/5"></div>
                                </div>
                                <div className="flex-1 p-6 flex flex-col justify-center">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-headline text-xl font-bold uppercase tracking-tighter truncate max-w-[150px]">
                                            {match.opponent || 'Avversario'}
                                        </h3>
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                            badge.cls === 'badge-win' ? 'bg-secondary/20 text-secondary' : 
                                            badge.cls === 'badge-loss' ? 'bg-error/20 text-error' : 'bg-outline/20 text-outline'
                                        }`}>
                                            {badge.label}
                                        </span>
                                    </div>
                                    <p className="text-on-surface-variant text-sm mb-4">Punteggio: <span className="text-on-surface font-bold">{match.score}</span></p>
                                    <div className="text-[10px] font-label text-outline uppercase tracking-widest">
                                        {new Date(match.date).toLocaleDateString('it-IT')}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </section>
        
        {/* Logout Footer */}
        <div className="py-12 flex justify-center">
            <button 
                onClick={onLogout}
                className="text-on-surface-variant hover:text-error text-xs font-bold uppercase tracking-[0.2em] transition-colors"
            >
                Chiudi Sessione 🔓
            </button>
        </div>
    </div>
  );
}
