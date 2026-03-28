<?php
if ( ! defined( 'ABSPATH' ) ) exit;

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
    #rl-game-container{margin-top:1.5rem;position:relative;min-height:180px;}
    .rl-logo-img{max-height:70px;max-width:200px;object-fit:contain;margin-bottom:.8rem;display:block;margin-left:auto;margin-right:auto;}
    /* Scratch Card */
    .rl-scratch-wrap{position:relative;width:300px;height:150px;margin:auto;border-radius:15px;overflow:hidden;background:var(--rl-card);box-shadow:0 0 20px rgba(0,0,0,.5);}
    .rl-prize-text{position:absolute;top:0;left:0;width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:1.6rem;font-weight:900;color:var(--rl-accent);text-align:center;padding:.5rem;box-sizing:border-box;z-index:1;background:radial-gradient(circle,#2a2a2a 0%,#111 100%);}
    #rl-scratch-canvas{position:absolute;top:0;left:0;z-index:2;cursor:crosshair;border-radius:15px;transition:opacity .8s ease-out;}
    /* Wheel */
    .rl-wheel-wrapper{position:relative;width:230px;height:230px;margin:auto;}
    .rl-wheel-pointer{position:absolute;top:-12px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:12px solid transparent;border-right:12px solid transparent;border-top:22px solid #fff;z-index:3;filter:drop-shadow(0 2px 2px rgba(0,0,0,.5));}
    #rl-wheel-canvas{border-radius:50%;border:5px solid var(--rl-accent);box-shadow:0 0 20px rgba(255,215,0,.4);transition:transform 4s cubic-bezier(.17,.67,.12,.99);}
    #rl-spin-btn{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);border-radius:50%;width:70px;height:70px;padding:0;z-index:4;font-size:.8rem;font-weight:900;}
    /* Slot */
    .rl-slot-wrapper{display:flex;justify-content:center;gap:12px;margin-bottom:1.5rem;}
    .rl-slot-reel{width:75px;height:75px;background:#fff;border-radius:10px;font-size:42px;display:flex;align-items:center;justify-content:center;border:3px solid var(--rl-accent);box-shadow:inset 0 0 10px rgba(0,0,0,.3);}
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

            document.getElementById('rl-play-again-btn').style.display = 'inline-block';

            if (this.isWinner && typeof confetti !== 'undefined') {
                confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#FFD700','#ffaa00','#fff'] });
                var au = document.getElementById('rl-applause-sound');
                if (au) { au.currentTime = 0; au.play().catch(function(){}); }
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
            var wrap = document.createElement('div');
            wrap.className = 'rl-wheel-wrapper';
            wrap.innerHTML = '<div class="rl-wheel-pointer"></div>' +
                '<canvas id="rl-wheel-canvas" width="220" height="220"></canvas>' +
                '<button class="rl-gold-button" id="rl-spin-btn">GIRA!</button>';
            this.container.appendChild(wrap);

            var prizeDiv = document.createElement('div');
            prizeDiv.id = 'rl-prize-label';
            prizeDiv.style.cssText = 'display:none;font-size:1.5rem;font-weight:900;color:#FFD700;margin-top:1rem;';
            prizeDiv.textContent = this.prize || '';
            this.container.appendChild(prizeDiv);

            var cvs = document.getElementById('rl-wheel-canvas');
            var ctx = cvs.getContext('2d');
            var colors = ['#e74c3c','#f1c40f','#2ecc71','#3498db','#9b59b6','#e67e22'];
            var arc = Math.PI * 2 / 6;
            for (var i = 0; i < 6; i++) {
                ctx.beginPath(); ctx.fillStyle = colors[i];
                ctx.moveTo(110,110); ctx.arc(110,110,108, i*arc, (i+1)*arc); ctx.fill();
            }
            ctx.fillStyle = '#fff'; ctx.font = '700 14px sans-serif'; ctx.textAlign = 'center';
            var labels = ['1','2','3','4','5','6'];
            for (var j = 0; j < 6; j++) {
                ctx.save(); ctx.translate(110,110);
                ctx.rotate((j + 0.5) * arc);
                ctx.fillText(labels[j], 0, -80); ctx.restore();
            }

            document.getElementById('rl-spin-btn').addEventListener('click', function() {
                if (self.isRevealed) return;
                this.disabled = true;
                var deg = 360 * 6 + Math.floor(Math.random() * 360);
                cvs.style.transform = 'rotate(' + deg + 'deg)';
                setTimeout(function() {
                    prizeDiv.style.display = 'block';
                    self.onReveal();
                }, 4100);
            });
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
                            document.getElementById('rl-pts').textContent = data.points;
                            document.getElementById('rl-user-points').style.display = 'block';

                            document.getElementById('rl-lead-form-container').style.display = 'none';

                            var gc = document.getElementById('rl-game-container');
                            gc.style.display = 'block';

                            var gameType = gc.getAttribute('data-game-type') || 'gratta_e_vinci';
                            gameHandler = new RistoGame('rl-game-container', gameType);
                            gameHandler.init(data.is_winner, data.prize);

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

            playAgainBtn.addEventListener('click', function() {
                document.getElementById('rl-game-container').style.display = 'none';
                playAgainBtn.style.display = 'none';
                document.getElementById('rl-alert').style.display = 'none';
                document.getElementById('rl-lead-form-container').style.display = 'flex';
                if (gameHandler && gameHandler.container) gameHandler.container.innerHTML = '';
                gameHandler = null;
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
                'punti' => $points, 
                'nome' => $name, 
                'ultimo_gioco' => current_time('mysql'),
                'play_count' => $new_play_count,
                'period_start' => $new_period_start
            ),
            array('id' => $user->id)
        );
        $msg = "Bentornat* $name! (+{$points_per_play} pt)";
    } else {
        $points = $points_per_play;
        $wpdb->insert( $table_name,
            array(
                'nome' => $name, 
                'email' => $email, 
                'punti' => $points, 
                'ultimo_gioco' => current_time('mysql'),
                'play_count' => $new_play_count,
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

    wp_send_json_success( array(
        'message' => $msg . $win_msg,
        'points'  => $points,
        'winner'  => $is_winner,
        'prize'   => $won_prize
    ) );
}
