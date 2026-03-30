<?php
if ( ! defined( 'ABSPATH' ) ) exit;

// =========================================================
// HELPER: Genera codice univoco casuale
// =========================================================
function ristoloyalty_generate_unique_code() {
    global $wpdb;
    $table = $wpdb->prefix . 'loyalty_redemptions';
    do {
        $code = strtoupper( substr( bin2hex( random_bytes(5) ), 0, 8 ) );
        $exists = $wpdb->get_var( $wpdb->prepare("SELECT COUNT(*) FROM $table WHERE codice_univoco = %s", $code) );
    } while ( $exists > 0 );
    return $code;
}

// =========================================================
// LEADERBOARD: Top 10 per punti correnti
// =========================================================
function ristoloyalty_get_leaderboard( $limit = 10 ) {
    global $wpdb;
    $table = $wpdb->prefix . 'loyalty_customers';
    return $wpdb->get_results(
        $wpdb->prepare(
            "SELECT nome, email, punti, punti_totali FROM $table ORDER BY punti DESC LIMIT %d",
            $limit
        )
    );
}

// Helper: oscura l'email per la privacy (es. ma***@gmail.com)
function ristoloyalty_obscure_email( $email ) {
    $parts = explode('@', $email);
    if ( count($parts) !== 2 ) return '***';
    $name   = $parts[0];
    $domain = $parts[1];
    $keep   = max(2, (int) floor( strlen($name) / 3 ));
    return substr($name, 0, $keep) . str_repeat('*', max(3, strlen($name) - $keep)) . '@' . $domain;
}

// Shortcode Leaderboard — versione avanzata
add_shortcode('loyalty_leaderboard', 'ristoloyalty_leaderboard_shortcode');
function ristoloyalty_leaderboard_shortcode() {
    $leaders = ristoloyalty_get_leaderboard(10);

    $c_bg     = get_option('loyalty_color_bg',          '#080808');
    $c_accent = get_option('loyalty_color_accent',      '#FFD700');
    $c_text   = get_option('loyalty_color_text',        '#ffffff');
    $c_card   = get_option('loyalty_color_card',        '#1a1a1a');
    $c_btnTxt = get_option('loyalty_color_button_text', '#000000');

    // Data ultimo reset (se impostata)
    $last_reset = get_option('loyalty_leaderboard_last_reset', '');

    ob_start();
    ?>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&display=swap" rel="stylesheet">
    <style>
    .rl-lb-wrap{max-width:500px;margin:0 auto;font-family:'Outfit',sans-serif;color:<?php echo esc_attr($c_text); ?>;}
    .rl-lb-header{background:<?php echo esc_attr($c_bg); ?>;border-radius:20px 20px 0 0;padding:1.8rem 1.5rem 1rem;text-align:center;border:1px solid rgba(255,215,0,.15);border-bottom:none;}
    .rl-lb-header h2{margin:0 0 .3rem;font-size:1.9rem;font-weight:900;color:<?php echo esc_attr($c_accent); ?>;}
    .rl-lb-header p{margin:0;font-size:.85rem;opacity:.5;}
    .rl-lb-body{background:<?php echo esc_attr($c_bg); ?>;border-radius:0 0 20px 20px;padding:.5rem 1rem 1.5rem;border:1px solid rgba(255,215,0,.15);border-top:none;box-shadow:0 10px 40px rgba(0,0,0,.5);}
    /* Podio Top 3 */
    .rl-podio{display:flex;justify-content:center;align-items:flex-end;gap:.8rem;margin:.5rem 0 1.2rem;padding:.8rem 0;}
    .rl-podio-item{display:flex;flex-direction:column;align-items:center;gap:.3rem;flex:1;max-width:130px;}
    .rl-podio-avatar{width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.6rem;font-weight:900;border:3px solid;}
    .rl-podio-avatar.gold{border-color:#FFD700;background:rgba(255,215,0,.15);box-shadow:0 0 16px rgba(255,215,0,.4);}
    .rl-podio-avatar.silver{border-color:#C0C0C0;background:rgba(192,192,192,.12);}
    .rl-podio-avatar.bronze{border-color:#CD7F32;background:rgba(205,127,50,.12);}
    .rl-podio-name{font-size:.78rem;font-weight:700;text-align:center;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .rl-podio-pts{font-size:.78rem;font-weight:900;padding:2px 8px;border-radius:20px;background:<?php echo esc_attr($c_accent); ?>;color:<?php echo esc_attr($c_btnTxt); ?>;}
    .rl-podio-medal{font-size:1.4rem;line-height:1;}
    .rl-podio-item.first .rl-podio-avatar{width:62px;height:62px;font-size:1.9rem;}
    /* Lista 4-10 */
    .rl-lb-list{display:flex;flex-direction:column;gap:.45rem;}
    .rl-lb-row{display:grid;grid-template-columns:2.2rem 1fr auto;align-items:center;gap:.7rem;background:<?php echo esc_attr($c_card); ?>;border-radius:12px;padding:.65rem 1rem;transition:transform .15s;}
    .rl-lb-row:hover{transform:translateX(3px);}
    .rl-lb-pos{font-size:.95rem;font-weight:900;text-align:center;color:<?php echo esc_attr($c_accent); ?>;opacity:.7;}
    .rl-lb-name{font-size:.95rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .rl-lb-pts{font-size:.85rem;font-weight:900;padding:3px 10px;border-radius:20px;background:<?php echo esc_attr($c_accent); ?>;color:<?php echo esc_attr($c_btnTxt); ?>;white-space:nowrap;}
    .rl-lb-empty{text-align:center;opacity:.45;padding:2.5rem 0;font-size:.95rem;}
    .rl-lb-divider{border:none;border-top:1px solid rgba(255,255,255,.07);margin:.6rem 0;}
    /* Responsive */
    @media(max-width:400px){
        .rl-podio-avatar{width:44px;height:44px;font-size:1.3rem;}
        .rl-podio-item.first .rl-podio-avatar{width:54px;height:54px;font-size:1.6rem;}
    }
    </style>

    <div class="rl-lb-wrap">
        <div class="rl-lb-header">
            <h2>🏆 Classifica</h2>
            <?php if ($last_reset): ?>
            <p>Reset mensile: <?php echo esc_html(date_i18n('d/m/Y', strtotime($last_reset))); ?></p>
            <?php else: ?>
            <p>Punti accumulati nel periodo corrente</p>
            <?php endif; ?>
        </div>
        <div class="rl-lb-body">
        <?php if ( empty($leaders) ): ?>
            <p class="rl-lb-empty">🎲 Nessun giocatore ancora in classifica.</p>
        <?php else: ?>
            <?php
            // Estrai top 3 e resto
            $top3 = array_slice($leaders, 0, 3);
            $rest  = array_slice($leaders, 3);

            // Funzione nickname locale
            $get_nick = function($row) {
                $nick = trim($row->nome);
                if ( ! $nick || strlen($nick) < 2 ) {
                    $nick = ristoloyalty_obscure_email($row->email);
                }
                return $nick;
            };

            // Ordine visivo podio: 2nd | 1st | 3rd
            $podio_order = [];
            if ( isset($top3[1]) ) $podio_order[] = ['data' => $top3[1], 'rank' => 2, 'cls' => 'silver', 'medal' => '🥈'];
            if ( isset($top3[0]) ) $podio_order[] = ['data' => $top3[0], 'rank' => 1, 'cls' => 'gold',   'medal' => '🥇'];
            if ( isset($top3[2]) ) $podio_order[] = ['data' => $top3[2], 'rank' => 3, 'cls' => 'bronze', 'medal' => '🥉'];
            ?>

            <!-- PODIO TOP 3 -->
            <?php if ( ! empty($podio_order) ): ?>
            <div class="rl-podio">
                <?php foreach ( $podio_order as $p ): ?>
                <div class="rl-podio-item <?php echo $p['rank'] === 1 ? 'first' : ''; ?>">
                    <div class="rl-podio-medal"><?php echo $p['medal']; ?></div>
                    <div class="rl-podio-avatar <?php echo esc_attr($p['cls']); ?>">
                        <?php echo mb_strtoupper(mb_substr($get_nick($p['data']), 0, 1)); ?>
                    </div>
                    <div class="rl-podio-name"><?php echo esc_html($get_nick($p['data'])); ?></div>
                    <div class="rl-podio-pts"><?php echo esc_html($p['data']->punti); ?> pt</div>
                </div>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>

            <!-- LISTA 4-10 -->
            <?php if ( ! empty($rest) ): ?>
            <hr class="rl-lb-divider">
            <div class="rl-lb-list">
                <?php foreach ( $rest as $i => $row ): ?>
                <div class="rl-lb-row">
                    <div class="rl-lb-pos"><?php echo $i + 4; ?></div>
                    <div class="rl-lb-name"><?php echo esc_html($get_nick($row)); ?></div>
                    <div class="rl-lb-pts"><?php echo esc_html($row->punti); ?> pt</div>
                </div>
                <?php endforeach; ?>
            </div>
            <?php endif; ?>

        <?php endif; ?>
        </div>
    </div>
    <?php
    return ob_get_clean();
}


// Shortcode per il Gioco
add_shortcode('loyalty_game', 'ristoloyalty_game_shortcode');
function ristoloyalty_game_shortcode() {
    $game_type  = get_option('loyalty_game_type', 'gratta_e_vinci');
    $ajaxurl    = admin_url('admin-ajax.php');
    $nonce      = wp_create_nonce('ristoloyalty_nonce');

    // Opzioni grafiche
    $c_bg     = get_option('loyalty_color_bg',          '#080808');
    $c_card   = get_option('loyalty_color_card',        '#1a1a1a');
    $c_text   = get_option('loyalty_color_text',        '#ffffff');
    $c_accent = get_option('loyalty_color_accent',      '#FFD700');
    $c_btnTxt = get_option('loyalty_color_button_text', '#000000');
    $logo_url = get_option('loyalty_logo_url',          '');
    $t_title  = get_option('loyalty_text_title',    'Tenta la fortuna!');
    $t_sub    = get_option('loyalty_text_subtitle', 'Gioca e accumula punti. Raggiungi la soglia e vinci un premio!');
    $t_btn    = get_option('loyalty_text_play_btn', '🎲 Gioca Ora');

    ob_start();
    ?>
    <!-- CSS inline per il plugin -->
    <style>
    #ristoloyalty-app{
        --rl-bg: <?php echo esc_attr($c_bg); ?>;
        --rl-card: <?php echo esc_attr($c_card); ?>;
        --rl-text: <?php echo esc_attr($c_text); ?>;
        --rl-accent: <?php echo esc_attr($c_accent); ?>;
        --rl-btn-txt: <?php echo esc_attr($c_btnTxt); ?>;
    }
    .rl-container{text-align:center;padding:2rem;border-radius:20px;background:var(--rl-bg);box-shadow:0 10px 40px rgba(0,0,0,.5);border:1px solid rgba(255,215,0,.15);max-width:500px;margin:0 auto;font-family:'Outfit',sans-serif;color:var(--rl-text);}
    .rl-golden-title{font-size:2.2rem;font-weight:900;color:var(--rl-accent);margin:0 0 1rem 0;}
    .rl-form-container{display:flex;flex-direction:column;gap:1rem;}
    .rl-form-container form{display:flex;flex-direction:column;gap:.8rem;}
    .rl-form-container input{background:var(--rl-card);border:1px solid #444;color:var(--rl-text);padding:.9rem 1rem;border-radius:10px;font-size:1rem;outline:none;font-family:inherit;}
    .rl-form-container input:focus{border-color:var(--rl-accent);}
    .rl-gold-button{background:var(--rl-accent);color:var(--rl-btn-txt);border:none;padding:.9rem 2rem;font-weight:700;border-radius:10px;cursor:pointer;font-family:inherit;font-size:1rem;transition:transform .2s,box-shadow .2s;}
    .rl-gold-button:hover{transform:translateY(-2px);opacity:.9;}
    .rl-gold-button:disabled{opacity:.6;cursor:not-allowed;transform:none;}
    .rl-points-badge{background:var(--rl-accent);color:var(--rl-btn-txt);padding:5px 15px;border-radius:20px;font-weight:700;display:inline-block;margin-bottom:10px;}
    .rl-alert{padding:10px;background:var(--rl-card);border-radius:10px;margin-bottom:10px;color:var(--rl-accent);font-weight:700;}
    #rl-game-container{margin-top:1.5rem;position:relative;min-height:180px;padding-bottom:1rem;}
    .rl-logo-img{max-height:70px;max-width:200px;object-fit:contain;margin-bottom:.8rem;display:block;margin-left:auto;margin-right:auto;}
    /* Scratch Card */
    .rl-scratch-wrap{position:relative;width:300px;height:150px;margin:auto;border-radius:15px;overflow:hidden;background:var(--rl-card);box-shadow:0 0 20px rgba(0,0,0,.5);}
    .rl-prize-text{position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:1.6rem;font-weight:900;color:var(--rl-accent);text-align:center;padding:.5rem;box-sizing:border-box;z-index:1;background:radial-gradient(circle,#2a2a2a 0%,#111 100%);}
    #rl-scratch-canvas{position:absolute;top:0;left:0;z-index:2;cursor:crosshair;border-radius:15px;transition:opacity .8s ease-out;}
    /* Wheel */
    .rl-wheel-wrapper{position:relative;width:290px;height:290px;margin:auto;overflow:visible;}
    .rl-wheel-pointer{position:absolute;top:-12px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:12px solid transparent;border-right:12px solid transparent;border-top:22px solid #fff;z-index:3;filter:drop-shadow(0 2px 2px rgba(0,0,0,.5));}
    #rl-wheel-canvas{border-radius:50%;border:5px solid var(--rl-accent);box-shadow:0 0 20px rgba(255,215,0,.4);transition:transform 4s cubic-bezier(.17,.67,.12,.99);}
    #rl-spin-btn{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);border-radius:50%;width:70px;height:70px;padding:0;z-index:4;font-size:.8rem;font-weight:900;}
    /* Slot */
    .rl-slot-wrapper{display:flex;justify-content:center;gap:12px;margin-bottom:1.5rem;}
    .rl-slot-reel{width:75px;height:75px;background:#fff;border-radius:10px;font-size:42px;display:flex;align-items:center;justify-content:center;border:3px solid var(--rl-accent);box-shadow:inset 0 0 10px rgba(0,0,0,.3);}
    /* Redemption Box */
    .rl-code-box{background:var(--rl-card);border:2px dashed var(--rl-accent);border-radius:14px;padding:1.2rem 1.5rem;margin:1.2rem auto 0;max-width:340px;text-align:center;}
    .rl-code-box p{margin:0 0 .5rem;font-size:.9rem;opacity:.8;}
    .rl-code-value{font-size:2rem;font-weight:900;letter-spacing:.3em;color:var(--rl-accent);display:block;margin-bottom:.8rem;}
    .rl-redemption-form{margin-top:1rem;}
    .rl-redemption-form input{background:var(--rl-card);border:1px solid #555;color:var(--rl-text);padding:.7rem 1rem;border-radius:10px;font-size:1rem;width:100%;box-sizing:border-box;margin-bottom:.6rem;font-family:inherit;text-align:center;letter-spacing:.2em;}
    .rl-redemption-msg{margin-top:.6rem;font-weight:700;font-size:.95rem;}
    </style>

    <div id="ristoloyalty-app" class="rl-container">
        <div id="rl-alert" style="display:none;" class="rl-alert"></div>
        <div id="rl-user-points" style="display:none;" class="rl-points-badge">I tuoi Punti: <span id="rl-pts">0</span></div>
        <?php if ($logo_url): ?>
        <img src="<?php echo esc_url($logo_url); ?>" alt="Logo" class="rl-logo-img" />
        <?php endif; ?>
        <h2 class="rl-golden-title"><?php echo esc_html($t_title); ?></h2>
        <div id="rl-lead-form-container" class="rl-form-container">
            <p style="margin-bottom:.5rem;"><?php echo esc_html($t_sub); ?></p>
            <form id="rl-lead-form">
                <input type="text" id="rl-name" placeholder="Il tuo Nome" required>
                <input type="email" id="rl-email" placeholder="La tua Email" required>
                <button type="submit" class="rl-gold-button" id="rl-submit-btn"><?php echo esc_html($t_btn); ?></button>
            </form>
        </div>
        <div id="rl-game-container" style="display:none;" data-game-type="<?php echo esc_attr($game_type); ?>"></div>

        <!-- Codice Riscatto (mostrato solo in caso di vincita) -->
        <div id="rl-code-section" style="display:none;" class="rl-code-box">
            <p>🎉 Hai vinto! Mostra questo codice al cameriere:</p>
            <span id="rl-code-value" class="rl-code-value">--------</span>
            <p style="font-size:.8rem;opacity:.6;">Il cameriere inserirà il PIN per confermare il riscatto.</p>
            <div class="rl-redemption-form">
                <input type="text" id="rl-pin-input" placeholder="PIN Cameriere" maxlength="8" inputmode="numeric" />
                <button class="rl-gold-button" id="rl-redeem-btn" style="width:100%;">✅ Riscatta Premio</button>
                <div id="rl-redemption-msg" class="rl-redemption-msg"></div>
            </div>
        </div>

        <button id="rl-play-again-btn" class="rl-gold-button" style="display:none;margin-top:1.5rem;">🔄 Gioca Ancora</button>
        <audio id="rl-applause-sound" src="https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3" preload="auto"></audio>
    </div>

    <!-- Script Confetti -->
    <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>

    <script>
    (function() {
        var AJAX_URL = '<?php echo esc_js($ajaxurl); ?>';
        var NONCE    = '<?php echo esc_js($nonce); ?>';
        var gameHandler = null;
        var currentCode = '';

        // =========================================================
        // GAMES HANDLER
        // =========================================================
        function RistoGame(containerId, gameType) {
            this.container  = document.getElementById(containerId);
            this.gameType   = gameType;
            this.isRevealed = false;
        }

        RistoGame.prototype.init = function(isWinner, prize) {
            this.isWinner = isWinner;
            this.prize    = prize;
            this.isRevealed = false;
            this.container.innerHTML = '';

            if (this.gameType === 'ruota_fortuna') {
                this.initWheel();
            } else if (this.gameType === 'slot_machine') {
                this.initSlot();
            } else {
                this.initScratch();
            }
        };

        RistoGame.prototype.onReveal = function() {
            if (this.isRevealed) return;
            this.isRevealed = true;

            // Mostra il testo premio (per ruota e slot)
            var lbl = document.getElementById('rl-prize-label');
            if (lbl) lbl.style.display = 'block';

            document.getElementById('rl-play-again-btn').style.display = 'inline-block';

            if (this.isWinner && typeof confetti !== 'undefined') {
                confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#FFD700','#ffaa00','#fff'] });
                var au = document.getElementById('rl-applause-sound');
                if (au) { au.currentTime = 0; au.play().catch(function(){}); }
            }

            // Mostra il codice riscatto DOPO la fine dell'animazione
            if (this.isWinner && currentCode) {
                var cs = document.getElementById('rl-code-section');
                if (cs) {
                    // Piccolo delay per lasciar finire l'animazione della ruota/slot
                    setTimeout(function() { cs.style.display = 'block'; }, 600);
                }
            }
        };

        // --- GRATTA E VINCI ---
        RistoGame.prototype.initScratch = function() {
            var wrap = document.createElement('div');
            wrap.className = 'rl-scratch-wrap';
            wrap.innerHTML = '<div class="rl-prize-text" id="rl-prize-label">' + (this.prize || '?') + '</div>';
            this.container.appendChild(wrap);

            var cvs = document.createElement('canvas');
            cvs.id = 'rl-scratch-canvas';
            cvs.width = 300; cvs.height = 150;
            wrap.appendChild(cvs);

            var ctx = cvs.getContext('2d', { willReadFrequently: true });
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = '#c0c0c0';
            ctx.fillRect(0, 0, 300, 150);

            // pattern argento
            for (var i = 0; i < 300; i += 4) for (var j = 0; j < 150; j += 4) {
                ctx.fillStyle = Math.random() > .5 ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.05)';
                ctx.fillRect(i, j, 4, 4);
            }
            ctx.font = '700 22px sans-serif';
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('GRATTA QUI', 150, 75);

            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = 40; ctx.lineJoin = 'round'; ctx.lineCap = 'round';

            var drawing = false;
            var self = this;

            function pos(e) {
                var r = cvs.getBoundingClientRect();
                var src = e.touches ? e.touches[0] : e;
                return { x: src.clientX - r.left, y: src.clientY - r.top };
            }
            function startFn(e) { drawing = true; ctx.beginPath(); moveFn(e); }
            function moveFn(e) {
                if (!drawing || self.isRevealed) return;
                e.preventDefault();
                var p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke();
            }
            function stopFn() {
                if (!drawing) return; drawing = false;
                if (self.isRevealed) return;
                var pxl = ctx.getImageData(0,0,300,150).data, t = 0;
                for (var k = 3; k < pxl.length; k += 4) if (pxl[k] < 50) t++;
                if (t / (pxl.length / 4) > 0.5) {
                    cvs.style.opacity = '0';
                    cvs.style.pointerEvents = 'none';
                    self.onReveal();
                }
            }
            cvs.addEventListener('mousedown', startFn);
            cvs.addEventListener('mousemove', moveFn);
            cvs.addEventListener('mouseup', stopFn);
            cvs.addEventListener('mouseleave', stopFn);
            cvs.addEventListener('touchstart', startFn, { passive: false });
            cvs.addEventListener('touchmove', moveFn, { passive: false });
            cvs.addEventListener('touchend', stopFn);
        };

        // --- RUOTA DELLA FORTUNA ---
        RistoGame.prototype.initWheel = function() {
            var self = this;
            var wheelTarget = document.createElement('div');
            wheelTarget.id = 'rl-wheel-target';
            this.container.appendChild(wheelTarget);

            // Div premio (nascosto, rivelato dopo lo spin)
            var prizeDiv = document.createElement('div');
            prizeDiv.id = 'rl-prize-label';
            prizeDiv.style.cssText = 'display:none;font-size:1.4rem;font-weight:900;color:#FFD700;margin-top:1.2rem;text-align:center;padding:0.5rem 0 0.5rem;';
            prizeDiv.textContent = this.prize || '';
            this.container.appendChild(prizeDiv);

            if (typeof RistoWheelGame !== 'undefined') {
                var wGame = new RistoWheelGame('rl-wheel-target', RistoLoyalty.prizes);
                wGame.init();
                wGame.onSpinClick(function() {
                    if (self.isRevealed) return;
                    wGame.spinTo(self.prize || '', function() {
                        self.onReveal();
                    });
                });
            } else {
                this.container.innerHTML = "<p>Errore: wheel-game.js non caricato.</p>";
            }
        };

        // --- SLOT MACHINE ---
        RistoGame.prototype.initSlot = function() {
            var self = this;
            var icons = ['🍒','🍋','🍉','🍕','🍔','🍷'];

            var slotWrap = document.createElement('div');
            slotWrap.className = 'rl-slot-wrapper';
            var reels = ['rl-r1','rl-r2','rl-r3'];
            reels.forEach(function(id) {
                var d = document.createElement('div');
                d.className = 'rl-slot-reel'; d.id = id;
                d.textContent = icons[Math.floor(Math.random()*icons.length)];
                slotWrap.appendChild(d);
            });
            this.container.appendChild(slotWrap);

            var btn = document.createElement('button');
            btn.className = 'rl-gold-button'; btn.textContent = '🎰 TIRA LA LEVA';
            this.container.appendChild(btn);

            var prizeDiv = document.createElement('div');
            prizeDiv.id = 'rl-prize-label';
            prizeDiv.style.cssText = 'display:none;font-size:1.5rem;font-weight:900;color:#FFD700;margin-top:1rem;';
            prizeDiv.textContent = this.prize || '';
            this.container.appendChild(prizeDiv);

            btn.addEventListener('click', function() {
                if (self.isRevealed) return;
                btn.disabled = true;
                var count = 0;
                var iv = setInterval(function() {
                    reels.forEach(function(id) {
                        document.getElementById(id).textContent = icons[Math.floor(Math.random()*icons.length)];
                    });
                    if (++count >= 22) {
                        clearInterval(iv);
                        var finalIcon = self.isWinner ? '🏆' : '❌';
                        reels.forEach(function(id) {
                            document.getElementById(id).textContent = finalIcon;
                        });
                        prizeDiv.style.display = 'block';
                        self.onReveal();
                    }
                }, 100);
            });
        };

        // =========================================================
        // JQUERY AJAX HANDLER
        // =========================================================
        document.addEventListener('DOMContentLoaded', function() {
            var form = document.getElementById('rl-lead-form');
            var submitBtn = document.getElementById('rl-submit-btn');
            var playAgainBtn = document.getElementById('rl-play-again-btn');
            var codeSection = document.getElementById('rl-code-section');
            var redeemBtn = document.getElementById('rl-redeem-btn');
            var pinInput = document.getElementById('rl-pin-input');
            var redemptionMsg = document.getElementById('rl-redemption-msg');

            // --- FORM GIOCO ---
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                var name  = document.getElementById('rl-name').value;
                var email = document.getElementById('rl-email').value;
                submitBtn.textContent = 'Caricamento...';
                submitBtn.disabled = true;

                var xhr = new XMLHttpRequest();
                xhr.open('POST', AJAX_URL);
                xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
                xhr.onload = function() {
                    submitBtn.textContent = 'Gioca Ora';
                    submitBtn.disabled = false;

                    if (xhr.status === 200) {
                        var resp = JSON.parse(xhr.responseText);
                        if (resp.success) {
                            var data = resp.data;
                            var alertEl = document.getElementById('rl-alert');
                            alertEl.textContent = data.message;
                            alertEl.style.display = 'block';

                            // ── CASO: premio precedente in attesa di riscatto ──
                            if (data.has_pending_prize) {
                                document.getElementById('rl-lead-form-container').style.display = 'none';
                                currentCode = data.codice_univoco;
                                document.getElementById('rl-code-value').textContent = data.codice_univoco;
                                redemptionMsg.textContent = '';
                                pinInput.value = '';
                                pinInput.disabled = false;
                                redeemBtn.disabled = false;
                                codeSection.style.display = 'block';
                                return;
                            }

                            document.getElementById('rl-pts').textContent = data.points;
                            document.getElementById('rl-user-points').style.display = 'block';

                            document.getElementById('rl-lead-form-container').style.display = 'none';

                            var gc = document.getElementById('rl-game-container');
                            gc.style.display = 'block';

                            var gameType = gc.getAttribute('data-game-type') || 'gratta_e_vinci';
                            gameHandler = new RistoGame('rl-game-container', gameType);
                            gameHandler.init(data.is_winner, data.prize);

                            // Salva il codice — il box viene mostrato in onReveal() dopo l'animazione
                            if (data.is_winner && data.codice_univoco) {
                                currentCode = data.codice_univoco;
                                document.getElementById('rl-code-value').textContent = data.codice_univoco;
                                redemptionMsg.textContent = '';
                                pinInput.value = '';
                                pinInput.disabled = false;
                                redeemBtn.disabled = false;
                            } else {
                                codeSection.style.display = 'none';
                            }

                        } else {
                            alert('Errore: ' + (resp.data ? resp.data.message : 'Riprova.'));
                        }
                    } else {
                        alert('Errore di connessione al server.');
                    }
                };
                xhr.onerror = function() { alert('Errore di rete.'); submitBtn.disabled = false; };
                xhr.send('action=ristoloyalty_play&nonce=' + encodeURIComponent(NONCE) +
                         '&name=' + encodeURIComponent(name) +
                         '&email=' + encodeURIComponent(email));
            });

            // --- RISCATTA PREMIO ---
            redeemBtn.addEventListener('click', function() {
                var pin = pinInput.value.trim();
                if (!pin || !currentCode) return;
                redeemBtn.disabled = true;
                redemptionMsg.style.color = '#aaa';
                redemptionMsg.textContent = 'Verifica in corso...';

                var xhr2 = new XMLHttpRequest();
                xhr2.open('POST', AJAX_URL);
                xhr2.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
                xhr2.onload = function() {
                    var resp2 = JSON.parse(xhr2.responseText);
                    if (resp2.success) {
                        redemptionMsg.style.color = '#4caf50';
                        redemptionMsg.textContent = '✅ ' + resp2.data.message;
                        redeemBtn.disabled = true;
                        pinInput.disabled = true;
                    } else {
                        redemptionMsg.style.color = '#f44336';
                        redemptionMsg.textContent = '❌ ' + (resp2.data ? resp2.data.message : 'Errore.');
                        redeemBtn.disabled = false;
                    }
                };
                xhr2.onerror = function() {
                    redemptionMsg.style.color = '#f44336';
                    redemptionMsg.textContent = '❌ Errore di rete.';
                    redeemBtn.disabled = false;
                };
                xhr2.send('action=ristoloyalty_redeem&nonce=' + encodeURIComponent(NONCE) +
                          '&codice=' + encodeURIComponent(currentCode) +
                          '&pin=' + encodeURIComponent(pin));
            });

            // --- GIOCA ANCORA ---
            playAgainBtn.addEventListener('click', function() {
                document.getElementById('rl-game-container').style.display = 'none';
                playAgainBtn.style.display = 'none';
                document.getElementById('rl-alert').style.display = 'none';
                codeSection.style.display = 'none';
                document.getElementById('rl-lead-form-container').style.display = 'flex';
                if (gameHandler && gameHandler.container) gameHandler.container.innerHTML = '';
                gameHandler = null;
                currentCode = '';
            });
        });
    })();
    </script>
    <?php
    return ob_get_clean();
}

// Shortcode Dashboard
add_shortcode('loyalty_dashboard', 'ristoloyalty_dashboard_shortcode');
function ristoloyalty_dashboard_shortcode() {
    return '<p>Usa lo shortcode <strong>[loyalty_game]</strong> per mostrare il gioco.</p>';
}

// =========================================================
// AJAX HANDLERS
// =========================================================
add_action('wp_ajax_ristoloyalty_play', 'ristoloyalty_play_handler');
add_action('wp_ajax_nopriv_ristoloyalty_play', 'ristoloyalty_play_handler');

function ristoloyalty_play_handler() {
    check_ajax_referer('ristoloyalty_nonce', 'nonce');

    global $wpdb;
    $table_name = $wpdb->prefix . 'loyalty_customers';

    $name  = sanitize_text_field( $_POST['name'] ?? '' );
    $email = sanitize_email( $_POST['email'] ?? '' );

    if ( ! $email || ! $name ) {
        wp_send_json_error( array('message' => 'Dati mancanti.') );
        return;
    }

    $user = $wpdb->get_row( $wpdb->prepare("SELECT * FROM $table_name WHERE email = %s", $email) );
    $premi_vinti_arr = array();

    // ── BLOCCO: controlla se esiste già un premio 'pending' per questo utente ──
    $redemptions_table = $wpdb->prefix . 'loyalty_redemptions';
    $pending = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM $redemptions_table WHERE email = %s AND stato = 'pending' ORDER BY data_vincita DESC LIMIT 1",
        $email
    ) );
    if ( $pending ) {
        wp_send_json_success( array(
            'has_pending_prize' => true,
            'message'           => "Ciao $name! Hai ancora un premio da riscattare 🎁",
            'codice_univoco'    => $pending->codice_univoco,
            'prize'             => $pending->premio,
            'points'            => $user ? $user->punti : 0,
        ) );
        return;
    }

    // Lettura opzioni limite giocate
    $max_plays = intval( get_option('loyalty_max_plays', 1) );
    $play_period = intval( get_option('loyalty_play_period', 24) );
    $period_unit = get_option('loyalty_play_period_unit', 'hours');
    $period_hours = ($period_unit === 'days') ? $play_period * 24 : $play_period;


    if ( $user ) {
        if ($user->premi_vinti) {
            $parsed = json_decode($user->premi_vinti, true);
            if (is_array($parsed)) $premi_vinti_arr = $parsed;
        }

        // Calcolo periodo di gioco
        $now = current_time('timestamp');
        $p_start = $user->period_start ? strtotime($user->period_start) : 0;
        
        if ( ! $p_start ) {
            $p_start = $now;
            $user->play_count = 0;
        }

        $hours_passed = ($now - $p_start) / 3600;

        if ( $hours_passed >= $period_hours ) {
            // Reset periodo
            $new_play_count = 1;
            $new_period_start = current_time('mysql');
        } else {
            // Siamo ancora nel periodo
            if ( $user->play_count >= $max_plays ) {
                wp_send_json_error( array('message' => 'Hai già raggiunto il limite massimo di giocate per questo periodo. Riprova più tardi!') );
                return;
            }
            $new_play_count = $user->play_count + 1;
            $new_period_start = $user->period_start;
        }
    } else {
        $new_play_count = 1;
        $new_period_start = current_time('mysql');
    }

    $points_per_play = intval( get_option( 'loyalty_points_per_play', 10 ) );
    if ( $points_per_play < 1 ) $points_per_play = 1;

    if ( $user ) {
        $points = $user->punti + $points_per_play;
        $wpdb->update( $table_name,
            array(
                'punti'        => $points,
                'punti_totali' => $user->punti_totali + $points_per_play,
                'nome'         => $name,
                'ultimo_gioco' => current_time('mysql'),
                'play_count'   => $new_play_count,
                'period_start' => $new_period_start
            ),
            array('id' => $user->id)
        );
        $msg = "Bentornat* $name! (+{$points_per_play} pt)";
    } else {
        $points = $points_per_play;
        $wpdb->insert( $table_name,
            array(
                'nome'         => $name,
                'email'        => $email,
                'punti'        => $points,
                'punti_totali' => $points,
                'ultimo_gioco' => current_time('mysql'),
                'play_count'   => $new_play_count,
                'period_start' => $new_period_start
            )
        );
        $msg = "Benvenut* $name! (+{$points_per_play} pt)";
    }

    // =============================================================
    // LOGICA VINCITA: Prima soglie fidelity, poi casuale
    // =============================================================
    $won_prize = '';
    $is_winner = false;
    $win_msg   = '';

    // 1) Controlla le soglie fidelity (dalla soglia più alta alla più bassa)
    $milestones = array();
    for ( $i = 1; $i <= 3; $i++ ) {
        $m_points = intval( get_option( "loyalty_milestone_{$i}_points", 0 ) );
        $m_prize  = get_option( "loyalty_milestone_{$i}_prize", '' );
        if ( $m_points > 0 && ! empty( $m_prize ) ) {
            $milestones[] = array( 'points' => $m_points, 'prize' => $m_prize );
        }
    }
    usort( $milestones, function( $a, $b ) { return $b['points'] - $a['points']; } );

    foreach ( $milestones as $m ) {
        if ( $points >= $m['points'] ) {
            $is_winner = true;
            $won_prize = '🏆 ' . $m['prize'];
            $new_pts   = $points - $m['points'];
            // Aggiorna punti periodo; punti_totali non viene detratto (storico)
            $wpdb->update( $table_name, array( 'punti' => $new_pts ), array( 'email' => $email ) );
            $points  = $new_pts;
            $win_msg = ' — TRAGUARDO ' . $m['points'] . ' PUNTI!';
            break;
        }
    }

    // 2) Solo se nessuna soglia è scattata → controlla la vincita casuale
    if ( ! $is_winner ) {
        $win_chance = intval( get_option( 'loyalty_win_chance', 20 ) );
        $p1 = get_option( 'loyalty_prize_1', 'Caffè Omaggio ☕' );
        $p2 = get_option( 'loyalty_prize_2', 'Sconto 10% 🎫' );
        $p3 = get_option( 'loyalty_prize_3', 'Amaro della Casa 🥃' );
        $prizes = array_values( array_filter( array( $p1, $p2, $p3 ) ) );
        if ( empty( $prizes ) ) $prizes = array( 'Sorpresa dello Chef 🍽️' );

        if ( rand( 1, 100 ) <= $win_chance ) {
            $is_winner = true;
            $won_prize = $prizes[ array_rand( $prizes ) ];
        } else {
            $won_prize = 'Ritenta, sarai più fortunato! 😢';
        }
    }

    $msg .= $win_msg;

    // STORICO PREMI
    if ( $is_winner ) {
        $premi_vinti_arr[] = array(
            'premio' => $won_prize,
            'data'   => current_time('mysql')
        );
        $wpdb->update( $table_name, array( 'premi_vinti' => wp_json_encode($premi_vinti_arr) ), array( 'email' => $email ) );
    }

    // GENERA CODICE UNIVOCO per ogni vincita
    $codice_univoco = '';
    if ( $is_winner ) {
        $codice_univoco = ristoloyalty_generate_unique_code();
        $redemptions_table = $wpdb->prefix . 'loyalty_redemptions';
        $wpdb->insert( $redemptions_table, array(
            'codice_univoco' => $codice_univoco,
            'email'          => $email,
            'premio'         => $won_prize,
            'stato'          => 'pending',
            'data_vincita'   => current_time('mysql'),
        ) );
    }

    wp_send_json_success( array(
        'message'        => $msg,
        'points'         => $points,
        'is_winner'      => $is_winner,
        'prize'          => $won_prize,
        'codice_univoco' => $codice_univoco,
    ) );
}

// =========================================================
// AJAX: Riscatto Premio con PIN Cameriere
// =========================================================
add_action('wp_ajax_ristoloyalty_redeem', 'ristoloyalty_redeem_handler');
add_action('wp_ajax_nopriv_ristoloyalty_redeem', 'ristoloyalty_redeem_handler');

function ristoloyalty_redeem_handler() {
    check_ajax_referer('ristoloyalty_nonce', 'nonce');

    global $wpdb;
    $redemptions_table = $wpdb->prefix . 'loyalty_redemptions';

    $codice = sanitize_text_field( $_POST['codice'] ?? '' );
    $pin    = sanitize_text_field( $_POST['pin'] ?? '' );

    if ( ! $codice || ! $pin ) {
        wp_send_json_error( array('message' => 'Dati mancanti.') );
        return;
    }

    // Verifica PIN cameriere
    $correct_pin = get_option('loyalty_waiter_pin', '');
    if ( empty($correct_pin) ) {
        wp_send_json_error( array('message' => 'PIN cameriere non configurato. Contatta il ristorante.') );
        return;
    }
    if ( $pin !== $correct_pin ) {
        wp_send_json_error( array('message' => 'PIN non corretto. Riprova.') );
        return;
    }

    // Cerca il codice
    $redemption = $wpdb->get_row( $wpdb->prepare(
        "SELECT * FROM $redemptions_table WHERE codice_univoco = %s",
        $codice
    ) );

    if ( ! $redemption ) {
        wp_send_json_error( array('message' => 'Codice non trovato.') );
        return;
    }

    if ( $redemption->stato === 'claimed' ) {
        wp_send_json_error( array('message' => 'Questo codice è già stato riscattato.') );
        return;
    }

    // Aggiorna stato a 'claimed'
    $wpdb->update(
        $redemptions_table,
        array( 'stato' => 'claimed', 'data_riscatto' => current_time('mysql') ),
        array( 'codice_univoco' => $codice )
    );

    wp_send_json_success( array(
        'message' => 'Premio riscattato con successo! Buon appetito 🍽️',
        'premio'  => $redemption->premio,
    ) );
}

// =========================================================
// SHORTCODE: [loyalty_my_rewards] — I Miei Premi in Attesa
// =========================================================
add_shortcode('loyalty_my_rewards', 'ristoloyalty_my_rewards_shortcode');
function ristoloyalty_my_rewards_shortcode() {
    $ajaxurl = admin_url('admin-ajax.php');
    $nonce   = wp_create_nonce('ristoloyalty_nonce');

    $c_bg     = get_option('loyalty_color_bg',     '#080808');
    $c_accent = get_option('loyalty_color_accent', '#FFD700');
    $c_text   = get_option('loyalty_color_text',   '#ffffff');
    $c_card   = get_option('loyalty_color_card',   '#1a1a1a');
    $c_btnTxt = get_option('loyalty_color_button_text', '#000000');

    ob_start();
    ?>
    <style>
    .rl-myrewards{max-width:480px;margin:0 auto;font-family:'Outfit',sans-serif;background:<?php echo esc_attr($c_bg); ?>;border-radius:20px;padding:2rem;box-shadow:0 10px 40px rgba(0,0,0,.5);border:1px solid rgba(255,215,0,.15);color:<?php echo esc_attr($c_text); ?>;}
    .rl-myrewards h2{color:<?php echo esc_attr($c_accent); ?>;text-align:center;font-size:1.8rem;font-weight:900;margin:0 0 1.2rem;}
    .rl-myrewards-form{display:flex;flex-direction:column;gap:.8rem;}
    .rl-myrewards-form input{background:<?php echo esc_attr($c_card); ?>;border:1px solid #444;color:<?php echo esc_attr($c_text); ?>;padding:.9rem 1rem;border-radius:10px;font-size:1rem;outline:none;font-family:inherit;}
    .rl-myrewards-form input:focus{border-color:<?php echo esc_attr($c_accent); ?>;}
    .rl-myrewards-btn{background:<?php echo esc_attr($c_accent); ?>;color:<?php echo esc_attr($c_btnTxt); ?>;border:none;padding:.9rem 2rem;font-weight:700;border-radius:10px;cursor:pointer;font-family:inherit;font-size:1rem;}
    .rl-myrewards-btn:disabled{opacity:.6;cursor:not-allowed;}
    .rl-reward-card{background:<?php echo esc_attr($c_card); ?>;border:2px dashed <?php echo esc_attr($c_accent); ?>;border-radius:14px;padding:1rem 1.2rem;margin-top:.8rem;text-align:center;}
    .rl-reward-name{font-size:1.05rem;font-weight:600;margin-bottom:.5rem;}
    .rl-reward-code{font-size:1.8rem;font-weight:900;letter-spacing:.3em;color:<?php echo esc_attr($c_accent); ?>;display:block;margin:.4rem 0;}
    .rl-reward-date{font-size:.8rem;opacity:.55;}
    #rl-mr-result{margin-top:1rem;}
    .rl-mr-empty{text-align:center;opacity:.55;padding:1rem 0;}
    </style>
    <div class="rl-myrewards">
        <h2>🎁 I Miei Premi</h2>
        <div class="rl-myrewards-form">
            <input type="email" id="rl-mr-email" placeholder="La tua Email" />
            <button class="rl-myrewards-btn" id="rl-mr-btn">🔍 Cerca i Miei Premi</button>
        </div>
        <div id="rl-mr-result"></div>
    </div>
    <script>
    (function(){
        var AJAX_URL = '<?php echo esc_js($ajaxurl); ?>';
        var NONCE    = '<?php echo esc_js($nonce); ?>';
        document.getElementById('rl-mr-btn').addEventListener('click', function() {
            var email = document.getElementById('rl-mr-email').value.trim();
            if (!email) return;
            var btn = this; btn.disabled = true; btn.textContent = 'Caricamento...';
            var xhr = new XMLHttpRequest();
            xhr.open('POST', AJAX_URL);
            xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
            xhr.onload = function() {
                btn.disabled = false; btn.textContent = '🔍 Cerca i Miei Premi';
                var result = document.getElementById('rl-mr-result');
                var resp = JSON.parse(xhr.responseText);
                if (resp.success) {
                    var items = resp.data.rewards;
                    if (!items || items.length === 0) {
                        result.innerHTML = '<p class="rl-mr-empty">Nessun premio in attesa di riscatto.</p>';
                        return;
                    }
                    var html = '';
                    items.forEach(function(r) {
                        html += '<div class="rl-reward-card" id="rl-card-'+r.codice_univoco+'">' +
                                '<div class="rl-reward-name">🏆 ' + r.premio + '</div>' +
                                '<span class="rl-reward-code">' + r.codice_univoco + '</span>' +
                                '<div class="rl-reward-date" style="margin-bottom:0.8rem;">Vinto il ' + r.data_vincita + '</div>' +
                                '<div style="display:flex; gap:0.5rem; margin-top:0.5rem;">' +
                                '<input type="password" id="rl-pin-'+r.codice_univoco+'" placeholder="PIN Cameriere" autocomplete="new-password" style="flex:1;text-align:center;padding:0.6rem;"/>' +
                                '<button onclick="rlRedeemReward(\''+r.codice_univoco+'\')" class="rl-myrewards-btn" style="padding:0.6rem 1rem;">Riscatta</button>' +
                                '</div>' +
                                '<div id="rl-msg-'+r.codice_univoco+'" style="margin-top:0.5rem;font-weight:bold;font-size:0.9rem;"></div>' +
                                '</div>';
                    });
                    result.innerHTML = html;
                } else {
                    result.innerHTML = '<p class="rl-mr-empty">❌ ' + (resp.data ? resp.data.message : 'Errore.') + '</p>';
                }
            };
            xhr.onerror = function() { btn.disabled = false; btn.textContent = '🔍 Cerca i Miei Premi'; };
            xhr.send('action=ristoloyalty_get_my_rewards&nonce=' + encodeURIComponent(NONCE) +
                     '&email=' + encodeURIComponent(email));
        });

        window.rlRedeemReward = function(codice) {
            var pinInput = document.getElementById('rl-pin-' + codice);
            var pin = pinInput.value.trim();
            var msgBox = document.getElementById('rl-msg-' + codice);
            
            if (!pin) {
                msgBox.style.color = '#ff6b6b';
                msgBox.textContent = 'Inserisci il PIN cameriere.';
                return;
            }
            msgBox.style.color = '<?php echo esc_js($c_text); ?>';
            msgBox.textContent = 'Validazione in corso...';

            var xhr = new XMLHttpRequest();
            xhr.open('POST', AJAX_URL);
            xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
            xhr.onload = function() {
                var resp = JSON.parse(xhr.responseText);
                if (resp.success) {
                    msgBox.style.color = '#4ade80';
                    msgBox.textContent = '✅ Premio Consegnato con Successo!';
                    document.getElementById('rl-card-' + codice).style.borderColor = '#4ade80';
                    pinInput.parentElement.style.display = 'none'; // Hide input and button
                } else {
                    msgBox.style.color = '#ff6b6b';
                    msgBox.textContent = '❌ ' + (resp.data ? resp.data.message : 'Errore.');
                }
            };
            xhr.send('action=ristoloyalty_redeem&nonce=' + encodeURIComponent(NONCE) +
                     '&codice=' + encodeURIComponent(codice) + '&pin=' + encodeURIComponent(pin));
        };
    })();
    </script>
    <?php
    return ob_get_clean();
}

// AJAX: Recupera premi pending per email
add_action('wp_ajax_ristoloyalty_get_my_rewards', 'ristoloyalty_get_my_rewards_handler');
add_action('wp_ajax_nopriv_ristoloyalty_get_my_rewards', 'ristoloyalty_get_my_rewards_handler');

function ristoloyalty_get_my_rewards_handler() {
    check_ajax_referer('ristoloyalty_nonce', 'nonce');

    global $wpdb;
    $email = sanitize_email( $_POST['email'] ?? '' );

    if ( ! $email ) {
        wp_send_json_error( array('message' => 'Email mancante.') );
        return;
    }

    $table = $wpdb->prefix . 'loyalty_redemptions';
    $rows  = $wpdb->get_results( $wpdb->prepare(
        "SELECT codice_univoco, premio, data_vincita FROM $table WHERE email = %s AND stato = 'pending' ORDER BY data_vincita DESC",
        $email
    ) );

    $rewards = array();
    foreach ( $rows as $r ) {
        $rewards[] = array(
            'codice_univoco' => $r->codice_univoco,
            'premio'         => $r->premio,
            'data_vincita'   => date_i18n('d/m/Y H:i', strtotime($r->data_vincita)),
        );
    }

    wp_send_json_success( array('rewards' => $rewards) );
}


