import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import './TotemGame.css';

const MULTIPLAYER_BASE = 'http://130.110.6.128:3000';

// Web Audio API context per feedback acustico a latenza zero
let audioCtx;
const playBeep = () => {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.05);

    gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
  } catch (e) {
    // Silently fail
  }
};

const GameButton = React.memo(({ color, baseColor, borderColor, content, animType, onPointerDown }) => {
  const [isPressed, setIsPressed] = useState(false);

  const handlePointerDown = (e) => {
    setIsPressed(true);
    playBeep();
    onPointerDown(color);
  };

  const handlePointerUp = () => {
    setIsPressed(false);
  };

  const animClass = animType === 'blink' ? 'brightness-150' : (animType === 'shake' ? 'animate-shake' : '');
  const pressedClass = isPressed ? 'border-b-0 translate-y-2' : 'border-b-8';

  return (
    <button
      className={`rounded-2xl transition-transform duration-75 will-change-transform ${pressedClass} ${baseColor} ${borderColor} flex items-center justify-center overflow-hidden ${animClass}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {content}
    </button>
  );
});

export default function TotemGame({ user, appSettings, onExit, onDataRefresh }) {
  const onDataRefreshRef = useRef(onDataRefresh);
  useEffect(() => {
    onDataRefreshRef.current = onDataRefresh;
  }, [onDataRefresh]);
  const [socket, setSocket] = useState(null);
  const [status, setStatus] = useState('connecting'); // connecting, waiting, countdown, playing, finished
  const [sysStatus, setSysStatus] = useState('');
  const [countdownError, setCountdownError] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const [roomId, setRoomId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [countdownTimer, setCountdownTimer] = useState(3);

  const [targetColor, setTargetColor] = useState(null);
  const [scores, setScores] = useState({});
  const [gameOverData, setGameOverData] = useState(null);

  const [gameType, setGameType] = useState('TOTEM');
  const [squirrelData, setSquirrelData] = useState(null);
  const [isFrozen, setIsFrozen] = useState(false);
  const freezeTimeoutRef = useRef(null);

  // Animazioni
  const [animColor, setAnimColor] = useState(null);
  const [animType, setAnimType] = useState(null); // 'blink' | 'shake'
  const animTimeoutRef = useRef(null);

  useEffect(() => {
    if (!user?.email) return;

    const newSocket = io(MULTIPLAYER_BASE, {
      transports: ['websocket'],
      reconnectionAttempts: 5
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('register', { email: user.email, avatar: user.avatar });
    });

    newSocket.on('sys-status', (data) => {
      if (data.wp) setSysStatus(data.wp);
    });

    newSocket.on('waiting', (msg) => {
      setStatus('waiting');
      setSysStatus(msg);
    });

    newSocket.on('lobby-countdown', (num) => {
      setStatus('waiting');
      setSysStatus(`Avversario trovato! Attesa altri giocatori... ${num}s`);
    });

    newSocket.on('match-found', (data) => {
      setRoomId(data.roomId);
      setPlayers(data.players);
      setStatus('countdown');
    });

    newSocket.on('countdown', (num) => {
      setCountdownTimer(num);
    });

    newSocket.on('game-start', (data) => {
      if (data && data.gameType) {
        setGameType(data.gameType);
      } else {
        setGameType('TOTEM');
      }
      setStatus('playing');
    });

    newSocket.on('next-block', (colorStr) => {
      // mapping da stringa a colere
      const colorMap = { 'green': '#10b981', 'blue': '#3b82f6', 'yellow': '#eab308', 'red': '#ef4444' };
      setTargetColor({ name: colorStr, hex: colorMap[colorStr] });
    });

    newSocket.on('next-squirrel', (data) => {
      setSquirrelData(data);
    });

    newSocket.on('hide-squirrel', () => {
      setSquirrelData(null);
    });

    newSocket.on('squirrel-penalty', (data) => {
      setIsFrozen(true);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      if (freezeTimeoutRef.current) clearTimeout(freezeTimeoutRef.current);
      freezeTimeoutRef.current = setTimeout(() => {
        setIsFrozen(false);
      }, data.duration || 1000);
    });

    newSocket.on('score-update', (updatedScores) => {
      setScores(updatedScores);
    });

    newSocket.on('game-over', (data) => {
      setStatus('finished');
      setGameOverData(data);
      if (onDataRefreshRef.current) {
        onDataRefreshRef.current();
      }
    });

    newSocket.on('opponent-disconnected', () => {
      if (status !== 'finished') {
        setErrorMsg('Avversario disconnesso!');
        setStatus('finished');
      }
    });

    newSocket.on('auth-error', (msg) => {
      setErrorMsg(msg);
      setStatus('finished');
    });

    return () => {
      newSocket.disconnect();
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
      if (freezeTimeoutRef.current) clearTimeout(freezeTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const handleColorClick = useCallback((color) => {
    if (status !== 'playing' || isFrozen) return;

    if (gameType === 'TOTEM') {
      if (!targetColor) return;
      if (color === targetColor.name) {
        triggerFeedback(color, 'blink');
      } else {
        triggerFeedback(color, 'shake');
      }
      if (socket) {
        socket.emit('totem-click', color);
      }
    } else if (gameType === 'SQUIRREL') {
      triggerFeedback(color, 'blink');
      if (socket) {
        socket.emit('squirrel-click', color);
      }
    }
  }, [status, isFrozen, gameType, targetColor, socket]);

  const triggerFeedback = (color, type) => {
    setAnimColor(color);
    setAnimType(type);

    // Vibrazione
    if (navigator.vibrate) {
      if (type === 'blink') {
        navigator.vibrate(50);
      } else {
        navigator.vibrate([100, 50, 100]);
      }
    }

    if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
    animTimeoutRef.current = setTimeout(() => {
      setAnimColor(null);
      setAnimType(null);
    }, 400);
  };

  // Ottieni info punteggi e classifica
  const getMyScore = () => {
    if (!socket || !scores[socket.id]) return 0;
    return scores[socket.id].score || 0;
  };

  const getLeaderboard = () => {
    if (!scores) return [];
    return Object.keys(scores)
      .map(id => ({
        id,
        email: scores[id].email,
        avatar: scores[id].avatar,
        score: scores[id].score || 0,
        isMe: socket && id === socket.id
      }))
      .sort((a, b) => b.score - a.score);
  };

  const renderContent = () => {
    if (status === 'connecting' || status === 'waiting') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 py-12">
          <div className="relative">
            <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center border-2 border-primary shadow-[0_0_30px_rgba(255,173,74,0.2)] animate-pulse">
              <span className="material-symbols-outlined text-4xl text-primary">sensors</span>
            </div>
          </div>
          <div className="text-center space-y-2">
            <h2 className="font-headline text-3xl font-bold uppercase tracking-tighter text-white">Waiting Room</h2>
            <p className="text-on-surface-variant font-label text-sm uppercase tracking-widest px-4">
              {status === 'waiting' ? sysStatus || 'In attesa di altri giocatori...' : 'Connessione al server...'}
            </p>
          </div>
          <div className="w-full max-w-xs bg-surface-container-high rounded-full h-1 overflow-hidden">
            <div className="bg-primary h-full w-1/3 animate-[loading_2s_infinite]"></div>
          </div>
          <button
            className="text-on-surface-variant font-bold text-xs uppercase tracking-[0.2em] hover:text-primary transition-colors"
            onClick={onExit}
          >
            Annulla Missione
          </button>
        </div>
      );
    }

    if (status === 'countdown') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-12">
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl scale-150"></div>
            <div className="relative w-48 h-48 bg-surface-container-low rounded-full border-8 border-primary flex items-center justify-center shadow-[0_0_60px_rgba(255,173,74,0.2)]">
              <span className="font-headline font-black text-8xl text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
                {countdownTimer > 0 ? countdownTimer : 'GO!'}
              </span>
            </div>
          </div>
          <div className="text-center space-y-4">
            <h2 className="font-headline text-2xl font-bold uppercase tracking-[0.1em] text-primary">Sincronizzazione...</h2>
            <div className="flex gap-2">
              {[1, 2, 3].map(i => (
                <div key={i} className={`w-3 h-3 rounded-full ${i <= (3 - countdownTimer) ? 'bg-primary shadow-[0_0_10px_#ffad4a]' : 'bg-surface-container-highest'}`}></div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (status === 'finished') {
      let isWin = false;
      let title = 'Fine Partita';
      let msg = '';
      let endLeaderboard = [];

      if (errorMsg) {
        msg = errorMsg;
        title = 'Connessione Persa';
      } else if (gameOverData) {
        const baseScore = gameOverData.scores?.[socket.id]?.score || getMyScore();
        const totalEarned = gameOverData.loyaltyPoints?.[socket.id] || baseScore;
        const bonus = totalEarned - baseScore;

        if (gameOverData.winner === socket.id) {
          isWin = true;
          title = gameType === 'SQUIRREL' ? 'RIFLESSI D\'ORO' : 'MISSIONE COMPIUTA';
          msg = gameType === 'SQUIRREL' ? `Sei stato il più veloce! Hai vinto ${totalEarned} PTS` : `Dominio assoluto! Hai vinto ${totalEarned} PTS`;
        } else if (gameOverData.winner === null) {
          title = 'STALLO';
          msg = 'Pareggio tecnico. Nessun bonus assegnato.';
        } else {
          title = gameType === 'SQUIRREL' ? 'TROPPO LENTO' : 'SCONFITTA';
          msg = gameType === 'SQUIRREL' ? `Scoiattolo sfuggito, ma porti a casa ${totalEarned} PTS` : `Missione fallita, ma porti a casa ${totalEarned} PTS`;
        }

        endLeaderboard = Object.keys(gameOverData.scores || {}).map(id => ({
          id,
          email: gameOverData.scores[id].email,
          score: gameOverData.scores[id].score,
          totalEarned: gameOverData.loyaltyPoints?.[id] || 0,
          isMe: socket && id === socket.id
        })).sort((a, b) => b.score - a.score);
      }

      return (
        <div className="py-6 space-y-8 max-w-md mx-auto">
          <div className="text-center space-y-2">
            <div className={`inline-flex items-center gap-2 px-4 py-1 rounded-full border mb-4 ${isWin ? 'bg-secondary/20 border-secondary text-secondary' : 'bg-primary/20 border-primary text-primary'}`}>
              <span className="material-symbols-outlined text-sm">{isWin ? 'emoji_events' : 'sports_score'}</span>
              <span className="font-label text-[10px] font-black uppercase tracking-widest">{isWin ? 'Winner' : 'Match End'}</span>
            </div>
            <h2 className={`font-headline text-4xl font-black tracking-tighter uppercase ${isWin ? 'text-secondary' : 'text-primary'}`}>{title}</h2>
            <p className="text-on-surface-variant font-body text-sm px-8">{msg}</p>
          </div>

          <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/10 shadow-2xl space-y-6">
            <h3 className="font-headline font-bold text-center uppercase tracking-widest text-xs text-on-surface-variant">Classifica Finale</h3>
            <div className="space-y-4">
              {endLeaderboard.map((p, index) => (
                <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl ${p.isMe ? 'bg-surface-container-highest border border-secondary/20' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className={`font-headline font-black text-lg ${index === 0 ? 'text-primary' : 'text-on-surface-variant'}`}>{index + 1}°</span>
                    <div className="flex flex-col">
                      <span className={`font-bold text-sm ${p.isMe ? 'text-secondary' : 'text-on-surface'}`}>
                        {p.isMe ? 'Tu (Operatore)' : (p.email ? p.email.split('@')[0] : 'Infiltrato')}
                      </span>
                      <span className="text-[10px] text-on-surface-variant uppercase font-label">{p.score} Blocchi</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block font-headline font-bold text-white text-lg">{p.totalEarned}</span>
                    <span className="block text-[8px] font-label text-on-surface-variant uppercase">PTS</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            className="w-full bg-primary text-on-primary py-5 rounded-2xl font-headline font-black text-xl uppercase tracking-tighter border-b-4 border-primary-dim active:border-b-0 active:translate-y-1 transition-all"
            onClick={onExit}
          >
            Torna alla Base
          </button>
        </div>
      );
    }

    const renderButtonContent = (btnColor) => {
      if (gameType === 'SQUIRREL' && squirrelData && squirrelData.color === btnColor) {
        if (squirrelData.type === 'bomb') {
          return <span className="text-5xl filter drop-shadow-[0_0_15px_rgba(255,0,0,0.8)] animate-pulse">💣</span>;
        } else {
          return <span className="text-5xl filter drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] animate-bounce">🐿️</span>;
        }
      }
      return null;
    };

    // --- PLAYING STATE ---
    return (
      <div className="flex flex-col flex-1 space-y-3 animate-[fade-in_0.5s_ease-out] relative">
        {isFrozen && (
          <div className="absolute inset-0 z-50 bg-neutral-900/60 backdrop-blur-sm rounded-3xl flex items-center justify-center animate-[fade-in_0.2s_ease-out]">
            <span className="text-7xl drop-shadow-[0_0_20px_rgba(255,0,0,0.5)]">🔒</span>
          </div>
        )}

        {/* Real-time Arena Scores */}
        <section className="grid grid-cols-2 gap-3">
          {getLeaderboard().slice(0, 2).map((p, index) => (
            <div key={p.id} className={`relative p-4 rounded-xl border-l-4 overflow-hidden shadow-lg ${p.isMe ? 'bg-secondary/10 border-secondary' : 'bg-surface-container-low border-primary/40'
              }`}>
              <div className="flex justify-between items-start relative z-10">
                <span className="font-label text-[10px] font-black uppercase text-on-surface-variant flex items-center gap-2">
                  <span className="text-xl">{p.avatar || (p.isMe ? '👤' : '🤖')}</span>
                  {p.isMe ? 'Soggetto' : 'Rival'}
                </span>
                <span className={`font-headline font-black text-2xl ${p.isMe ? 'text-secondary' : 'text-primary'}`}>
                  {p.score}
                </span>
              </div>
              <h4 className="font-headline font-bold text-xs uppercase truncate text-on-surface relative z-10 mt-1">
                {p.isMe ? 'Tu' : (p.email ? p.email.split('@')[0] : 'Infiltrato')}
              </h4>
              {/* Background Rank Number */}
              <span className="absolute -bottom-4 -right-2 font-headline font-black text-6xl text-on-surface/5 italic">{index + 1}</span>
            </div>
          ))}
        </section>

        {/* Central Action Area (Target) */}
        <div className="relative group">
          <div className="absolute inset-0 bg-primary/5 rounded-3xl blur-3xl group-hover:bg-primary/10 transition-colors"></div>
          <div className="relative bg-surface-container-low rounded-3xl p-1 border-2 border-outline-variant/10 shadow-[0_0_40px_rgba(0,0,0,0.3)]">
            <div className="flex flex-col items-center justify-center p-4 space-y-2">
              {gameType === 'TOTEM' ? (
                <>
                  <div className="w-full h-24 rounded-2xl flex items-center justify-center overflow-hidden bg-neutral-900 border border-outline-variant/10 relative">
                    {targetColor ? (
                      <div
                        className="w-full h-full transition-all duration-300 relative overflow-hidden"
                        style={{ background: targetColor.hex }}
                      >
                        <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 rounded-full blur-xl"></div>
                      </div>
                    ) : (
                      <div className="spinner-small"></div>
                    )}
                  </div>
                  <div className="text-center">
                    <span className="font-label text-[10px] text-primary font-black uppercase tracking-[0.3em]">Block Detected</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-24 flex items-center justify-center text-center">
                  <span className="font-headline text-3xl text-primary font-black uppercase tracking-widest drop-shadow-[0_0_15px_rgba(38,254,220,0.4)] animate-pulse">
                    SQUIRREL!
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CONTROLS (Giant 2x2 Grid) */}
        <div className="grid grid-cols-2 gap-4 flex-1 min-h-[250px] touch-none">
          <GameButton
            color="green"
            baseColor="bg-[#10b981]"
            borderColor="border-[#065f46]"
            content={renderButtonContent('green')}
            animType={animColor === 'green' ? animType : null}
            onPointerDown={handleColorClick}
          />
          <GameButton
            color="blue"
            baseColor="bg-[#3b82f6]"
            borderColor="border-[#1e3a8a]"
            content={renderButtonContent('blue')}
            animType={animColor === 'blue' ? animType : null}
            onPointerDown={handleColorClick}
          />
          <GameButton
            color="yellow"
            baseColor="bg-[#eab308]"
            borderColor="border-[#854d0e]"
            content={renderButtonContent('yellow')}
            animType={animColor === 'yellow' ? animType : null}
            onPointerDown={handleColorClick}
          />
          <GameButton
            color="red"
            baseColor="bg-[#ef4444]"
            borderColor="border-[#991b1b]"
            content={renderButtonContent('red')}
            animType={animColor === 'red' ? animType : null}
            onPointerDown={handleColorClick}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col h-[calc(100vh-180px)]">
      {renderContent()}
    </div>
  );
}
