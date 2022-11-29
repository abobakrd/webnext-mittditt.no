<?php

// REST-API Backend for frontend design card editor
// This file is executed on the action hook "template_include"

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// Constants for subkeys of meta value 'UMKEYN_USER_DESIGNCARDS' for easy access
if (!defined('UMKEYN_USER_DESIGNCARDS')) {
    define('UMKEYN_USER_DESIGNCARDS', '_mds_user_designcards');
}

class Editor
{
    public static $instance = null;

    private function __construct()
    {

        $this->init_user_setup();
        $this->db_fs_table_dirs_init_content_img();
        $this->init_ajax_actions();
        $this->enqueue_scripts_and_localize_data();
    }

    public static function init_singleton()
    {
        if (self::$instance == null) {
            self::$instance = new Editor();
        }

    }

    private $js_cs_globals;

    // ajax action names
    private $ajax_action_tag_save_designcard = 'mds_save_designcard';
    private $ajax_action_tag_delete_designcard = 'mds_delete_designcard';
    private $ajax_action_tag_content_img_fileupload = 'mds_content_img_fileupload';
    private $ajax_action_tag_register_receiver_and_to_checkout = 'mds_register_receiver_and_to_checkout';
    private $ajax_action_tag_custom_register_new_user = 'mds_custom_register_new_user';
    private $ajax_action_tag_update_autosave_pref = 'mds_update_autosave_pref';

    const DEBUG = false;

    private $user_designcards = array(); // cache for all user's designcards

    private function init_user_setup()
    {
        if (is_user_logged_in()) {
            $this->user_is_logged_in = true;
            $this->user_id = get_current_user_id();
            $this->user_designcards = $this->db_get_user_meta_designcards();
            $this->user_has_designcards = (empty($this->user_designcards)) ? false : true;
        }
    }

    private function load_motives_frontend()
    {
        global $wpdb;

        $table_name = $wpdb->prefix . 'mds_motives';

        $results = $wpdb->get_results("SELECT * FROM $table_name");
        return $results;
    }

    private function db_fs_table_dirs_init_content_img()
    {
        global $wpdb;

        $table_name = $wpdb->prefix . 'mds_content_images';

        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
                id mediumint(9) NOT NULL AUTO_INCREMENT,
                user_id BIGINT(20) NOT NULL,
                dc_uid varchar(32) NOT NULL,
                img_url varchar(2083) NOT NULL,
                PRIMARY KEY  (id)
            ) $charset_collate;";

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        maybe_create_table($table_name, $sql);

        $upload_dir = wp_get_upload_dir()['basedir'];

        if (!defined('MDS_PATH_CONTENT_IMG')) {
            define('MDS_PATH_CONTENT_IMG', $upload_dir . '/user_content_images');
        }

        if (wp_mkdir_p(MDS_PATH_CONTENT_IMG)) {
            ////// DEBUG //////
            if (self::DEBUG) {
                echo 'mds_debug_log: stacktrace: db_fs_table_dirs_init_content_img (method): successfulyl made dirs';
            }
            ////// DEBUG //////
        }
    }

    // enqueues js client side script and localizes global js data for ajax calls
    private function enqueue_scripts_and_localize_data()
    {
        $this->js_cs_globals = array(
            'ajax' => array(
                'actions' => array(
                    'save_designcard' => $this->ajax_action_tag_save_designcard,
                    'register_receiver_to_checkout' => $this->ajax_action_tag_register_receiver_and_to_checkout,
                    'delete_designcard' => $this->ajax_action_tag_delete_designcard,
                    'content_img_fileupload' => $this->ajax_action_tag_content_img_fileupload,
                    'register_user' => $this->ajax_action_tag_custom_register_new_user,
                    'update_autosave' => $this->ajax_action_tag_update_autosave_pref,
                ),
                'ajax_url' => admin_url('admin-ajax.php') . '?mds_e_ajax=t',
                'nonce' => wp_create_nonce('mds_eanproduct'),
                'mds_ftype_order' => wp_nonce_field('mds_fload_asc2__', 'mds_ftype_order', true, false),
            ),
        );

        $this->js_cs_globals['uploaded_motives'] = $this->load_motives_frontend();

        $this->js_cs_globals['checkout_url'] = wc_get_checkout_url();

        $this->js_cs_globals['user_designcards'] = $this->user_designcards;

        $this->js_cs_globals['user_is_logged_in'] = (is_user_logged_in()) ? 1 : 0;

        $this->js_cs_globals['autosave_pref'] = (is_user_logged_in()) ? $this->get_autosave_pref() : 'not_available';

        add_action('wp_enqueue_scripts', function () {
            wp_enqueue_script('jspdf', get_stylesheet_directory_uri() . '/external/jspdf.js', array(), false);
            wp_enqueue_script('signature_pad', get_stylesheet_directory_uri() . '/external/signature_pad.js', array(), false);
            wp_enqueue_style('mds-editor-style', get_stylesheet_directory_uri() . '/css/mds-editor-style.css', array(), time());
            wp_enqueue_script('html2canvas', get_stylesheet_directory_uri() . '/external/html2canvas.js', array(), false);
            wp_enqueue_script('mds_editor_ajax', get_stylesheet_directory_uri() . '/js/clientside-editor.js', array(), time(), true);
            wp_localize_script(
                'mds_editor_ajax',
                'mds_cs_globals',
                $this->js_cs_globals);
        });
    }

    private function init_ajax_actions()
    {
        add_action('wp_ajax_' . $this->ajax_action_tag_save_designcard,
            array($this, 'ajax_action_save_designcard'));

        add_action('wp_ajax_' . $this->ajax_action_tag_delete_designcard,
            array($this, 'ajax_action_delete_designcard'));

        add_action('wp_ajax_' . $this->ajax_action_tag_content_img_fileupload,
            array($this, 'ajax_action_content_img_fileupload'));

        add_action('wp_ajax_' . $this->ajax_action_tag_register_receiver_and_to_checkout,
            array($this, 'ajax_action_register_receiver_and_to_checkout'));

        add_action('wp_ajax_nopriv_' . $this->ajax_action_tag_register_receiver_and_to_checkout,
            array($this, 'ajax_action_register_receiver_and_to_checkout'));

        add_action('wp_ajax_' . $this->ajax_action_tag_custom_register_new_user,
            array($this, 'ajax_action_custom_register_new_user'));

        add_action('wp_ajax_' . $this->ajax_action_tag_update_autosave_pref,
            array($this, 'ajax_action_update_autosave'));

        add_action('wp_ajax_nopriv_' . $this->ajax_action_tag_custom_register_new_user,
            array($this, 'ajax_action_custom_register_new_user'));
    }

    // generic ajax security check used by individual ajax actions before proceeding further
    private function ajax_security_check()
    {
        if (!check_ajax_referer('mds_eanproduct')) {
            $this->ajax_res('ajax_security_check_failed', 'Ajax sikkerhet: sikkerhetssjekk feilet.', 400);
        }
    }

    private function motive_or_con_img_exists($type, $url)
    {

        if (!strlen($url)) {
            return true;
        }
        // user can have no images as well

        // default image?
        if ($type === 'img' && $url === 'https://www.mittditt.no/wp-content/uploads/user_content_images/1603458121.jpg') {
            return true;
        }

        $url = str_replace('\\', '\\', $url);

        if ($type === 'motive') {
            $type = 'mds_motives';
            $colum = 'a5_url';
        } else {
            $type = 'mds_content_images';
            $colum = 'img_url';
        }

        global $wpdb;
        $table = $wpdb->prefix . $type;
        $motive = $wpdb->get_var(
            $wpdb->prepare(
                "
                    SELECT $colum
                    FROM $table
                    WHERE $colum = %s
                ",
                $url
            )
        );
        if ($motive === false) {
            return false;
        } else {
            return true;
        }
    }

    private function is_valid_savedate($date)
    {
        if ($date === 'ikke lagret') {
            return true;
        }

        return (bool) preg_match('/(\d{1,2})\.(\d{1,2})\.(\d\d), \d\d:\d\d/', $date);
    }

    /*
     * validates and escapes new designcard data arrived from ajax
     * param $validate_eternal_save will validate the card for an eternal save, meaning it will validate b64 images rather then image links
     */
    private function validate_and_escape_designcard_ajax_post_data()
    {
        $dc = json_decode(preg_replace('/\\\(?!n)/', '', $_POST['dc']), true);

        // sanitize
        $dc['uid'] = sanitize_text_field($dc['uid']);
        $dc['status'] = sanitize_text_field($dc['status']);
        $dc['send_type'] = sanitize_text_field($dc['send_type']);
        $dc['pages'] = intval(sanitize_text_field($dc['pages']));
        $dc['created'] = sanitize_text_field($dc['created']);
        $dc['saved'] = sanitize_text_field($dc['saved']);
        $dc['motive_budstikke_url'] = esc_url($dc['motive_budstikke_url']);
        $dc['motive_sendtype_url'] = esc_url($dc['motive_sendtype_url']);

        $valid_uid = false;

        if ($dc['uid'] !== 'new') {
            if (strlen($dc['uid']) !== 32) {
                $this->ajax_res('dc_validation_failed', 'Validering av kort: validering feilet', 400);
            } else {
                $valid_uid = true;
            }
        } else {
            $valid_uid = true;
        }

        if (!$valid_uid) {
            $this->ajax_res('dc_validation_failed', 'Validering av kort: validering feilet', 400);
        }

        // validate
        if (!( // tested and works
            $this->motive_or_con_img_exists('motive', $dc['motive_budstikke_url']) &&
            $this->motive_or_con_img_exists('motive', $dc['motive_sendtype_url']) &&
            in_array($dc['status'], array('saved', 'bought')) &&
            in_array($dc['send_type'], array('hylse', 'envelope')) &&
            in_array($dc['pages'], array(1, 2, 3, 4, 5, 6)) &&
            $this->is_valid_savedate($dc['saved']) &&
            $this->is_valid_savedate($dc['created'])
        )) {
            $this->ajax_res('dc_validation_failed', 'Validering av kort: validering feilet', 400, array('dc' => $dc));
        }

        for ($i = 1; $i < $dc['pages'] + 1; $i++) {
            $page = $dc['page_' . $i];
            $p_i = 'page_' . $i;
            $style = $page['greeting']['style'];

            // sanitize
            $dc[$p_i]['greeting']['content'] = sanitize_textarea_field($page['greeting']['content']);
            $dc[$p_i]['greeting']['content'] = preg_replace('/\n/', '_lb_', $page['greeting']['content']);

            $dc[$p_i]['offset_y_content_img'] = sanitize_text_field($page['offset_y_content_img']);
            $dc[$p_i]['greeting_height'] = sanitize_text_field($page['greeting_height']);

            $dc[$p_i]['content_img_url'] = esc_url($page['content_img_url']);

            $dc[$p_i]['greeting']['style']['fontsize'] = sanitize_text_field($style['fontsize']);
            $dc[$p_i]['greeting']['style']['fontfamily'] = sanitize_text_field($style['fontfamily']);
            $dc[$p_i]['greeting']['style']['fontweight'] = sanitize_text_field($style['fontweight']);
            $dc[$p_i]['greeting']['style']['fontcolor'] = sanitize_text_field($style['fontcolor']);
            $dc[$p_i]['greeting']['style']['fontstyle'] = sanitize_text_field($style['fontstyle']);
            $dc[$p_i]['greeting']['style']['width'] = sanitize_text_field($style['width']);

            // validate
            if (!(
                $this->motive_or_con_img_exists('img', $page['content_img_url']) &&
                strlen($page['greeting']['content']) < 100000 &&
                strlen($page['offset_y_content_img']) < 4 &&
                strlen($page['greeting_height']) <= 5 &&
                in_array($style['width'], array('large-width', 'small-width')) &&
                in_array($style['width'], array('large-width', 'small-width')) &&
                in_array($style['fontstyle'], array('italic', '')) &&
                in_array($style['fontweight'], array('', 'bold', 'normal')) &&
                in_array($style['fontsize'], array('12px', '13px', '14px', '15px', '16px', '17px', '18px', '19px', '20px', '21px', '22px', '23px', '24px')) &&
                strlen($style['fontcolor']) === 7// hex length of color code
            )) {
                $this->ajax_res('dc_page_validation_failed', 'Validering av kort: side validering feilet, side: ' . $i, 400,
                    array(strlen($page['greeting_height'])));
            }

            if ($i === $dc['pages']) {
                //sanitize
                $dc[$p_i]['offset_y_canvas_sig'] = sanitize_text_field($page['offset_y_canvas_sig']);

                // validate
                if (!(
                    is_array($page['canvas_signature']) &&
                    $this->validate_canvas_signature($dc[$p_i]['canvas_signature']) &&
                    count($page['canvas_signature']) < 15000 &&
                    strlen($page['offset_y_canvas_sig']) < 4
                )) {
                    $this->ajax_res('dc_canv_sig_validation_failed', 'Validering av kort: signatur validering feilet', 400);
                }
            }
        }

        ////// DEBUG //////
        if (self::DEBUG) {
            error_log('mds_debug_log: stacktrace: validate_and_escape_designcard_ajax_post_data (method): value of $data:');
        }
        ////// DEBUG //////

        return $dc;
    }

    private function validate_canvas_signature($sig)
    {
        $sig = json_encode($sig);
        if (preg_match('/\<|\>|\*/', $sig) === 1) {
            return false;
        } else {
            return true;
        }
    }

    private function db_update_user_meta_designcards($dcs)
    {
        return update_user_meta(get_current_user_id(), UMKEYN_USER_DESIGNCARDS, json_encode($dcs, JSON_UNESCAPED_UNICODE));
    }

    private function db_get_user_meta_designcards()
    {
        $dcs = get_user_meta(get_current_user_id(), UMKEYN_USER_DESIGNCARDS);
        if (count($dcs) > 0) {
            return json_decode($dcs[0], true);
        } else {
            return $dcs;
        }
    }

    private function get_dc($dc_uid = '', $dcs = array())
    {
        if (count($dcs) > 0) {
            foreach ($dcs as $dc) {
                if ($dc['uid'] === $dc_uid) {
                    return $dc;
                }
            }
        }

        return false;
    }

    public function ajax_action_custom_register_new_user()
    {
        $this->ajax_security_check();

        $secret_key = '6Ldn3dMZAAAAAKpMaAf3PXUvSeh581Ezr43fllgn';
        $response_key = $_POST['g-recaptcha-response'];
        $user_ip = $_SERVER['REMOTE_ADDR'];

        $google_captcha_url = 'https://www.google.com/recaptcha/api/siteverify?&secret=' . $secret_key . '&response=' . $response_key . '&remoteip=' . $user_ip;

        $response = json_decode(file_get_contents($google_captcha_url));
        if (!$response->success) {
            $this->ajax_res('google_captcha_user_registration_validation_failed', 'Google captcha brukerregistrering: validering feilet', 400);
        }

        $user_login = sanitize_text_field($_POST['username']);
        $user_email = sanitize_email($_POST['email']);
        $user = register_new_user($user_login, $user_email);
        if (!is_wp_error($user)) {
            $this->ajax_res('custom_user_registration', 'Custom brukerregistrering: Velykket trinn 1 registrering. id: ' . $user . ' displayname: ' . get_user_by('id', $user)->display_name);
        } else {
            $this->ajax_res('custom_user_registration_error', 'Custom brukerregistrering: Noe gikk galt, prøv på nytt senere.', 400);
        }
    }

    public function ajax_action_register_receiver_and_to_checkout()
    {
        $this->ajax_security_check();

        // dc and receiverinfo gets saved in order meta if order goes through - this means images are b64 encoded for eternal storage

        $dc = $this->validate_and_escape_designcard_ajax_post_data();
        if ($dc === 'bad') {
            $this->ajax_res('register_receiver_and_to_checkout_dc_validation_failed', 'Lagring av mottaker: kortvalidering feilet', 400);
        }

        $_POST['receiverinfo'] = json_decode(stripslashes($_POST['receiverinfo']), true);

        // sanitize
        $_POST['receiverinfo']['to_name'] = sanitize_text_field($_POST['receiverinfo']['to_name']);
        $_POST['receiverinfo']['to_street'] = sanitize_text_field($_POST['receiverinfo']['to_street']);
        $_POST['receiverinfo']['to_place'] = sanitize_text_field($_POST['receiverinfo']['to_place']);
        $_POST['receiverinfo']['to_postal'] = sanitize_text_field($_POST['receiverinfo']['to_postal']);
        $_POST['receiverinfo']['from_name'] = sanitize_text_field($_POST['receiverinfo']['from_name']);
        $_POST['receiverinfo']['birthday_date'] = sanitize_text_field($_POST['receiverinfo']['birthday_date']);

        // validate
        if (!(
            strlen($_POST['receiverinfo']['to_name']) < 100 &&
            strlen($_POST['receiverinfo']['to_place']) < 100 &&
            strlen($_POST['receiverinfo']['to_place']) < 100 &&
            strlen($_POST['receiverinfo']['to_postal']) === 4 &&
            strlen($_POST['receiverinfo']['from_name']) < 100 &&
            strlen($_POST['receiverinfo']['birthday_date']) === 10
        )) {
            $this->ajax_res('register_receiver_validation_failed', 'Lagring av mottaker: Validering av mottaker feilet.', 400);
        }

        // only registered users can be reminded
        // get a reminder date 275 days (365 days (1 year) - 30 days) after birthday date
        if (is_user_logged_in()) {
            $has_email_reminder = get_user_meta(get_current_user_id(), '_mds_email_reminder');
            if (!empty($has_email_reminder)) {
                if (intval($has_email_reminder[0] === 1)) {
                    $has_email_reminder = true;
                } else {
                    $has_email_reminder = false;
                }
            }
            if ($has_email_reminder || $_POST['receiverinfo']['email_reminder'] === 'true') {
                $birthday_date = $_POST['receiverinfo']['birthday_date'];
                $reminder_date = date('Y-m-d', strtotime('+335 day', strtotime(date(date('Y') . '-m-d', strtotime($birthday_date)))));
                if ($reminder_date === false) {
                    $this->ajax_res('reminder_date_calculation_failed', 'Lagring av mottaker: kalkulering av påminnelsesdato feilet', 400);
                } else {
                    WC()->session->set('mds_dc_order_email_reminder', array('sent' => 0, 'date' => $reminder_date));
                }
            }
        }

        // add products to cart
        WC()->cart->empty_cart();
        if ($dc['send_type'] === 'hylse') {
            WC()->cart->add_to_cart(564);
        } else if ($dc['send_type'] === 'envelope') {
            WC()->cart->add_to_cart(258);
        }
        if ($dc['pages'] > 1) {
            WC()->cart->add_to_cart(256, $dc['pages'] - 1); // ekstraside produkt = 10kr
        }

        // important: we need to bind the dc uid to the receiverinfo and both to the order which later is generated through successfull checkout
        if (isset($_POST['is_mobile']) && $_POST['is_mobile'] === 'true') {
            WC()->session->set('mds_dc_order_is_mobile', 'true');
        } else {
            WC()->session->set('mds_dc_order_is_mobile', '');
        }
        WC()->session->set('mds_dc_order', json_encode($dc, JSON_UNESCAPED_UNICODE));
        WC()->session->set('mds_dc_order_receiver', $_POST['receiverinfo']);

        // everything went well, redirect user to checkout
        $this->ajax_res('register_receiver_ok', 'Lagring av mottaker: mottaker registrert, viderefører bruker til kassen.');
    }

    private function ajax_res($msg, $verbose_msg, $status = null, $additional_data = array())
    {
        $res = array('msg' => $msg, 'verbose_msg' => $verbose_msg);
        if (!empty($additional_data)) {
            $res['xtra'] = $additional_data;
        }

        echo json_encode($res, JSON_UNESCAPED_UNICODE);
        (!empty($status)) ? wp_die('', $status) : wp_die(); // 200 default
    }

    /*
     *
     * AJAX Action: save designcard changes
     *
     */
    public function ajax_action_save_designcard()
    {
        $this->ajax_security_check();

        $dc_to_save = $this->validate_and_escape_designcard_ajax_post_data();

        if ($dc_to_save === 'bad') {
            $this->ajax_res('dc_save_validation_failed', 'Lagring av kort: validering av kort feilet', 400);
        }

        $is_new = false;

        $dcs = $this->db_get_user_meta_designcards();

        if ($dc_to_save['uid'] !== 'new') {

            // if the dc isnt a new one, then it must exists in the database before we make changes to it
            $stored_dc = $this->get_dc($dc_to_save['uid'], $dcs);

            if (!empty($stored_dc)) {
                // the dc exists and it does have new changes, so we find it in the database and replace it with the new changes
                for ($i = 0; $i < count($dcs); $i++) {
                    if ($dcs[$i]['uid'] === $dc_to_save['uid']) {
                        $dcs[$i] = $dc_to_save;
                    }
                }
            }

        } else {

            // check if max limit of stored dcs is reached
            if (count($dcs) >= 30) {
                $this->ajax_res('save_dc_storage_limit_reached', ' Lagring av kort: bruker har overskredet maks grensen av 30 lagrede budstikker.', 400);
            }

            // its a new dc with the default "new" uid, so we generate a md5 hash ID and save it
            $is_new = true;

            $dc_to_save['uid'] = md5(uniqid(time() . get_user_by('id', get_current_user_id())->user_nicename));
            array_push($dcs, $dc_to_save);
        }

        $update_user_meta_res = $this->db_update_user_meta_designcards($dcs);

        ////// DEBUG //////
        if (self::DEBUG) {
            echo 'mds_debug_log: stacktrace: db_update_designcard (method): value of $update_user_meta_res: ';
            var_dump($update_user_meta_res);
        }
        ////// DEBUG //////

        if (is_int($update_user_meta_res)) {
            if ($is_new) {
                $this->ajax_res('dc_new_row_new_saved', 'Opprettet ny rad og lagret nytt kort med uid ' . $dc_to_save['uid'], 200, array('new_uid' => $dc_to_save['uid']));
            } else {
                $this->ajax_res('dc_new_row_saved', 'Opprettet ny rad og oppdaterte kort' . $dc_to_save['uid']);
            }
        } else if ($update_user_meta_res) {
            if ($is_new) {
                $this->ajax_res('dc_saved_new', 'Lagret nytt kort med uid ' . $dc_to_save['uid'], 200, array('new_uid' => $dc_to_save['uid']));
            } else {
                $this->ajax_res('dc_saved', 'Oppdaterte kort med uid ' . $dc_to_save['uid']); // most used response
            }
        } else {

            $this->ajax_res('dc_no_changes_or_error', 'Kortet har enten ingen nye endringer eller så kunne ikke databasen oppdateres.');
        }
    }

    /*
     *
     * AJAX Action: save designcard changes
     *
     */
    public function ajax_action_content_img_fileupload()
    {
        $this->ajax_security_check();

        $dc_uid = sanitize_text_field($_POST['dc_uid']);
        $dcs = $this->db_get_user_meta_designcards();
        if (empty($this->get_dc($dc_uid, $dcs))) {
            $this->ajax_res('con_img_upload_no_dc_belonging', 'Lagring av innholdsbilde: fant ingen tilhørende kort til bilde, så lagrer ikke.', 400);
        }

        // Check that the nonce is valid, and the user can edit this post.
        if (!isset($_POST['mds_ftype_order__']) && !wp_verify_nonce($_POST['mds_ftype_order__'], 'mds_fload_asc2__')) {
            $this->ajax_res('con_img_upload_validation_failed', 'Sikkerhetssjekk for filopplastning feilet', 400);
        }

        if (!isset($_POST['dc_uid'], $_FILES['file'])) {
            $this->ajax_res('con_img_upload_missing_post_fields', 'Lagring av innholdsbilde: et eller flere postfelt mangler', 400);
        }

        $tmp_name = sanitize_text_field($_FILES['file']['tmp_name']);
        $size = sanitize_text_field($_FILES['file']['size']);
        $mime = mime_content_type($tmp_name);

        if (intval($size) > 3145768) {
            $this->ajax_res('con_img_upload_file_too_big', 'Lagring av innholdsbilde: Filen er større enn maks tillat størrelse 3MB og klientside validering feilet.', 400);
        }

        $valid_mime_types = array(
            'image/jpeg',
            'image/png',
        );

        if (!in_array($mime, $valid_mime_types, true)) {
            $this->ajax_res('con_img_upload_file_too_big', 'Lagring av innholdsbilde: Filen har ugyldig filformat (' . $mime . '), kun jpeg og png er tillat. Klientside validering feilet.', 400);
        }

        $upload_dir = wp_get_upload_dir()['basedir'] . '/user_content_images/';
        $upload_url = home_url('/wp-content/uploads/user_content_images/');

        $img_path = $upload_dir . time();
        $img_url = $upload_url . time() . '.jpg'; // because wp image editor converts it to jpg anyway

        // resize image to thumb and a5
        $image = wp_get_image_editor($tmp_name);
        if (!is_wp_error($image)) {
            $image->resize(170, 170, true);
            $image->save($img_path);
        } else {
            $this->ajax_res('con_img_upload_resize_failed', 'Lagring av innholdsbilde: skalering av bilde feilet. ', 400);
        }

        /* upload to db */
        global $wpdb;
        $table_name = $wpdb->prefix . 'mds_content_images';
        $sql_res = $wpdb->insert(
            $table_name,
            array(
                'user_id' => get_current_user_id(),
                'dc_uid' => $dc_uid,
                'img_url' => $img_url,
            ),
            array(
                '%d',
                '%s',
                '%s',
            )
        );

        $xtra_res_data = array(
            'img_url' => $img_url,
        );

        if ($dc_uid) {
            $this->ajax_res('con_img_upload_ok', 'Lagring av innholdsbilde: bilde ble lastet opp', 200, array('img_url' => $img_url));
        }

    }

/**
 * AJAX Action: deletes designcard with specified id if it exists
 */
    public function ajax_action_delete_designcard()
    {
        $this->ajax_security_check();

        $dc_uid = sanitize_text_field($_POST['dc_uid']);

        $dcs = $this->db_get_user_meta_designcards();

        if (empty($this->get_dc($dc_uid, $dcs))) {
            $this->ajax_res('delete_dc_dc_doesnt_exists', 'Sletting av kort: kortet eksisterer ikke', 400);
        }

        $locally_deleted = false;

        for ($i = 0; $i < count($dcs); $i++) {
            if ($dcs[$i]['uid'] === $dc_uid) {
                unset($dcs[$i]);
                $dcs = array_values($dcs);
                $this->db_update_user_meta_designcards($dcs);
                break;
            }
        }

        $this->ajax_res('delete_dc_ok', 'Sletting av kort: slettet kort');

        ////// DEBUG //////
        if (self::DEBUG) {
            echo 'mds_debug_log: stacktrace: db_delete_designcard (method): value of $update_user_meta_res: ';
            var_dump('liksom debug');
        }
        ////// DEBUG //////
    }

    public function ajax_action_update_autosave()
    {
        $this->ajax_security_check();

        if (isset($_POST['update_autosave'])) {
            $v = intval(sanitize_text_field($_POST['update_autosave']));
            if (!in_array($v, array(0, 1))) {
                $this->ajax_res('update_autosave_failed_invalid_value', 'Oppdatering av autolagring: verdien er ugyldig ' . $v, 400);
            } else {
                update_user_meta(get_current_user_id(), '_mds_autosave_mdc', $v);
                $this->ajax_res('updated_autosave_to_' . $v, 'Oppdatering av autosave: oppdaterte autosave preferanse til ' . $v);
            }
        }
    }
}

Editor::init_singleton();
