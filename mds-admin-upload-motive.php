<?php

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

function upload_status_msg($type, $msg)
{
    if ($type === 'err') {
        echo '<p class="mds_motive-upload-status err">' . $msg . '</p>';
    } else if ($type === 'succ') {
        echo '<p class="mds_motive-upload-status succ">' . $msg . '</p>';
    }
}

/** Step 2 (from text above). */
add_action('admin_menu', 'mds_media_motives');

/** Step 1. */
function mds_media_motives()
{
    add_media_page('Motiver', 'Motiver', 'edit_posts', 'motiver', 'media_motives_page');
}

/**
 * Creates custom database table to store urls and relative motive types if it doesnt already exists
 *
 * This table is used by the frontend designcard editor to lookup motives
 */
function init_db_motive_table()
{
    global $wpdb;

    $table_name = $wpdb->prefix . 'mds_motives';

    $charset_collate = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE $table_name (
		id mediumint(9) NOT NULL AUTO_INCREMENT,
		motive_type tinytext NOT NULL,
		thumb_url varchar(2083) DEFAULT '' NOT NULL,
		thumb_dir varchar(2083) DEFAULT '' NOT NULL,
        a5_url varchar(2083) DEFAULT '',
        a5_dir varchar(2083) DEFAULT '',
        time_uploaded TIMESTAMP NOT NULL
		PRIMARY KEY  (id)
	) $charset_collate;";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    maybe_create_table($table_name, $sql);
}

/**
 * Creates directories specific to motive types in Wordpress's upload directory if they dont already exists
 *
 * Motive directories:
 * motive_budstikke
 * motive_hylse
 * motive_envelope
 *
 * The reason why we are not using the standard media upload procedure is because motive images
 * use specific size dimmensions and meta data like motive type which is used to connect the motive
 * to a certain motive type
 *
 */
function init_motive_dirs()
{

    $upload_dir = wp_get_upload_dir()['basedir'];

    if (!defined('MDS_MOTIVE_PATH_BUDSTIKKE')) {
        define('MDS_PATH_MOTIVE_BUDSTIKKE', $upload_dir . '/motive_budstikke');
    }

    if (!defined('MDS_MOTIVE_PATH_HYLSE')) {
        define('MDS_PATH_MOTIVE_HYLSE', $upload_dir . '/motive_hylse');
    }

    if (!defined('MDS_MOTIVE_PATH_ENVELOPE')) {
        define('MDS_PATH_MOTIVE_ENVELOPE', $upload_dir . '/motive_envelope');
    }

    $mds_motive_paths = array(
        MDS_PATH_MOTIVE_HYLSE,
        MDS_PATH_MOTIVE_ENVELOPE,
        MDS_PATH_MOTIVE_BUDSTIKKE,
    );

    foreach ($mds_motive_paths as $path) {
        if (!is_dir($path)) {
            if (wp_mkdir_p($path)) {
                upload_status_msg('succ', 'Lagd tabeller i databasen for motiver.');
            } else {
                upload_status_msg('err', 'Kunne ikke lage tabeller for motiver i databasen.');
            }
        }
    }
}

/**
 * envelope sizes
 * 529 x 374
 *
 * 300 x 59
 *
 */

function show_existing_motives()
{
    global $wpdb;
    $table = $wpdb->prefix . 'mds_motives';
    
    $budstikkes_count = 0;
    $hylses_count = 0;
    $envelopes_count = 0;

    $budstikkes = $wpdb->get_results("SELECT * FROM $table WHERE motive_type = 'budstikke'");
    echo '<form id="mds_del-motive-form" action="" method="POST">
            <div id="mds_status-bar-motives" class="mds_admin-box">
            <input type="submit" name="mds_del_motive_form" value="Slett bilder" style="display:none;"><p>Velg bilder for å slette</p>
            <div style="display:none;">Velg alle</div>
            </div>';
    if ($budstikkes) {
        $budstikkes_count = count($budstikkes);
    }

    echo '<div class="mds_motive-container">
            <h2>Opplastede ark motiver (' . $budstikkes_count . ')</h2>
                <div class="mds_img-container">';
    if (!$budstikkes) {
        echo '<p>Ingen ark motiver er lastet opp.</p>';
    }

    foreach ($budstikkes as $row) {
        echo '<div class="mds_motive-select-box"><input type="checkbox" name="del_motive_id[]" value="' . $row->id . '">
                        <img src="' . $row->thumb_url . '">
             </div>';
    }
    echo '</div>
        </div>';

    $hylses = $wpdb->get_results("SELECT * FROM $table WHERE motive_type = 'hylse'");
    if ($hylses) {
        $hylses_count = count($hylses);
    }

    echo '<div class="mds_motive-container">
    <h2>Opplastede hylse motiver (' . $hylses_count . ')</h2>
        <div class="mds_img-container">';

    if (!$hylses) {
        echo '<p>Ingen hylsemotiver er lastet opp.</p>';
    }

    foreach ($hylses as $row) {
        echo '<div class="mds-motive-hylse mds_motive-select-box"><input type="checkbox" name="del_motive_id[]" value="' . $row->id . '">
                        <img src="' . $row->thumb_url . '">
             </div>';
    }
    echo '</div>
        </div>';

    $envelopes = $wpdb->get_results("SELECT * FROM $table WHERE motive_type = 'envelope'");
    if ($envelopes) {
        $envelopes_count = count($hylses);
    }
    echo '<div class="mds_motive-container mds_motive-envelopes">
        <h2>Opplastede brev motiver (' . $envelopes_count . ')</h2>
            <div class="mds_img-container">';

    if (!$envelopes) {
        echo '<p>Ingen brevmotiver er lastet opp.</p>';
    }

    foreach ($envelopes as $row) {
        echo '<div class="mds_motive-select-box"><input type="checkbox" name="del_motive_id[]" value="' . $row->id . '">
                        <img src="' . $row->thumb_url . '">
             </div>';
    }
    echo '</div>
    </div></form>';
}

/** Step 3. */
function media_motives_page()
{
    if (!current_user_can('edit_posts')) {
        wp_die(__('Du har ikke tillatelse for denne siden.'));
    }

    init_db_motive_table(); // creates table if it doesnt exists

    echo '<div class="mds_admin-box" style="padding: 25px;background: white;margin: 10px 0 0;">';

    // upload request
    if (isset($_FILES['uploaded_motive']) && isset($_POST['mds_upload_motive_form'])) {

        $motive = $_FILES['uploaded_motive'];
        $tmp_name = $motive['tmp_name'];
        $size = $motive['size'];

        $motive_type = sanitize_text_field($_POST['motive_type']);

        $valid_motive_types = array('budstikke', 'hylse', 'envelope');
        if (!in_array($motive_type, $valid_motive_types)) {
            wp_die();
        }

        $mime = mime_content_type($tmp_name);

        if ($mime === 'image/jpeg' || $mime === 'image/png') {

            if ($size < 3000000) {
                // Check that the nonce is valid, and the user can edit this post.
                if (
                    isset($_POST['mds_upload_motive_nonce'])
                    && wp_verify_nonce($_POST['mds_upload_motive_nonce'], 'mds_motive_upload')
                ) {

                    $motive_type = sanitize_text_field($_POST['motive_type']);

                    $upload_dir = wp_get_upload_dir()['basedir'];
                    $upload_url = home_url('/wp-content/uploads');

                    $thumb_lastpath = '/motive_' . $motive_type . '/' . time() . '-thumb';
                    $a5_lastpath = '/motive_' . $motive_type . '/' . time() . '-a5';

                    $full_width = 559;
                    $full_height = 794;
                    $thumb_width = '';
                    $thumb_height = '';

                    $new_imgs = array();

                    if ($motive_type === 'budstikke') {
                        $thumb_height = 192;
                        $thumb_width = 136;
                        $new_imgs['a5'] = array(
                            'width' => $full_width,
                            'height' => $full_height,
                            'path' => $upload_dir . $a5_lastpath,
                            'url' => $upload_url . $a5_lastpath . '.jpg',
                        );
                    } else if ($motive_type === 'hylse') {
                        $thumb_width = 529;
                        $thumb_height = 210;
                    } else if ($motive_type === 'envelope') {
                        $thumb_width = 529;
                        $thumb_height = 374;
                    }

                    $new_imgs['thumb'] = array(
                        'width' => $thumb_width,
                        'height' => $thumb_height,
                        'path' => $upload_dir . $thumb_lastpath,
                        'url' => $upload_url . $thumb_lastpath . '.jpg',
                    );

                    // resize image to thumb and a5
                    $image = wp_get_image_editor($tmp_name);
                    if (!is_wp_error($image)) {
                        foreach ($new_imgs as $img) {
                            $image->resize($img['width'], $img['height'], true);
                            $image->save($img['path']);
                        }
                    }

                    $array_sql = array(
                        'motive_type' => $motive_type,
                        'thumb_url' => $new_imgs['thumb']['url'],
                        'thumb_dir' => $new_imgs['thumb']['path'] . '.jpg',
                        'date_uploaded' => date('Y-m-d')
                    );

                    $array_sql_map = array(
                        '%s', // motive type
                        '%s', // thumb_url
                        '%s', // thumb_dir
                        '%s', // date
                    );

                    if ($motive_type === 'budstikke') {
                        $array_sql['a5_url'] = $new_imgs['a5']['url'];
                        $array_sql['a5_dir'] = $new_imgs['a5']['path'] . '.jpg';
                        array_push($array_sql_map, '%s', '%s');
                    }

                    /* upload to db */
                    global $wpdb;
                    $table_name = $wpdb->prefix . 'mds_motives';
                    $sql_res = $wpdb->insert(
                        $table_name,
                        $array_sql,
                        $array_sql_map
                    );
                    if ($sql_res === 1) {
                        upload_status_msg('succ', "Motivet ble lastet opp.");
                    } else if (!$sql_res) {
                        $err_msg = 'Noe gikk galt, kunne ikke laste opp motiv.';
                        upload_status_msg('err', "Motivet ble lastet opp.");
                    }

                } else {
                    // The security check failed, maybe show the user an error.
                    upload_status_msg('err', 'Noe gikk galt, kunne ikke laste opp motivet. Vennligst prøv på nytt.');
                }

            } else {
                upload_status_msg('err', 'Motivet er større enn maksimum tillatt størrelse 3mb.');
            }

        } else {
            upload_status_msg('err', 'Motivet må være av filformatet PNG eller JPG.');
        }
    }

    // delete requqest
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['mds_del_motive_form'])) {

        global $wpdb;
        $table = $wpdb->prefix . 'mds_motives';

        if (isset($_POST['del_motive_id'])) {

            // get motives to del as rows from database because we need directory URI's to delete them from directories as well
            $ids = array_map('intval', $_POST['del_motive_id']);
            $id_placeholders = implode(', ', array_fill(0, count($_POST['del_motive_id']), '%d'));

            $sql_motives = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT * FROM $table WHERE ID IN ($id_placeholders)",
                    $ids
                ));

            $a5_to_del = 0;
            $a5_deleted = 0;
            $thumb_deleted = 0;
            // directory deleting (budstikke motives are the only motives that have a5 dirs so we need to unlink that if they are checked)
            if ($sql_motives) {
                foreach ($sql_motives as $row) {
                    if (strlen($row->a5_dir) > 0) {
                        $a5_to_del++;
                        if (unlink($row->a5_dir)) {
                            $a5_deleted++;
                        }
                    }
                    if (unlink($row->thumb_dir)) {
                        $thumb_deleted++;
                    }
                }
            }

            $sql_motives_deleted = $wpdb->query(
                $wpdb->prepare(
                    "DELETE FROM $table WHERE ID IN ($id_placeholders)",
                    $ids
                )
            );
            if ($sql_motives_deleted) {
                if ($a5_deleted === $a5_to_del && $thumb_deleted === $sql_motives_deleted) {
                    upload_status_msg('succ', 'Motive(ne) ble slettet.');
                } else {
                    upload_status_msg('err', 'En feil skjedde, motive(ne) kunne ikke slettes.');
                }
            }
        }

    }

    init_motive_dirs();

    ?>

<h1>Last opp motiver</h1>
<form action="" method="post" enctype="multipart/form-data" id="mds_fileupload-motive-form">
  <strong>NB! Budstikke motiv må være i A5 dimensjoner: 561 x 793 (px)</strong><br><br>
  <?php wp_nonce_field('mds_motive_upload', 'mds_upload_motive_nonce');?>
  <label>Velg type motiv</label><br>
  <select name="motive_type"><br>
      <option value="budstikke">Ark</option>
      <option value="hylse">Hylse</option>
      <option value="envelope">Brev</option>
  </select>
<br><br>

    <div id="mds_fileupload-box">
      <input type="file" name="uploaded_motive">
      <input type="submit" value="Last opp" name="mds_upload_motive_form">
    </div>

</form>
</div>



<?php

    show_existing_motives();

}?>