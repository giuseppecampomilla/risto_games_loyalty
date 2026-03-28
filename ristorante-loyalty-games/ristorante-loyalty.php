<?php
/**
 * Plugin Name: Ristorante Loyalty
 * Plugin URI:  https://example.com
 * Description: Plugin per la gestione dei punti fedeltà e giochi interattivi.
 * Version:     1.0.0
 * Author:      Il tuo sviluppatore
 * Text Domain: ristorante-loyalty
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Impedi l'accesso diretto
}

// Includi il core del sistema (Shortcode HTML e Logica Punti Ajax)
require_once plugin_dir_path( __FILE__ ) . 'loyalty-system.php';

// Registra la funzione di attivazione del plugin
register_activation_hook( __FILE__, 'ristorante_loyalty_create_table' );

/**
 * Funzione che crea la tabella nel database all'attivazione del plugin
 */
function ristorante_loyalty_create_table() {
    global $wpdb;
    
    // Definiamo il nome della tabella concatenando il prefisso di WordPress
    $table_name = $wpdb->prefix . 'loyalty_customers';
    
    // Otteniamo il charset e collate corrotti dal DB di WordPress
    $charset_collate = $wpdb->get_charset_collate();

    // Query SQL per creare la tabella con i campi richiesti
    $sql = "CREATE TABLE $table_name (
        id mediumint(9) NOT NULL AUTO_INCREMENT,
        nome varchar(100) NOT NULL,
        email varchar(100) NOT NULL,
        punti mediumint(9) DEFAULT 0 NOT NULL,
        ultimo_gioco datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY email (email)
    ) $charset_collate;";

    // Includiamo il file upgrade.php che contiene la funzione dbDelta
    require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );
    
    // dbDelta esegue la query e crea (o aggiorna) la tabella in modo sicuro
    dbDelta( $sql );
}

/**
 * Aggiornamento DB: aggiunge le colonne play_count e period_start se non esistono
 */
add_action( 'admin_init', 'ristorante_loyalty_upgrade_db' );
function ristorante_loyalty_upgrade_db() {
    if ( get_option('loyalty_db_version', '1.0') >= '2.1' ) return;
    global $wpdb;
    $table = $wpdb->prefix . 'loyalty_customers';
    $cols = $wpdb->get_col("SHOW COLUMNS FROM $table");
    if ( ! in_array('play_count', $cols) ) {
        $wpdb->query("ALTER TABLE $table ADD COLUMN play_count INT DEFAULT 0");
    }
    if ( ! in_array('period_start', $cols) ) {
        $wpdb->query("ALTER TABLE $table ADD COLUMN period_start DATETIME NULL");
    }
    if ( ! in_array('premi_vinti', $cols) ) {
        $wpdb->query("ALTER TABLE $table ADD COLUMN premi_vinti LONGTEXT NULL");
    }
    update_option('loyalty_db_version', '2.1');
}

/**
 * Aggiunge il menu e i sottomenu in amministrazione
 */
add_action( 'admin_menu', 'ristorante_loyalty_add_menu_pages' );

function ristorante_loyalty_add_menu_pages() {
    add_menu_page(
        'Loyalty Games', 'Loyalty Games', 'manage_options',
        'loyalty-games-main', 'ristorante_loyalty_settings_page',
        'dashicons-tickets-alt', 80
    );
    add_submenu_page(
        'loyalty-games-main', 'Impostazioni Gioco', 'Impostazioni Gioco',
        'manage_options', 'loyalty-games-main', 'ristorante_loyalty_settings_page'
    );
    add_submenu_page(
        'loyalty-games-main', 'Lista Clienti', 'Lista Clienti',
        'manage_options', 'loyalty-games-customers', 'ristorante_loyalty_customers_page'
    );
    // Terzo sottomenu: Personalizzazione Grafica
    add_submenu_page(
        'loyalty-games-main', 'Personalizzazione Grafica', '🎨 Grafica',
        'manage_options', 'loyalty-games-design', 'ristorante_loyalty_design_page'
    );
}

// Carica la Media Library di WP solo nella pagina grafica
add_action( 'admin_enqueue_scripts', 'ristorante_loyalty_admin_scripts' );
function ristorante_loyalty_admin_scripts( $hook ) {
    if ( isset($_GET['page']) && $_GET['page'] === 'loyalty-games-design' ) {
        wp_enqueue_media();
    }
}

/**
 * Registra le opzioni e i settings
 */
add_action( 'admin_init', 'ristorante_loyalty_register_settings' );
function ristorante_loyalty_register_settings() {
    register_setting( 'ristorante_loyalty_options', 'loyalty_game_type' );
    register_setting( 'ristorante_loyalty_options', 'loyalty_game_url' );
    // Punti e Premi Casuali
    register_setting( 'ristorante_loyalty_options', 'loyalty_points_per_play' );
    register_setting( 'ristorante_loyalty_options', 'loyalty_win_chance' );
    register_setting( 'ristorante_loyalty_options', 'loyalty_prize_1' );
    register_setting( 'ristorante_loyalty_options', 'loyalty_prize_2' );
    register_setting( 'ristorante_loyalty_options', 'loyalty_prize_3' );
    // Limite giocate
    register_setting( 'ristorante_loyalty_options', 'loyalty_max_plays' );
    register_setting( 'ristorante_loyalty_options', 'loyalty_play_period' );
    register_setting( 'ristorante_loyalty_options', 'loyalty_play_period_unit' );
    // Soglie Fidelity
    register_setting( 'ristorante_loyalty_options', 'loyalty_milestone_1_points' );
    register_setting( 'ristorante_loyalty_options', 'loyalty_milestone_1_prize' );
    register_setting( 'ristorante_loyalty_options', 'loyalty_milestone_2_points' );
    register_setting( 'ristorante_loyalty_options', 'loyalty_milestone_2_prize' );
    register_setting( 'ristorante_loyalty_options', 'loyalty_milestone_3_points' );
    register_setting( 'ristorante_loyalty_options', 'loyalty_milestone_3_prize' );
    // Grafica
    register_setting( 'ristorante_loyalty_design', 'loyalty_color_bg' );
    register_setting( 'ristorante_loyalty_design', 'loyalty_color_card' );
    register_setting( 'ristorante_loyalty_design', 'loyalty_color_text' );
    register_setting( 'ristorante_loyalty_design', 'loyalty_color_accent' );
    register_setting( 'ristorante_loyalty_design', 'loyalty_color_button_text' );
    register_setting( 'ristorante_loyalty_design', 'loyalty_logo_url' );
    register_setting( 'ristorante_loyalty_design', 'loyalty_text_title' );
    register_setting( 'ristorante_loyalty_design', 'loyalty_text_subtitle' );
    register_setting( 'ristorante_loyalty_design', 'loyalty_text_play_btn' );
}

/**
 * Callback per la pagina Impostazioni
 */
function ristorante_loyalty_settings_page() {
    ?>
    <div class="wrap">
        <h1>⚙️ Impostazioni Gioco</h1>
        
        <div class="notice notice-info is-dismissible" style="margin-bottom: 20px;">
            <p><strong>💡 Shortcode del Gioco:</strong> Copia e incolla questo codice: <code>[loyalty_game]</code> nella pagina in cui vuoi far apparire il gioco.</p>
        </div>

        <form method="post" action="options.php">
            <?php settings_fields( 'ristorante_loyalty_options' ); ?>
            <?php do_settings_sections( 'ristorante_loyalty_options' ); ?>
            <table class="form-table">
                <tr valign="top">
                    <th scope="row">Tipo di Gioco</th>
                    <td>
                        <select name="loyalty_game_type">
                            <option value="gratta_e_vinci" <?php selected(get_option('loyalty_game_type'), 'gratta_e_vinci'); ?>>Gratta e Vinci</option>
                            <option value="ruota_fortuna" <?php selected(get_option('loyalty_game_type'), 'ruota_fortuna'); ?>>Ruota della Fortuna</option>
                            <option value="slot_machine" <?php selected(get_option('loyalty_game_type'), 'slot_machine'); ?>>Slot Machine</option>
                        </select>
                    </td>
                </tr>
                <tr valign="top">
                    <th scope="row">Punti per Giocata</th>
                    <td><input type="number" name="loyalty_points_per_play" min="1" max="1000" value="<?php echo esc_attr( get_option('loyalty_points_per_play', '10') ); ?>" /> pt</td>
                </tr>
                <tr valign="top">
                    <th scope="row">Probabilità di Vincita (%)</th>
                    <td><input type="number" name="loyalty_win_chance" min="1" max="100" value="<?php echo esc_attr( get_option('loyalty_win_chance', '20') ); ?>" /></td>
                </tr>
                <tr valign="top">
                    <th scope="row">Premio 1</th>
                    <td><input type="text" name="loyalty_prize_1" value="<?php echo esc_attr( get_option('loyalty_prize_1', '') ); ?>" class="regular-text" /></td>
                </tr>
                <tr valign="top">
                    <th scope="row">Premio 2</th>
                    <td><input type="text" name="loyalty_prize_2" value="<?php echo esc_attr( get_option('loyalty_prize_2', '') ); ?>" class="regular-text" /></td>
                </tr>
                <tr valign="top">
                    <th scope="row">Premio 3</th>
                    <td><input type="text" name="loyalty_prize_3" value="<?php echo esc_attr( get_option('loyalty_prize_3', '') ); ?>" class="regular-text" /></td>
                </tr>

                <!-- LIMITI GIOCATE -->
                <tr valign="top">
                    <th scope="row" colspan="2"><h2 style="margin: 20px 0 0;">⏳ Limite Giocate per Utente</h2></th>
                </tr>
                <tr valign="top">
                    <th scope="row">Numero Massimo di Giocate</th>
                    <td><input type="number" name="loyalty_max_plays" min="1" max="1000" value="<?php echo esc_attr( get_option('loyalty_max_plays', '1') ); ?>" /></td>
                </tr>
                <tr valign="top">
                    <th scope="row">Periodo di Tempo</th>
                    <td>
                        <input type="number" name="loyalty_play_period" min="1" max="365" value="<?php echo esc_attr( get_option('loyalty_play_period', '24') ); ?>" style="width:70px;" />
                        <select name="loyalty_play_period_unit">
                            <option value="hours" <?php selected(get_option('loyalty_play_period_unit', 'hours'), 'hours'); ?>>Ore</option>
                            <option value="days" <?php selected(get_option('loyalty_play_period_unit', 'hours'), 'days'); ?>>Giorni</option>
                        </select>
                        <p class="description">Es: Massimo 1 giocata ogni 24 ore. L'utente non potrà giocare finché non scade il periodo dalla sua ultima giocata.</p>
                    </td>
                </tr>

                <!-- ===== SEZIONE SOGLIE FIDELITY ===== -->
                <tr><td colspan="2"><hr><h2 style="margin:0;">🏆 Soglie Fidelity</h2><p style="color:#aaa;margin:.3rem 0 0;">Premio assegnato automaticamente al raggiungimento dei punti (ha priorità sul premio casuale).</p></td></tr>
                <?php for ($i = 1; $i <= 3; $i++) : ?>
                <tr valign="top">
                    <th scope="row">Soglia <?php echo $i; ?></th>
                    <td style="display:flex;gap:10px;align-items:center;">
                        <input type="number" name="loyalty_milestone_<?php echo $i; ?>_points" min="0" placeholder="Punti (es. 100)" value="<?php echo esc_attr( get_option('loyalty_milestone_' . $i . '_points', '') ); ?>" style="width:120px;" />
                        &nbsp;pt →&nbsp;
                        <input type="text" name="loyalty_milestone_<?php echo $i; ?>_prize" placeholder="Premio (es. Cena per Due 🍽️)" value="<?php echo esc_attr( get_option('loyalty_milestone_' . $i . '_prize', '') ); ?>" style="width:280px;" />
                    </td>
                </tr>
                <?php endfor; ?>

                <!-- ===== CAMPO URL PER QR CODE ===== -->
                <tr><td colspan="2"><hr><h2 style="margin:0;">📱 QR Code Gioco</h2><p style="color:#666;margin:.3rem 0 0;">Inserisci l'URL della pagina WordPress in cui hai incollato lo shortcode <code>[loyalty_game]</code>.</p></td></tr>
                <tr valign="top">
                    <th scope="row">URL della Pagina Gioco</th>
                    <td><input type="url" name="loyalty_game_url" id="loyalty_game_url" value="<?php echo esc_attr( get_option('loyalty_game_url', '') ); ?>" class="large-text" placeholder="https://tuo-sito.com/gioca" /></td>
                </tr>

            </table>
            <?php submit_button('Salva Impostazioni'); ?>
        </form>

        <!-- ===== SEZIONE QR CODE (fuori dal form) ===== -->
        <?php $game_url = get_option('loyalty_game_url', ''); ?>
        <div style="margin-top:2rem;padding:1.5rem;background:#fff;border:1px solid #ddd;border-radius:8px;max-width:500px;">
            <h2 style="margin-top:0;">📱 Il tuo QR Code</h2>
            <?php if ( $game_url ) : ?>
                <p style="color:#555;">Scansionando questo QR code il cliente aprirà direttamente la pagina del gioco.</p>
                <div style="display:flex;align-items:flex-start;gap:2rem;flex-wrap:wrap;">
                    <div>
                        <img id="rl-qr-img"
                             src="https://api.qrserver.com/v1/create-qr-code/?data=<?php echo urlencode($game_url); ?>&size=200x200&color=000000&bgcolor=ffffff&qzone=2"
                             alt="QR Code"
                             width="200" height="200"
                             style="border:6px solid #111;border-radius:8px;display:block;">
                        <p style="font-size:.75rem;color:#aaa;margin:.4rem 0 0;word-break:break-all;max-width:200px;"><?php echo esc_html($game_url); ?></p>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:.8rem;padding-top:.5rem;">
                        <a id="rl-qr-download"
                           href="https://api.qrserver.com/v1/create-qr-code/?data=<?php echo urlencode($game_url); ?>&size=600x600&color=000000&bgcolor=ffffff&qzone=2"
                           download="qrcode-gioco.png"
                           class="button button-primary">⬇️ Scarica QR Code (600×600)</a>
                        <a href="<?php echo esc_url($game_url); ?>" target="_blank" class="button">🔗 Apri pagina gioco</a>
                    </div>
                </div>
            <?php else : ?>
                <p style="color:#999;">👆 Salva prima l'URL della pagina gioco nel form qui sopra per generare il QR Code.</p>
            <?php endif; ?>
        </div>

    </div>
    <?php
}

/**
 * Callback per la pagina Personalizzazione Grafica
 */
function ristorante_loyalty_design_page() {
    ?>
    <div class="wrap">
        <h1>🎨 Personalizzazione Grafica</h1>
        <p style="color:#555;">Le modifiche vengono applicate in tempo reale al box del gioco nella pagina pubblica.</p>
        <form method="post" action="options.php">
            <?php settings_fields( 'ristorante_loyalty_design' ); ?>
            <table class="form-table">
                <tr><td colspan="2"><h2 style="margin:0 0 .5rem;">🎨 Colori</h2></td></tr>
                <tr valign="top">
                    <th scope="row">Sfondo del Box</th>
                    <td><input type="color" name="loyalty_color_bg" value="<?php echo esc_attr( get_option('loyalty_color_bg', '#080808') ); ?>" /></td>
                </tr>
                <tr valign="top">
                    <th scope="row">Sfondo input / card</th>
                    <td><input type="color" name="loyalty_color_card" value="<?php echo esc_attr( get_option('loyalty_color_card', '#1a1a1a') ); ?>" /></td>
                </tr>
                <tr valign="top">
                    <th scope="row">Colore Testo</th>
                    <td><input type="color" name="loyalty_color_text" value="<?php echo esc_attr( get_option('loyalty_color_text', '#ffffff') ); ?>" /></td>
                </tr>
                <tr valign="top">
                    <th scope="row">Colore Accentuato (titolo, bordi, tasto)</th>
                    <td><input type="color" name="loyalty_color_accent" value="<?php echo esc_attr( get_option('loyalty_color_accent', '#FFD700') ); ?>" /></td>
                </tr>
                <tr valign="top">
                    <th scope="row">Colore Testo Tasto</th>
                    <td><input type="color" name="loyalty_color_button_text" value="<?php echo esc_attr( get_option('loyalty_color_button_text', '#000000') ); ?>" /></td>
                </tr>
                <tr><td colspan="2"><hr><h2 style="margin:0 0 .5rem;">🖼️ Logo Ristorante</h2></td></tr>
                <tr valign="top">
                    <th scope="row">Logo</th>
                    <td>
                        <?php $logo = get_option('loyalty_logo_url', ''); ?>
                        <?php if ($logo): ?><img id="rl-logo-preview" src="<?php echo esc_url($logo); ?>" style="max-height:80px;display:block;margin-bottom:8px;border-radius:6px;" /><?php else: ?><img id="rl-logo-preview" src="" style="max-height:80px;display:none;margin-bottom:8px;border-radius:6px;" /><?php endif; ?>
                        <input type="hidden" name="loyalty_logo_url" id="loyalty_logo_url" value="<?php echo esc_attr($logo); ?>" />
                        <button type="button" class="button" id="rl-upload-logo">📂 Scegli dalla Libreria</button>
                        <button type="button" class="button" id="rl-remove-logo" style="margin-left:6px;color:red;">✕ Rimuovi</button>
                        <p class="description">Il logo apparirà in cima al box del gioco.</p>
                    </td>
                </tr>
                <tr><td colspan="2"><hr><h2 style="margin:0 0 .5rem;">✏️ Testi</h2></td></tr>
                <tr valign="top">
                    <th scope="row">Titolo principale</th>
                    <td><input type="text" name="loyalty_text_title" value="<?php echo esc_attr( get_option('loyalty_text_title', 'Tenta la fortuna!') ); ?>" class="large-text" /></td>
                </tr>
                <tr valign="top">
                    <th scope="row">Sottotitolo / Descrizione</th>
                    <td><textarea name="loyalty_text_subtitle" class="large-text" rows="2"><?php echo esc_textarea( get_option('loyalty_text_subtitle', 'Gioca e accumula punti. Raggiungi la soglia e vinci un premio!') ); ?></textarea></td>
                </tr>
                <tr valign="top">
                    <th scope="row">Testo pulsante Gioca</th>
                    <td><input type="text" name="loyalty_text_play_btn" value="<?php echo esc_attr( get_option('loyalty_text_play_btn', '🎲 Gioca Ora') ); ?>" class="regular-text" /></td>
                </tr>
            </table>
            <?php submit_button('Salva Stile'); ?>
        </form>
    </div>
    <script>
    (function(){
        var btn = document.getElementById('rl-upload-logo');
        var inp = document.getElementById('loyalty_logo_url');
        var prev = document.getElementById('rl-logo-preview');
        var rem = document.getElementById('rl-remove-logo');
        var frame;
        if (btn) btn.addEventListener('click', function(e){
            e.preventDefault();
            if (frame) { frame.open(); return; }
            frame = wp.media({ title: 'Scegli Logo', button:{ text:'Usa questo logo' }, multiple:false });
            frame.on('select', function(){
                var att = frame.state().get('selection').first().toJSON();
                inp.value = att.url; prev.src = att.url; prev.style.display = 'block';
            });
            frame.open();
        });
        if (rem) rem.addEventListener('click', function(){
            inp.value = ''; prev.src = ''; prev.style.display = 'none';
        });
    })();
    </script>
    <?php
}


function ristorante_loyalty_customers_page() {
    global $wpdb;
    $table_name = $wpdb->prefix . 'loyalty_customers';
    
    // Vista Dettaglio Cliente
    if ( isset($_GET['action']) && $_GET['action'] === 'view' && isset($_GET['id']) ) {
        $id = intval($_GET['id']);
        $c = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_name WHERE id = %d", $id));
        if ( ! $c ) {
            echo '<div class="wrap"><h1>Cliente non trovato.</h1><a href="?page=loyalty-games-customers" class="button">Torna alla lista</a></div>';
            return;
        }

        $premi_vinti = array();
        if ( !empty($c->premi_vinti) ) {
            $parsed = json_decode($c->premi_vinti, true);
            if (is_array($parsed)) $premi_vinti = array_reverse($parsed); // dal più recente
        }
        ?>
        <div class="wrap">
            <h1 class="wp-heading-inline">👤 Scheda Giocatore</h1>
            <a href="?page=loyalty-games-customers" class="page-title-action">Torna alla lista</a>
            <hr class="wp-header-end">
            
            <div style="background:#fff;padding:20px;border:1px solid #ccd0d4;box-shadow:0 1px 1px rgba(0,0,0,.04);max-width:800px;margin-top:20px;">
                <h2 style="margin-top:0;font-size:1.5rem;border-bottom:1px solid #eee;padding-bottom:10px;">Dati Profilo</h2>
                <p><strong>Nome:</strong> <?php echo esc_html($c->nome); ?></p>
                <p><strong>Email:</strong> <?php echo esc_html($c->email); ?></p>
                <p><strong>Punti Attuali:</strong> <span style="background:#FFD700;color:#000;font-weight:bold;padding:3px 8px;border-radius:12px;"><?php echo esc_html($c->punti); ?></span></p>
                <p><strong>Ultimo Gioco:</strong> <?php echo esc_html(date_i18n('d F Y H:i', strtotime($c->ultimo_gioco))); ?></p>
                <p><strong>Giocate nel periodo corrente:</strong> <?php echo esc_html($c->play_count); ?></p>
                
                <h2 style="margin-top:30px;font-size:1.5rem;border-bottom:1px solid #eee;padding-bottom:10px;">🏆 Storico Premi Vinti</h2>
                <?php if ( empty($premi_vinti) ) : ?>
                    <p>Nessun premio vinto finora.</p>
                <?php else : ?>
                    <table class="wp-list-table widefat fixed striped" style="margin-top:10px;">
                        <thead>
                            <tr>
                                <th>Data Vincita</th>
                                <th>Premio</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach($premi_vinti as $p) : ?>
                            <tr>
                                <td><?php echo esc_html(date_i18n('d F Y H:i', strtotime($p['data']))); ?></td>
                                <td><strong><?php echo esc_html($p['premio']); ?></strong></td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
            </div>
        </div>
        <?php
        return;
    }

    // Lista generale clienti
    $customers = $wpdb->get_results("SELECT * FROM $table_name ORDER BY punti DESC");

    ?>
    <div class="wrap">
        <h1>👥 Lista Clienti</h1>
        <table class="wp-list-table widefat fixed striped" style="margin-top: 20px;">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Punti</th>
                    <th>Ultimo Gioco</th>
                    <th>Azioni</th>
                </tr>
            </thead>
            <tbody>
                <?php if($customers): foreach($customers as $c): ?>
                    <tr>
                        <td><?php echo esc_html($c->id); ?></td>
                        <td><strong><?php echo esc_html($c->nome); ?></strong></td>
                        <td><?php echo esc_html($c->email); ?></td>
                        <td><span style="background:#FFD700;color:#000;font-weight:bold;padding:2px 6px;border-radius:10px;"><?php echo esc_html($c->punti); ?></span></td>
                        <td><?php echo esc_html(date_i18n('d/m/Y H:i', strtotime($c->ultimo_gioco))); ?></td>
                        <td>
                            <a href="?page=loyalty-games-customers&action=view&id=<?php echo esc_attr($c->id); ?>" class="button button-small">Visualizza</a>
                        </td>
                    </tr>
                <?php endforeach; else: ?>
                    <tr><td colspan="6">Nessun cliente registrato oppure plugin non ancora attivato.</td></tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
    <?php
}

/**
 * Enqueue scripts and styles per il frontend
 */
add_action( 'wp_enqueue_scripts', 'ristorante_loyalty_enqueue_scripts' );
function ristorante_loyalty_enqueue_scripts() {
    wp_enqueue_style( 'ristorante-loyalty-style', plugin_dir_url( __FILE__ ) . 'public/css/style.css', array(), '1.0.0' );
    wp_enqueue_script( 'canvas-confetti', 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js', array(), null, true );
    wp_enqueue_script( 'ristorante-loyalty-gamesp', plugin_dir_url( __FILE__ ) . 'public/js/games-handler.js', array(), '1.0.0', true );
    wp_enqueue_script( 'ristorante-loyalty-script', plugin_dir_url( __FILE__ ) . 'public/js/script.js', array('jquery', 'ristorante-loyalty-gamesp'), '1.0.0', true );

    wp_localize_script( 'ristorante-loyalty-script', 'RistoLoyalty', array(
        'ajaxurl' => admin_url( 'admin-ajax.php' ),
        'nonce'   => wp_create_nonce( 'ristoloyalty_nonce' )
    ) );
}
