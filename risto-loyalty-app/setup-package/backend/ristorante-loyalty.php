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
        punti_totali mediumint(9) DEFAULT 0 NOT NULL,
        ultimo_gioco datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
        is_verified tinyint(1) DEFAULT 0 NOT NULL,
        verification_code varchar(20) NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY email (email)
    ) $charset_collate;";

    // Tabella riscatti premi
    $redemptions_table = $wpdb->prefix . 'loyalty_redemptions';
    $sql2 = "CREATE TABLE $redemptions_table (
        id mediumint(9) NOT NULL AUTO_INCREMENT,
        codice_univoco varchar(20) NOT NULL,
        email varchar(100) NOT NULL,
        premio varchar(255) NOT NULL,
        stato varchar(20) DEFAULT 'pending' NOT NULL,
        data_vincita datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
        data_riscatto datetime NULL,
        PRIMARY KEY  (id),
        UNIQUE KEY codice_univoco (codice_univoco)
    ) $charset_collate;";

    require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );
    dbDelta( $sql );
    dbDelta( $sql2 );
}

/**
 * Aggiornamento DB: aggiunge le colonne play_count e period_start se non esistono
 */
add_action( 'admin_init', 'ristorante_loyalty_upgrade_db' );
function ristorante_loyalty_upgrade_db() {
    global $wpdb;
    $current_version = get_option('loyalty_db_version', '1.0');

    // Upgrade a 2.1: aggiunge colonne play_count, period_start, premi_vinti
    if ( version_compare($current_version, '2.1', '<') ) {
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
        $current_version = '2.1';
    }

    // Upgrade a 2.2: crea tabella loyalty_redemptions
    if ( version_compare($current_version, '2.2', '<') ) {
        $redemptions_table = $wpdb->prefix . 'loyalty_redemptions';
        $charset_collate   = $wpdb->get_charset_collate();
        $sql = "CREATE TABLE $redemptions_table (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            codice_univoco varchar(20) NOT NULL,
            email varchar(100) NOT NULL,
            premio varchar(255) NOT NULL,
            stato varchar(20) DEFAULT 'pending' NOT NULL,
            data_vincita datetime DEFAULT CURRENT_TIMESTAMP NOT NULL,
            data_riscatto datetime NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY codice_univoco (codice_univoco)
        ) $charset_collate;";
        require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );
        dbDelta( $sql );
        update_option('loyalty_db_version', '2.2');
        $current_version = '2.2';
    }

    // Upgrade a 2.3: aggiunge colonna punti_totali per storico classifica
    if ( version_compare($current_version, '2.3', '<') ) {
        $table = $wpdb->prefix . 'loyalty_customers';
        $cols  = $wpdb->get_col("SHOW COLUMNS FROM $table");
        if ( ! in_array('punti_totali', $cols) ) {
            $wpdb->query("ALTER TABLE $table ADD COLUMN punti_totali MEDIUMINT(9) DEFAULT 0 NOT NULL AFTER punti");
            // Inizializza punti_totali uguale a punti per i clienti esistenti
            $wpdb->query("UPDATE $table SET punti_totali = punti WHERE punti_totali = 0");
        }
        update_option('loyalty_db_version', '2.3');
        $current_version = '2.3';
    }

    // Upgrade a 2.4: aggiunge colonna is_verified e verification_code
    if ( version_compare($current_version, '2.4', '<') ) {
        $table = $wpdb->prefix . 'loyalty_customers';
        $cols  = $wpdb->get_col("SHOW COLUMNS FROM $table");
        if ( ! in_array('is_verified', $cols) ) {
            $wpdb->query("ALTER TABLE $table ADD COLUMN is_verified TINYINT(1) DEFAULT 0 NOT NULL");
            // I vecchi utenti sono considerati già verificati
            $wpdb->query("UPDATE $table SET is_verified = 1");
        }
        if ( ! in_array('verification_code', $cols) ) {
            $wpdb->query("ALTER TABLE $table ADD COLUMN verification_code VARCHAR(20) NULL");
        }
        update_option('loyalty_db_version', '2.4');
    }
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
    // Quarto sottomenu: PIN Cameriere & Riscatti
    add_submenu_page(
        'loyalty-games-main', 'PIN Cameriere & Riscatti', '🔑 Riscatti',
        'manage_options', 'loyalty-games-redemptions', 'ristorante_loyalty_redemptions_page'
    );
    // Quinto sottomenu: Classifica
    add_submenu_page(
        'loyalty-games-main', 'Classifica', '🏆 Classifica',
        'manage_options', 'loyalty-games-leaderboard', 'ristorante_loyalty_leaderboard_admin_page'
    );
}

// Carica la Media Library di WP solo nella pagina grafica
add_action( 'admin_enqueue_scripts', 'ristorante_loyalty_admin_scripts' );
function ristorante_loyalty_admin_scripts( $hook ) {
    if ( isset($_GET['page']) && $_GET['page'] === 'loyalty-games-design' ) {
        wp_enqueue_media();
    }
}
