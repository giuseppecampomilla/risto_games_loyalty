import React, { useState, useEffect } from 'react';
import './Login.css';

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 giorni

function getValidSession() {
  try {
    const raw = localStorage.getItem('ristoLoyaltySession');
    if (!raw) return null;
    const token = JSON.parse(raw);
    if (!token?.email || !token?.issued_at) return null;
    if (Date.now() - token.issued_at > SESSION_DURATION_MS) {
      localStorage.removeItem('ristoLoyaltySession');
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export default function Login({ onLogin, signupBonus = 150 }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [otp, setOtp] = useState('');
  const API_SECRET = 'sk_multigame_92a3b1d8f7e6c40a5b6c7d8e9f0a1b2c3d4e5f6';
  
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // Auto-login da URL: se ?email= è presente, salta la schermata iniziale.
  // Prima controlla se esiste già una sessione valida per quell'email:
  // in quel caso bypassiamo completamente l'OTP.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailFromUrl = params.get('email');
    if (!emailFromUrl) return;

    setEmail(emailFromUrl);

    // ✅ Sessione già valida → login diretto senza OTP
    const session = getValidSession();
    if (session && session.email === emailFromUrl) {
      onLogin({ email: emailFromUrl, nome: session.nome || '', punti: signupBonus, livello: 'Silver' });
      return;
    }

    // Nessuna sessione valida → richiedi OTP come prima
    setIsLoading(true);
    fetch(`${API_BASE_URL}/request-otp/?api_secret=${API_SECRET}`, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json', 'X-API-Secret': API_SECRET },
      body: JSON.stringify({ email: emailFromUrl, nome: '' })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          if (data.requires_otp) {
            setStep('otp');
          } else {
            // Utente verificato dal server, nessun OTP richiesto
            onLogin({ email: emailFromUrl, nome: '', punti: signupBonus, livello: 'Silver' });
          }
        }
      })
      .catch(() => setErrorMsg('Errore di connessione.'))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedNome = mode === 'signup' ? nome.trim() : '';

    if (!trimmedEmail) return;
    if (mode === 'signup' && !trimmedNome) {
      setErrorMsg('Inserisci un nickname per registrarti.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      // In modalità signup: controlla disponibilità nickname
      if (mode === 'signup' && trimmedNome) {
        const resCheck = await fetch(
          `${API_BASE_URL}/check-nickname/?nome=${encodeURIComponent(trimmedNome)}&email=${encodeURIComponent(trimmedEmail)}&api_secret=${API_SECRET}`,
          { 
            mode: 'cors',
            headers: { 'X-API-Secret': API_SECRET } 
          }
        );
        if (resCheck.ok) {
          const dataCheck = await resCheck.json();
          if (dataCheck.taken) {
            setErrorMsg('Questo Nickname è già in uso da un altro utente. Scegline uno diverso!');
            setIsLoading(false);
            return;
          }
        }
      }

      // Richiesta OTP (funziona sia per nuovi che per utenti esistenti)
      const resOtp = await fetch(`${API_BASE_URL}/request-otp/?api_secret=${API_SECRET}`, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json', 'X-API-Secret': API_SECRET },
        body: JSON.stringify({ email: trimmedEmail, nome: trimmedNome })
      });

      if (resOtp.ok) {
        const dataOtp = await resOtp.json();
        if (dataOtp.requires_otp) {
          setStep('otp');
        } else {
          onLogin({ email: trimmedEmail, nome: trimmedNome, punti: signupBonus, livello: 'Silver' });
        }
      } else {
        setErrorMsg('Errore di comunicazione col server.');
      }
    } catch (err) {
      console.error('Errore validazione', err);
      setErrorMsg('Errore di connessione.');
    }
    setIsLoading(false);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length > 0) {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const res = await fetch(`${API_BASE_URL}/verify-code/?api_secret=${API_SECRET}`, {
            method: 'POST',
            mode: 'cors',
            headers: { 
                'Content-Type': 'application/json',
                'X-API-Secret': API_SECRET
            },
            body: JSON.stringify({ email, code: otp })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.success) {
                // ✅ Salva il token di sessione nel localStorage
                const sessionToken = {
                  email,
                  nome,
                  issued_at: Date.now(),
                };
                localStorage.setItem('ristoLoyaltySession', JSON.stringify(sessionToken));
                onLogin({ email, nome, punti: signupBonus, livello: 'Silver' });
            } else {
                setErrorMsg(data.message || 'Codice errato.');
            }
        } else {
            setErrorMsg('Codice errato o scaduto.');
        }
      } catch (err) {
          setErrorMsg('Errore di connessione.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card card-glass">
        <div className="login-header">
           <div className="login-avatar">{mode === 'login' ? '🔑' : '👑'}</div>
           <h2>{mode === 'login' ? 'Bentornato!' : 'Unisciti al Club'}</h2>
           <p>{mode === 'login'
             ? 'Inserisci la tua email per accedere al programma fedeltà.'
             : 'Crea il tuo account e inizia a guadagnare punti.'
           }</p>
        </div>

        {/* Toggle Login / Registrazione */}
        {step === 'email' && (
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px', marginBottom: '1.5rem', gap: '4px' }}>
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(''); }}
              style={{
                flex: 1, padding: '8px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.5px',
                background: mode === 'login' ? 'rgba(251,191,36,0.2)' : 'transparent',
                color: mode === 'login' ? '#fbbf24' : '#6b7280',
                transition: 'all 0.2s'
              }}
            >ACCEDI</button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMsg(''); }}
              style={{
                flex: 1, padding: '8px', borderRadius: '9px', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.5px',
                background: mode === 'signup' ? 'rgba(251,191,36,0.2)' : 'transparent',
                color: mode === 'signup' ? '#fbbf24' : '#6b7280',
                transition: 'all 0.2s'
              }}
            >REGISTRATI</button>
          </div>
        )}
        
        {errorMsg && (
            <div style={{ background: '#ef444420', color: '#fca5a5', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center', border: '1px solid #ef4444' }}>
                {errorMsg}
            </div>
        )}
        
        {step === 'email' ? (
            <form onSubmit={handleSubmit} className="login-form">
              {/* Nickname: visibile solo in modalità signup */}
              {mode === 'signup' && (
                <div className="input-group">
                  <label>Nickname</label>
                  <input 
                    type="text" 
                    placeholder="Come ti chiami?" 
                    value={nome} 
                    onChange={(e) => setNome(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="input-group">
                <label>Email</label>
                <input 
                  type="email" 
                  placeholder="La tua email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className={`btn-spin ${isLoading ? 'disabled' : ''}`} style={{marginTop: '1rem'}} disabled={isLoading}>
                {isLoading ? 'ATTENDERE...' : (mode === 'login' ? 'ENTRA ORA' : 'CREA ACCOUNT')}
              </button>
            </form>
        ) : (
            <form onSubmit={handleVerify} className="login-form">
              <p style={{marginBottom: '1rem', color: '#ccc', textAlign: 'center'}}>
                Abbiamo inviato un codice a <strong>{email}</strong>. Inseriscilo qui sotto.
              </p>
              <div className="input-group">
                <label>Codice di Verifica (4 cifre)</label>
                <input 
                  type="text" 
                  placeholder="es. 1234" 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength="4"
                  style={{textAlign: 'center', letterSpacing: '4px', fontSize: '1.2rem'}}
                />
              </div>
              <button type="submit" className={`btn-spin ${isLoading ? 'disabled' : ''}`} style={{marginTop: '1rem'}} disabled={isLoading}>
                {isLoading ? 'ATTENDERE...' : 'VERIFICA CODICE'}
              </button>
              <button type="button" onClick={() => setStep('email')} style={{background: 'transparent', border:'none', color: '#999', marginTop: '1rem', cursor: 'pointer', display: 'block', width: '100%'}}>
                Cambia email o nome
              </button>
            </form>
        )}

      </div>
    </div>
  );
}
