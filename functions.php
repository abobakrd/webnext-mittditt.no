<?php

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

if (!defined('MDS_NS')) {
    define('MDS_NS', 'MDS_NAMESPACE');
}

// make auto-save feature in card editor on by default for new users
add_action('register_user', function ($user_id) {
    $user = get_user_by('id', $user_id);
    if (in_array('customer', $user->roles) && $user->exists()) {
        update_user_meta($user_id, '_mds_autosave_mdc', 1); // on by default for new customers
    }
});

// redirect woocommerce URL's to site index
add_action('template_redirect', function () {
    if (is_woocommerce()) {
        wp_redirect(site_url());
    }
});

// START: ADMIN - WOOCOMMERCE FEATURE | ORDER PAGE MERGED WITH DESIGNCARD INFO OVERVIEW
// Filters the woocommerce order page in admin panel with following:
// * Button to convert the design card into a PDF
// * outputs info about the receiver of the design card

// Enqueue the related scripts 
add_action('admin_enqueue_scripts', function ($hook_suffix) {
    global $woocommerce, $post;
    if (get_post_type($post) === 'shop_order') {
        $order = new WC_Order($post->ID);
        $order_id = intval($order->get_order_number());
        $dc_and_receivers = get_post_meta($order_id, '_mds_order_dc');
        wp_enqueue_script('jspdf', get_stylesheet_directory_uri() . '/external/jspdf.js', array(), false);
        // wp_enqueue_script('html2canvas', get_stylesheet_directory_uri() . '/external/html2canvas.js', array(), false);
        wp_enqueue_script('signature_pad', get_stylesheet_directory_uri() . '/external/signature_pad.js', array(), false);
        wp_enqueue_style('mds-admin-dc-order-style', get_stylesheet_directory_uri() . '/css/mds-admin-dc-order.css', array(), time(), false);
        wp_enqueue_script('mds_dc_html_to_pdf', get_stylesheet_directory_uri() . '/js/admin-dc-html-to-pdf.js', array(), time(), true);
        wp_localize_script(
            'mds_dc_html_to_pdf',
            'mds_dc_and_receiver',
            json_decode($dc_and_receivers[0], true));
    }
});

add_action('woocommerce_admin_order_item_headers', 'action_woocommerce_after_order_itemmeta', 1, 0);
function action_woocommerce_after_order_itemmeta()
{
    global $woocommerce, $post;
    $order = new WC_Order($post->ID);
    $order_id = intval($order->get_order_number());
    $dc_and_receivers = json_decode(get_post_meta($order_id, '_mds_order_dc')[0], true);

    $sendtype = $dc_and_receivers['dc']['send_type'];
    $senddisp = '';
    if ($sendtype === 'envelope') {
        $sendtype = 'Brev';
        $senddisp = 'brev';
    } else if ($sendtype === 'hylse') {
        $sendtype = 'Budstikke';
        $senddisp = 'hylse';
    }

    $receiver = $dc_and_receivers['receiver'];

    echo '<div id="mds_dc-info-options">
    <p id="mds_title">Konverter gratulasjonsbudstikken til PDF</p>
    <div class="mds_admin-btn" id="mds_conv-bg">Konverter med bakgrunn</div>
     <div class="mds_admin-btn" id="mds_conv-w-bg">Konverter uten bakgrunn</div>
     </div>';

    $has_email_reminder = get_user_meta($order->get_user_id(), '_mds_email_reminder');
    if (!empty($has_email_reminder)) {
        $has_email_reminder = intval($has_email_reminder[0]);
    } else {
        $has_email_reminder = false;
    }

    echo '<div class="mds_ctbl" style="display:flex;flex-wrap:wrap;">';
    echo '<div><h4>Gratulanten</h4>';
    echo '<p>' . $receiver['to_name'] . '</p>';
    echo '<p>' . $receiver['to_street'] . '</p>';
    echo '<p>' . $receiver['to_postal'] . ' ' . $receiver['to_place'] . '</p>';
    echo '<p><strong>Bursdagsdato: </strong>' . $receiver['birthday_date'] . '</p>';
    echo '</div>';

    echo '<div>';
    echo '<h4>Avsender</h4>';
    echo '<p>Fra: ' . $receiver['from_name'] . '</p>';
    echo '</div>';
    echo '</div>';

    echo '<div class="mds_ctbl" style="display:flex;flex-wrap:wrap;">';
    echo '<div><h4>Valgt sendemetode</h4>';
    echo '<p>' . $sendtype . '</p>';
    echo '</div>';

    echo '<div>';
    echo '<h4>Motiv for ' . $senddisp . '</h4>';
    echo '<img style="width:300px;" src="' . $dc_and_receivers['dc']['motive_sendtype_url'] . '">';
    echo '</div>';
    echo '</div>';

    echo '<div class="mds_ctbl" style="display:flex;flex-wrap:wrap;">';
    echo '<div><h4>E-post påminnelse</h4><p>';
    echo ($has_email_reminder === 1) ? 'Kunden abonnerer på e-post påminnelse' : 'Kunden abonnerer ikke på e-post påminnelse';
    echo '</p></div>';

    echo '<div>';
    echo '<h4>E-post påminnelser</h4>';
    if (!empty($dc_and_receivers['email_reminders'])) {
        foreach ($dc_and_receivers['email_reminders'] as $reminder) {
            echo '<p>';
            echo '<strong>Dato:</strong> ' . $reminder['date'];
            echo '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>Sendt:</strong> ';
            echo ($reminder['sent'] === 0) ? 'nei' : ' Ja';
            echo '</p>';
        }
    }
    echo '</div>';
    echo '</div>';
};
// END: ADMIN - WOOCOMMERCE FEATURE | ORDER PAGE MERGED WITH DESIGNCARD INFO OVERVIEW



// START: Client feature | page for resending designcard from last 
// year (user lands on this page after clicking an unique email)

// Constants for static products
if(!defined('DC_PID')) define('DC_PID', 564);
if(!defined('DC_PAGE_PID')) define('DC_PAGE_PID', 256);
if(!defined('DC_ENVELOPE_SHIPPING_PID')) define('DC_ENVELOPE_SHIPPING_PID', 258);
if(!defined('DC_SLEEVE_SHIPPING_PID')) define('DC_SLEEVE_SHIPPING_PID', 257);

add_action('template_redirect', 'resend_dc_confirm_order_page');
function resend_dc_confirm_order_page()
{

    // get param sent in the email link
    if (!empty($_GET['mds-resend-oid'])) {
        $qs_order_id = intval(sanitize_text_field($_GET['mds-resend-oid']));

        // order exists?
        $order = get_post_meta($qs_order_id, '_mds_order_dc');
        if (!$order) {
            return;
        }

        // user isnt logged in but is at the login page and has the correct get param so we filter the redirect url so we can later verify the get param again after the user logs in
        $is_login_page = preg_match('/^\/wp-login\.php.*/i', $_SERVER['REQUEST_URI']);
        if (!is_user_logged_in() && $is_login_page) {
            add_filter('login_redirect', function () {
                $qs_order_id = sanitize_text_field($_GET['mds-resend-oid']);
                return site_url('?mds-resend-oid=' . $qs_order_id);
            });
        }

        // user isnt logged in but has correct get param so we redirect the user to the login page then redo the process again
        else if (!is_user_logged_in()) {
            wp_redirect(wp_login_url() . '?mds-resend-oid=' . $qs_order_id);
        }

        // user is now logged in and have the correct get param so we can now proceed with the reorder process
        else if (is_user_logged_in()) {
            if ($order = wc_get_order($qs_order_id)) {

                if ($order->get_user_id() !== get_current_user_id()) {
                    wp_redirect(site_url());
                    return;
                }

                $dc_order_meta = json_decode($order->get_meta('_mds_order_dc'), true);
                $dc = $dc_order_meta['dc'];
                if (!empty($dc_order_meta)) {

                    // add new values to indicate its a resend order
                    $dc_order_meta['is_resend'] = 'true';
                    $dc_order_meta['original_order_id'] = $qs_order_id;

                    // add products to cart
                    WC()->cart->empty_cart();
                    WC()->cart->add_to_cart(DC_PID); // main product - budstikke
                    WC()->cart->add_to_cart(DC_PAGE_PID, intval($dc['pages'])); // enkeltsider produkt = 10kr
                    $pid_sendtype = 0;
                    if ($dc['send_type'] === 'envelope') {
                        $pid_sendtype = DC_ENVELOPE_SHIPPING_PID;
                    } else if ($dc['send_type'] === 'hylse') {
                        $pid_sendtype = DC_SLEEVE_SHIPPING_PID;
                    }
                    WC()->cart->add_to_cart($pid_sendtype);

                    WC()->session->set('mds_dc_resend_order', $dc_order_meta);
                    WC()->session->set('mds_dc_order_customer_id', $order->get_user_id());
                    wp_redirect(wc_get_checkout_url() . '?mds-reorder=t&mds-org-oid=' . $qs_order_id);
                }
            }
        }
    } else {
        return;
    }
}
// END: Client feature | page for resending designcard from last 




// START: WooCommerce checkout
// Updates the order with the design card and receiver info
add_action('woocommerce_checkout_update_order_meta', 'checkout_update_order_meta_with_dc_and_receivers');
function checkout_update_order_meta_with_dc_and_receivers($order_id)
{
    $resend_order = WC()->session->get('mds_dc_resend_order');

    /**
     * RESEND ORDER
     *
     * User wants to resend already sent DC so all order meta is already obtained from original order, so we will just use that
     */
    if (!empty($resend_order)) {
        $dc_info_order_meta = $resend_order;

        if (WC()->session->get('mds_dc_order_customer_id') !== get_current_user_id()) {
            wp_redirect(site_url());
            return;
        }

    } else {
        /**
         * NORMAL FIRST TIME ORDER
         */
        $dc = json_decode(WC()->session->get('mds_dc_order'), true);
        $receiver = WC()->session->get('mds_dc_order_receiver');

        if (empty($dc) || empty($receiver)) {
            WC()->cart->empty_cart();
            WC()->session->set('mds_dc_order', '');
            WC()->session->set('mds_dc_order_receiver', '');
            WC()->session->set('mds_dc_order_is_mobile', '');
            WC()->session->set('mds_dc_order_email_reminder', '');
            echo 'Noe gikk galt. Prøv på nytt eller kontakt administrator.';
            return;
        }

        $dc_info_order_meta = array('user_id' => get_current_user_id(), 'dc' => $dc, 'receiver' => $receiver);

        $email_reminder = WC()->session->get('mds_dc_order_email_reminder');
        if (!empty($email_reminder)) {
            $dc_info_order_meta['email_reminders'] = array($email_reminder); // user can have multiple reminders
            update_user_meta(get_current_user_id(), '_mds_email_reminder', 1);
        }

        if (!empty(WC()->session->get('mds_dc_order_is_mobile'))) {
            $dc_info_order_meta['dc_order_mobile'] = 'true';
        }
    }

    $update_res = update_post_meta($order_id, '_mds_order_dc', json_encode($dc_info_order_meta, JSON_UNESCAPED_UNICODE));
    if ($update_res === false) {
        error_log('mds_update_checkout_err_couldnt_update', 1, 'log@webnext.no');
    }

    // update mailing list if user signed up for email reminder

    // its now safe to empty cart and flush mds session values
    WC()->cart->empty_cart();
    WC()->session->set('mds_dc_order', '');
    WC()->session->set('mds_dc_order_receiver', '');
    WC()->session->set('mds_dc_order_is_mobile', '');
    WC()->session->set('mds_dc_order_email_reminder', '');
    WC()->session->set('mds_dc_resend_order', '');
    WC()->session->set('mds_dc_order_customer_id', '');
}
// END: WooCommerce checkout




// START: WooCommerce customer order overview page
add_filter('woocommerce_account_orders_columns', 'add_account_orders_column', 10, 1);
function add_account_orders_column($columns)
{
    $columns['custom-column'] = __('Budstikke trefarge', 'woocommerce');

    return $columns;
}

add_action('woocommerce_my_account_my_orders_column_custom-column', 'add_account_orders_column_rows');
function add_account_orders_column_rows($order)
{
    // Example with a custom field
    if ($value = $order->get_meta('_mds_order_dc')) {
        echo json_decode($value, true)['dc']['budstikke_wood_color'];
    }
}

add_action('woocommerce_after_my_account', 'action_woocommerce_after_my_account', 10, 1);
function action_woocommerce_after_my_account($wccm_after_checkout)
{
    // make action magic happen here...
    $vmsg = 'Skru av';
    $vs = 'På';
    $vcolor = '#b2e8b2';
    $has_email_reminder = get_user_meta(get_current_user_id(), '_mds_email_reminder');
    if (!empty($has_email_reminder)) {
        $v = intval($has_email_reminder[0]);
        if ($v === 0) {
            $vcolor = '#ffc6c6';
            $vs = 'Av';
            $vmsg = 'Skru på';
            $v = 1;
        } else {
            $v = 0;
        }
    }

    echo '<table>
    <tr>
    <td>
    <p style="margin:0;">Årlig e-post påminnelse om å sende bestilte budstikker på nytt</p>
    </td>
    <td style="background:' . $vcolor . '">
    ' . $vs . '
    </td>
    <td>
    <a href="' . site_url('/min-konto/?mds-email-reminder-on=' . $v) . '">' . $vmsg . '</a>
    </td>
    </tr>
    </table>';
};

add_action('init', 'user_request_turn_off_email_reminder');
function user_request_turn_off_email_reminder()
{
    if (!is_user_logged_in()) {
        return;
    }

    if (isset($_GET['mds-email-reminder-on'])) {
        $g = '';
        (intval($_GET['mds-email-reminder-on']) === 0) ? $g = 0 : $g = 1;

        if(!in_array($g, array(0,1))) return;

        update_user_meta(get_current_user_id(), '_mds_email_reminder', $g);
        wp_redirect(site_url('/min-konto'));
        exit;
    }
}
// End: WooCommerce customer order overview page




// START: Email subscription service
// A cron job that executes a HEAD request with a query string (msd-cron-erm=t) everyday to the backend 
// to check if there are any email reminders needed to be sent out
function send_email_to_customer_about_dc_resend($user_email, $multiple = false, $to_name = false, $order_id = false)
{
    $subject_multiple = 'Her kommer påminnelse om du ønsker å sende budstikken på nytt til tidligere mottakere';
    $subject_single = 'Ønsker du å sende gratulasjonsbudstikken på nytt til ' . $to_name . '?';

    $body_single = '<div>
    <p>Det er snart 1 år siden du sendte gratulasjonsbudstikke til ' . $to_name . ', ønsker du å sende den på nytt i år?

    Gratulasjonsbudstikken er samme som du sendte sist og den vil bli sendt 5 dager i forkant som vanlig før vedkommende sin bursdag for å garantere at den kommer før bursdagen.

    Alt du må gjøre er å klikke på lenken under og fullføre ordren.</p>


    <a href="' . site_url('?mds-resend-oid=' . $order_id) . '">Klikk her for å sende budstikke på nytt</a>
    Ønsker du ikke å sende den på nytt så kan du bare ignorere denne e-posten.


    mittditt.no
    Send gratulasjonsbudstikke til dine kjære
    </div>';

    $body_multiple = '<div style="font-family: Open Sans, sans-serif, \'Arial\';line-height:1.6em;">
    <p>Det er snart 1 år siden du sendte gratulasjonsbudstikke til flere på Mittditt.no, hvis du ønsker å sende flere av disse budstikkene på nytt så kan du besøke lenken under og resende ordren fra tidligere.

    <br><br>

    Gratulasjonsbudstikkene er samme som du sendte sist og de vil bli sendt 5 dager i forkant
    som vanlig før vedkommende sin bursdag for å garantere at den kommer før bursdagen.

    <br><br>

    <a href="' . site_url('/my-account/orders') . '">Klikk her for å sende budstikkene på nytt</a>

    <p>Ønsker du ikke å sende de på nytt så kan du bare ignorere denne e-posten.</p>

    <br>

<a href="' . site_url() . '">mittditt.no</a>
<br>
<span style="font-size:14px;">Send gratulasjonsbudstikke til dine kjære</span>
<br>
</div>';

    $subject = $subject_single;
    $body = $body_single;

    if ($multiple) {
        $subject = $subject_multiple;
        $body = $body_multiple;
    }

    $headers = array('Content-Type: text/html; charset=UTF-8');

    if (!wp_mail($user_email, $subject, $body, $headers)) {
        error_log('Kunne ikke sende påminnelse om til kunde om rebestilling(er) av budstikke(er).', 1, 'log@webnext.no');
        return false;
    } else {
        return true;
    }
}

// The backend handler for the HEAD request
add_action('init', 'check_email_reminder_register');
function check_email_reminder_register()
{
    // a HEAD requests is sent to https://www.mittditt.no?mds-cron-erm=t everyday so WP can
    // figure if there are any email reminders to send out to customers

    if (!empty($_GET['mds-cron-erm']) && $_SERVER['REQUEST_METHOD'] === 'HEAD') {
        if ($_GET['mds-cron-erm'] === 't') {
            error_log('MDS-bg-task-email-scheduler: running background task');

            // Actions to perform
            $customers = get_users(array('role' => 'customer'));

            if (empty($customers)) {
                error_log('mds-bg-task-email-scheduler: no customers');
                return;
            }

            foreach ($customers as $customer) {
                if (!$customer->exists()) {
                    continue;
                }

                $email_reminder_turned_on = get_user_meta($customer->ID, '_mds_email_reminder');
                if (!empty($email_reminder_turned_on)) {
                    if (intval($email_reminder_turned_on[0]) !== 1) {
                        continue;
                    }
                } else {
                    continue;
                }

                $order_ids = wc_get_orders(array(
                    'return' => 'ids',
                    'customer_id' => $customer->ID)
                );

                if (empty($order_ids)) {
                    error_log('no orders for customer ' . $customer->ID);
                    continue;
                }

                // collect all reminders from all orders
                $reminders_to_send = array();
                foreach ($order_ids as $order_id) {
                    $dc_meta = json_decode(get_post_meta($order_id, '_mds_order_dc')[0], true);
                    if (!empty($dc_meta['email_reminders']) && $dc_meta['receiver']['email_reminder'] === 'true') {
                        $c_r_i = count($dc_meta['email_reminders']) - 1;
                        $curr_reminder = $dc_meta['email_reminders'][$c_r_i];
                        if ($curr_reminder['sent'] === 0 && time() > strtotime($curr_reminder['date'])) {
                            $reminders_to_send[$order_id] = $dc_meta;
                        }
                    }
                }

                // decide which email template to send
                if (count($reminders_to_send) > 1) {
                    error_log('multiple set ' . $customer->user_email);
                    foreach ($reminders_to_send as $order_id => $dc_meta) {
                        $curr_i = count($dc_meta['email_reminders']) - 1;
                        $c_r = $dc_meta['email_reminders'][$curr_i];
                        $c_r['sent'] = 1;
                        $dc_meta['email_reminders'][$curr_i + 1] = array('sent' => 0, 'date' => date('Y-m-d', strtotime('+335 day', strtotime(date(date('Y') . '-m-d', strtotime($c_r['date']))))));
                        $reminders_to_send[$order_id] = $dc_meta;
                    }
                    if (!send_email_to_customer_about_dc_resend($customer->user_email, true)) {
                        // error handled in email send function (send_email_about_resend_of_dc())
                        return;
                    } else {
                        foreach ($reminders_to_send as $order_id => $dc_meta) {
                            error_log('updated multiple email reminders for customer: ' . $customer->ID);
                            update_post_meta(intval($order_id), '_mds_order_dc', json_encode($dc_meta, JSON_UNESCAPED_UNICODE));
                            sleep(1); // wait 1s before we send next email to avoid overloading email server
                        }
                    }
                    return;
                } else if (count($reminders_to_send) === 1) {
                    $arr_keys = array_keys($reminders_to_send);

                    $order_id = $arr_keys[0]; // array is indexed by order_id
                    $to_name = $reminders_to_send[$order_id]['receiver']['to_name'];

                    $curr_i = count($reminders_to_send[$order_id]['email_reminders']) - 1; // index to last reminder
                    $c_r = $reminders_to_send[$order_id]['email_reminders'][$curr_i]['sent'] = 1; // last reminder

                    // new reminder based on previous (335+ days from this year combined with month and day from past reminder date)
                    $reminders_to_send[$order_id]['email_reminders'][$curr_i + 1] = array('sent' => 0, 'date' => date('Y-m-d', strtotime('+335 day', strtotime(date(date('Y') . '-m-d', strtotime($c_r['date']))))));
                    if (!send_email_to_customer_about_dc_resend($customer->user_email, false, $to_name, $order_id)) {
                        // error handled in mail send functione
                        error_log('not working');
                        return;
                    } else {
                        error_log('updated single email reminder for order id: ' . $order_id . ' customer: ' . $customer->ID);
                        $new_dc_meta_to_update = $reminders_to_send[$order_id];
                        update_post_meta(intval($order_id), '_mds_order_dc', json_encode($new_dc_meta_to_update, JSON_UNESCAPED_UNICODE));
                        sleep(1); // wait 1s so we dont overload email server
                    }
                }
            }
            return;
        }
    }
}
// END: Email subscription service




// START: Static Global design card product initializer
// Creates a static design card product so the system can programmatically
// create different variants (designcard with different text, pictures etc)
add_action('after_switch_theme', 'init_global_designcard_product');
function init_global_designcard_product()
{
    $all_product_ids_query = array(
        'post_type' => 'product',
        'numberposts' => -1,
        'posts_per_page' => -1,
    );

    $all_designcard_pids = get_posts($all_product_ids_query);

    if (!empty($all_designcard_pids)) {

        $pids_count = count($all_designcard_pids);

        // if so, delete all above 1
        if ($pids_count > 1) {
            add_action('wp_footer', function () {"more then 1!";});
            for ($i = 1; $i < $pids_count; $i++) {
                $deleted_data = wp_delete_post($all_designcard_pids[$i], true);
                if ($deleted_data !== null && $deleted_data !== false) {
                    echo "MDS: deleted invalid product";
                } else {
                    echo "MDS: couldnt delete invalid product";
                }
            }
        } else if ($pids_count === 1) {
            // correct > proceed
            add_action('wp_footer', function () {"only 1!";});
        }

    } else {
        add_action('wp_footer', function () {echo "none!";});
        // First we create the product post so we can grab it's ID
        $post_id = wp_insert_post(
            array(
                'post_title' => 'Budstikke',
                'post_type' => 'product',
                'post_status' => 'publish',
            )
        );

        // Then we use the product ID to set all the posts meta
        wp_set_object_terms($post_id, 'simple', 'product_type');
        update_post_meta($post_id, '_visibility', 'visible');
        update_post_meta($post_id, '_price', '69');

        if ($post_id !== 0 || !is_wp_error($post_id)) {
            // succ
        } else {
            echo "MDS_ERROR: Could not create a new product for the editor";
        }
    }
}
// END: Static Global design card product initializer




// START: URL checker the loads the editor if the user is on siteurl/editor...
add_action('init', 'page_checker');
function page_checker()
{
    $is_editor_page = preg_match('/^\/editor.*/i', $_SERVER['REQUEST_URI']);

    if ((!empty($_GET['mds_e_ajax']) && sanitize_text_field($_GET['mds_e_ajax']) === 't') || ($is_editor_page === 1)) {
        require get_stylesheet_directory() . '/classes/mds-editor-core.php'; // main file for loading everything related to the editor
        add_action('wp_head', function () {
            echo ' <script src="https://www.google.com/recaptcha/api.js" async defer></script>';
        });
    } else if (is_admin() && current_user_can('administrator')) {
        require get_stylesheet_directory() . '/mds-admin-upload-motive.php';

        add_action('admin_enqueue_scripts', function ($hook_suffix) {
            wp_enqueue_script('mds_admin-upload-motive-script', get_stylesheet_directory_uri() . '/js/admin-upload-motive-script.js', array(), false, true);
            wp_enqueue_style('mds_admin-upload-motive-style', get_stylesheet_directory_uri() . '/css/admin-upload-motive-style.css', array(), false);
        });
    }
}
// END: URL checker the loads the editor if the user is on siteurl/editor...
