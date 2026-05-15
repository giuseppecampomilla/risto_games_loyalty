<?php
/**
 * Risto Loyalty - VERSIONE FULL INTEGRALE (API + GIOCHI + LIMITI + LOGIN)
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Secret');

if ( ! defined( 'ABSPATH' ) ) exit;

if ( isset( $_SERVER['REQUEST_METHOD'] ) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS' ) {
    status_header( 200 );
    exit();
}

// Autenticazione: accetta Secret Key sia da Header che da Query Parameter
add_filter( 'rest_authentication_errors', function( $result ) {
    $api_secret = $_SERVER['HTTP_X_API_SECRET'] ?? ($_GET['api_secret'] ?? '');
    if ( ! empty( $api_secret ) && $api_secret === 'sk_multigame_92a3b1d8f7e6c40a5b6c7d8e9f0a1b2c3d4e5f6' ) {
        return true; 
    }
    return $result;
}, 100 );

add_action( 'rest_api_init', function () {
    $ns = 'risto-loyalty/v1';
    register_rest_route($ns, '/config/', array('methods'=>'GET', 'callback'=>'rl_get_config', 'permission_callback'=>'__return_true'));
    register_rest_route($ns, '/user-data/', array('methods'=>'GET', 'callback'=>'rl_get_user_data', 'permission_callback'=>'__return_true'));
    register_rest_route($ns, '/check-nickname/', array('methods'=>'POST', 'callback'=>'rl_check_nickname', 'permission_callback'=>'__return_true'));
    register_rest_route($ns, '/request-otp/', array('methods'=>'POST', 'callback'=>'rl_request_otp', 'permission_callback'=>'__return_true'));
    register_rest_route($ns, '/verify-code/', array('methods'=>'POST', 'callback'=>'rl_verify_otp', 'permission_callback'=>'__return_true'));
    register_rest_route($ns, '/process-win/', array('methods'=>'POST', 'callback'=>'rl_process_win', 'permission_callback'=>'__return_true'));
    register_rest_route($ns, '/update-points/', array('methods'=>'POST', 'callback'=>'rl_update_points', 'permission_callback'=>'__return_true'));
    register_rest_route($ns, '/verify-user/', array('methods'=>'GET', 'callback'=>'rl_verify_user', 'permission_callback'=>'__return_true'));
    register_rest_route($ns, '/get-leaderboard/', array('methods'=>'GET', 'callback'=>'rl_get_leaderboard', 'permission_callback'=>'__return_true'));
    register_rest_route($ns, '/update-avatar/', array('methods'=>'POST', 'callback'=>'rl_update_avatar', 'permission_callback'=>'__return_true'));
    register_rest_route($ns, '/get-user-rewards/', array('methods'=>'GET', 'callback'=>'rl_get_user_rewards', 'permission_callback'=>'__return_true'));
    register_rest_route($ns, '/redeem-reward/', array('methods'=>'POST', 'callback'=>'rl_redeem_reward', 'permission_callback'=>'__return_true'));
});

/* --- CALLBACKS API --- */

function rl_get_config() {
    $prizes = array();
    for($i=1;$i<=3;$i++) { $p = get_option("loyalty_prize_$i"); if($p) $prizes[]=$p; }
    
    $milestones = array();
    for($i=1;$i<=3;$i++) {
        $pts = get_option("loyalty_milestone_{$i}_points");
        $prz = get_option("loyalty_milestone_{$i}_prize");
        if($pts && $prz) $milestones[] = array('points'=>(int)$pts, 'prize'=>$prz);
    }

    return rest_ensure_response(array(
        'signup_bonus' => (int)get_option('loyalty_signup_bonus', 150),
        'points_per_play' => (int)get_option('loyalty_points_per_play', 10), // Assicurati che la chiave sia questa
        'win_chance' => (int)get_option('loyalty_win_chance', 20),
        'game_type' => get_option('loyalty_game_type', 'all'),
        'max_plays' => (int)get_option('loyalty_max_plays', 1),
        'play_period' => (int)get_option('loyalty_play_period', 24),
        'play_period_unit' => get_option('loyalty_play_period_unit', 'hours'),
        'prizes' => $prizes,
        'milestones' => $milestones,
        'color_bg' => get_option('loyalty_color_bg', '#000000'),
        'color_accent' => get_option('loyalty_color_accent', '#c5a35d'),
        'multiplayer_win_bonus' => (int)get_option('loyalty_multiplayer_win_bonus', 500),
        'multiplayer_click_multiplier' => (int)get_option('loyalty_multiplayer_click_pts', 10),
        'multiplayer_target_clicks' => (int)get_option('loyalty_multiplayer_target_clicks', 60)
    ));
}

function rl_process_win($req) {
    global $wpdb;
    $params = $req->get_json_params();
    $email = sanitize_email($params['email']);
    $table = $wpdb->prefix . 'loyalty_customers';
    $user = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE email = %s", $email));
    
    if (!$user) return new WP_Error('404', 'User not found', array('status'=>404));

    // --- CONTROLLO LIMITE GIOCATE ---
    $max_plays = (int)get_option('loyalty_max_plays', 1);
    $play_period = (int)get_option('loyalty_play_period', 24);
    $play_unit = get_option('loyalty_play_period_unit', 'hours');
    $period_sec = ($play_unit === 'days' ? $play_period * 24 : $play_period) * 3600;

    $now = current_time('timestamp');
    $p_start = $user->period_start ? strtotime($user->period_start) : 0;
    $count = (int)$user->play_count;

    if ($p_start === 0 || ($now - $p_start) >= $period_sec) {
        $count = 1;
        $p_start_mysql = current_time('mysql');
    } else {
        if ($count >= $max_plays) {
            return new WP_Error('limit', 'Limite giocate raggiunto.', array(
                'status' => 403,
                'play_count' => $user->play_count,
                'period_start' => $user->period_start
            ));
        }
        $count++;
        $p_start_mysql = $user->period_start;
    }

    // --- LOGICA VINCITA ---
    $frontend_points = isset($params['points']) ? (int)$params['points'] : 0;
    $frontend_prize = isset($params['premio_fisico']) ? sanitize_text_field($params['premio_fisico']) : '';
    
    // Per supportare i giochi React che inviano i punti calcolati (come la ruota)
    $points_to_add = $frontend_points > 0 ? $frontend_points : (int)get_option('loyalty_points_per_play', 10);
    $prize = $frontend_prize;
    $is_win = !empty($prize) || $points_to_add > 0;

    $update = array(
        'punti' => $user->punti + $points_to_add,
        'punti_totali' => $user->punti_totali + $points_to_add,
        'play_count' => $count,
        'period_start' => $p_start_mysql,
        'ultimo_gioco' => current_time('mysql')
    );

    if ($prize) {
        $code = strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
        $wpdb->insert($wpdb->prefix . 'loyalty_redemptions', array(
            'codice_univoco' => $code, 'email' => $email, 'premio' => $prize, 'stato' => 'pending', 'data_vincita' => current_time('mysql')
        ));
        $vinti = json_decode($user->premi_vinti, true) ?: array();
        $vinti[] = array('premio'=>$prize, 'codice'=>$code, 'data'=>current_time('mysql'), 'stato'=>'pending');
        $update['premi_vinti'] = json_encode($vinti);
    }

    $wpdb->update($table, $update, array('email' => $email));
    return rest_ensure_response(array('success'=>true, 'punti'=>$update['punti'], 'is_win'=>$is_win, 'prize'=>$prize));
}

function rl_check_nickname($req) {
    global $wpdb;
    $nome = sanitize_text_field($req->get_param('nome'));
    $email = sanitize_email($req->get_param('email'));
    $user = $wpdb->get_var($wpdb->prepare("SELECT email FROM {$wpdb->prefix}loyalty_customers WHERE LOWER(nome) = LOWER(%s)", $nome));
    return rest_ensure_response(array('taken' => ($user && $user !== $email)));
}

function rl_request_otp($req) {
    global $wpdb;
    $params = $req->get_json_params();
    $email = sanitize_email($params['email']);
    $nome = sanitize_text_field($params['nome'] ?? '');
    $otp = str_pad(rand(0, 9999), 4, '0', STR_PAD_LEFT);
    $table = $wpdb->prefix . 'loyalty_customers';
    $user = $wpdb->get_row($wpdb->prepare("SELECT id FROM $table WHERE email = %s", $email));
    if($user) {
        $wpdb->update($table, array('verification_code'=>$otp), array('email'=>$email));
    } else {
        $wpdb->insert($table, array('email'=>$email, 'nome'=>$nome, 'verification_code'=>$otp, 'punti'=>get_option('loyalty_signup_bonus', 150), 'is_verified'=>0));
    }
    wp_mail($email, "Codice Risto Loyalty", "Il tuo codice di accesso: $otp");
    return rest_ensure_response(array('success'=>true, 'requires_otp'=>true));
}

function rl_verify_otp($req) {
    global $wpdb;
    $params = $req->get_json_params();
    $email = sanitize_email($params['email']);
    $otp = sanitize_text_field($params['code'] ?? $params['otp']);
    $user = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}loyalty_customers WHERE email = %s AND verification_code = %s", $email, $otp));
    if(!$user) return new WP_Error('403', 'Codice errato', array('status'=>403));
    $wpdb->update($wpdb->prefix . 'loyalty_customers', array('is_verified'=>1, 'verification_code'=>''), array('email'=>$email));
    return rest_ensure_response(array('success'=>true, 'user'=>array('nome'=>$user->nome, 'email'=>$user->email)));
}

function rl_get_user_data($req) {
    global $wpdb;
    $email = sanitize_email($req->get_param('email'));
    $user = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}loyalty_customers WHERE email = %s", $email));
    if (!$user) return new WP_Error('404', 'Utente non trovato', array('status' => 404));
    
    // Recupera i premi per il Wallet
    $rewards = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}loyalty_redemptions WHERE email = %s AND stato = 'pending' ORDER BY data_vincita DESC", 
        $email
    ));

    return rest_ensure_response(array(
        'success' => true, 
        'user' => array(
            'punti' => (int)$user->punti, 
            'nome' => $user->nome, 
            'email' => $user->email,
            'play_count' => (int)$user->play_count,
            'period_start' => $user->period_start,
            'avatar' => isset($user->avatar) ? $user->avatar : ''
        ),
        'rewards' => $rewards
    ));
}

function rl_update_points($req) {
    global $wpdb;
    $params = $req->get_json_params();
    $email = sanitize_email($params['email']);
    $pts = (int)$params['points'];
    $table = $wpdb->prefix . 'loyalty_customers';
    $user = $wpdb->get_row($wpdb->prepare("SELECT punti, punti_totali FROM $table WHERE email = %s", $email));
    if (!$user) return new WP_Error('404', 'User not found', array('status' => 404));
    $wpdb->update($table, array('punti'=>$user->punti+$pts, 'punti_totali'=>$user->punti_totali+$pts), array('email'=>$email));
    return rest_ensure_response(array('success'=>true));
}

function rl_verify_user($req) {
    global $wpdb;
    $email = sanitize_email($req->get_param('email'));
    $user = $wpdb->get_row($wpdb->prepare("SELECT email FROM {$wpdb->prefix}loyalty_customers WHERE email = %s", $email));
    return $user ? rest_ensure_response(array('success'=>true)) : new WP_Error('404', 'Not found', array('status'=>404));
}

function rl_get_leaderboard($req) {
    global $wpdb;
    $table = $wpdb->prefix . 'loyalty_customers';
    // Controlla se la colonna avatar esiste prima di interrogarla per non rompere db vecchi
    $cols = $wpdb->get_col("SHOW COLUMNS FROM $table LIKE 'avatar'");
    $select = empty($cols) ? "nome AS user_name, punti_totali" : "nome AS user_name, punti_totali, avatar";
    
    $leaders = $wpdb->get_results("SELECT $select FROM $table ORDER BY punti_totali DESC LIMIT 50", ARRAY_A);
    return rest_ensure_response(array('success' => true, 'leaderboard' => $leaders));
}

function rl_update_avatar($req) {
    global $wpdb;
    $email = sanitize_email($req->get_param('email'));
    $avatar = sanitize_text_field($req->get_param('avatar'));
    $table = $wpdb->prefix . 'loyalty_customers';
    
    // Aggiunge la colonna on-the-fly se non esiste
    $cols = $wpdb->get_col("SHOW COLUMNS FROM $table LIKE 'avatar'");
    if (empty($cols)) {
        $wpdb->query("ALTER TABLE $table ADD COLUMN avatar VARCHAR(10) NULL");
    }
    
    $wpdb->update($table, array('avatar' => $avatar), array('email' => $email));
    return rest_ensure_response(array('success' => true));
}

function rl_get_user_rewards($req) {
    global $wpdb;
    $email = sanitize_email($req->get_param('email'));
    $rewards = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}loyalty_redemptions WHERE email = %s AND stato = 'pending' ORDER BY data_vincita DESC", 
        $email
    ));
    return rest_ensure_response(array('success' => true, 'rewards' => $rewards));
}

function rl_redeem_reward($req) {
    global $wpdb;
    $params = $req->get_json_params();
    $email = sanitize_email($params['email']);
    $code = sanitize_text_field($params['code']);
    $pin = sanitize_text_field($params['pin']);
    
    // Verifica PIN Cameriere
    $correct_pin = get_option('loyalty_waiter_pin', '0000');
    if ($pin !== $correct_pin) {
        return rest_ensure_response(array('success' => false, 'message' => 'PIN errato. Riprova.'));
    }
    
    $table = $wpdb->prefix . 'loyalty_redemptions';
    $reward = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table WHERE email = %s AND codice_univoco = %s AND stato = 'pending'", $email, $code));
    
    if (!$reward) {
        return rest_ensure_response(array('success' => false, 'message' => 'Premio non trovato o già riscattato.'));
    }
    
    $wpdb->update($table, 
        array('stato' => 'riscattato', 'data_riscatto' => current_time('mysql')), 
        array('id' => $reward->id)
    );
    
    return rest_ensure_response(array('success' => true));
}

add_shortcode( 'loyalty_dashboard', function() {
    if (!is_user_logged_in()) return 'Esegui il login.';
    $user = wp_get_current_user();
    global $wpdb;
    $pts = $wpdb->get_var($wpdb->prepare("SELECT punti FROM {$wpdb->prefix}loyalty_customers WHERE email = %s", $user->user_email));
    return "<div style='background:#111;padding:20px;border-radius:12px;color:#fff;text-align:center;'>
        <h2 style='color:#fbbf24;'>Punti: ".number_format($pts)."</h2>
        <a href='http://130.110.6.128/' style='background:#fbbf24;color:#000;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;'>APRI APP</a>
    </div>";
});
