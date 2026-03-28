class RistoGameHandler {
    constructor(containerId, gameType) {
        this.container = document.getElementById(containerId);
        this.gameType = gameType;
        this.prizeText = null;
        this.canvas = null;
        this.ctx = null;
        this.isRevealed = false;
        this.prizeStr = '';
        this.isWinner = false;
    }

    initGame(isWinner, prizeStr) {
        this.isWinner = isWinner;
        this.prizeStr = prizeStr;
        this.isRevealed = false;
        
        // Pulisce il contenitore prima di avviare il nuovo gioco
        this.container.innerHTML = '<div class="rl-prize-text" id="rl-prize-text" style="display:none; z-index:1;"></div>';
        this.prizeText = document.getElementById('rl-prize-text');
        this.prizeText.textContent = this.prizeStr;
        
        if (this.gameType === 'gratta_e_vinci') {
            this.initScratch();
        } else if (this.gameType === 'ruota_fortuna') {
            this.initWheel();
        } else if (this.gameType === 'slot_machine') {
            this.initSlot();
        } else {
            // Default o fallback
            this.initScratch();
        }
    }

    onWin() {
        this.isRevealed = true;
        
        // Mostra sempre il testo del premio quando vince o finisce il gioco
        if(this.prizeText) this.prizeText.style.display = 'flex';
        
        if(this.isWinner && typeof confetti !== 'undefined') {
            confetti({particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#FFD700', '#ffaa00', '#ffffff']});
            let audio = document.getElementById('rl-applause-sound');
            if(audio) { audio.currentTime = 0; audio.play().catch(e=>console.log(e)); }
        }
        document.getElementById('rl-play-again-btn').style.display = 'inline-block';
    }

    // --- GRATTA E VINCI ---
    initScratch() {
        this.prizeText.style.display = 'flex'; // Il gratta e vinci nasconde con il canvas, non col display
        this.container.innerHTML += '<canvas id="rl-game-canvas" width="300" height="150" style="position:absolute;top:0;left:50%;transform:translateX(-50%);z-index:2;cursor:crosshair;transition:opacity 0.5s ease-out;border-radius:15px;background:#1a1a1a;"></canvas>';
        
        this.canvas = document.getElementById('rl-game-canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.fillStyle = '#c0c0c0';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Pattern argento base
        for (let i = 0; i < this.canvas.width; i += 4) {
            for (let j = 0; j < this.canvas.height; j += 4) {
                if (Math.random() > 0.5) {
                    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                    this.ctx.fillRect(i, j, 4, 4);
                }
            }
        }

        this.ctx.font = '700 24px sans-serif';
        this.ctx.fillStyle = '#666';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('GRATTA QUI', this.canvas.width/2, this.canvas.height/2);
        
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.lineWidth = 40;
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';

        let isDrawing = false;
        
        const scratchFn = (e) => {
            if(!isDrawing || this.isRevealed) return;
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            let x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
            let y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
        };

        const startFn = (e) => {
            if(this.isRevealed) return;
            isDrawing = true;
            this.ctx.beginPath();
            scratchFn(e);
        };

        const stopFn = () => {
            if(!isDrawing) return;
            isDrawing = false;
            if(!this.isRevealed) {
                let p = this.ctx.getImageData(0,0,this.canvas.width,this.canvas.height).data, t=0;
                for(let i=3; i<p.length; i+=4) if(p[i]<50) t++;
                if(t/(p.length/4) > 0.5) {
                    this.canvas.style.opacity = 0;
                    this.canvas.style.pointerEvents = 'none';
                    this.onWin();
                }
            }
        };

        this.canvas.addEventListener('mousedown', startFn);
        this.canvas.addEventListener('mousemove', scratchFn);
        this.canvas.addEventListener('mouseup', stopFn);
        this.canvas.addEventListener('mouseleave', stopFn);
        this.canvas.addEventListener('touchstart', startFn, {passive:false});
        this.canvas.addEventListener('touchmove', scratchFn, {passive:false});
        this.canvas.addEventListener('touchend', stopFn);
    }

    // --- RUOTA DELLA FORTUNA ---
    initWheel() {
        this.container.innerHTML = `
            <div style="position:relative; width:220px; height:220px; margin:auto;">
                <canvas id="rl-game-canvas" width="220" height="220" style="transition: transform 3.5s cubic-bezier(0.25, 0.1, 0.25, 1); border-radius:50%; border: 6px solid #FFD700; box-shadow: 0 0 15px rgba(255,215,0,0.5);"></canvas>
                <div style="position:absolute; top:-15px; left:50%; transform:translateX(-50%); width:0; height:0; border-left:15px solid transparent; border-right:15px solid transparent; border-top:25px solid #fff; z-index:3; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.5));"></div>
                <button id="spin-btn" class="rl-gold-button" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); padding: 15px; z-index:4; border-radius:50%; width:80px; height:80px; font-weight:900;">GIRA</button>
            </div>
            <div class="rl-prize-text" id="rl-prize-text" style="display:none; position:relative; margin-top:2rem;"></div>
        `;
        this.prizeText = document.getElementById('rl-prize-text');
        this.prizeText.textContent = this.prizeStr;
        this.canvas = document.getElementById('rl-game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Disegna 6 spicchi colorati sulla ruota
        const colors = ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#e67e22'];
        const slices = 6;
        const arc = Math.PI * 2 / slices;
        for(let i=0; i<slices; i++) {
            this.ctx.beginPath();
            this.ctx.fillStyle = colors[i];
            this.ctx.moveTo(110, 110);
            this.ctx.arc(110, 110, 110, i * arc, (i + 1) * arc);
            this.ctx.lineTo(110, 110);
            this.ctx.fill();
        }

        const spinBtn = document.getElementById('spin-btn');
        spinBtn.addEventListener('click', () => {
            if (this.isRevealed) return;
            spinBtn.disabled = true;
            
            // Simula un numero di giri base + uno spicchietto basato sulla vittoria o perdita
            // In un gioco reale si mappa il premio allo spicchio, qui semplifichiamo con animazione standard
            const spinAmount = 360 * 5 + (Math.floor(Math.random() * 360)); 
            this.canvas.style.transform = \`rotate(\${spinAmount}deg)\`;
            
            setTimeout(() => {
                this.onWin();
            }, 3500);
        });
    }

    // --- SLOT MACHINE ---
    initSlot() {
        this.container.innerHTML = \`
            <div style="display:flex; justify-content:center; gap:15px; margin-bottom: 25px;">
                <div class="slot" id="slot-1" style="width:70px; height:70px; background:#fff; border-radius:10px; font-size:45px; display:flex; align-items:center; justify-content:center; border:3px solid #FFD700; color:#000; box-shadow:inset 0 0 10px rgba(0,0,0,0.5);">🍒</div>
                <div class="slot" id="slot-2" style="width:70px; height:70px; background:#fff; border-radius:10px; font-size:45px; display:flex; align-items:center; justify-content:center; border:3px solid #FFD700; color:#000; box-shadow:inset 0 0 10px rgba(0,0,0,0.5);">🍋</div>
                <div class="slot" id="slot-3" style="width:70px; height:70px; background:#fff; border-radius:10px; font-size:45px; display:flex; align-items:center; justify-content:center; border:3px solid #FFD700; color:#000; box-shadow:inset 0 0 10px rgba(0,0,0,0.5);">🍉</div>
            </div>
            <button id="slot-btn" class="rl-gold-button">TIRA LA LEVA</button>
            <div class="rl-prize-text" id="rl-prize-text" style="display:none; position:relative; margin-top:1.5rem;"></div>
        \`;
        this.prizeText = document.getElementById('rl-prize-text');
        this.prizeText.textContent = this.prizeStr;
        
        const btn = document.getElementById('slot-btn');
        const icons = ['🍒','🍋','🍉','🍕','🍔','🍷'];

        btn.addEventListener('click', () => {
            if(this.isRevealed) return;
            btn.disabled = true;
            
            let spins = 0;
            const interval = setInterval(() => {
                document.getElementById('slot-1').innerText = icons[Math.floor(Math.random()*icons.length)];
                document.getElementById('slot-2').innerText = icons[Math.floor(Math.random()*icons.length)];
                document.getElementById('slot-3').innerText = icons[Math.floor(Math.random()*icons.length)];
                spins++;
                
                // Dopo 20 giri si ferma e assegna il risultato in base alla % di vittoria calcolata dal backend
                if(spins > 20) {
                    clearInterval(interval);
                    
                    // Forza visivamente la vittoria o la sconfitta!
                    const finalIcon = this.isWinner ? '🏆' : '❌';
                    document.getElementById('slot-1').innerText = finalIcon;
                    document.getElementById('slot-2').innerText = finalIcon;
                    document.getElementById('slot-3').innerText = finalIcon;
                    
                    this.onWin();
                }
            }, 100);
        });
    }
}
