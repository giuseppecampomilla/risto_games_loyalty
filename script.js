document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('lead-form');
    const formContainer = document.getElementById('lead-form-container');
    const scratchContainer = document.getElementById('scratch-container');
    const subtitle = document.getElementById('main-subtitle');
    const prizeText = document.getElementById('prize-text');
    const canvas = document.getElementById('scratch-canvas');
    const playAgainBtn = document.getElementById('play-again-btn');
    const applauseSound = document.getElementById('applause-sound');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Premi possibili
    const prizes = ['Caffè Omaggio ☕', 'Sconto 10% 🎫', 'Amaro della Casa 🥃'];
    
    // Variabili Canvas
    let isDrawing = false;
    let isRevealed = false;
    let brushRadius = 20;

    // Inizializza il Canvas (Manto argentato)
    function initCanvas() {
        // Ripristina composite operation per disegnare il nuovo strato
        ctx.globalCompositeOperation = 'source-over';

        // Colore grigio "grattabile"
        ctx.fillStyle = '#c0c0c0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Aggiungi un pattern/rumore per sembrare più simile a uno strato argentato reale
        for (let i = 0; i < canvas.width; i += 4) {
            for (let j = 0; j < canvas.height; j += 4) {
                if (Math.random() > 0.5) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                    ctx.fillRect(i, j, 4, 4);
                } else {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
                    ctx.fillRect(i, j, 4, 4);
                }
            }
        }

        // Testo istruzioni sopra l'argento
        ctx.font = '700 24px Outfit';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GRATTA QUI', canvas.width / 2, canvas.height / 2);

        // Prepara il canvas per "cancellare" con il tocco/mouse
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = brushRadius * 2;
    }

    // Calcola la percentuale cancellata
    function getScratchedPercentage() {
        const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let transparentPixels = 0;
        const totalPixels = pixels.length / 4;

        // iteriamo ogni pixel. Se l'alpha channel è basso, è cancellato
        for (let i = 3; i < pixels.length; i += 4) {
            if (pixels[i] < 50) {
                transparentPixels++;
            }
        }

        return (transparentPixels / totalPixels) * 100;
    }

    // Helper per trovare coordinate precise su mobile e desktop
    function getMousePos(evt) {
        const rect = canvas.getBoundingClientRect();
        // gestisci sia touch che mouse
        let clientX = evt.clientX;
        let clientY = evt.clientY;

        if (evt.touches && evt.touches.length > 0) {
            clientX = evt.touches[0].clientX;
            clientY = evt.touches[0].clientY;
        }

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function scratch(evt) {
        if (!isDrawing || isRevealed) return;
        evt.preventDefault();

        const pos = getMousePos(evt);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();

        // Check if won (ogni pochi move o up, ma ottimizziamo facendolo al touch up/mouse up
        // per non fare getImageData a ogni minino movimento)
    }

    function startScratch(evt) {
        if (isRevealed) return;
        isDrawing = true;
        const pos = getMousePos(evt);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        scratch(evt);
    }

    function stopScratch() {
        if (!isDrawing) return;
        isDrawing = false;
        
        if (!isRevealed) {
            const percentage = getScratchedPercentage();
            if (percentage > 50) {
                revealPrize();
            }
        }
    }

    function revealPrize() {
        isRevealed = true;
        canvas.classList.add('scratch-revealed');
        
        // Riproduci suono Applausi
        applauseSound.currentTime = 0;
        applauseSound.play().catch(e => console.log('Audio play error:', e));

        // Mostra il pulsante "Gioca ancora"
        playAgainBtn.style.display = 'block';
        
        // Confetti effect
        const duration = 3000;
        const end = Date.now() + duration;

        (function frame() {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#FFD700', '#ffaa00', '#ffffff']
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#FFD700', '#ffaa00', '#ffffff']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    }

    // Event listeners per il canvas
    canvas.addEventListener('mousedown', startScratch);
    canvas.addEventListener('mousemove', scratch);
    canvas.addEventListener('mouseup', stopScratch);
    canvas.addEventListener('mouseleave', stopScratch);

    canvas.addEventListener('touchstart', startScratch, {passive: false});
    canvas.addEventListener('touchmove', scratch, {passive: false});
    canvas.addEventListener('touchend', stopScratch);

    // Gestione pulsante Gioca Ancora
    playAgainBtn.addEventListener('click', () => {
        isRevealed = false;
        isDrawing = false;
        
        playAgainBtn.style.display = 'none';
        
        // Disabilitiamo temporaneamente la transizione CSS per far tornare il canvas opaco ISTANTANEAMENTE
        canvas.style.transition = 'none';
        canvas.classList.remove('scratch-revealed');
        
        // Forziamo il browser ad applicare subito la modifica senza transizione
        void canvas.offsetWidth;
        
        // Ripristiniamo la transizione per la prossima vincita
        canvas.style.transition = '';
        
        // Scegli un nuovo premio casuale
        const randomPrize = prizes[Math.floor(Math.random() * prizes.length)];
        prizeText.textContent = randomPrize;
        
        initCanvas();
    });

    // Gestione Form
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Simula invio dati
        const name = document.getElementById('user-name').value;
        
        // Scegli random un premio
        const randomPrize = prizes[Math.floor(Math.random() * prizes.length)];
        prizeText.textContent = randomPrize;

        // Animazione UI: nascondi form, mostra scratch
        formContainer.style.display = 'none';
        subtitle.textContent = `Buona fortuna, ${name}! Gratta e scopri il premio.`;
        scratchContainer.style.display = 'block';

        initCanvas();
    });
});
