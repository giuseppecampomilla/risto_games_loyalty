window.RistoWheelGame = function(containerId, prizes) {
    this.container = document.getElementById(containerId);
    this.prizes = prizes; 
    if (!this.prizes || this.prizes.length === 0) {
        this.prizes = ['Ritenta'];
    }
    this.numSlices = this.prizes.length;
    this.arc = Math.PI * 2 / this.numSlices;
    this.colors = ['#e74c3c','#1abc9c','#f1c40f','#3498db','#9b59b6','#e67e22', '#e84393', '#d63031', '#2ecc71', '#fdcb6e'];
    this.isSpinning = false;
    this.currentRotation = 0; 
};

window.RistoWheelGame.prototype.init = function() {
    this.container.innerHTML = 
        '<div class="rl-wheel-wrapper">' +
            '<div class="rl-wheel-pointer"></div>' +
            '<canvas id="rl-wheel-canvas" width="280" height="280" ' +
            'style="border-radius:50%;border:6px solid #FFD700;box-shadow:0 0 15px rgba(255,215,0,0.5);transition: transform 4s cubic-bezier(0.25, 0.1, 0.25, 1);">' +
            '</canvas>' +
            '<button class="rl-gold-button" id="rl-wheel-spin-btn" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);padding:15px;z-index:4;border-radius:50%;width:80px;height:80px;font-weight:900;">GIRA</button>' +
        '</div>' +
        '<div class="rl-prize-text" id="rl-wheel-prize" style="display:none;margin-top:1.5rem;text-align:center;"></div>';

    this.canvas = document.getElementById('rl-wheel-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.spinBtn = document.getElementById('rl-wheel-spin-btn');
    this.prizeBox = document.getElementById('rl-wheel-prize');

    this.drawWheel();
};

window.RistoWheelGame.prototype.drawWheel = function() {
    var ctx = this.ctx;
    var centerX = 140;
    var centerY = 140;
    var radius = 135;

    ctx.clearRect(0,0,280,280);

    for (var i = 0; i < this.numSlices; i++) {
        ctx.beginPath();
        ctx.fillStyle = this.colors[i % this.colors.length];
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, i * this.arc, (i + 1) * this.arc);
        ctx.lineTo(centerX, centerY);
        ctx.fill();

        // Contorno
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#fff';
        ctx.stroke();

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((i + 0.5) * this.arc);
        ctx.fillStyle = '#fff';
        
        // Font size dinamico
        var fontSize = 14;
        if(this.numSlices > 6) fontSize = 12;
        if(this.numSlices > 8) fontSize = 10;
        
        ctx.font = '700 ' + fontSize + 'px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        
        var text = this.prizes[i];
        if (text.length > 18) {
            text = text.substring(0, 15) + '...';
        }
        ctx.fillText(text, radius - 15, 0);
        ctx.restore();
    }
};

window.RistoWheelGame.prototype.onSpinClick = function(callback) {
    var self = this;
    this.spinBtn.addEventListener('click', function(e) {
        e.preventDefault();
        callback();
    });
};

window.RistoWheelGame.prototype.spinTo = function(targetPrizeStr, onComplete) {
    if (this.isSpinning) return;
    this.isSpinning = true;
    this.spinBtn.disabled = true;
    
    // Trova l'indice del premio vincente
    // Il targetPrizeStr in input è quello ritornato dall'AJAX. 
    // Esempio: se non vincente "Niente" non c'è, magari è "". 
    // Se "Ritenta" non esiste, prova a trovarlo con matching parziale.
    var targetIndex = -1;
    for (var i = 0; i < this.prizes.length; i++) {
        if (targetPrizeStr !== '' && this.prizes[i] === targetPrizeStr) {
            targetIndex = i; break;
        }
    }
    
    if (targetIndex === -1) {
        // Fallback: cerca "Ritenta" o casella senza premi
        for (var j = 0; j < this.prizes.length; j++) {
            if (this.prizes[j] === 'Ritenta' || this.prizes[j].toLowerCase().indexOf('sconto') === -1) {
                targetIndex = j; break;
            }
        }
    }
    if (targetIndex === -1) {
        targetIndex = Math.floor(Math.random() * this.numSlices); // purè random in caso estremo
    }

    var sliceAngleDeg = (360 / this.numSlices);
    var targetCenterDeg = (targetIndex * sliceAngleDeg) + (sliceAngleDeg / 2);
    
    // Fermati esattamente sullo spicchio indicato dal pointer in alto (270 gradi)
    var stopDeg = 270 - targetCenterDeg; 
    var extraSpins = 360 * 6; // 6 rotazioni complete di spettacolo
    
    var newRotation = this.currentRotation + extraSpins;
    var currentMod = newRotation % 360;
    var diff = stopDeg - currentMod;
    if (diff < 0) diff += 360;
    newRotation += diff;

    // Aggiungo offset casuale dentro lo spicchio
    var randomOffset = (Math.random() * (sliceAngleDeg * 0.7)) - (sliceAngleDeg * 0.35);
    newRotation += randomOffset;

    this.currentRotation = newRotation;
    this.canvas.style.transform = 'rotate(' + this.currentRotation + 'deg)';

    var self = this;
    setTimeout(function() {
        self.isSpinning = false;
        if (onComplete) onComplete();
    }, 4200); 
};
