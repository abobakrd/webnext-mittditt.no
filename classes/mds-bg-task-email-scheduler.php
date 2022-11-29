<?php

class mds_email_reminder_scheduler extends WP_Async_Request
{

    /**
     * @var string
     */
    protected $action = 'mds_bg_task_email_reminder_scheduler';

    protected function send_email_to_customer_about_dc_resend($user_email, $multiple, $to_name = false, $order_id = false)
    {
        $to = $user_email;

        $subject_multiple = 'Her kommer påminnelse om du ønsker å sende budstikken på nytt til tidligere mottakere';
        $subject_single = 'Ønsker du å sende gratulasjonsbudstikken på nytt til ' . $to_name . '?';

        $body_single = '
        <div style="font-family: Open Sans, sans-serif, \'Arial\';line-height:1.6em;">
        <p>Det er snart 1 år siden du sendte gratulasjonsbudstikke til ' .
        $to_name . ', ønsker du å sende den på nytt i år? <br><br>

        Gratulasjonsbudstikken er samme som du sendte sist og den vil bli sendt 5 dager i forkant
        som vanlig før vedkommende sin bursdag for å garantere at den kommer før bursdagen.

        <br><br>

        Alt du må gjøre er å klikke på lenken under og fullføre ordren.</p>
        <br>

        <a href="' . site_url('?mds-resend-oid=' . $order_id) . '">Klikk her for å sende budstikke på nytt</a>

        <p>Ønsker du ikke å sende den på nytt så kan du bare ignorere denne e-posten.</p>

        <br>

  <a href="' . site_url() . '">mittditt.no</a>
  <br>
  <span style="font-size:14px;">Send gratulasjonsbudstikke til dine kjære</span>
  <br>
</div>';

        $body_multiple = '
<div style="font-family: Open Sans, sans-serif, \'Arial\';line-height:1.6em;">
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

        if ($multiple) {
            $subject = $subject_multiple;
            $subject = $body_multiple;
        } else {
            $subject = $subject_single;
            $body = $body_single;
        }

        $headers = array('Content-Type: text/html; charset=UTF-8');

        if (!wp_mail($to, $subject, $body, $headers)) {
            error_log('Kunne ikke sende påminnelse om til kunde om rebestilling(er) av budstikke(er).', 1, 'log@webnext.no');
            return false;
        } else {
            return true;
        }

    }

    /**
     * Handle
     *
     * Override this method to perform any actions required
     * during the async request.
     */
    protected function handle()
    {
        error_log('MDS-bg-task-email-scheduler: running background task');

        // Actions to perform
        $customers = get_users(array('role' => 'customer', 'return' => 'ids'));

        if (empty($customers)) {
            error_log('mds-bg-task-email-scheduler: no customers');
            return;
        }

        foreach ($customers as $customer) {
            if (!$customer->exists()) {
                continue;
            }

            if (!get_user_meta($customer->ID, '_mds_email_reminder')) {
                continue;
            }

            $order_ids = wc_get_orders(array(
                'return' => 'ids',
                'customer_id' => $customer->ID)
            );

            if (empty($order_ids)) {
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
                foreach ($reminders_to_send as $order_id => $dc_meta) {
                    $curr_i = count($dc_meta['email_reminders']) - 1;
                    $c_r = $dc_meta['email_reminders'][$curr_i];
                    if ($c_r['sent'] === 0 && time() > strtotime($c_r['date'])) {
                        $c_r['sent'] = 1;
                        echo 'new_reminder_date: ' . '<br>';
                        $dc_meta['email_reminders'][$curr_i + 1] = array('sent' => 0, 'date' => date('Y-m-d', strtotime('+335 day', strtotime(date(date('Y') . '-m-d', strtotime($c_r['date']))))));
                    }
                }
                if (!$this->send_email_to_customer_about_dc_resend($customer->get('user_email'), true)) {
                    // error handled in email send function (send_email_about_resend_of_dc())
                    return;
                } else {
                    foreach ($reminders_to_send as $order_id => $dc_meta) {
                        update_post_meta(intval($order_id), '_mds_order_dc', json_encode($dc_meta, JSON_UNESCAPED_UNICODE));
                        sleep(1); // wait 1s before we send next email to avoid overloading email server
                    }
                }
                return;
            } else if (count($reminders_to_send) === 1) {
                $arr_keys = array_keys($reminders_to_send);
                $to_name = $reminders_to_send[$arr_keys[0]]['receiver']['to_name'];
                $order_id = $arr_keys[0]; // array is indexed by order_id
                if (!$this->send_email_to_customer_about_dc_resend($customer->get('user_email'), false, $to_name, $order_id)) {
                    // error handled in mail send function
                    return;
                } else {
                    update_post_meta(intval($order_id), '_mds_order_dc', json_encode($dc_meta, JSON_UNESCAPED_UNICODE));
                    sleep(1); // wait 1s so we dont overload email server
                }
            }
        }
    }
}
