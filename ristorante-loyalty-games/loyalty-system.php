<?php
// CORS: consenti chiamate sia dal browser (React) che dal server Oracle (Node.js)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Secret');

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Inizio - CORS Policy per Server Oracle (React Games) - Gestione Preflight
if ( isset( $_SERVER['REQUEST_METHOD'] ) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS' ) {
    status_header( 200 );
    exit();
}
// Fine - CORS Policy

/* ---------------------------------------------------------
 *  AUTENTICAZIONE: Bypassa nonce WP per richieste con X-API-Secret valida.
 *  Permette chiamate server-to-server (Node.js → WordPress) senza cookie/nonce.
 * --------------------------------------------------------- */
add_filter( 'rest_authentication_errors', function( $result ) {
    $api_secret = $_SERVER['HTTP_X_API_SECRET'] ?? '';
    if ( ! empty( $api_secret ) && $api_secret === 'sk_multigame_92a3b1d8f7e6c40a5b6c7d8e9f0a1b2c3d4e5f6' ) {
        return true; 
    }
    return $result;
}, 100 );

// Assicura che l'header X-API-Secret sia permesso nelle richieste preflight REST di WP
add_filter( 'rest_preflight_allow_headers', function( $allowed_headers ) {
    $allowed_headers[] = 'X-API-Secret';
    return $allowed_headers;
});

/* ---------------------------------------------------------
 *  1. Helper – genera codice univoco casuale
 * --------------------------------------------------------- */
if ( ! function_exists( 'ristoloyalty_generate_unique_code' ) ) {
    function ristoloyalty_generate_unique_code() {
        global $wpdb;
        $table = $wpdb->prefix . 'loyalty_redemptions';
        do {
            $code   = strtoupper( substr( bin2hex( random_bytes( 5 ) ), 0, 8 ) );
            $exists = $wpdb->get_var(
                $wpdb->prepare( "SELECT COUNT(*) FROM $table WHERE codice_univoco = %s", $code )
            );
        } while ( $exists > 0 );
        return $code;
    }
}

/* ---------------------------------------------------------
 *  2. Helper – sincronizzazione singolo utente per email.
 *     Usata dallo shortcode (brutale) e dai hook WP.
 * --------------------------------------------------------- */
if ( ! function_exists( 'ristoloyalty_sync_user' ) ) {
    function ristoloyalty_sync_user( $user_id ) {
        global $wpdb;
        $user = get_userdata( $user_id );
        if ( ! $user ) return;

        // Catena di fallback per il nome: display_name → first_name → user_login
        $nome = trim( $user->display_name );
        if ( empty( $nome ) ) {
            $nome = trim( get_user_meta( $user_id, 'first_name', true ) );
        }
        if ( empty( $nome ) ) {
            $nome = $user->user_login;
        }

        $table  = $wpdb->prefix . 'loyalty_customers';
        $exists = $wpdb->get_var(
            $wpdb->prepare( "SELECT COUNT(*) FROM $table WHERE email = %s", $user->user_email )
        );

        if ( $exists == 0 ) {
            $inserted = $wpdb->insert(
                $table,
                array(
                    'nome'         => $nome,
                    'email'        => $user->user_email,
                    'punti'        => 0,
                    'punti_totali' => 0,
                    'created_at'   => current_time( 'mysql' ),
                ),
                array( '%s', '%s', '%d', '%d', '%s' )
            );
            if ( $inserted === false ) {
                error_log( 'Risto Loyalty - Errore Sync DB: ' . $wpdb->last_error );
            }
        } else {
            // Se l'utente esiste ma il nome è vuoto, aggiornalo
            $current_nome = $wpdb->get_var(
                $wpdb->prepare( "SELECT nome FROM $table WHERE email = %s", $user->user_email )
            );
            if ( empty( trim( $current_nome ) ) && ! empty( $nome ) ) {
                $wpdb->update(
                    $table,
                    array( 'nome' => $nome ),
                    array( 'email' => $user->user_email ),
                    array( '%s' ),
                    array( '%s' )
                );
            }
        }
    }
}

/* Alias retrocompatibile */
if ( ! function_exists( 'ristoloyalty_sync_new_user' ) ) {
    function ristoloyalty_sync_new_user( $user_id ) {
        ristoloyalty_sync_user( $user_id );
    }
    add_action( 'user_register', 'ristoloyalty_sync_new_user' );
}

/* Sincronizza l'utente anche al login (per utenti esistenti) */
if ( ! function_exists( 'ristoloyalty_sync_user_on_login' ) ) {
    function ristoloyalty_sync_user_on_login( $user_login, $user ) {
        // DEBUG: Hook wp_login attivato con successo
        ristoloyalty_sync_new_user( $user->ID );
    }
    add_action( 'wp_login', 'ristoloyalty_sync_user_on_login', 10, 2 );
}

/* ---------------------------------------------------------
 *  3. Nascondi la admin‑bar per gli utenti non‑admin
 * --------------------------------------------------------- */
if ( ! function_exists( 'ristoloyalty_hide_admin_bar' ) ) {
    function ristoloyalty_hide_admin_bar( $show ) {
        return current_user_can( 'manage_options' ) ? $show : false;
    }
    add_filter( 'show_admin_bar', 'ristoloyalty_hide_admin_bar' );
}

/* ---------------------------------------------------------
 *  4. Shortcode – Dashboard Loyalty (All‑in‑One)
 * --------------------------------------------------------- */
if ( ! function_exists( 'ristoloyalty_dashboard_shortcode' ) ) {
    function ristoloyalty_dashboard_shortcode() {

        /* -------------------------------------------------
         *  Utente NON loggato → form custom (Dark / Gold)
         * ------------------------------------------------- */
        if ( ! is_user_logged_in() ) {
            ob_start();
            ?>
            <div class="rl-auth-box"
                 style="max-width:420px;margin:2rem auto;padding:2rem;background:#111;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.6);font-family:'Outfit',sans-serif;color:#fff;">
                <h2 style="color:#FFD700;text-align:center;margin-bottom:1rem;">Accedi o Registrati</h2>

                <div class="rl-tabs"
                     style="display:flex;gap:0.5rem;margin-bottom:1rem;">
                    <button class="rl-tab active" data-target="login"
                            style="flex:1;padding:0.6rem;background:#222;color:#FFD700;border:none;cursor:pointer;">Login</button>
                    <button class="rl-tab" data-target="register"
                            style="flex:1;padding:0.6rem;background:#222;color:#fff;border:none;cursor:pointer;">Registrati</button>
                </div>

                <!-- Login -->
                <div class="rl-tab-content" id="rl-login" style="display:block;">
                    <form id="rl-login-form">
                        <input type="email" name="log" placeholder="Email" required
                               style="width:100%;padding:0.8rem;margin-bottom:0.8rem;background:#222;border:1px solid #444;color:#fff;border-radius:8px;">
                        <input type="password" name="pwd" placeholder="Password" required
                               style="width:100%;padding:0.8rem;margin-bottom:1rem;background:#222;border:1px solid #444;color:#fff;border-radius:8px;">
                        <button type="submit"
                                style="width:100%;padding:0.8rem;background:#FFD700;color:#000;border:none;border-radius:8px;font-weight:700;cursor:pointer;">
                            Login
                        </button>
                    </form>
                    <div class="rl-msg" style="margin-top:0.8rem;color:#f55;"></div>
                </div>

                <!-- Registrazione -->
                <div class="rl-tab-content" id="rl-register" style="display:none;">
                    <form id="rl-register-form">
                        <input type="text" name="username" placeholder="Username" required
                               style="width:100%;padding:0.8rem;margin-bottom:0.5rem;background:#222;border:1px solid #444;color:#fff;border-radius:8px;">
                        <input type="email" name="email" placeholder="Email" required
                               style="width:100%;padding:0.8rem;margin-bottom:0.5rem;background:#222;border:1px solid #444;color:#fff;border-radius:8px;">
                        <input type="password" name="password" placeholder="Password" required
                               style="width:100%;padding:0.8rem;margin-bottom:1rem;background:#222;border:1px solid #444;color:#fff;border-radius:8px;">
                        <button type="submit"
                                style="width:100%;padding:0.8rem;background:#FFD700;color:#000;border:none;border-radius:8px;font-weight:700;cursor:pointer;">
                            Registrati
                        </button>
                    </form>
                    <div class="rl-msg" style="margin-top:0.8rem;color:#f55;"></div>
                </div>
            </div>

            <script>
                (function () {
                    /* Tab navigation */
                    const tabs = document.querySelectorAll('.rl-tab');
                    const contents = {
                        login: document.getElementById('rl-login'),
                        register: document.getElementById('rl-register')
                    };
                    tabs.forEach(tab => {
                        tab.addEventListener('click', () => {
                            tabs.forEach(t => t.classList.remove('active'));
                            tab.classList.add('active');
                            Object.values(contents).forEach(c => c.style.display = 'none');
                            contents[tab.dataset.target].style.display = 'block';
                        });
                    });

                    /* AJAX login */
                    document.getElementById('rl-login-form').addEventListener('submit', function (e) {
                        e.preventDefault();
                        const fd = new FormData(this);
                        fetch('<?php echo admin_url('admin-ajax.php'); ?>', {
                            method: 'POST',
                            credentials: 'same-origin',
                            body: new URLSearchParams({
                                action: 'rl_login',
                                username: fd.get('log'),
                                password: fd.get('pwd'),
                                _ajax_nonce: '<?php echo wp_create_nonce('rl_login_nonce'); ?>'
                            })
                        })
                            .then(r => r.json())
                            .then(res => {
                                const msg = this.parentNode.querySelector('.rl-msg');
                                if (res.success) {
                                    msg.style.color = '#0f0';
                                    msg.textContent = 'Login effettuato, ricaricamento...';
                                    location.reload();
                                } else {
                                    msg.style.color = '#f55';
                                    msg.textContent = res.data;
                                }
                            });
                    });

                    /* AJAX registrazione */
                    document.getElementById('rl-register-form').addEventListener('submit', function (e) {
                        e.preventDefault();
                        const fd = new FormData(this);
                        fetch('<?php echo admin_url('admin-ajax.php'); ?>', {
                            method: 'POST',
                            credentials: 'same-origin',
                            body: new URLSearchParams({
                                action: 'rl_register',
                                username: fd.get('username'),
                                email: fd.get('email'),
                                password: fd.get('password'),
                                _ajax_nonce: '<?php echo wp_create_nonce('rl_register_nonce'); ?>'
                            })
                        })
                            .then(r => r.json())
                            .then(res => {
                                const msg = this.parentNode.querySelector('.rl-msg');
                                if (res.success) {
                                    msg.style.color = '#0f0';
                                    msg.textContent = 'Registrazione avvenuta, login...';
                                    location.reload();
                                } else {
                                    msg.style.color = '#f55';
                                    msg.textContent = res.data;
                                    // Se l'account esiste già, suggerisci il login e switcha tab
                                    if (res.data.includes('già esistente')) {
                                        setTimeout(() => {
                                            const loginTab = document.querySelector('.rl-tab[data-target="login"]');
                                            if (loginTab) loginTab.click();
                                        }, 2000);
                                    }
                                }
                            });
                    });
                })();
            </script>
            <?php
            return ob_get_clean();
        }

        /* -------------------------------------------------
         *  Utente LOGGATO – provisioning on‑the‑fly
         * ------------------------------------------------- */
        $current_user = wp_get_current_user();
        $email        = $current_user->user_email;

        // Sincronizzazione "brutale": chiamata diretta prima di qualsiasi altra operazione
        if ( is_user_logged_in() ) {
            ristoloyalty_sync_user( get_current_user_id() );
        }

        global $wpdb;
        $table_customers = $wpdb->prefix . 'loyalty_customers';
        $user_data       = $wpdb->get_row(
            $wpdb->prepare( "SELECT * FROM $table_customers WHERE email = %s", $email )
        );

        if ( ! $user_data ) {
            // Crea record mancante con 0 punti
            $wpdb->insert(
                $table_customers,
                array(
                    'nome'         => $current_user->display_name,
                    'email'        => $email,
                    'punti'        => 0,
                    'punti_totali' => 0,
                    'created_at'   => current_time( 'mysql' ),
                ),
                array( '%s', '%s', '%d', '%d', '%s' )
            );
            $points = 0;
        } else {
            $points = (int) $user_data->punti;
        }

        /* -------------------------------------------------
         *  Recupero premi e storico multiplayer
         * ------------------------------------------------- */
        $table_redemptions = $wpdb->prefix . 'loyalty_redemptions';
        $rewards = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM $table_redemptions WHERE email = %s ORDER BY data_vincita DESC LIMIT 3",
                $email
            )
        );

        $oracle_api_url = "http://130.110.6.128:3000/api/user-history/" . urlencode( $email );
        $response       = wp_remote_get(
            $oracle_api_url,
            array(
                'timeout' => 5,
                'headers' => array(
                    'X-API-Secret' => 'sk_multigame_92a3b1d8f7e6c40a5b6c7d8e9f0a1b2c3d4e5f6'
                )
            )
        );

        $history = array();
        if ( ! is_wp_error( $response ) && wp_remote_retrieve_response_code( $response ) === 200 ) {
            $history = json_decode( wp_remote_retrieve_body( $response ), true );
        }

        /* -------------------------------------------------
         *  Design (palette, font, layout)
         * ------------------------------------------------- */
        $c_bg     = get_option( 'loyalty_color_bg',     '#080808' );
        $c_accent = get_option( 'loyalty_color_accent', '#FFD700' );
        $c_text   = get_option( 'loyalty_color_text',   '#ffffff' );
        $c_card   = get_option( 'loyalty_color_card',   '#1a1a1a' );
        $c_btnTxt = get_option( 'loyalty_color_button_text', '#000000' );

        ob_start();
        ?>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&display=swap"
              rel="stylesheet">
        <style>
            .rl-dash {font-family:'Outfit',sans-serif;color:<?php echo esc_attr($c_text); ?>;max-width:600px;margin:0 auto;line-height:1.5;}
            .rl-card{background:<?php echo esc_attr($c_card); ?>;border-radius:24px;padding:1.8rem;margin-bottom:1.5rem;border:1px solid rgba(255,215,0,0.1);box-shadow:0 10px 30px rgba(0,0,0,0.3);}
            .rl-punti-card{background:linear-gradient(135deg,<?php echo esc_attr($c_card); ?>0%,#2a2a2a100%);text-align:center;border:1px solid <?php echo esc_attr($c_accent); ?>;}
            .rl-punti-val{font-size:4rem;font-weight:900;color:<?php echo esc_attr($c_accent); ?>;margin:0.8rem 0;}
            .rl-actions{display:grid;grid-template-columns:1fr 1fr;gap:1.2rem;margin-bottom:1.5rem;}
            .rl-btn{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1.8rem 1rem;border-radius:22px;text-decoration:none;font-weight:800;transition:all .3s ease;text-align:center;border:none;}
            .rl-btn:hover{transform:translateY(-5px);box-shadow:0 8px 25px rgba(255,215,0,0.25);}
            .rl-btn-gold{background:<?php echo esc_attr($c_accent); ?>;color:#000;}
            .rl-btn-outline{background:transparent;border:2.5px solid <?php echo esc_attr($c_accent); ?>;color:<?php echo esc_attr($c_accent); ?>;}
            .rl-section-title{font-size:1.3rem;font-weight:800;margin-bottom:1.2rem;color:<?php echo esc_attr($c_accent); ?>;display:flex;align-items:center;gap:0.6rem;}
            .rl-list-item{display:flex;justify-content:space-between;align-items:center;padding:1rem 0;border-bottom:1px solid rgba(255,255,255,0.08);}
            .rl-list-item:last-child{border-bottom:none;}
            .rl-badge{padding:6px 12px;border-radius:12px;font-size:0.75rem;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;}
            .rl-badge-win{background:rgba(74,222,128,0.2);color:#4ade80;border:1px solid rgba(74,222,128,0.3);}
            .rl-badge-loss{background:rgba(248,113,113,0.2);color:#f87171;border:1px solid rgba(248,113,113,0.3);}
            .rl-badge-draw{background:rgba(148,163,184,0.2);color:#94a3b8;border:1px solid rgba(148,163,184,0.3);}
            @media(max-width:480px){
                .rl-actions{grid-template-columns:1fr;}
                .rl-punti-val{font-size:3rem;}
            }
        </style>

        <div class="rl-dash">
            <!-- Header benvenuto + Logout -->
            <div class="rl-card" style="display:flex;align-items:center;justify-content:space-between;padding:1rem 1.5rem;margin-bottom:1rem;">
                <div>
                    <div style="font-size:0.8rem;opacity:0.6;margin-bottom:0.2rem;">Bentornato 👋</div>
                    <div style="font-size:1.2rem;font-weight:800;color:<?php echo esc_attr($c_accent); ?>"><?php echo esc_html( $current_user->display_name ); ?></div>
                </div>
                <a href="<?php echo esc_url( wp_logout_url( get_permalink() ) ); ?>"
                   style="background:linear-gradient(135deg,#c0392b,#e74c3c);color:#fff;padding:0.5rem 1.2rem;border-radius:10px;font-weight:700;font-size:0.85rem;text-decoration:none;border:1px solid rgba(255,80,80,0.3);">LOGOUT 🔓</a>
            </div>

            <!-- Saldo punti -->
            <div class="rl-card rl-punti-card">
                <div class="rl-punti-lbl">Il Tuo Bilancio Loyalty</div>
                <div class="rl-punti-val"><?php echo number_format( $points, 0, ',', '.' ); ?></div>
                <div class="rl-punti-lbl">Punti Disponibili</div>
            </div>

            <!-- Bottoni azione -->
            <div class="rl-actions">
                <a href="http://130.110.6.128/?email=<?php echo urlencode( $email ); ?>"
                   class="rl-btn rl-btn-gold">
                    <span class="rl-icon">🕹️</span><span>GIOCHI SINGOLI</span>
                </a>
                <a href="http://130.110.6.128:3000/?email=<?php echo urlencode( $email ); ?>"
                   class="rl-btn rl-btn-outline">
                    <span class="rl-icon">⚔️</span><span>SFIDA MULTIPLAYER</span>
                </a>
            </div>

            <!-- Storico multiplayer -->
            <div class="rl-card">
                <div class="rl-section-title">⚔️ Ultime Sfide Multiplayer</div>
                <?php if ( empty( $history ) ): ?>
                    <div class="rl-empty">Nessuna sfida completata. Scendi in campo!</div>
                <?php else: ?>
                    <?php foreach ( array_slice( $history, 0, 5 ) as $match ): ?>
                        <?php
                        $badge_class = 'rl-badge-loss';
                        if ( $match['result'] === 'vittoria' ) $badge_class = 'rl-badge-win';
                        if ( $match['result'] === 'pareggio' ) $badge_class = 'rl-badge-draw';
                        ?>
                        <div class="rl-list-item">
                            <div>
                                <div class="rl-item-main">vs <?php echo esc_html( $match['opponent'] ); ?></div>
                                <div class="rl-item-sub">Score: <?php echo esc_html( $match['score'] ); ?></div>
                            </div>
                            <div class="rl-badge <?php echo $badge_class; ?>">
                                <?php echo esc_html( $match['result'] ); ?>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>

            <!-- Premi riscattati -->
            <div class="rl-card">
                <div class="rl-section-title">🎁 I Tuoi Ultimi Premi</div>
                <?php if ( empty( $rewards ) ): ?>
                    <div class="rl-empty">Ancora nessun premio vinto. Gioca per sbloccarli!</div>
                <?php else: ?>
                    <?php foreach ( $rewards as $r ): ?>
                        <div class="rl-list-item">
                            <div>
                                <div class="rl-item-main"><?php echo esc_html( $r->premio ); ?></div>
                                <div class="rl-item-sub"><?php echo date_i18n( 'd M Y', strtotime( $r->data_vincita ) ); ?></div>
                            </div>
                            <div class="rl-badge"
                                 style="background:rgba(255,215,0,0.1);color:<?php echo esc_attr( $c_accent ); ?>;border:1px solid rgba(255,215,0,0.2);">
                                <?php echo ( $r->stato === 'claimed' ) ? 'RISCATTATO' : 'IN ATTESA'; ?>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }
    add_shortcode( 'loyalty_dashboard', 'ristoloyalty_dashboard_shortcode' );
}

/* ---------------------------------------------------------
 *  5. AJAX – Login custom
 * --------------------------------------------------------- */
if ( ! function_exists( 'ristoloyalty_ajax_login' ) ) {
    function ristoloyalty_ajax_login() {
        check_ajax_referer( 'rl_login_nonce', '_ajax_nonce' );

        $username = sanitize_user( $_POST['username'] );
        $password = $_POST['password'];

        $creds = array(
            'user_login'    => $username,
            'user_password' => $password,
            'remember'      => true,
        );

        $user = wp_signon( $creds, false );
        if ( is_wp_error( $user ) ) {
            wp_send_json_error( $user->get_error_message() );
        } else {
            wp_set_current_user( $user->ID );
            wp_send_json_success();
        }
    }
    add_action( 'wp_ajax_rl_login', 'ristoloyalty_ajax_login' );
    add_action( 'wp_ajax_nopriv_rl_login', 'ristoloyalty_ajax_login' );
}

/* ---------------------------------------------------------
 *  6. AJAX – Registrazione custom
 * --------------------------------------------------------- */
if ( ! function_exists( 'ristoloyalty_ajax_register' ) ) {
    function ristoloyalty_ajax_register() {
        check_ajax_referer( 'rl_register_nonce', '_ajax_nonce' );

        $username = sanitize_user( $_POST['username'] );
        $email    = sanitize_email( $_POST['email'] );
        $password = $_POST['password'];

        if ( username_exists( $username ) || email_exists( $email ) ) {
            wp_send_json_error( 'Account già esistente, effettua l\'accesso.' );
        }

        $user_id = wp_create_user( $username, $password, $email );
        if ( is_wp_error( $user_id ) ) {
            wp_send_json_error( $user_id->get_error_message() );
        }

        // Forza invio email di conferma all'utente
        wp_new_user_notification( $user_id, null, 'both' );

        // Imposta il display name PRIMA della sync, così viene salvato correttamente nel DB
        wp_update_user( array( 'ID' => $user_id, 'display_name' => $username ) );

        // Sincronizza nella tabella loyalty_customers (display_name già impostato)
        ristoloyalty_sync_new_user( $user_id );

        // Auto‑login
        wp_set_current_user( $user_id );
        wp_set_auth_cookie( $user_id );

        wp_send_json_success();
    }
    add_action( 'wp_ajax_rl_register', 'ristoloyalty_ajax_register' );
    add_action( 'wp_ajax_nopriv_rl_register', 'ristoloyalty_ajax_register' );
}

/* ---------------------------------------------------------
 *  7. Leaderboard – (funzionalità già presente)
 * --------------------------------------------------------- */
if ( ! function_exists( 'ristoloyalty_get_leaderboard' ) ) {
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
}

if ( ! function_exists( 'ristoloyalty_obscure_email' ) ) {
    function ristoloyalty_obscure_email( $email ) {
        $parts = explode( '@', $email );
        if ( count( $parts ) !== 2 ) {
            return '***';
        }
        $name   = $parts[0];
        $domain = $parts[1];
        $keep   = max( 2, (int) floor( strlen( $name ) / 3 ) );
        return substr( $name, 0, $keep ) . str_repeat( '*', max( 3, strlen( $name ) - $keep ) ) . '@' . $domain;
    }
}

if ( ! function_exists( 'ristoloyalty_leaderboard_shortcode' ) ) {
    function ristoloyalty_leaderboard_shortcode() {
        $leaders = ristoloyalty_get_leaderboard( 10 );

        $c_bg     = get_option( 'loyalty_color_bg',          '#080808' );
        $c_accent = get_option( 'loyalty_color_accent',      '#FFD700' );
        $c_text   = get_option( 'loyalty_color_text',        '#ffffff' );
        $c_card   = get_option( 'loyalty_color_card',        '#1a1a1a' );
        $c_btnTxt = get_option( 'loyalty_color_button_text', '#000000' );

        $last_reset = get_option( 'loyalty_leaderboard_last_reset', '' );

        ob_start();
        ?>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&display=swap"
              rel="stylesheet">
        <style>
            .rl-lb-wrap{max-width:500px;margin:0 auto;font-family:'Outfit',sans-serif;color:<?php echo esc_attr($c_text); ?>;}
            .rl-lb-header{background:<?php echo esc_attr($c_bg); ?>;border-radius:20px 20px 0 0;padding:1.8rem 1.5rem 1rem;text-align:center;border:1px solid rgba(255,215,0,.15);border-bottom:none;}
            .rl-lb-header h2{margin:0 0 .3rem;font-size:1.9rem;font-weight:900;color:<?php echo esc_attr($c_accent); ?>;}
            .rl-lb-header p{margin:0;font-size:.85rem;opacity:.5;}
            .rl-lb-body{background:<?php echo esc_attr($c_bg); ?>;border-radius:0 0 20px 20px;padding:.5rem 1rem 1.5rem;border:1px solid rgba(255,215,0,.15);border-top:none;box-shadow:0 10px 40px rgba(0,0,0,.5);}
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
            .rl-lb-list{display:flex;flex-direction:column;gap:.45rem;}
            .rl-lb-row{display:grid;grid-template-columns:2.2rem 1fr auto;align-items:center;gap:.7rem;background:<?php echo esc_attr($c_card); ?>;border-radius:12px;padding:.65rem 1rem;transition:transform .15s;}
            .rl-lb-row:hover{transform:translateX(3px);}
            .rl-lb-pos{font-size:.95rem;font-weight:900;text-align:center;color:<?php echo esc_attr($c_accent); ?>;opacity:.7;}
            .rl-lb-name{font-size:.95rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
            .rl-lb-pts{font-size:.85rem;font-weight:900;padding:3px 10px;border-radius:20px;background:<?php echo esc_attr($c_accent); ?>;color:<?php echo esc_attr($c_btnTxt); ?>;white-space:nowrap;}
            .rl-lb-empty{text-align:center;opacity:.45;padding:2.5rem 0;font-size:.95rem;}
            .rl-lb-divider{border:none;border-top:1px solid rgba(255,255,255,.07);margin:.6rem 0;}
            @media(max-width:400px){
                .rl-podio-avatar{width:44px;height:44px;font-size:1.3rem;}
                .rl-podio-item.first .rl-podio-avatar{width:54px;height:54px;font-size:1.6rem;}
            }
        </style>

        <div class="rl-lb-wrap">
            <div class="rl-lb-header">
                <h2>🏆 Classifica</h2>
                <?php if ( $last_reset ): ?>
                    <p>Reset mensile: <?php echo esc_html( date_i18n( 'd/m/Y', strtotime( $last_reset ) ) ); ?></p>
                <?php else: ?>
                    <p>Punti accumulati nel periodo corrente</p>
                <?php endif; ?>
            </div>
            <div class="rl-lb-body">
                <?php if ( empty( $leaders ) ): ?>
                    <p class="rl-lb-empty">🎲 Nessun giocatore ancora in classifica.</p>
                <?php else: ?>
                    <?php
                    $top3 = array_slice( $leaders, 0, 3 );
                    $rest = array_slice( $leaders, 3 );

                    $get_nick = function ( $row ) {
                        $nick = trim( $row->nome );
                        if ( ! $nick || strlen( $nick ) < 2 ) {
                            $nick = ristoloyalty_obscure_email( $row->email );
                        }
                        return $nick;
                    };
                    $podio_order = [];
                    if ( isset( $top3[1] ) ) $podio_order[] = [ 'data' => $top3[1], 'rank' => 2, 'cls' => 'silver', 'medal' => '🥈' ];
                    if ( isset( $top3[0] ) ) $podio_order[] = [ 'data' => $top3[0], 'rank' => 1, 'cls' => 'gold',   'medal' => '🥇' ];
                    if ( isset( $top3[2] ) ) $podio_order[] = [ 'data' => $top3[2], 'rank' => 3, 'cls' => 'bronze', 'medal' => '🥉' ];
                    ?>
                    <?php if ( ! empty( $podio_order ) ): ?>
                        <div class="rl-podio">
                            <?php foreach ( $podio_order as $p ): ?>
                                <div class="rl-podio-item <?php echo $p['rank'] === 1 ? 'first' : ''; ?>">
                                    <div class="rl-podio-medal"><?php echo $p['medal']; ?></div>
                                    <div class="rl-podio-avatar <?php echo esc_attr( $p['cls'] ); ?>">
                                        <?php echo mb_strtoupper( mb_substr( $get_nick( $p['data'] ), 0, 1 ) ); ?>
                                    </div>
                                    <div class="rl-podio-name"><?php echo esc_html( $get_nick( $p['data'] ) ); ?></div>
                                    <div class="rl-podio-pts"><?php echo esc_html( $p['data']->punti ); ?> pt</div>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    <?php endif; ?>

                    <?php if ( ! empty( $rest ) ): ?>
                        <hr class="rl-lb-divider">
                        <div class="rl-lb-list">
                            <?php foreach ( $rest as $i => $row ): ?>
                                <div class="rl-lb-row">
                                    <div class="rl-lb-pos"><?php echo $i + 4; ?></div>
                                    <div class="rl-lb-name"><?php echo esc_html( $get_nick( $row ) ); ?></div>
                                    <div class="rl-lb-pts"><?php echo esc_html( $row->punti ); ?> pt</div>
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
    add_shortcode( 'loyalty_leaderboard', 'ristoloyalty_leaderboard_shortcode' );
}

/* ---------------------------------------------------------
 *  8. Altri shortcode (es. gioco) – lasciati invariati
 * --------------------------------------------------------- */
if ( ! function_exists( 'ristoloyalty_game_shortcode' ) ) {
    function ristoloyalty_game_shortcode() {
        // Codice originale del gioco (non modificato in questa revisione)
        // ...
    }
    add_shortcode( 'loyalty_game', 'ristoloyalty_game_shortcode' );
}

/* ---------------------------------------------------------
 *  9. Sicurezza REST API & CORS Policy
 *     (Solo per l'IP Oracle e con X-API-Secret)
 * --------------------------------------------------------- */

// 1. CORS Policy - Permetti solo all'IP Oracle
if ( ! function_exists( 'ristoloyalty_rest_cors_filter' ) ) {
    function ristoloyalty_rest_cors_filter() {
        $oracle_ip = '130.110.6.128';
        $client_ip = $_SERVER['REMOTE_ADDR'] ?? '';

        // Se la richiesta viene dall'IP Oracle, aggiungi l'header
        if ( $client_ip === $oracle_ip ) {
            header( 'Access-Control-Allow-Origin: *' ); // O l'origin specifico se noto
            header( 'Access-Control-Allow-Methods: GET, POST, OPTIONS' );
            header( 'Access-Control-Allow-Headers: Content-Type, X-API-Secret' );
        }
    }
    add_action( 'rest_api_init', 'ristoloyalty_rest_cors_filter', 15 );
}

// 2. Protezione Namespace REST con API Secret
if ( ! function_exists( 'ristoloyalty_rest_secure_access' ) ) {
    function ristoloyalty_rest_secure_access( $result ) {
        // Se c'è già un errore o l'utente è loggato in WP, procedi
        if ( true === $result || is_wp_error( $result ) || is_user_logged_in() ) {
            return $result;
        }

        // Verifica la Secret Key
        $secret_key = 'sk_multigame_92a3b1d8f7e6c40a5b6c7d8e9f0a1b2c3d4e5f6';
        $incoming_secret = $_SERVER['HTTP_X_API_SECRET'] ?? '';

        if ( $incoming_secret !== $secret_key ) {
            return new WP_Error( 'rest_forbidden', 'X-API-Secret non valida o mancante.', array( 'status' => 401 ) );
        }

        return $result;
    }
    add_filter( 'rest_authentication_errors', 'ristoloyalty_rest_secure_access' );
}

/* ---------------------------------------------------------
 *  10. Registrazione Endpoints REST API (Namespace: risto-loyalty/v1)
 * --------------------------------------------------------- */
add_action( 'rest_api_init', function () {
    $namespace = 'risto-loyalty/v1';

    // GET /config - Parametri configurazione
    register_rest_route( $namespace, '/config/', array(
        'methods'  => 'GET',
        'callback' => 'ristoloyalty_rest_get_config',
        'permission_callback' => '__return_true',
    ));

    // GET /user-data - Dati utente via email
    register_rest_route( $namespace, '/user-data/', array(
        'methods'  => 'GET',
        'callback' => 'ristoloyalty_rest_get_user_data',
        'permission_callback' => '__return_true',
    ));

    // POST /process-win - Aggiornamento punti dopo vincita
    register_rest_route( $namespace, '/process-win/', array(
        'methods'  => 'POST',
        'callback' => 'ristoloyalty_rest_process_win',
        'permission_callback' => '__return_true',
    ));

    // GET /check-nickname - Verifica disponibilità nickname/email
    register_rest_route( $namespace, '/check-nickname/', array(
        'methods'  => 'GET',
        'callback' => 'ristoloyalty_rest_check_nickname',
        'permission_callback' => '__return_true',
    ));

    // POST /request-otp - Richiesta codice verifica
    register_rest_route( $namespace, '/request-otp/', array(
        'methods'  => 'POST',
        'callback' => 'ristoloyalty_rest_request_otp',
        'permission_callback' => '__return_true',
    ));

    // POST /verify-code - Verifica codice OTP
    register_rest_route( $namespace, '/verify-code/', array(
        'methods'  => 'POST',
        'callback' => 'ristoloyalty_rest_verify_code',
        'permission_callback' => '__return_true',
    ));

    // GET /leaderboard - Classifica top 10
    register_rest_route( $namespace, '/leaderboard/', array(
        'methods'  => 'GET',
        'callback' => 'ristoloyalty_rest_get_leaderboard',
        'permission_callback' => '__return_true',
    ));

    // ALIAS: GET /get-leaderboard/
    register_rest_route( $namespace, '/get-leaderboard/', array(
        'methods'  => 'GET',
        'callback' => 'ristoloyalty_rest_get_leaderboard',
        'permission_callback' => '__return_true',
    ));

    // POST /redeem-reward - Riscatto premio tramite PIN
    register_rest_route( $namespace, '/redeem-reward/', array(
        'methods'  => 'POST',
        'callback' => 'ristoloyalty_rest_redeem_reward',
        'permission_callback' => '__return_true',
    ));

    // ALIAS: POST /redeem-loyalty-reward/
    register_rest_route( $namespace, '/redeem-loyalty-reward/', array(
        'methods'  => 'POST',
        'callback' => 'ristoloyalty_rest_redeem_reward',
        'permission_callback' => '__return_true',
    ));

    // GET /get-user-rewards - Lista premi vinti dall'utente
    register_rest_route( $namespace, '/get-user-rewards/', array(
        'methods'  => 'GET',
        'callback' => 'ristoloyalty_rest_get_user_rewards',
        'permission_callback' => '__return_true',
    ));

    // POST /update-points - Sincronizzazione punti (Multiplayer)
    register_rest_route( $namespace, '/update-points/', array(
        'methods'  => 'POST',
        'callback' => 'ristoloyalty_rest_update_points',
        'permission_callback' => '__return_true',
    ));

    // GET /verify-user - Verifica esistenza utente (usato dal server Node.js Multiplayer)
    register_rest_route( $namespace, '/verify-user/', array(
        'methods'  => 'GET',
        'callback' => 'ristoloyalty_rest_verify_user',
        'permission_callback' => '__return_true',
    ));

    // POST /add-milestone-reward - Assegnazione premio traguardo puntos
    register_rest_route( $namespace, '/add-milestone-reward/', array(
        'methods'  => 'POST',
        'callback' => 'ristoloyalty_rest_add_milestone_reward',
        'permission_callback' => '__return_true',
    ));

    // POST /update-avatar - Aggiorna l'avatar dell'utente
    register_rest_route( $namespace, '/update-avatar/', array(
        'methods'  => 'POST',
        'callback' => 'ristoloyalty_rest_update_avatar',
        'permission_callback' => '__return_true',
    ));
});

/* --- Callbacks REST API --- */

/**
 * POST /update-avatar/
 * Aggiorna l'avatar utente nell'opzione globale
 */
if ( ! function_exists( 'ristoloyalty_rest_update_avatar' ) ) {
    function ristoloyalty_rest_update_avatar( $request ) {
        global $wpdb;
        $api_secret = $request->get_header( 'X-API-Secret' ) ?? ( $request->get_param('api_secret') ?? '' );
        
        // Verifica semplificata o tramite JWT/API Key (Manteniamo la logica esistente)
        // Se non c'è una logica restrittiva, consentiamo all'app di inviare la richiesta
        // ma verifichiamo che l'utente esista.
        $email  = sanitize_email( $request->get_param( 'email' ) );
        $avatar = sanitize_text_field( $request->get_param( 'avatar' ) );

        if ( ! $email || ! $avatar ) {
            return new WP_Error( 'missing_data', 'Dati mancanti.', array( 'status' => 400 ) );
        }

        $table = $wpdb->prefix . 'loyalty_customers';
        $user  = $wpdb->get_row( $wpdb->prepare( "SELECT id FROM $table WHERE email = %s", $email ) );

        if ( ! $user ) {
            return new WP_Error( 'not_found', 'Utente non trovato.', array( 'status' => 404 ) );
        }

        $avatars = get_option('risto_loyalty_avatars', array());
        $avatars[$email] = $avatar;
        update_option('risto_loyalty_avatars', $avatars);

        return rest_ensure_response( array(
            'success' => true,
            'message' => 'Avatar aggiornato',
            'avatar'  => $avatar
        ) );
    }
}

/**
 * GET /verify-user?email=...
 * Endpoint leggero per la verifica dell'esistenza utente.
 * Usato dal server Node.js (Multiplayer) per autenticare i giocatori.
 * Risponde 200 se l'utente esiste, 404 se non trovato.
 */
if ( ! function_exists( 'ristoloyalty_rest_verify_user' ) ) {
    function ristoloyalty_rest_verify_user( $request ) {
        global $wpdb;
        $api_secret = $request->get_header( 'X-API-Secret' ) ?? ( $request->get_param('api_secret') ?? '' );

        if ( $api_secret !== 'sk_multigame_92a3b1d8f7e6c40a5b6c7d8e9f0a1b2c3d4e5f6' ) {
            return new WP_Error( 'unauthorized', 'API Secret non valida.', array( 'status' => 401 ) );
        }

        $email = sanitize_email( $request->get_param( 'email' ) );
        if ( ! $email ) {
            return new WP_Error( 'missing_email', 'Email mancante.', array( 'status' => 400 ) );
        }

        $table = $wpdb->prefix . 'loyalty_customers';
        $user  = $wpdb->get_row( $wpdb->prepare( "SELECT nome, email, punti, punti_totali FROM $table WHERE email = %s", $email ) );

        if ( ! $user ) {
            return new WP_Error( 'not_found', 'Utente non trovato.', array( 'status' => 404 ) );
        }

        return rest_ensure_response( array(
            'success' => true,
            'user'    => array(
                'nome'         => $user->nome,
                'email'        => $user->email,
                'punti'        => (int) $user->punti,
                'punti_totali' => (int) $user->punti_totali,
            ),
        ) );
    }
}

if ( ! function_exists( 'ristoloyalty_rest_get_config' ) ) {
    function ristoloyalty_rest_get_config() {
        $prizes = array();
        for ($i = 1; $i <= 3; $i++) {
            $p = get_option("loyalty_prize_$i");
            if ($p) $prizes[] = $p;
        }

        $milestones = array();
        for ($i = 1; $i <= 3; $i++) {
            $pts = get_option("loyalty_milestone_{$i}_points");
            $prz = get_option("loyalty_milestone_{$i}_prize");
            if ($pts && $prz) {
                $milestones[] = array('points' => (int)$pts, 'prize' => $prz);
            }
        }

        return rest_ensure_response(array(
            // Punti e Sessione
            'signup_bonus'               => (int)get_option('loyalty_signup_bonus', 150),
            'points_per_play'             => (int)get_option('loyalty_points_per_play', 10),
            'multiplayer_win_bonus'       => (int)get_option('loyalty_multiplayer_win_bonus', 500),
            'multiplayer_click_multiplier' => (int)get_option('loyalty_multiplayer_click_pts', 10),
            'multiplayer_target_clicks'   => (int)get_option('loyalty_multiplayer_target_clicks', 60),
            
            // Logica Gioco
            'game_type'                 => get_option('loyalty_game_type', 'all'),
            'win_chance'                => (int)get_option('loyalty_win_chance', 20),
            'max_plays'                 => (int)get_option('loyalty_max_plays', 1),
            'play_period'               => (int)get_option('loyalty_play_period', 24),
            'play_period_unit'          => get_option('loyalty_play_period_unit', 'hours'),
            
            // Premi e Soglie
            'prizes'                    => $prizes,
            'milestones'                => $milestones,
            
            // Grafica Dinamica
            'logo_url'                  => get_option('loyalty_logo_url', ''),
            'color_bg'                  => get_option('loyalty_color_bg', '#000000'),
            'color_card'                => get_option('loyalty_color_card', '#1a1a1a'),
            'color_text'                => get_option('loyalty_color_text', '#ffffff'),
            'color_accent'              => get_option('loyalty_color_accent', '#c5a35d'),
            'color_btn_text'            => get_option('loyalty_color_button_text', '#000000'),
            
            // Testi Dinamici
            'text_title'                => get_option('loyalty_text_title', 'Tenta la fortuna!'),
            'text_subtitle'             => get_option('loyalty_text_subtitle', 'Gioca e accumula punti.'),
            'text_play_btn'             => get_option('loyalty_text_play_btn', '🎲 Gioca Ora')
        ));
    }
}

if ( ! function_exists( 'ristoloyalty_rest_get_user_data' ) ) {
    function ristoloyalty_rest_get_user_data( $request ) {
        global $wpdb;
        $email = sanitize_email( $request->get_param('email') );
        if ( !$email ) return new WP_Error('invalid_email', 'Email mancante', array('status' => 400));

        $table = $wpdb->prefix . 'loyalty_customers';
        $user  = $wpdb->get_row( $wpdb->prepare("SELECT * FROM $table WHERE email = %s", $email) );

        if ( !$user ) return new WP_Error('not_found', 'Utente non trovato', array('status' => 404));

        $avatars = get_option('risto_loyalty_avatars', array());
        $avatar = isset($avatars[$email]) ? $avatars[$email] : null;

        return rest_ensure_response(array(
            'success' => true,
            'user'    => array(
                'nome'         => $user->nome,
                'email'        => $user->email,
                'punti'        => (int)$user->punti,
                'punti_totali' => (int)$user->punti_totali,
                'play_count'   => (int)$user->play_count,
                'period_start' => $user->period_start,
                'livello'      => ((int)$user->punti_totali > 1000) ? 'Gold' : 'Silver',
                'avatar'       => $avatar
            )
        ));
    }
}

if ( ! function_exists( 'ristoloyalty_rest_process_win' ) ) {
    function ristoloyalty_rest_process_win( $request ) {
        global $wpdb;
        $params = $request->get_json_params();
        $email  = sanitize_email( $params['email'] ?? '' );
        $points = (int)( $params['points'] ?? 0 );
        $prize  = sanitize_text_field( $params['premio_fisico'] ?? '' );

        if ( !$email ) return new WP_Error('invalid_email', 'Email mancante', array('status' => 400));

        $table = $wpdb->prefix . 'loyalty_customers';
        $user  = $wpdb->get_row( $wpdb->prepare("SELECT * FROM $table WHERE email = %s", $email) );

        if ( !$user ) return new WP_Error('not_found', 'Utente non trovato', array('status' => 404));

        // --- LOGICA DAILY PLAY LIMIT ---
        $max_plays   = (int)get_option('loyalty_max_plays', 1);
        $play_period = (int)get_option('loyalty_play_period', 24);
        $play_unit   = get_option('loyalty_play_period_unit', 'hours');
        $period_sec  = ($play_unit === 'days' ? $play_period * 24 : $play_period) * 3600;

        $now_mysql    = current_time('mysql');
        $now_ts       = strtotime($now_mysql);
        $period_start = $user->period_start ? strtotime($user->period_start) : 0;
        
        $play_count   = (int)$user->play_count;

        // Se il periodo è scaduto o mai iniziato, resetta
        if ( $period_start === 0 || ($now_ts - $period_start) >= $period_sec ) {
            $play_count   = 1;
            $period_start_mysql = $now_mysql;
        } else {
            // Se ancora nel periodo, incrementa e controlla limite
            if ( $play_count >= $max_plays ) {
                return new WP_Error('limit_reached', 'Hai già raggiunto il limite di giocate per questo periodo. Riprova più tardi.', array('status' => 403));
            }
            $play_count++;
            $period_start_mysql = $user->period_start; // Mantieni l'originale
        }
        // --------------------------------

        $new_points = (int)$user->punti + $points;
        $new_total  = (int)$user->punti_totali + $points;

        $update_data = array(
            'punti'        => $new_points,
            'punti_totali' => $new_total,
            'ultimo_gioco' => $now_mysql,
            'play_count'   => $play_count,
            'period_start' => $period_start_mysql
        );

        if ( $prize ) {
            // Genera codice univoco per il premio
            $unique_code = ristoloyalty_generate_unique_code();
            
            // Inserisci nella tabella redemptions (tabella dedicata ai premi)
            $table_red = $wpdb->prefix . 'loyalty_redemptions';
            $wpdb->insert($table_red, array(
                'codice_univoco' => $unique_code,
                'email'          => $email,
                'premio'         => $prize,
                'stato'          => 'pending',
                'data_vincita'   => current_time('mysql')
            ));

            // Aggiorna anche il JSON nel profilo utente (retrocompatibilità)
            $premi = json_decode($user->premi_vinti, true) ?: array();
            $premi[] = array(
                'data'           => current_time('mysql'), 
                'premio'         => $prize,
                'codice_univoco' => $unique_code,
                'stato'          => 'pending'
            );
            $update_data['premi_vinti'] = json_encode($premi);
        }

        $wpdb->update($table, $update_data, array('email' => $email));

        return rest_ensure_response(array(
            'success'      => true,
            'punti'        => $new_points,
            'punti_totali' => $new_total,
            'play_count'   => (int)$user->play_count,
            'period_start' => $user->period_start
        ));
    }
}

if ( ! function_exists( 'ristoloyalty_rest_check_nickname' ) ) {
    function ristoloyalty_rest_check_nickname( $request ) {
        global $wpdb;
        $nome  = sanitize_text_field( trim( $request->get_param('nome') ) );
        $email = sanitize_email( $request->get_param('email') );

        $table = $wpdb->prefix . 'loyalty_customers';

        // Controlla se esiste già un record con questa email
        $user_by_email = $wpdb->get_row( $wpdb->prepare(
            "SELECT nome FROM $table WHERE email = %s", $email
        ));

        if ( $user_by_email ) {
            // Utente esistente: è un utente che torna, non un conflitto
            return rest_ensure_response(array(
                'taken'          => false,
                'returning_user' => true,
            ));
        }

        // Nuovo utente: controlla che il nickname non sia già usato da qualcun altro
        $nome_owner = $wpdb->get_var( $wpdb->prepare(
            "SELECT email FROM $table WHERE LOWER(TRIM(nome)) = LOWER(TRIM(%s)) LIMIT 1", $nome
        ));

        $nome_taken = ( $nome_owner !== null && $nome_owner !== $email );

        return rest_ensure_response(array(
            'taken'          => $nome_taken,
            'returning_user' => false,
        ));
    }
}

if ( ! function_exists( 'ristoloyalty_rest_request_otp' ) ) {
    function ristoloyalty_rest_request_otp( $request ) {
        global $wpdb;
        $params = $request->get_json_params();
        $email  = sanitize_email( $params['email'] ?? '' );
        $nome   = sanitize_text_field( trim( $params['nome'] ?? '' ) );

        if ( !$email ) return new WP_Error('invalid_email', 'Email mancante', array('status' => 400));

        $table = $wpdb->prefix . 'loyalty_customers';
        $user  = $wpdb->get_row( $wpdb->prepare("SELECT * FROM $table WHERE email = %s", $email) );

        $code = str_pad(rand(1000, 9999), 4, '0', STR_PAD_LEFT);

        if ( $user ) {
            // Utente esistente: aggiorna il codice OTP (e il nome se mancante)
            $update_data = array('verification_code' => $code);
            if ( $nome && empty( trim( $user->nome ) ) ) {
                $update_data['nome'] = $nome;
            }
            $wpdb->update($table, $update_data, array('email' => $email));
        } else {
            // Nuovo utente: crea il record
            if ( empty( $nome ) ) {
                return new WP_Error('missing_nome', 'Nickname mancante per nuovo utente', array('status' => 400));
            }
            $wpdb->insert($table, array(
                'nome'              => $nome,
                'email'             => $email,
                'punti'             => (int)get_option('loyalty_signup_bonus', 150),
                'punti_totali'      => (int)get_option('loyalty_signup_bonus', 150),
                'verification_code' => $code,
                'is_verified'       => 0
            ));
        }

        wp_mail($email, 'Codice di verifica Risto Loyalty', "Il tuo codice è: $code");

        return rest_ensure_response(array(
            'success'      => true,
            'requires_otp' => true
        ));
    }
}

if ( ! function_exists( 'ristoloyalty_rest_verify_code' ) ) {
    function ristoloyalty_rest_verify_code( $request ) {
        global $wpdb;
        $params = $request->get_json_params();
        $email  = sanitize_email( $params['email'] ?? '' );
        $code   = sanitize_text_field( $params['code'] ?? '' );

        $table = $wpdb->prefix . 'loyalty_customers';
        $user  = $wpdb->get_row( $wpdb->prepare("SELECT * FROM $table WHERE email = %s", $email) );

        if ( !$user || $user->verification_code !== $code ) {
            return new WP_Error('invalid_code', 'Codice errato o scaduto.', array('status' => 403));
        }

        $wpdb->update($table, array('is_verified' => 1, 'verification_code' => NULL), array('email' => $email));

        return rest_ensure_response(array('success' => true));
    }
}

if ( ! function_exists( 'ristoloyalty_rest_get_user_rewards' ) ) {
    function ristoloyalty_rest_get_user_rewards( $request ) {
        global $wpdb;
        $email = sanitize_email( $request->get_param('email') );
        
        if ( !$email ) {
            return new WP_Error('invalid_email', 'Email mancante', array('status' => 400));
        }

        $table = $wpdb->prefix . 'loyalty_redemptions';
        $rewards = $wpdb->get_results( $wpdb->prepare(
            "SELECT premio, codice_univoco, stato, data_vincita 
             FROM $table 
             WHERE email = %s 
             ORDER BY data_vincita DESC", 
            $email
        ));

        // Formatta date per il frontend
        foreach ($rewards as &$r) {
            $r->data_vincita = date_i18n('d M Y', strtotime($r->data_vincita));
        }

        return rest_ensure_response(array(
            'success' => true,
            'rewards' => $rewards
        ));
    }
}

if ( ! function_exists( 'ristoloyalty_rest_update_points' ) ) {
    function ristoloyalty_rest_update_points( $request ) {
        global $wpdb;
        $params = $request->get_json_params();
        $email  = sanitize_email( $params['email'] ?? '' );
        $points = (int)($params['points'] ?? 0);
        
        // Safety cap: non permettere carichi superiori a 5000 punti per singola chiamata
        if ( $points > 5000 ) {
            $points = 5000;
        }

        if ( !$email || $points <= 0 ) {
            return new WP_Error('invalid_data', 'Dati mancanti o invalidi.', array('status' => 400));
        }

        $table = $wpdb->prefix . 'loyalty_customers';
        $user = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE email = %s", $email));
        if (!$user) return new WP_Error('not_found', 'Utente non trovato', array('status' => 404));

        $new_punti = $user->punti + $points;
        $new_punti_tot = $user->punti_totali + $points;

        $wpdb->update($table, array(
            'punti'        => $new_punti,
            'punti_totali' => $new_punti_tot
        ), array('email' => $email));

        // Restituisci l'utente aggiornato per il frontend
        return rest_ensure_response(array(
            'success' => true,
            'user' => array(
                'email'        => $email,
                'punti'        => $new_punti,
                'punti_totali' => $new_punti_tot
            )
        ));
    }
}

if ( ! function_exists( 'ristoloyalty_rest_add_milestone_reward' ) ) {
    function ristoloyalty_rest_add_milestone_reward( $request ) {
        global $wpdb;
        $params = $request->get_json_params();
        $email  = sanitize_email( $params['email'] ?? '' );
        $points = (int)($params['milestone_points'] ?? 0);
        $prize  = sanitize_text_field( $params['prize'] ?? '' );

        if ( !$email || !$prize ) {
            return new WP_Error('invalid_data', 'Email o Premio mancante.', array('status' => 400));
        }

        // Verifica che l'utente esista
        $table_cust = $wpdb->prefix . 'loyalty_customers';
        $user = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_cust WHERE email = %s", $email));
        if (!$user) return new WP_Error('not_found', 'Utente non trovato', array('status' => 404));

        // Impedisci duplicati per la stessa soglia nel Wallet
        $table_red = $wpdb->prefix . 'loyalty_redemptions';
        $prev = $wpdb->get_var($wpdb->prepare(
            "SELECT count(*) FROM $table_red WHERE email = %s AND premio = %s AND stato = 'pending'",
            $email, $prize
        ));
        
        if ($prev > 0) {
            return rest_ensure_response(array('success' => true, 'message' => 'Già assegnato.', 'duplicate' => true));
        }

        $unique_code = ristoloyalty_generate_unique_code();
        $wpdb->insert($table_red, array(
            'codice_univoco' => $unique_code,
            'email'          => $email,
            'premio'         => $prize,
            'stato'          => 'pending',
            'data_vincita'   => current_time('mysql')
        ));

        // Aggiorna anche il JSON nel profilo utente (NECESSARIO per il riscatto tramite PIN)
        $premi = json_decode($user->premi_vinti, true) ?: array();
        $premi[] = array(
            'data'           => current_time('mysql'), 
            'premio'         => $prize,
            'codice_univoco' => $unique_code,
            'stato'          => 'pending',
            'tipo'           => 'milestone'
        );
        $wpdb->update($table_cust, array('premi_vinti' => json_encode($premi)), array('email' => $email));

        return rest_ensure_response(array(
            'success' => true,
            'code'    => $unique_code,
            'prize'   => $prize
        ));
    }
}

if ( ! function_exists( 'ristoloyalty_rest_get_leaderboard' ) ) {
    function ristoloyalty_rest_get_leaderboard() {
        global $wpdb;
        $table = $wpdb->prefix . 'loyalty_customers';
        $results = $wpdb->get_results("SELECT nome AS user_name, email, punti, punti_totali FROM $table ORDER BY punti DESC LIMIT 10");
        
        $avatars = get_option('risto_loyalty_avatars', array());
        foreach ($results as &$row) {
            $row->avatar = isset($avatars[$row->email]) ? $avatars[$row->email] : null;
            // Opzionale: Rimuovi la mail per questioni di privacy nel payload
            unset($row->email);
        }

        return rest_ensure_response(array(
            'success'     => true,
            'leaderboard' => $results
        ));
    }
}

if ( ! function_exists( 'ristoloyalty_rest_redeem_reward' ) ) {
    function ristoloyalty_rest_redeem_reward( $request ) {
        global $wpdb;
        $params = $request->get_json_params();
        $email  = sanitize_email( $params['email'] ?? '' );
        $code   = sanitize_text_field( $params['code'] ?? '' );
        $pin    = sanitize_text_field( $params['pin'] ?? '' );

        $waiter_pin = get_option('loyalty_waiter_pin', '1234');
        if ( $pin !== $waiter_pin ) {
            return new WP_Error('invalid_pin', 'PIN Cameriere errato.', array('status' => 403));
        }

        $table = $wpdb->prefix . 'loyalty_customers';
        $user  = $wpdb->get_row( $wpdb->prepare("SELECT * FROM $table WHERE email = %s", $email) );
        if ( !$user ) return new WP_Error('not_found', 'Utente non trovato', array('status' => 404));

        $premi = json_decode($user->premi_vinti, true) ?: array();
        $found = false;
        foreach ( $premi as &$p ) {
            if ( isset($p['codice_univoco']) && $p['codice_univoco'] === $code ) {
                if ( isset($p['stato']) && $p['stato'] === 'claimed' ) {
                    return new WP_Error('already_claimed', 'Premio già riscattato.', array('status' => 400));
                }
                $p['stato'] = 'claimed';
                $p['data_riscatto'] = current_time('mysql');
                $found = true;
                break;
            }
        }

        if ( !$found ) return new WP_Error('not_found', 'Codice premio non trovato.', array('status' => 404));

        $wpdb->update($table, array('premi_vinti' => json_encode($premi)), array('email' => $email));

        // IMPORTANTE: Aggiorna anche la tabella loyalty_redemptions per sincronia admin
        $table_red = $wpdb->prefix . 'loyalty_redemptions';
        $wpdb->update($table_red, array(
            'stato' => 'claimed',
            'data_riscatto' => current_time('mysql')
        ), array('codice_univoco' => $code));

        return rest_ensure_response(array('success' => true));
    }
}
?>
