# Piano di Implementazione - Correzione Limiti di Gioco e Probabilità di Vincita

L'utente ha segnalato due problemi principali:
1. Il limite "Numero massimo giocate" non viene rispettato.
2. La "Ruota della Fortuna" (e probabilmente altri giochi) risulta in una vincita troppo frequente, ignorando il parametro "probabilità vincita".

## Revisione Utente Richiesta

> [!IMPORTANT]
> La correzione comporta modifiche sia al plugin WordPress PHP che al frontend React. La logica di vincita rimarrà sul lato client per semplicità (mantenendo l'architettura attuale), ma ora seguirà rigorosamente il parametro `win_chance` dalle impostazioni di WordPress.

> [!WARNING]
> Aggiungerò un controllo lato server all'endpoint `/process-win/`. Se un utente tenta di inviare una vincita dopo aver raggiunto il limite (ad esempio, manipolando il client), il server la rifiuterà.

## Modifiche Proposte

### Backend WordPress (`ristorante-loyalty-games`)

#### [MODIFICA] [loyalty-system.php](file:///Users/guy/Downloads/Test_App/ristorante-loyalty-games/loyalty-system.php)
- **`ristoloyalty_rest_settings`**: Includere `max_plays`, `play_period`, `play_period_unit` e `win_chance` nella risposta.
- **`ristoloyalty_rest_get_user_data`**: Includere `play_count` e `period_start` nell'oggetto utente.
- **`ristoloyalty_rest_process_win`**: 
    - Implementare il controllo del limite di giocate (copiando la logica dal gestore AJAX).
    - Aggiornare `play_count` e `period_start` nel database quando viene elaborata una vincita o giocata.

---

### Frontend React (`risto-loyalty-app`)

#### [MODIFICA] [App.jsx](file:///Users/guy/Downloads/Test_App/risto-loyalty-app/src/App.jsx)
- Implementare un helper `canUserPlay()` che controlli `user.play_count` e `appSettings.max_plays`.
- Mostrare un messaggio di avviso e disabilitare i pulsanti "Gioca" se il limite è raggiunto.
- Passare le `appSettings` complete ai componenti di gioco.

#### [MODIFICA] [Wheel.jsx](file:///Users/guy/Downloads/Test_App/risto-loyalty-app/src/Wheel.jsx)
- Sostituire i premi cablati (`PRIZES`) con una lista dinamica da `settings.prizes`.
- Implementare la selezione vincita/perdita basata su `settings.win_chance`.
- Assicurarsi che l'esito "Ritenta" venga selezionato se il tiro sulla probabilità fallisce.

#### [MODIFICA] [ScratchCard.jsx](file:///Users/guy/Downloads/Test_App/risto-loyalty-app/src/ScratchCard.jsx)
- Simile alla Ruota: usare `settings.win_chance` e premi dinamici.

#### [MODIFICA] [SlotMachine.jsx](file:///Users/guy/Downloads/Test_App/risto-loyalty-app/src/SlotMachine.jsx)
- Simile alla Ruota: usare `settings.win_chance` e premi dinamici.

## Domande Aperte

- Dovremmo mostrare un timer per il prossimo gioco disponibile? (Cercherò di aggiungere una versione semplice se possibile).
- L'attuale array `PRIZES` in `Wheel.jsx` ha 8 "spicchi". Se uso premi dinamici (solitamente 3 slot nelle impostazioni), dovrei riempire il resto con "Ritenta"? (Strategia consigliata).

## Piano di Verifica

### Test Automatizzati
- Nessun test automatizzato disponibile in questo ambiente.

### Verifica Manuale
- **Limite di Gioco**: Gioca una partita e verifica che i pulsanti "Gioca" si disabilitino se il limite (es. 1 gioco ogni 24h) viene raggiunto.
- **Probabilità di Vincita**: Imposta temporaneamente `win_chance` allo 0% in WordPress e verifica che la ruota si fermi sempre su "Ritenta". Impostalo al 100% e verifica che vinca sempre.
- **Sincronizzazione Impostazioni**: Verifica che cambiando i premi in WordPress si aggiornino le etichette sulla ruota React.
