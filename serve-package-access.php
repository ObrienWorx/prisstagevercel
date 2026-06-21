<?php

/**
 * Plugin Name: Taxonomy Package Access with WooCommerce Integration
 * Description: Sell access to service-category taxonomy terms via packages with subtitle, duration (months), price, description, and WooCommerce integration.
 * Version: 5.1
 * Author: Acelema
 */

defined('ABSPATH') || exit;
add_action('init', function () {
    register_post_type('package', [
        'labels' => [
            'name'               => 'Packages',
            'singular_name'      => 'Package',
            'add_new'            => 'Add Package',
            'add_new_item'       => 'Add New Package',
            'edit_item'          => 'Edit Package',
            'new_item'           => 'New Package',
            'view_item'          => 'View Package',
            'search_items'       => 'Search Packages',
            'not_found'          => 'No packages found',
            'not_found_in_trash' => 'No packages found in Trash',
            'all_items'          => 'All Packages',
            'menu_name'          => 'Packages',
            'name_admin_bar'     => 'Package',
        ],
        'public' => true,
        'show_in_menu' => true,
        'supports' => ['title', 'editor', 'thumbnail'],
        'menu_icon' => 'dashicons-products',
        'show_in_rest' => false,
    ]);
});
add_action('add_meta_boxes', function () {
    add_meta_box('package_service_categories', 'Package Settings', function ($post) {
        wp_nonce_field('save_package_settings', 'package_nonce');

        $price               = get_post_meta($post->ID, '_package_price', true) ?: '';
        $sale_price          = get_post_meta($post->ID, '_package_sale_price', true) ?: '';
        $duration            = get_post_meta($post->ID, '_package_duration_months', true) ?: 1;
        $sale_start          = get_post_meta($post->ID, '_package_sale_start', true);
        $sale_end            = get_post_meta($post->ID, '_package_sale_end', true);
        $sale_banner         = get_post_meta($post->ID, '_package_sale_banner', true);
        $subscriber_page_url = get_post_meta($post->ID, '_package_subscriber_page_url', true) ?: '';
        $selected            = get_post_meta($post->ID, '_service_category_ids', true) ?: [];
        $terms               = get_terms(['taxonomy' => 'service-category', 'hide_empty' => false]);

        $sort_order = get_post_meta($post->ID, '_package_sort_order', true);
        if ($sort_order === '' || $sort_order === false) {
            $sort_order = 0;
        }

        echo '<p><strong>Frontend Sort Order:</strong></p>';
        echo "<input type='number' name='package_sort_order' value='" . esc_attr($sort_order) . "' style='width:100px;' placeholder='e.g., 1 for first'><br>";
        echo "<small>Enter a number to control the display order on the frontend. Lower numbers appear first.</small><br><br>";

        echo '<p><strong>Price (A$):</strong></p>';
        echo "<input type='number' step='0.01' name='package_price' value='" . esc_attr($price) . "' style='width:100px;margin-right:10px;'> Regular Price<br><br>";
        echo "<input type='number' step='0.01' name='package_sale_price' value='" . esc_attr($sale_price) . "' style='width:100px;'> Sale Price<br><br>";

        echo '<p><strong>Access Duration (in months):</p>';
        echo "<input type='number' name='package_duration_months' value='$duration' style='width:100px;'><br><br>";

        echo '<p><strong>Sale Start Date:</p>';
        echo "<input type='datetime-local' name='package_sale_start' value='" . esc_attr($sale_start) . "'><br><br>";

        echo '<p><strong>Sale End Date:</p>';
        echo "<input type='datetime-local' name='package_sale_end' value='" . esc_attr($sale_end) . "'><br><br>";

        echo '<p><strong>Sale Banner Image URL:</p>';
        echo "<input type='text' name='package_sale_banner' value='" . esc_attr($sale_banner) . "' style='width:100%;'><br><br>";

        echo '<p><strong>Subscriber-Specific Page URL:</strong></p>';
        echo "<input type='url' name='package_subscriber_page_url' value='" . esc_url($subscriber_page_url) . "' style='width:100%;' placeholder='e.g., https://yoursite.com/my-package-subscribers'><br><br>";

        echo '<p><strong>Select Service Categories:</p>';
        echo '<ul style="max-height:200px;overflow:auto;border:1px solid #ccc;padding:10px;">';
        foreach ($terms as $term) {
            $checked = in_array($term->term_id, $selected) ? 'checked' : '';
            echo "<li><label><input type='checkbox' name='service_category_ids[]' value='{$term->term_id}' $checked> {$term->name}</label></li>";
        }
        echo '</ul><br>';
    }, 'package', 'normal', 'high');
});

add_action('save_post_package', function ($post_id) {
    if (!isset($_POST['package_nonce']) || !wp_verify_nonce($_POST['package_nonce'], 'save_package_settings')) return;
    $price      = sanitize_text_field($_POST['package_price'] ?? '');
    $sale_price = sanitize_text_field($_POST['package_sale_price'] ?? '');
    $duration   = intval($_POST['package_duration_months'] ?? 1);

    update_post_meta($post_id, '_package_price', $price);
    update_post_meta($post_id, '_package_sale_price', $sale_price);
    update_post_meta($post_id, '_package_duration_months', $duration);
    $sale_start_raw = sanitize_text_field($_POST['package_sale_start'] ?? '');
    $sale_end_raw   = sanitize_text_field($_POST['package_sale_end'] ?? '');
    $sale_start_ts  = $sale_start_raw ? strtotime($sale_start_raw) : '';
    $sale_end_ts    = $sale_end_raw ? strtotime($sale_end_raw) : '';

    update_post_meta($post_id, '_package_sale_start', $sale_start_raw);
    update_post_meta($post_id, '_package_sale_end', $sale_end_raw);
    update_post_meta($post_id, '_sale_price_dates_from', $sale_start_ts);
    update_post_meta($post_id, '_sale_price_dates_to', $sale_end_ts);
    update_post_meta($post_id, '_regular_price', $price);
    update_post_meta($post_id, '_sale_price', $sale_price);

    update_post_meta($post_id, '_package_sale_banner', esc_url($_POST['package_sale_banner'] ?? ''));
    update_post_meta($post_id, '_package_subscriber_page_url', isset($_POST['package_subscriber_page_url']) ? sanitize_url($_POST['package_subscriber_page_url']) : '');

    if (isset($_POST['service_category_ids'])) {
        update_post_meta($post_id, '_service_category_ids', array_map('intval', $_POST['service_category_ids']));
    } else {
        delete_post_meta($post_id, '_service_category_ids');
    }

    $sort_order = isset($_POST['package_sort_order']) ? intval($_POST['package_sort_order']) : 0;
    update_post_meta($post_id, '_package_sort_order', $sort_order);
    $linked_product = get_posts([
        'post_type'      => 'product',
        'meta_query'     => [['key' => '_linked_package_id', 'value' => $post_id]],
        'posts_per_page' => 1,
        'fields'         => 'ids'
    ]);

    if (!empty($linked_product) && function_exists('wc_get_product')) {
        $product_id = $linked_product[0];
        update_post_meta($product_id, '_regular_price', $price);
        update_post_meta($product_id, '_sale_price', $sale_price);
        update_post_meta($product_id, '_sale_price_dates_from', $sale_start_ts);
        update_post_meta($product_id, '_sale_price_dates_to', $sale_end_ts);
        error_log("Debug: Synced package $post_id pricing to WooCommerce product $product_id");
    }
});



add_action('woocommerce_product_options_general_product_data', function () {
    echo '<div class="options_group">';
    $packages = get_posts(['post_type' => 'package', 'numberposts' => -1]);
    $options = ['' => 'Select Package'];
    foreach ($packages as $pkg) {
        $options[$pkg->ID] = $pkg->post_title;
    }
    woocommerce_wp_select([
        'id' => '_linked_package_id',
        'label' => 'Linked Package',
        'options' => $options,
        'description' => 'Purchasing this product grants access to the selected package.',
    ]);
    echo '</div>';
});
add_action('woocommerce_process_product_meta', function ($post_id) {
    if (isset($_POST['_linked_package_id'])) {
        update_post_meta($post_id, '_linked_package_id', intval($_POST['_linked_package_id']));
    }
});

add_filter('woocommerce_add_to_cart_validation', function ($passed, $product_id) {
    if (is_user_logged_in()) {
        $user_id    = get_current_user_id();
        $package_id = get_post_meta($product_id, '_linked_package_id', true);
        if ($package_id) {
            $term_ids = get_post_meta($package_id, '_service_category_ids', true) ?: [];
            $all_active = true;
            $active_until = '';

            foreach ($term_ids as $term_id) {
                $access = get_user_meta($user_id, "access_{$term_id}", true);

                if (empty($access) || strtotime($access['end']) < time()) {
                    $all_active = false;
                    break;
                } else {
                    $active_until = $access['end'];
                }
            }

            // if ($all_active) {
            //     wc_add_notice(
            //         sprintf(__('You already have an active subscription for this package until %s', 'textdomain'), $active_until),
            //         'error'
            //     );
            //     return false;
            // }
        }
    }
    return $passed;
}, 10, 2);

add_action('woocommerce_order_status_completed', 'acelema_handle_package_purchase', 10, 1);

function acelema_handle_package_purchase($order_id)
{
    error_log("Acelema Debug: acelema_handle_package_purchase function initiated for order ID: $order_id");
    $order = wc_get_order($order_id);

    if (!$order) {
        error_log("Acelema Debug: Order not found for ID: $order_id");
        return;
    }

    $user_id = $order->get_user_id();

    if (!$user_id) {
        error_log("Acelema Debug: No user ID found for order: $order_id");
        return;
    }

    error_log("Acelema Debug: Processing order $order_id for user $user_id.");

    $current_subscribed_packages = get_user_meta($user_id, 'subscribed_packages', true);
    if (!is_array($current_subscribed_packages)) {
        $current_subscribed_packages = [];
        error_log("Acelema Debug: Initializing subscribed_packages for user $user_id as empty array.");
    } else {
        error_log("Acelema Debug: Existing subscribed_packages for user $user_id: " . print_r($current_subscribed_packages, true));
    }


    $packages_to_update_count = [];

    foreach ($order->get_items() as $item_id => $item) {
        $product_id = $item->get_product_id();
        $product_name = $item->get_name();

        error_log("Acelema Debug: Processing order item product ID: $product_id, Name: $product_name");
        $package_id = get_post_meta($product_id, '_linked_package_id', true);

        if (empty($package_id) || !is_numeric($package_id)) {
            error_log("Acelema Debug: Product $product_id ($product_name) is not linked to a valid package. Skipping.");
            continue;
        }
        $package_id = intval($package_id);
        $package_post = get_post($package_id);
        if (!$package_post || $package_post->post_type !== 'package') {
            error_log("Acelema Debug: Linked ID $package_id for product $product_id ($product_name) does not point to a valid 'package' CPT. Skipping.");
            continue;
        }

        error_log("Acelema Debug: Product $product_id linked to package ID: $package_id ({$package_post->post_title}).");

        if (!in_array($package_id, $current_subscribed_packages)) {
            $current_subscribed_packages[] = $package_id;
            error_log("Acelema Debug: Added package $package_id to user $user_id's subscribed_packages.");
        } else {
            error_log("Acelema Debug: User $user_id already has package $package_id in subscribed_packages. Skipping addition.");
        }

        if (!in_array($package_id, $packages_to_update_count)) {
            $packages_to_update_count[] = $package_id;
        }

        $term_ids = get_post_meta($package_id, '_service_category_ids', true) ?: [];
        $duration_months = intval(get_post_meta($package_id, '_package_duration_months', true)) ?: 1;

        $start_date = current_time('Y-m-d H:i:s');
        $end_date = date('Y-m-d H:i:s', strtotime("+$duration_months months", strtotime($start_date)));

        foreach ($term_ids as $term_id) {
            $term = get_term($term_id, 'service-category');
            $term_name = $term ? $term->name : 'Unknown Term';
            $existing_access = get_user_meta($user_id, "access_{$term_id}", true);
            if (!is_array($existing_access)) {
                $existing_access = ['start' => '', 'end' => ''];
            }

            if (!empty($existing_access['end']) && strtotime($existing_access['end']) > current_time('timestamp')) {
                if (strtotime($end_date) < strtotime($existing_access['end'])) {
                    error_log("Acelema Debug: User $user_id has existing active access for term $term_id ($term_name) expiring later than new access. Skipping update.");
                    continue;
                }
            }

            update_user_meta($user_id, "access_{$term_id}", [
                'start'        => $start_date,
                'end'          => $end_date,
                'package_id' => $package_id
            ]);
            error_log("Acelema Debug: Granted/Updated access for user $user_id to term $term_id ($term_name) from $start_date to $end_date via package $package_id.");
        }
    }

    update_user_meta($user_id, 'subscribed_packages', array_values(array_unique($current_subscribed_packages)));
    error_log("Acelema Debug: Final subscribed_packages for user $user_id: " . print_r(get_user_meta($user_id, 'subscribed_packages', true), true));

    foreach ($packages_to_update_count as $pkg_id_to_count) {
        $args = array(
            'meta_query' => array(
                array(
                    'key'     => 'subscribed_packages',
                    'value'   => serialize(strval($pkg_id_to_count)),
                    'compare' => 'LIKE',
                )
            ),
            'count_total' => true,
            'fields'      => 'ids'
        );
        $user_query = new WP_User_Query($args);
        $count = $user_query->get_total();

        update_post_meta($pkg_id_to_count, '_package_subscriber_count', $count);
        error_log("Acelema Debug: Recalculated and updated _package_subscriber_count for package $pkg_id_to_count to $count.");
    }
    error_log("Acelema Debug: Finished processing order $order_id.");
}

add_action('template_redirect', function () {
    if (!is_singular(['service', 'report', 'page'])) {
        error_log("Acelema Debug: Not a singular page, service, or report. Exiting template_redirect.");
        return;
    }

    $current_cpt = get_post_type();
    $post_id_accessed = get_the_ID();
    $post_title = get_the_title($post_id_accessed);
    // Force login for specific report pages
    $force_login_slugs = array(
        'daily-digest',
        'dividend-yield-report',
        'growth-edge-report',
        'penny-stocks-spotlight',
        'usa-equity-report',
        'mining-resource-insights',
        'ai-equity-vision-report',
        'pg-weekly-pick',
        'technical-swing-insights',
        'etf-navigatotr-report',
        'healthcare-pulse-report',
        'energy-spectrum-report',
        'sector-opportunity-report',
        'global-commodity-report'
    );

    if (in_array(get_post_field('post_name', $post_id_accessed), $force_login_slugs) && ! is_user_logged_in()) {
        wp_redirect(home_url('/member-account/'));
        exit;
    }

    error_log("Acelema Debug: template_redirect initiated for CPT: $current_cpt, Post ID: $post_id_accessed, Title: $post_title");

    if (current_user_can('manage_options')) {
        error_log("Acelema Debug: User is admin, granting access to post ID $post_id_accessed.");
        return;
    }

    $user_id = get_current_user_id();
    $now = current_time('Y-m-d H:i:s');
    $default_fallback_url = site_url('/subscribe');
    error_log("Acelema Debug: User ID: $user_id, Current time: $now, Default fallback URL: $default_fallback_url");

    $required_package_ids = [];
    $final_redirect_url = $default_fallback_url;

    if ($current_cpt === 'page') {
        $is_page_restricted = get_post_meta($post_id_accessed, '_restrict_page_access', true);
        $page_subscriber_url = get_post_meta($post_id_accessed, '_page_subscriber_page_url', true);
        error_log("Acelema Debug: Page ID $post_id_accessed restrict_page_access meta: " . var_export($is_page_restricted, true) . ", Subscriber URL: " . ($page_subscriber_url ?: 'None'));

        if (!$is_page_restricted) {
            error_log("Acelema Debug: Page ID $post_id_accessed is not restricted. Allowing access.");
            return;
        }

        $required_package_ids = get_post_meta($post_id_accessed, '_required_package_ids', true);
        if (!is_array($required_package_ids)) {
            $required_package_ids = [];
            error_log("Acelema Debug: No _required_package_ids meta found for page ID $post_id_accessed or invalid format.");
        } else {
            error_log("Acelema Debug: Page ID $post_id_accessed requires packages: " . print_r($required_package_ids, true));
        }

        if (empty($required_package_ids)) {
            error_log("Acelema Debug: Page ID $post_id_accessed is restricted but has no required packages. Denying access.");
            $final_redirect_url = !empty($page_subscriber_url) ? esc_url($page_subscriber_url) : $default_fallback_url;
            error_log("Acelema Debug: Redirecting to: $final_redirect_url");
            wp_redirect($final_redirect_url);
            exit;
        }

        if ($user_id) {
            $user_packages = get_user_meta($user_id, 'subscribed_packages', true) ?: [];
            if (!is_array($user_packages)) {
                $user_packages = [];
                error_log("Acelema Debug: User $user_id has no or invalid subscribed_packages meta.");
            }
            error_log("Acelema Debug: User $user_id subscribed packages: " . print_r($user_packages, true));

            $has_access = !empty(array_intersect($required_package_ids, $user_packages));
            if ($has_access) {
                error_log("Acelema Debug: User $user_id has a required package for page ID $post_id_accessed. Granting access.");
                return;
            } else {
                error_log("Acelema Debug: User $user_id does not have any required packages for page ID $post_id_accessed.");
            }
        } else {
            error_log("Acelema Debug: User is not logged in. Denying access for page ID $post_id_accessed.");
        }

        $final_redirect_url = !empty($page_subscriber_url) ? esc_url($page_subscriber_url) : $default_fallback_url;
        foreach ($required_package_ids as $package_id) {
            $url_from_package = get_post_meta($package_id, '_package_subscriber_page_url', true);
            if (!empty($url_from_package)) {
                $final_redirect_url = esc_url($url_from_package);
                error_log("Acelema Debug: Using package $package_id URL for redirect: $final_redirect_url");
                break;
            }
        }
    } else {
        $required_term_ids = wp_get_post_terms($post_id_accessed, 'service-category', ['fields' => 'ids']);
        if (is_wp_error($required_term_ids)) {
            $required_term_ids = [];
            error_log("Acelema Debug: Error retrieving terms for post ID $post_id_accessed: " . print_r($required_term_ids->get_error_messages(), true));
        }
        error_log("Acelema Debug: Post ID $post_id_accessed ($current_cpt) has service-category terms: " . print_r($required_term_ids, true));

        if (!empty($required_term_ids)) {
            $packages = get_posts([
                'post_type' => 'package',
                'posts_per_page' => -1,
                'fields' => 'ids',
                'post_status' => 'publish',
                'meta_query' => [
                    [
                        'key' => '_service_category_ids',
                        'compare' => 'EXISTS',
                    ],
                ],
            ]);
            foreach ($packages as $package_id) {
                $package_terms = get_post_meta($package_id, '_service_category_ids', true) ?: [];
                if (!is_array($package_terms)) {
                    $package_terms = [];
                    error_log("Acelema Debug: Package ID $package_id has no or invalid _service_category_ids meta.");
                }
                if (array_intersect($required_term_ids, $package_terms)) {
                    $required_package_ids[] = $package_id;
                }
            }
            error_log("Acelema Debug: Packages granting access to terms for post ID $post_id_accessed: " . print_r($required_package_ids, true));
        }

        if (empty($required_term_ids)) {
            error_log("Acelema Debug: No service-category terms required for post ID $post_id_accessed ($current_cpt). Allowing access.");
            return;
        }

        $access_granted = false;
        if (!empty($required_package_ids) && $user_id) {
            $user_packages = get_user_meta($user_id, 'subscribed_packages', true) ?: [];
            if (!is_array($user_packages)) {
                $user_packages = [];
                error_log("Acelema Debug: User $user_id has no or invalid subscribed_packages meta.");
            }
            error_log("Acelema Debug: User $user_id subscribed packages: " . print_r($user_packages, true));

            foreach ($required_package_ids as $package_id) {
                $package = get_post($package_id);
                if (!$package || $package->post_type !== 'package') {
                    error_log("Acelema Debug: Package ID $package_id is invalid or not a package post type. Skipping.");
                    continue;
                }
                if (in_array($package_id, $user_packages)) {
                    $term_ids = get_post_meta($package_id, '_service_category_ids', true) ?: [];
                    error_log("Acelema Debug: Checking package $package_id ({$package->post_title}) with terms: " . print_r($term_ids, true));
                    foreach ($term_ids as $term_id) {
                        $access = get_user_meta($user_id, "access_{$term_id}", true);
                        $term = get_term($term_id, 'service-category');
                        $term_name = $term && !is_wp_error($term) ? $term->name : 'Unknown Term';
                        error_log("Acelema Debug: Checking access for user $user_id to term $term_id ($term_name) via package $package_id: " . print_r($access, true));
                        if ($access && is_array($access) && isset($access['start']) && isset($access['end'])) {
                            $start_time = strtotime($access['start']);
                            $end_time = strtotime($access['end']);
                            $current_time = strtotime($now);
                            if ($current_time >= $start_time && $current_time <= $end_time) {
                                error_log("Acelema Debug: Active access found for user $user_id to package $package_id via term $term_id. Access granted.");
                                $access_granted = true;
                                break 2;
                            } else {
                                error_log("Acelema Debug: Access for term $term_id ($term_name) is expired or not yet active. Start: {$access['start']}, End: {$access['end']}, Current: $now");
                            }
                        } else {
                            error_log("Acelema Debug: No valid access data for user $user_id to term $term_id ($term_name).");
                        }
                    }
                } else {
                    error_log("Acelema Debug: User $user_id does not have package $package_id ({$package->post_title}).");
                }
            }
        } else if (!$user_id) {
            error_log("Acelema Debug: User is not logged in. Denying access for post ID $post_id_accessed.");
        } else {
            error_log("Acelema Debug: No required packages for post ID $post_id_accessed ($current_cpt) or user $user_id has no subscriptions.");
        }

        if ($access_granted) {
            error_log("Acelema Debug: User $user_id has active access to $current_cpt post $post_id_accessed. Allowing access.");
            return;
        }

        foreach ($required_package_ids as $package_id) {
            $url_from_package = get_post_meta($package_id, '_package_subscriber_page_url', true);
            if (!empty($url_from_package)) {
                $final_redirect_url = esc_url($url_from_package);
                error_log("Acelema Debug: Using package $package_id URL for redirect: $final_redirect_url");
                break;
            }
        }
    }

    if (! is_user_logged_in()) {
        $user_id = get_current_user_id();
        error_log(
            "Acelema Debug: Denying access to post ID $post_id_accessed ($current_cpt) for user $user_id. Redirecting to: $final_redirect_url"
        );
        wp_redirect($final_redirect_url);
        exit;
    }
});

add_filter('manage_edit-package_columns', function ($columns) {
    $columns['subscriber_count'] = 'Subscribers';
    return $columns;
});

add_action('manage_package_posts_custom_column', function ($column, $post_id) {
    if ($column === 'subscriber_count') {
        $args = array(
            'meta_query' => array(
                array(
                    'key'     => 'subscribed_packages',
                    'value'   => serialize(intval($post_id)),
                    'compare' => 'LIKE'
                )
            ),
            'count_total' => true,
            'fields'      => 'ids'
        );
        $user_query = new WP_User_Query($args);
        $count = $user_query->get_total();

        error_log("Acelema Debug: Package ID {$post_id} subscriber count query result: {$count}"); // Add this line

        update_post_meta($post_id, '_package_subscriber_count', $count);

        echo '<a href="' . admin_url('admin.php?page=view-subscribers&package_id=' . $post_id) . '">' . $count . '</a>';
    }
}, 10, 2);

add_shortcode('all_packages', function () {
    $args = [
        'post_type'      => 'package',
        'numberposts'    => -1,
        'post_status'    => 'publish',
        'meta_key'       => '_package_sort_order',
        'orderby'        => 'meta_value_num',
        'order'          => 'ASC',
    ];

    $packages = get_posts($args);

    if (empty($packages)) return '<p>No packages available.</p>';

    $output = '<style>
        .packages-section {background:#fff;padding:60px 20px;text-align:center;}
        .all-packages-grid {display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:30px;max-width:1200px;margin:0 auto;}
        .package-card {display:flex;flex-direction:column;justify-content:space-between;align-items:center;background:#F2F2F2;border-radius:16px;padding:50px 25px;color:#fff;text-align:center;box-shadow:0 8px 20px rgba(0,0,0,0.2);transition:transform 0.3s ease;}
        .package-card:hover {transform:translateY(-6px);}
        .package-card h3 {font-size:22px;font-weight:bold;margin-bottom:15px;color:#000;}
        .price-section {margin:15px 0 0;font-size:20px;font-weight:bold;color:#0049ac;}
        .price-section del {color:#0049ac;margin-right:8px;}
        .price-section .sale {color:#FF5252;font-size:22px;}
        .duration {font-size:14px;margin-bottom:20px;display:block;color:#212121;}
        .features {list-style:none;padding:0;margin:0;}
        .features li {padding:10px 0;font-size:15px;color:#0049ac;}
        .features li:not(:first-child){border-top:1px solid rgb(44 44 44 / 30%);}
        .buy-btn {display:inline-block;margin-top:20px;background:#fff;color:#0049ac;padding:12px 25px;text-decoration:none;font-weight:bold;border-radius:6px;font-size:16px;transition:all 0.3s;}
        .buy-btn:hover {background:#0049ac;color:#fff;border:1px solid #0049ac;}
    </style>';

    $output .= '<div class="packages-section"><div class="all-packages-grid">';

    $now = current_time('timestamp');

    foreach ($packages as $pkg) {
        $package_id = $pkg->ID;
        $title = esc_html($pkg->post_title);
        if (
            strtolower(trim($title)) === '7 day free trial' ||
            $package_id == 41287
        ) {
            continue;
        }

        $price = get_post_meta($package_id, '_package_price', true);
        $duration = get_post_meta($package_id, '_package_duration_months', true) ?: 1;
        $sale_end = get_post_meta($package_id, '_package_sale_end', true);
        $sale_price = get_post_meta($package_id, '_package_sale_price', true);

        $is_sale_active = ($sale_end && strtotime($sale_end) >= $now);

        $linked_product = get_posts([
            'post_type' => 'product',
            'meta_query' => [['key' => '_linked_package_id', 'value' => $package_id]],
            'posts_per_page' => 1
        ]);

        $buy_link = !empty($linked_product) ? get_permalink($linked_product[0]->ID) : '#';

        $features_raw = strip_tags($pkg->post_content);
        $features_array = preg_split("/\r\n|\n|\r/", $features_raw);

        $extra_class = '';
        $custom_style = '';
        $btn_style = '';

        if (strtolower($title) === 'imperial membership plan') {
            $extra_class = ' imperial-package';
            $custom_style = 'background:#000000;color:#FFD700 !important;';
            $btn_style = 'background:#FFD700;color:#000000;';
        }

        $output .= "<div class='package-card{$extra_class}' style='{$custom_style}'>
        <h3>{$title}</h3><div class='price-section'>";
        if ($is_sale_active && $sale_price && $sale_price < $price) {
            $output .= "<del>A\${$price}</del> <span class='sale'>A\${$sale_price}</span>";
        } else {
            $output .= "A\${$price}";
        }
        $output .= "</div><span class='duration'>Per {$duration} Months</span>";

        if (!empty($features_array)) {
            $output .= "<ul class='features'>";
            foreach ($features_array as $feature) {
                if (trim($feature) !== '') {
                    $output .= "<li>" . esc_html($feature) . "</li>";
                }
            }
            $output .= "</ul>";
        }

        $output .= "<a href='{$buy_link}' class='buy-btn' style='{$btn_style}'>KNOW MORE</a></div>";
    }

    $output .= '</div></div>';
    return $output;
});

add_shortcode('package_duration', function () {
    if (!is_product()) return '';
    global $product;
    $product_id = $product->get_id();
    $package_id = get_post_meta($product_id, '_linked_package_id', true);
    if ($package_id) {
        $duration_months = get_post_meta($package_id, '_package_duration_months', true);
        if ($duration_months) {
            return '<div class="wc-package-duration" style="font-size:16px;color:#000;margin:0;">
                            Per ' . esc_html($duration_months) . ' Month' . ($duration_months > 1 ? 's' : '') . '
                        </div>';
        }
    }
    return '';
});


add_shortcode('package_sale_banner', function () {
    if (!is_product()) return '';
    global $product;
    $product_id = $product->get_id();
    $package_id = get_post_meta($product_id, '_linked_package_id', true);
    if ($package_id) {
        $banner = get_post_meta($package_id, '_package_sale_banner', true);
        if ($banner) {
            return '<div class="package-sale-banner" style="margin:15px 0;"><img src="' . esc_url($banner) . '" style="max-width:100%;border-radius:8px;"></div>';
        }
    }
    return '';
});


add_shortcode('package_sale_period', function () {
    if (!is_product()) return '';
    global $product;
    $product_id = $product->get_id();
    $package_id = get_post_meta($product_id, '_linked_package_id', true);

    if ($package_id) {
        $sale_end = trim(get_post_meta($package_id, '_package_sale_end', true));
        if ($sale_end) {
            try {
                // Parse ISO 8601 string and set Sydney timezone
                $tz = new DateTimeZone('Australia/Sydney');
                $end_dt = new DateTime($sale_end, $tz);

                $now_dt = new DateTime('now', $tz);
                if ($end_dt > $now_dt) {
                    $end_time_ms = $end_dt->getTimestamp() * 1000;

                    ob_start(); ?>
                    <div class="sale-countdown" style="font-size:18px;font-weight:bold;color:#d32f2f;margin:15px 0;">
                        Sale ends in: <span id="countdown-timer">Loading...</span>
                    </div>
                    <script>
                        (function() {
                            const countdownElem = document.getElementById('countdown-timer');
                            const endTime = <?php echo $end_time_ms; ?>;

                            function updateCountdown() {
                                const now = new Date().getTime();
                                const distance = endTime - now;
                                if (distance <= 0) {
                                    countdownElem.parentElement.style.display = 'none';
                                    return;
                                }
                                const hours = Math.floor(distance / (1000 * 60 * 60));
                                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                                const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                                countdownElem.textContent = `${hours}h ${minutes}m ${seconds}s`;
                            }

                            updateCountdown();
                            setInterval(updateCountdown, 1000);
                        })();
                    </script>
    <?php
                    return ob_get_clean();
                }
            } catch (Exception $e) {
                return '';
            }
        }
    }
    return '';
});

add_action('admin_menu', 'acelema_add_remove_subscriptions_page');
function acelema_add_remove_subscriptions_page()
{
    add_submenu_page(
        'edit.php?post_type=package',
        'Remove All Subscriptions',
        'Remove All Subs',
        'manage_options',
        'remove-all-subscriptions',
        'acelema_render_remove_subscriptions_page'
    );
}

add_action('admin_post_acelema_remove_all_subscriptions', 'acelema_remove_all_user_subscriptions_action');
function acelema_remove_all_user_subscriptions_action()
{
    if (!current_user_can('manage_options')) {
        wp_die(__('You do not have sufficient permissions to perform this action.'));
    }

    if (isset($_POST['acelema_remove_all_subs_nonce']) && wp_verify_nonce($_POST['acelema_remove_all_subs_nonce'], 'acelema_remove_all_subscriptions')) {
        global $wpdb;
        error_log("Acelema Debug: Initiating 'Remove All Subscriptions' action.");
        $deleted_subscribed_meta = $wpdb->query("DELETE FROM {$wpdb->usermeta} WHERE meta_key = 'subscribed_packages'");
        error_log("Acelema Debug: Deleted 'subscribed_packages' user meta for {$deleted_subscribed_meta} rows.");
        $deleted_access_meta = $wpdb->query("DELETE FROM {$wpdb->usermeta} WHERE meta_key LIKE 'access_%'");
        error_log("Acelema Debug: Deleted 'access_{term_id}' user meta for {$deleted_access_meta} rows.");
        $packages = get_posts([
            'post_type' => 'package',
            'numberposts' => -1,
            'fields' => 'ids'
        ]);

        $reset_count_packages = 0;
        if (!empty($packages)) {
            foreach ($packages as $package_id) {
                delete_post_meta($package_id, '_package_subscriber_count');
                add_post_meta($package_id, '_package_subscriber_count', 0, true);
                wp_cache_delete($package_id, 'post_meta');
                $reset_count_packages++;
            }
        }
        error_log("Acelema Debug: Reset subscriber count for {$reset_count_packages} packages to 0.");
        if (function_exists('wp_cache_flush')) {
            wp_cache_flush();
            error_log('Acelema Debug: WordPress object cache flushed.');
        }
        wp_redirect(add_query_arg('message', 'subscriptions_removed', admin_url('edit.php?post_type=package')));
        exit;
    } else {
        error_log("Acelema Debug: Invalid nonce or direct access attempt for 'Remove All Subscriptions' action.");
        wp_die(__('Invalid nonce or direct access not allowed.'));
    }
}

function acelema_render_remove_subscriptions_page()
{
    if (!current_user_can('manage_options')) {
        wp_die(__('You do not have sufficient permissions to access this page.'));
    }

    $message = '';
    if (isset($_GET['message'])) {
        if ($_GET['message'] === 'subscriptions_removed') {
            $message = '<div class="notice notice-success is-dismissible"><p>All user subscription packages and their associated access have been successfully removed, and package subscriber counts reset.</p></div>';
        } elseif ($_GET['message'] === 'error_nonce') {
            $message = '<div class="notice notice-error is-dismissible"><p>Security check failed. Please try again.</p></div>';
        }
    }
    ?>
    <div class="wrap">
        <h1>Remove All User Subscriptions</h1>
        <?php echo $message; ?>
        <p><strong><span style="color: red;">WARNING:</span> This action will permanently delete all subscription data for all users. This includes their `subscribed_packages` meta and all `access_{term_id}` meta keys. This action cannot be undone.</strong></p>
        <p>Please ensure you have a **full database backup** before proceeding.</p>

        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <input type="hidden" name="action" value="acelema_remove_all_subscriptions">
            <?php wp_nonce_field('acelema_remove_all_subscriptions', 'acelema_remove_all_subs_nonce'); ?>
            <p>
                <input type="submit" class="button button-primary" value="Confirm and Remove All Subscriptions" onclick="return confirm('Are you absolutely sure you want to remove ALL user subscriptions? This action is irreversible!');">
            </p>
        </form>
    </div>
<?php
}

add_action('admin_menu', 'acelema_add_subscriber_list_page');

function acelema_add_subscriber_list_page()
{
    add_submenu_page(
        'edit.php?post_type=package',
        'Subscribed Package Users',
        'Subscribers',
        'manage_options',
        'view-subscribers',
        'acelema_render_subscriber_list_page'
    );
}


function acelema_render_subscriber_list_page()
{
    if (!current_user_can('manage_options')) {
        wp_die(__('You do not have sufficient permissions to access this page.'));
    }

    $package_id      = isset($_GET['package_id']) ? intval($_GET['package_id']) : 0;
    $edit_user_id    = isset($_GET['user_id']) && isset($_GET['edit']) ? intval($_GET['user_id']) : 0;
    $view_user_id    = isset($_GET['user_id']) && !isset($_GET['edit']) ? intval($_GET['user_id']) : 0;
    $edit_package_id = isset($_GET['package_id']) && isset($_GET['edit']) ? intval($_GET['package_id']) : 0;
    $message         = '';

    // Notices
    if (isset($_GET['message'])) {
        $notices = [
            'subscription_updated' => ['success', 'Subscription updated successfully.'],
            'subscription_added'   => ['success', 'New package added successfully.'],
            'error_nonce'          => ['error', 'Security check failed. Please try again.'],
            'error_invalid_data'   => ['error', 'Invalid or missing data. Please check all fields and try again.'],
        ];
        if (isset($notices[$_GET['message']])) {
            $class = $notices[$_GET['message']][0];
            $text  = $notices[$_GET['message']][1];
            $message = '<div class="notice notice-' . esc_attr($class) . ' is-dismissible"><p>' . esc_html($text) . '</p></div>';
        }
    }
?>
    <div class="wrap">
        <h1>Subscribed Package Users<?php echo $package_id && !$edit_user_id && !$view_user_id ? ' for ' . esc_html(get_post($package_id)->post_title) : ''; ?></h1>
        <?php echo $message; ?>

        <?php
        global $wpdb;

        $user_ids_to_display = [];

        if ($edit_user_id) {
            $user = get_userdata($edit_user_id);
            if ($user) $user_ids_to_display = [$edit_user_id];
        } elseif ($view_user_id) {
            $user = get_userdata($view_user_id);
            if ($user) $user_ids_to_display = [$view_user_id];
        } else {
            $users_query_args = [
                'meta_query' => [
                    'relation' => 'AND',
                    ['key' => 'subscribed_packages', 'compare' => 'EXISTS'],
                    ['key' => 'subscribed_packages', 'value' => '', 'compare' => '!='],
                ],
                'fields' => 'ID',
                'number' => -1,
            ];

            if ($package_id) {
                $users_query_args['meta_query'][] = [
                    'key' => 'subscribed_packages',
                    'value' => serialize(intval($package_id)),
                    'compare' => 'LIKE',
                ];
            }

            $users_query = new WP_User_Query($users_query_args);
            $user_ids_to_display = $users_query->get_results();
        }

        if (empty($user_ids_to_display)) {
            echo '<p>No users subscribed to packages found' . ($package_id && !$edit_user_id && !$view_user_id ? ' for this package' : '') . '.</p>';
        } else {
        ?>
            <style>
                .user-master-row {
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .user-master-row:hover {
                    background-color: #f0f6fb !important;
                }

                .subscription-details-row {
                    background-color: #fafafa !important;
                    display: none;
                }

                .toggle-icon {
                    display: inline-block;
                    width: 20px;
                    font-weight: bold;
                    color: #2271b1;
                    text-align: center;
                }

                .details-container {
                    padding: 10px;
                    border-left: 3px solid #2271b1;
                }
            </style>

            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th style="width: 50px;">Sr.</th>
                        <th>User ID</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Subscribed Packages</th>
                        <th style="width: 10%;">Start Date</th>
                        <th style="width: 10%;">End Date</th>
                        <th>Price</th>
                        <th>Upsell Price</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php
                    $sr_no = 0;

                    foreach ($user_ids_to_display as $user_id) {
                        $user = get_userdata($user_id);
                        if (!$user) continue;

                        $subscribed_packages = get_user_meta($user->ID, 'subscribed_packages', true);
                        if (!is_array($subscribed_packages)) $subscribed_packages = [];

                        $package_names = [];
                        $start_dates   = [];
                        $end_dates     = [];
                        $prices        = [];
                        $upsell_prices = [];

                        // Filter packages if needed
                        $packages_to_process = $subscribed_packages;
                        if ($package_id && !$edit_user_id && !$view_user_id) {
                            $packages_to_process = array_filter($subscribed_packages, function ($pkg_id_inner) use ($package_id) {
                                return $pkg_id_inner == $package_id;
                            });
                        }

                        foreach ($packages_to_process as $sub_package_id) {
                            $pkg_post = get_post($sub_package_id);
                            if (!$pkg_post) continue;
                            $package_names[] = esc_html($pkg_post->post_title);

                            $term_ids = get_post_meta($sub_package_id, '_service_category_ids', true) ?: [];
                            $access_start = $access_end = '-';
                            foreach ($term_ids as $term_id) {
                                $access = get_user_meta($user->ID, "access_{$term_id}", true);
                                if ($access && isset($access['start'], $access['end'])) {
                                    $access_start = $access['start'];
                                    $access_end   = $access['end'];
                                    break;
                                }
                            }
                            $start_dates[]   = $access_start;
                            $end_dates[]     = $access_end;

                            $subscription_meta = get_user_meta($user->ID, "subscription_{$sub_package_id}", true);
                            $prices[]        = isset($subscription_meta['price']) ? "A$" . number_format(floatval($subscription_meta['price']), 2) : '-';
                            $upsell_prices[] = isset($subscription_meta['upsell_price']) ? "A$" . number_format(floatval($subscription_meta['upsell_price']), 2) : '-';
                        }

                        if (!empty($package_names)) {
                            $sr_no++;
                            // MASTER ROW (Initial View)
                            echo '<tr class="user-master-row" data-user-id="' . $user->ID . '">';
                            echo '<td><span class="toggle-icon">+</span> ' . $sr_no . '</td>';
                            echo '<td>' . esc_html($user->ID) . '</td>';
                            echo '<td>' . (esc_html($user->user_login) ?: esc_html($user->user_email)) . '</td>';
                            echo '<td><a href="mailto:' . esc_attr($user->user_email) . '">' . esc_html($user->user_email) . '</a></td>';
                            echo '<td colspan="5" style="color: #666; font-style: italic;">Click to expand ' . count($package_names) . ' package(s)</td>';
                            echo '<td>';
                            echo '<a href="' . esc_url(add_query_arg(['user_id' => $user->ID, 'edit' => 1], admin_url('admin.php?page=view-subscribers'))) . '" class="button">Edit User</a>';
                            echo '</td>';
                            echo '</tr>';

                            // DETAIL ROW (Initially Hidden)
                            echo '<tr class="subscription-details-row" id="details-' . $user->ID . '">';
                            echo '<td colspan="4"></td>';
                            echo '<td colspan="6">';

                            echo '<table style="width:100%; border-collapse:collapse; margin-top:10px;">';
                            echo '<tr style="background:#f6f7f7;">
        <th style="padding:10px; border:1px solid #ddd;">Package</th>
        <th style="padding:10px; border:1px solid #ddd;">Start</th>
        <th style="padding:10px; border:1px solid #ddd;">End</th>
        <th style="padding:10px; border:1px solid #ddd;">Price</th>
        <th style="padding:10px; border:1px solid #ddd;">Upsell</th>
        <th style="padding:10px; border:1px solid #ddd;">Action</th>
      </tr>';

                            foreach ($packages_to_process as $sub_package_id) {

                                $pkg_post = get_post($sub_package_id);
                                if (!$pkg_post) continue;

                                $package_name = esc_html($pkg_post->post_title);

                                $term_ids = get_post_meta($sub_package_id, '_service_category_ids', true) ?: [];
                                $access_start = '-';
                                $access_end   = '-';

                                foreach ($term_ids as $term_id) {
                                    $access = get_user_meta($user->ID, "access_{$term_id}", true);
                                    if ($access && isset($access['start'], $access['end'])) {
                                        $access_start = $access['start'];
                                        $access_end   = $access['end'];
                                        break;
                                    }
                                }

                                $subscription_meta = get_user_meta($user->ID, "subscription_{$sub_package_id}", true);

                                $price = isset($subscription_meta['price']) ? "A$" . number_format(floatval($subscription_meta['price']), 2) : '-';
                                $upsell = isset($subscription_meta['upsell_price']) ? "A$" . number_format(floatval($subscription_meta['upsell_price']), 2) : '-';

                                $remove_url = add_query_arg([
                                    'action'     => 'acelema_remove_subscription',
                                    'user_id'    => $user->ID,
                                    'package_id' => $sub_package_id,
                                    '_wpnonce'   => wp_create_nonce('acelema_remove_subscription_' . $user->ID . '_' . $sub_package_id)
                                ], admin_url('admin-post.php'));

                                echo '<tr>
            <td style="padding:10px; border:1px solid #ddd;">' . $package_name . '</td>
            <td style="padding:10px; border:1px solid #ddd;">' . $access_start . '</td>
            <td style="padding:10px; border:1px solid #ddd;">' . $access_end . '</td>
            <td style="padding:10px; border:1px solid #ddd;">' . $price . '</td>
            <td style="padding:10px; border:1px solid #ddd;">' . $upsell . '</td>
            <td style="padding:10px; border:1px solid #ddd;">
                <a href="' . esc_url($remove_url) . '" class="button button-secondary" onclick="return confirm(\'Remove this package?\');">Remove</a>
            </td>
          </tr>';
                            }

                            echo '</table>';

                            echo '<a href="' . esc_url(add_query_arg([
                                'action' => 'acelema_remove_subscription',
                                'user_id' => $user->ID,
                                'removeAll' => true,
                                '_wpnonce' => wp_create_nonce('acelema_remove_subscription_all_' . $user->ID)
                            ], admin_url('admin-post.php'))) . '" class="button" onclick="return confirm(\'Remove all subscriptions?\');">Remove All</a>';

                            echo '</td>';
                            echo '</tr>';
                        }
                    }
                    ?>
                </tbody>
            </table>

            <script type="text/javascript">
                jQuery(document).ready(function($) {
                    $('.user-master-row').on('click', function(e) {
                        if ($(e.target).is('a') || $(e.target).parent().is('a')) {
                            return;
                        }

                        var detailsRow = $(this).next('.subscription-details-row');
                        var icon = $(this).find('.toggle-icon');

                        detailsRow.fadeToggle(150);

                        if (icon.text() === '+') {
                            icon.text('-');
                            $(this).css('background-color', '#f0f6fb');
                        } else {
                            icon.text('+');
                            $(this).css('background-color', '');
                        }
                    });
                });
            </script>
            <?php
        }
        if ($edit_user_id) {
            $user = get_userdata($edit_user_id);
            if ($user) {
                $subscription_key = $edit_package_id ? "subscription_{$edit_package_id}" : '';
                $subscription_meta = $edit_package_id ? get_user_meta($edit_user_id, $subscription_key, true) : [];
                $current_price = isset($subscription_meta['price']) ? number_format(floatval($subscription_meta['price']), 2) : '';
                $current_upsell_price = isset($subscription_meta['upsell_price']) ? number_format(floatval($subscription_meta['upsell_price']), 2) : '';
                $current_start_date = '';
                $current_end_date = '';
                $current_service_categories = [];

                if ($edit_package_id) {
                    $term_ids = get_post_meta($edit_package_id, '_service_category_ids', true) ?: [];
                    foreach ($term_ids as $term_id) {
                        $access = get_user_meta($edit_user_id, "access_{$term_id}", true);
                        if ($access && isset($access['start'], $access['end'])) {
                            $current_start_date = $access['start'];
                            $current_end_date = $access['end'];
                            break;
                        }
                    }
                    if (!empty($term_ids)) {
                        $terms = get_terms(['include' => $term_ids, 'taxonomy' => 'service-category', 'hide_empty' => false]);
                        if (!is_wp_error($terms) && !empty($terms)) {
                            foreach ($terms as $term) {
                                $current_service_categories[] = $term->term_id;
                            }
                        }
                    }
                }

                $packages = get_posts(['post_type' => 'package', 'numberposts' => -1, 'post_status' => 'publish']);
                $service_categories = get_terms(['taxonomy' => 'service-category', 'hide_empty' => false]);

                $package_category_map = [];
                foreach ($packages as $package) {
                    $term_ids = get_post_meta($package->ID, '_service_category_ids', true) ?: [];
                    $package_category_map[$package->ID] = array_map('intval', $term_ids);
                }
            ?>

                <h2>Manage Subscriptions for <?php echo esc_html($user->user_email); ?></h2>
                <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                    <input type="hidden" name="action" value="acelema_edit_subscription">
                    <input type="hidden" name="user_id" value="<?php echo esc_attr($edit_user_id); ?>">
                    <input type="hidden" name="current_package_id" value="<?php echo esc_attr($edit_package_id); ?>">
                    <input type="hidden" name="current_url" value="<?php echo admin_url('admin.php?' . $_SERVER['QUERY_STRING']); ?>">
                    <?php wp_nonce_field('acelema_edit_subscription', 'acelema_edit_subscription_nonce'); ?>

                    <h3>Action</h3>
                    <table class="form-table">
                        <tr>
                            <th><label>Choose Action</label></th>
                            <td>
                                <label><input type="radio" name="action_type" value="edit" <?php checked(!$edit_package_id); ?> required> Edit Existing Subscription</label><br>
                                <label><input type="radio" name="action_type" value="add" <?php checked(!$edit_package_id); ?>> Add New Package</label>
                                <p class="description">Select whether to edit an existing subscription or add a new package.</p>
                            </td>
                        </tr>
                    </table>

                    <h3>Subscription Details</h3>
                    <table class="form-table">
                        <tr>
                            <th><label for="package_id">Select Package</label></th>
                            <td>
                                <select name="package_id" id="package_id" required>
                                    <option value="">Select a Package</option>
                                    <?php foreach ($packages as $package) : ?>
                                        <option value="<?php echo esc_attr($package->ID); ?>" <?php selected($package->ID, $edit_package_id); ?>>
                                            <?php echo esc_html($package->post_title); ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                                <p class="description">Choose the package for this subscription.</p>
                            </td>
                        </tr>

                        <tr>
                            <th><label>Service Categories</label></th>
                            <td>
                                <?php foreach ($service_categories as $category) : ?>
                                    <label>
                                        <input type="checkbox" name="service_category_id[]" value="<?php echo esc_attr($category->term_id); ?>" <?php checked(in_array($category->term_id, $current_service_categories)); ?>>
                                        <?php echo esc_html($category->name); ?>
                                    </label><br>
                                <?php endforeach; ?>
                                <p class="description">Select one or more service categories for this subscription.</p>
                            </td>
                        </tr>

                        <tr>
                            <th><label for="start_date">Start Date</label></th>
                            <td>
                                <!-- <input type="datetime-local" name="start_date" id="start_date" value="<?php //echo esc_attr($current_start_date ? date('Y-m-d\TH:i', strtotime($current_start_date)) : date('Y-m-d\TH:i'));
                                                                                                            ?>" required> -->
                                <input type="datetime-local" name="start_date" id="start_date" value="" required>
                                <p class="description">Subscription start date and time.</p>
                            </td>
                        </tr>

                        <tr>
                            <th><label for="end_date">End Date</label></th>
                            <td>
                                <!-- <input type="datetime-local" name="end_date" id="end_date" value="<?php //echo esc_attr($current_end_date ? date('Y-m-d\TH:i', strtotime($current_end_date)) : date('Y-m-d\TH:i', strtotime('+1 month')));
                                                                                                        ?>" required> -->
                                <input type="datetime-local" name="end_date" id="end_date" value="" required>
                                <p class="description">Subscription end date and time.</p>
                            </td>
                        </tr>

                        <tr>
                            <th><label for="subscription_price">Subscription Price (A$)</label></th>
                            <td>
                                <input type="number" name="subscription_price" id="subscription_price" step="0.01" min="0" value="<?php echo esc_attr($current_price); ?>" class="small-text" required>
                                <p class="description">The price charged for this subscription (e.g., 99.99).</p>
                            </td>
                        </tr>

                        <tr>
                            <th><label for="subscription_upsell_price">Upsell Price (A$)</label></th>
                            <td>
                                <input type="number" name="subscription_upsell_price" id="subscription_upsell_price" step="0.01" min="0" value="<?php echo esc_attr($current_upsell_price); ?>" class="small-text">
                                <p class="description">Optional: Additional upsell price for this subscription (e.g., 19.99).</p>
                            </td>
                        </tr>
                    </table>

                    <p class="submit">
                        <input type="submit" class="button button-primary" value="Save Changes" onclick="return confirm('Are you sure you want to save these changes?');">
                    </p>
                </form>

                <script>
                    var packageCategoryMap = <?php echo wp_json_encode($package_category_map); ?>;
                    document.addEventListener('DOMContentLoaded', function() {
                        const packageSelect = document.getElementById('package_id');
                        const checkboxes = document.querySelectorAll('input[name="service_category_id[]"]');

                        packageSelect.addEventListener('change', function() {
                            checkboxes.forEach(cb => cb.checked = false);
                            const selectedPackageId = packageSelect.value;
                            if (selectedPackageId && packageCategoryMap[selectedPackageId]) {
                                packageCategoryMap[selectedPackageId].forEach(termId => {
                                    const cb = document.querySelector('input[name="service_category_id[]"][value="' + termId + '"]');
                                    if (cb) cb.checked = true;
                                });
                            }
                        });
                    });
                </script>

        <?php
            }
        }
        ?>

    </div>
<?php
}

add_filter('gettext', 'acelema_change_add_to_cart_text', 20, 3);
add_filter('ngettext', 'acelema_change_add_to_cart_text', 20, 3);

add_action('admin_post_acelema_edit_subscription', 'acelema_handle_edit_subscription');


function acelema_handle_edit_subscription()
{
    if (!current_user_can('manage_options')) {
        wp_die(__('You do not have sufficient permissions to perform this action.'));
    }

    if (!isset($_POST['acelema_edit_subscription_nonce']) || !wp_verify_nonce($_POST['acelema_edit_subscription_nonce'], 'acelema_edit_subscription')) {
        wp_redirect(add_query_arg('message', 'error_nonce', $_POST['current_url']));
        exit;
    }

    $user_id            = intval($_POST['user_id'] ?? 0);
    $current_package_id = intval($_POST['current_package_id'] ?? 0); // The package being edited
    $new_package_id     = intval($_POST['package_id'] ?? 0);
    $start_date         = sanitize_text_field($_POST['start_date'] ?? '');
    $end_date           = sanitize_text_field($_POST['end_date'] ?? '');
    $price              = floatval($_POST['subscription_price'] ?? 0);
    $upsell_price       = floatval($_POST['subscription_upsell_price'] ?? 0);
    $action_type        = sanitize_text_field($_POST['action_type'] ?? 'edit');
    $current_url        = $_POST['current_url'];

    if (!$user_id || !$new_package_id || !$start_date || !$end_date) {
        wp_redirect(add_query_arg('message', 'error_invalid_data', $current_url));
        exit;
    }

    $subscribed_packages = get_user_meta($user_id, 'subscribed_packages', true) ?: [];

    // --- LOGIC FOR INDIVIDUAL EDIT ---
    if ($action_type === 'edit') {
        // 1. Update the price/upsell for the specific package ONLY
        update_user_meta($user_id, "subscription_{$new_package_id}", [
            'price' => $price,
            'upsell_price' => $upsell_price,
        ]);

        // 2. Update access dates ONLY for categories belonging to this specific package
        $term_ids = get_post_meta($new_package_id, '_service_category_ids', true) ?: [];
        foreach ($term_ids as $term_id) {
            update_user_meta($user_id, "access_{$term_id}", [
                'start'      => $start_date,
                'end'        => $end_date,
                'package_id' => $new_package_id,
            ]);
        }

        // 3. Handle Package ID Swap (if you changed which package it is)
        if ($current_package_id && $new_package_id !== $current_package_id) {
            $subscribed_packages = array_diff($subscribed_packages, [$current_package_id]);
            $subscribed_packages[] = $new_package_id;
            update_user_meta($user_id, 'subscribed_packages', array_values(array_unique($subscribed_packages)));
            delete_user_meta($user_id, "subscription_{$current_package_id}");
        }

        // CRITICAL: Stop here. Do not run any related_packages_map or loops.
        wp_redirect(add_query_arg('message', 'subscription_updated', $current_url));
        exit;
    }
    if ($action_type === 'add') {
        if (!in_array($new_package_id, $subscribed_packages)) {
            $subscribed_packages[] = $new_package_id;
        }

        update_user_meta($user_id, "subscription_{$new_package_id}", [
            'price' => $price,
            'upsell_price' => $upsell_price,
        ]);

        $term_ids = get_post_meta($new_package_id, '_service_category_ids', true) ?: [];
        foreach ($term_ids as $term_id) {
            update_user_meta($user_id, "access_{$term_id}", [
                'start'      => $start_date,
                'end'        => $end_date,
                'package_id' => $new_package_id,
            ]);
        }

        $related_packages_map = [
            26710 => [26698, 26700, 26701, 26703],
            26702 => [26698, 26700, 26701],
            26709 => [26698, 26700, 26701, 26702, 26703, 26704, 26705, 26706, 26707, 26708, 26710, 37181, 37185, 39437, 45155, 43299],
        ];

        if (isset($related_packages_map[$new_package_id])) {
            foreach ($related_packages_map[$new_package_id] as $rel_id) {
                if (!in_array($rel_id, $subscribed_packages)) {
                    $subscribed_packages[] = $rel_id;
                    update_user_meta($user_id, "subscription_{$rel_id}", ['price' => $price, 'upsell_price' => $upsell_price]);
                }
            }
        }

        update_user_meta($user_id, 'subscribed_packages', array_values(array_unique($subscribed_packages)));
        wp_redirect(add_query_arg('message', 'subscription_added', $current_url));
        exit;
    }
}

function acelema_change_add_to_cart_text($translated_text, $text, $domain)
{
    if ('woocommerce' === $domain) {
        switch ($translated_text) {
            case 'Add to cart':
                $translated_text = esc_html__('Subscribe Now', 'your-text-domain');
                break;
            case 'Add to Cart':
                $translated_text = esc_html__('Subscribe Now', 'your-text-domain');
                break;
        }
    }
    return $translated_text;
}
add_filter('woocommerce_product_single_add_to_cart_text', 'acelema_single_product_add_to_cart_text');
function acelema_single_product_add_to_cart_text()
{
    return esc_html__('Subscribe Now', 'your-text-domain');
}

add_filter('woocommerce_product_add_to_cart_text', 'acelema_archive_add_to_cart_text');
function acelema_archive_add_to_cart_text()
{
    return esc_html__('Subscribe Now', 'your-text-domain');
}

add_filter('the_content', function ($content) {
    if (is_singular('reports') && is_main_query()) {
        error_log("Acelema Debug: 'the_content' filter for report initiated for post " . get_the_ID());

        if (!is_user_logged_in()) {
            error_log("Acelema Debug: User not logged in, redirecting to login page.");
            return '<p>You must <a href="' . site_url('/login') . '">login</a> to view this report.</p>';
        }

        $user_id = get_current_user_id();
        error_log("Acelema Debug: Current user ID: $user_id");

        $user_packages = get_user_meta($user_id, 'subscribed_packages', true);

        if (!is_array($user_packages) || empty($user_packages)) {
            error_log("Acelema Debug: User $user_id has no subscribed packages (or it's not an array) for report access. Redirecting.");
            return '<p>This report is restricted. <a href="' . site_url('/subscribe') . '">Purchase a package</a> to access it.</p>';
        }
        error_log("Acelema Debug: User $user_id subscribed packages: " . print_r($user_packages, true));

        $report_terms = wp_get_post_terms(get_the_ID(), 'service-category', ['fields' => 'ids']);
        error_log("Acelema Debug: Report " . get_the_ID() . " has service-categories: " . print_r($report_terms, true));


        if (!empty($report_terms)) {
            foreach ($user_packages as $package_id) {
                $package_id = intval($package_id);

                $package_terms = get_post_meta($package_id, '_service_category_ids', true) ?: [];
                error_log("Acelema Debug: Checking user package ID: $package_id, grants access to terms: " . print_r($package_terms, true));
                $intersecting_terms = array_intersect($report_terms, $package_terms);

                if (!empty($intersecting_terms)) {
                    error_log("Acelema Debug: Found intersecting terms for package $package_id: " . print_r($intersecting_terms, true));
                    $has_active_access = false;
                    $now = current_time('Y-m-d H:i:s');
                    foreach ($intersecting_terms as $report_term_id) {
                        $access = get_user_meta($user_id, "access_{$report_term_id}", true);
                        error_log("Acelema Debug: Checking access for user $user_id for term $report_term_id: " . print_r($access, true));

                        if ($access && is_array($access) && isset($access['start']) && isset($access['end'])) {
                            if (strtotime($now) >= strtotime($access['start']) && strtotime($now) <= strtotime($access['end'])) {
                                $has_active_access = true;
                                error_log("Acelema Debug: User $user_id has active access for term $report_term_id.");
                                break;
                            } else {
                                error_log("Acelema Debug: Access for term $report_term_id is not active (start: {$access['start']}, end: {$access['end']}, now: $now).");
                            }
                        } else {
                            error_log("Acelema Debug: No valid access meta found for term $report_term_id for user $user_id.");
                        }
                    }

                    if ($has_active_access) {
                        error_log("Acelema Debug: User $user_id granted access to report " . get_the_ID() . " via package $package_id with active term access. Returning content.");
                        return $content;
                    } else {
                        error_log("Acelema Debug: User $user_id's access for package $package_id has intersecting terms but no *active* access found among them. Checking next package...");
                    }
                } else {
                    error_log("Acelema Debug: No intersecting terms between report " . get_the_ID() . " and package $package_id.");
                }
            }
        } else {
            error_log("Acelema Debug: Report " . get_the_ID() . " has no associated service-category terms.");
        }

        error_log("Acelema Debug: User $user_id denied access to report " . get_the_ID() . ". No active package found with relevant term access. Redirecting to subscribe page.");
        return '<p>This report is restricted. <a href="' . site_url('/subscribe') . '">Purchase a package</a> to access it.</p>';
    }
    return $content;
});

add_action('add_meta_boxes', function () {
    add_meta_box(
        'page_access_settings',
        'Page Access & Subscription',
        function ($post) {
            wp_nonce_field('save_page_access_settings', 'page_access_nonce');

            $restrict_access = get_post_meta($post->ID, '_restrict_page_access', true);
            $page_subscriber_url = get_post_meta($post->ID, '_page_subscriber_page_url', true) ?: '';
            $selected_packages = get_post_meta($post->ID, '_required_package_ids', true) ?: [];
            $all_packages = get_posts(['post_type' => 'package', 'numberposts' => -1, 'post_status' => 'publish']);

            echo '<p>';
            echo '<label><input type="checkbox" name="restrict_page_access" value="1" ' . checked(1, $restrict_access, false) . '> Restrict Access to this Page</label>';
            echo '</p>';

            echo '<p><strong>Subscriber-Specific Page URL (for this page):</strong></p>';
            echo "<input type='url' name='page_subscriber_page_url' value='" . esc_url($page_subscriber_url) . "' style='width:100%;' placeholder='e.g., https://yoursite.com/this-page-subscribe'><br>";
            echo "<small>If set, users without access will be redirected here. Otherwise, a relevant package page or /subscribe will be used.</small><br><br>";

            if (!empty($all_packages)) {
                echo '<p><strong>Page Requires Access to Packages:</strong></p>';
                echo '<ul style="max-height:150px;overflow:auto;border:1px solid #ccc;padding:10px;">';
                foreach ($all_packages as $package) {
                    $checked = in_array($package->ID, $selected_packages) ? 'checked' : '';
                    echo "<li><label><input type='checkbox' name='required_package_ids[]' value='{$package->ID}' $checked> {$package->post_title}</label></li>";
                }
                echo '</ul>';
                echo "<small>Select packages a user must have subscribed to view this page. (Only applies if 'Restrict Access' is checked).</small><br>";
            } else {
                echo '<p><small>No packages found. Please create some to link them to this page.</small></p>';
            }
        },
        'page',
        'normal',
        'high'
    );
});

add_action('save_post_page', function ($post_id) {
    if (!isset($_POST['page_access_nonce']) || !wp_verify_nonce($_POST['page_access_nonce'], 'save_page_access_settings')) {
        return;
    }
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }
    if (!current_user_can('edit_post', $post_id)) {
        return;
    }

    $restrict_access = isset($_POST['restrict_page_access']) ? 1 : 0;
    update_post_meta($post_id, '_restrict_page_access', $restrict_access);

    $page_subscriber_url = sanitize_url($_POST['page_subscriber_page_url'] ?? '');
    if (!empty($page_subscriber_url)) {
        update_post_meta($post_id, '_page_subscriber_page_url', $page_subscriber_url);
    } else {
        delete_post_meta($post_id, '_page_subscriber_page_url');
    }

    if (isset($_POST['required_package_ids'])) {
        $package_ids = array_map('intval', $_POST['required_package_ids']);
        update_post_meta($post_id, '_required_package_ids', $package_ids);
    } else {
        delete_post_meta($post_id, '_required_package_ids');
    }

    wp_set_post_terms($post_id, [], 'service-category', false);
});


add_shortcode('user_subscriptions', function ($atts) {
    $atts = shortcode_atts(['user_id' => 0], $atts, 'user_subscriptions');
    $user_id = intval($atts['user_id']);

    if (!$user_id) {
        $user_id = get_current_user_id();
    }

    if (!$user_id || !get_userdata($user_id)) {
        return '<p class="subscriptions-message" style="font-family: Poppins, sans-serif; color: #333;">No user found or you must be logged in to view subscriptions.</p>';
    }
    $subscribed_packages = get_user_meta($user_id, 'subscribed_packages', true);
    if (!is_array($subscribed_packages) || empty($subscribed_packages)) {
        return '<p class="subscriptions-message" style="font-family: Poppins, sans-serif; color: #333;">You have no active subscriptions.</p>';
    }

    ob_start();
    $now = current_time('timestamp');
    $has_active_subscriptions = false;
?>
    <div class="user-subscriptions">
        <h2 style="font-family: Poppins, sans-serif; color: #333; margin-bottom: 20px;">Your Subscriptions</h2>
        <table class="subscriptions-table" style="width: 100%; border-collapse: collapse; font-family: Poppins, sans-serif;">
            <thead>
                <tr style="background: #0049ac; color: #fff;">
                    <th style="padding: 12px; text-align: left; font-weight: bold;color: #fff;">Membership</th>

                    <th style="padding: 12px; text-align: left; font-weight: bold;color: #fff;">Started On</th>
                    <th style="padding: 12px; text-align: left; font-weight: bold;color: #fff;">Expire On</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($subscribed_packages as $package_id) :
                    $package = get_post($package_id);
                    if (!$package || $package->post_type !== 'package') {
                        continue;
                    }
                    $service_category_ids = get_post_meta($package_id, '_service_category_ids', true) ?: [];
                    if (empty($service_category_ids)) {
                        continue;
                    }

                    $product_id = get_post_meta($package_id, '_product_id', true);
                    $price = '-';
                    if ($product_id && function_exists('wc_get_product')) {
                        $product = wc_get_product($product_id);
                        if ($product) {
                            $price = wc_price($product->get_price());
                        }
                    }


                    $start_date = null;
                    $end_date = null;
                    foreach ($service_category_ids as $term_id) {
                        $access = get_user_meta($user_id, "access_{$term_id}", true);
                        if (!$access || !is_array($access) || !isset($access['start']) || !isset($access['end']) || strtotime($access['end']) < $now) {
                            continue;
                        }
                        $has_active_subscriptions = true;
                        $start_timestamp = strtotime($access['start']);
                        $end_timestamp = strtotime($access['end']);
                        if (!$start_date || $start_timestamp < strtotime($start_date)) {
                            $start_date = $access['start'];
                        }
                        if (!$end_date || $end_timestamp > strtotime($end_date)) {
                            $end_date = $access['end'];
                        }
                    }

                    if ($start_date && $end_date) :
                ?>
                        <tr style="border-bottom: 1px solid #ccc;">
                            <td style="padding: 12px; color: #333;"><?php echo esc_html($package->post_title); ?></td>

                            <td style="padding: 12px; color: #333;"><?php echo esc_html(date_i18n('F j, Y', strtotime($start_date))); ?></td>
                            <td style="padding: 12px; color: #333;"><?php echo esc_html(date_i18n('F j, Y', strtotime($end_date))); ?></td>
                        </tr>
                    <?php endif; ?>
                <?php endforeach; ?>
                <?php if (!$has_active_subscriptions) : ?>
                    <tr>
                        <td colspan="4" style="padding: 12px; text-align: center; color: #666; font-style: italic;">
                            No active subscriptions found.
                        </td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
    <style>
        .user-subscriptions {
            max-width: 800px;
            margin: 20px auto;
            font-family: Poppins, sans-serif;
        }

        .subscriptions-table {
            background: #fff;
            border: 1px solid #ccc;
            border-radius: 4px;
            overflow: hidden;
        }

        .subscriptions-table th,
        .subscriptions-table td {
            text-align: left;
        }

        .subscriptions-table tr:nth-child(even) {
            background: #f9f9f9;
        }

        .subscriptions-table tr:hover {
            background: #f0f0f0;
        }

        @media (max-width: 768px) {
            .user-subscriptions {
                max-width: 100%;
                padding: 0 15px;
            }

            .subscriptions-table th,
            .subscriptions-table td {
                font-size: 14px;
                padding: 8px;
            }

            .subscriptions-table th {
                font-size: 13px;
            }
        }
    </style>
<?php
    return ob_get_clean();
});

add_filter('wp_nav_menu_objects', function ($items, $args) {
    $user_id = get_current_user_id();
    error_log("Acelema Debug: Checking nav menu items for user ID $user_id");

    foreach ($items as &$item) {
        if ($item->object === 'page') {
            $page_id = intval($item->object_id);
            $restrict_access = get_post_meta($page_id, '_restrict_page_access', true);
            error_log("Acelema Debug: Nav menu check for page ID $page_id, restrict_page_access: " . var_export($restrict_access, true));

            if (!$restrict_access) {
                error_log("Acelema Debug: Page ID $page_id is not restricted. No lock icon.");
                continue;
            }

            $required_package_ids = get_post_meta($page_id, '_required_package_ids', true) ?: [];
            error_log("Acelema Debug: Page ID $page_id requires packages: " . print_r($required_package_ids, true));

            if (!$user_id || empty($required_package_ids)) {
                $item->title = '<span style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">'
                    . esc_html($item->title)
                    . '<span class="menu-lock-icon">🔒</span>'
                    . '</span>';
                error_log("Acelema Debug: No user or no packages required for page ID $page_id. Adding lock icon.");
                continue;
            }

            $user_packages = get_user_meta($user_id, 'subscribed_packages', true) ?: [];
            if (!is_array($user_packages)) {
                $user_packages = [];
                error_log("Acelema Debug: User $user_id has no or invalid subscribed_packages meta.");
            }
            error_log("Acelema Debug: User $user_id subscribed packages: " . print_r($user_packages, true));

            $has_access = !empty(array_intersect($required_package_ids, $user_packages));
            if (!$has_access) {
                $item->title = '<span style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">'
                    . esc_html($item->title)
                    . '<span class="menu-lock-icon">🔒</span>'
                    . '</span>';
                error_log("Acelema Debug: No access for user $user_id to page ID $page_id. Adding lock icon.");
            } else {
                error_log("Acelema Debug: Access granted for user $user_id to page ID $page_id. No lock icon.");
            }
        }
    }

    return $items;
}, 10, 2);
// add 43343 for global comodity
add_shortcode('report_categories_grid', function () {
    $page_ids = [19345, 10001, 10000, 10900, 9999, 15500, 18899, 19338, 23099, 37289, 37297, 39440, 43343, 45160];
    $user_id  = get_current_user_id();

    $unlocked_pages = [];
    $locked_pages   = [];

    foreach ($page_ids as $page_id) {
        $page = get_post($page_id);
        if (!$page) {
            continue;
        }

        $title       = esc_html(get_the_title($page_id));
        $thumbnail   = get_the_post_thumbnail($page_id, 'medium', ['class' => 'page-thumb']);
        if (!$thumbnail) {
            $thumbnail = '<img src="https://pristinegaze.com.au/wp-content/uploads/2025/08/24-4.png" alt="" class="page-thumb" />';
        }

        $restrict_access       = get_post_meta($page_id, '_restrict_page_access', true);
        $required_package_ids  = get_post_meta($page_id, '_required_package_ids', true) ?: [];
        $user_packages         = is_array(get_user_meta($user_id, 'subscribed_packages', true))
            ? get_user_meta($user_id, 'subscribed_packages', true)
            : [];
        $has_access = $user_id && !empty(array_intersect($required_package_ids, $user_packages));

        $item_html  = '<div class="locked-page-item" style="position:relative;border:1px solid #ddd;padding:10px;text-align:center;border-radius:8px;overflow:hidden;">';
        $item_html .= '<a href="' . esc_url(get_permalink($page_id)) . '">';
        $item_html .= $thumbnail;
        $item_html .= '<div class="locked-page-title" style="margin-top:10px;font-weight:bold;">' . $title . '</div>';
        $item_html .= '</a>';

        if ($restrict_access && !$has_access) {
            $item_html .= '<div class="lock-overlay" style="
                position:absolute;
                top:0;
                left:0;
                width:100%;
                height:100%;
                background:rgba(0,0,0,0.5);
                display:flex;
                align-items:center;
                justify-content:center;
                color:#fff;
                font-size:40px;
            ">🔒</div>';
        }

        $item_html .= '</div>';

        if ($restrict_access && !$has_access) {
            $locked_pages[] = $item_html;
        } else {
            $unlocked_pages[] = $item_html;
        }
    }

    $all_items = array_merge($unlocked_pages, $locked_pages);

    return '<div class="locked-pages-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px;">' .
        implode('', $all_items) .
        '</div>';
});



add_action('admin_menu', 'acelema_add_subscriber_management_pages');

function acelema_add_subscriber_management_pages()
{
    add_submenu_page(
        'edit.php?post_type=package',
        'Add New Subscriber',
        'Add New Subscriber',
        'manage_options',
        'add-new-subscriber',
        'acelema_render_add_new_subscriber_page'
    );
}


function acelema_render_add_new_subscriber_page()
{
    if (!current_user_can('manage_options')) {
        wp_die(__('You do not have sufficient permissions to access this page.'));
    }

    $message = '';
    if (isset($_GET['message'])) {
        if ($_GET['message'] === 'user_added') {
            $message = '<div class="notice notice-success is-dismissible"><p>User and subscription added successfully.</p></div>';
        } elseif ($_GET['message'] === 'error_nonce') {
            $message = '<div class="notice notice-error is-dismissible"><p>Security check failed. Please try again.</p></div>';
        } elseif ($_GET['message'] === 'error_email_exists') {
            $message = '<div class="notice notice-error is-dismissible"><p>A user with this email already exists. Please use a different email or assign a package to the existing user.</p></div>';
        } elseif ($_GET['message'] === 'error_invalid_data') {
            $message = '<div class="notice notice-error is-dismissible"><p>Invalid or missing data. Please check all fields and try again.</p></div>';
        } elseif ($_GET['message'] === 'error_invalid_password') {
            $message = '<div class="notice notice-error is-dismissible"><p>Password must be at least 8 characters long.</p></div>';
        }
    }

    $packages = get_posts(['post_type' => 'package', 'numberposts' => -1, 'post_status' => 'publish']);
    $users = get_users(['fields' => ['ID', 'display_name', 'user_login', 'user_email']]);
?>
    <div class="wrap">
        <h1>Add New Subscriber / Assign Package</h1>
        <?php echo $message; ?>
        <p>You can either create a new user or select an existing one to assign a package.</p>

        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
            <input type="hidden" name="action" value="acelema_add_new_subscriber">
            <?php wp_nonce_field('acelema_add_new_subscriber', 'acelema_add_subscriber_nonce'); ?>

            <h2>Create New User</h2>
            <table class="form-table">
                <tr>
                    <th><label for="user_login">Username</label></th>
                    <td>
                        <input type="text" name="user_login" id="user_login" class="regular-text">
                        <p class="description">Login username for the new user.</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="user_email">Email</label></th>
                    <td>
                        <input type="email" name="user_email" id="user_email" class="regular-text">
                        <p class="description">Will also be used for notifications.</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="user_password">Password</label></th>
                    <td>
                        <input type="password" name="user_password" id="user_password" class="regular-text">
                        <p class="description">Minimum 8 characters.</p>
                    </td>
                </tr>
                <tr>
                    <th><label for="user_first_name">First Name</label></th>
                    <td>
                        <input type="text" name="user_first_name" id="user_first_name" class="regular-text">
                    </td>
                </tr>
                <tr>
                    <th><label for="user_last_name">Last Name</label></th>
                    <td>
                        <input type="text" name="user_last_name" id="user_last_name" class="regular-text">
                    </td>
                </tr>
            </table>

            <h2>OR Assign to Existing User</h2>
            <table class="form-table">
                <tr>
                    <th><label for="existing_user_id">Existing User</label></th>
                    <td>
                        <select name="existing_user_id" id="existing_user_id">
                            <option value="">Select a User</option>
                            <?php foreach ($users as $user): ?>
                                <option value="<?php echo esc_attr($user->ID); ?>">
                                    <?php echo esc_html("{$user->display_name} ({$user->user_login} - {$user->user_email})"); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                        <p class="description">If you choose a user here, the new user fields above will be ignored.</p>
                    </td>
                </tr>
            </table>

            <h2>Package Details</h2>
            <table class="form-table">
                <tr>
                    <th><label for="package_id">Select Package</label></th>
                    <td>
                        <select name="package_id" id="package_id" required>
                            <option value="">Select a Package</option>
                            <?php foreach ($packages as $package) : ?>
                                <option value="<?php echo esc_attr($package->ID); ?>">
                                    <?php echo esc_html($package->post_title); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th><label for="subscription_duration">Subscription Duration (Months)</label></th>
                    <td>
                        <input type="number" name="subscription_duration" id="subscription_duration" min="1" value="1" class="small-text" required>
                    </td>
                </tr>
                <tr>
                    <th><label for="subscription_price">Subscription Price (A$)</label></th>
                    <td>
                        <input type="number" name="subscription_price" id="subscription_price" step="0.01" min="0" class="small-text" required>
                    </td>
                </tr>
                <tr>
                    <th><label for="subscription_upsell_price">Upsell Price (A$)</label></th>
                    <td>
                        <input type="number" name="subscription_upsell_price" id="subscription_upsell_price" step="0.01" min="0" class="small-text">
                    </td>
                </tr>
            </table>

            <p class="submit">
                <input type="submit" class="button button-primary" value="Save Subscriber & Package">
            </p>
        </form>
    </div>
<?php
}

add_action('admin_post_acelema_add_new_subscriber', 'acelema_handle_add_new_subscriber');

function acelema_handle_add_new_subscriber()
{
    if (! current_user_can('manage_options')) {
        wp_die(__('You do not have sufficient permissions to perform this action.'));
    }

    if (! isset($_POST['acelema_add_subscriber_nonce']) || ! wp_verify_nonce($_POST['acelema_add_subscriber_nonce'], 'acelema_add_new_subscriber')) {
        wp_redirect(add_query_arg('message', 'error_nonce', admin_url('admin.php?page=add-new-subscriber')));
        exit;
    }

    $existing_user_id = intval($_POST['existing_user_id'] ?? 0);
    $username         = sanitize_user($_POST['user_login'] ?? '');
    $email            = sanitize_email($_POST['user_email'] ?? '');
    $password         = $_POST['user_password'] ?? '';
    $first_name       = sanitize_text_field($_POST['user_first_name'] ?? '');
    $last_name        = sanitize_text_field($_POST['user_last_name'] ?? '');
    $package_id       = intval($_POST['package_id'] ?? 0);
    $duration_months  = intval($_POST['subscription_duration'] ?? 1);
    $price            = floatval($_POST['subscription_price'] ?? 0);
    $upsell_price     = floatval($_POST['subscription_upsell_price'] ?? 0);

    if (empty($package_id) || $duration_months < 1 || $price < 0) {
        wp_redirect(add_query_arg('message', 'error_invalid_data', admin_url('admin.php?page=add-new-subscriber')));
        exit;
    }

    if ($existing_user_id <= 0) {
        if (empty($username)) {
            $username = sanitize_user(strtolower($first_name . $last_name), true);
        }
        if (empty($username)) {
            $username = sanitize_user(current(explode('@', $email)), true);
        }

        $base_username = $username;
        $counter       = 1;
        while (username_exists($username)) {
            $username = $base_username . $counter;
            $counter++;
        }

        if (empty($email) || empty($password) || strlen($password) < 8) {
            wp_redirect(add_query_arg('message', 'error_invalid_password', admin_url('admin.php?page=add-new-subscriber')));
            exit;
        }

        if (email_exists($email)) {
            wp_redirect(add_query_arg('message', 'error_email_exists', admin_url('admin.php?page=add-new-subscriber')));
            exit;
        }

        $user_id = wp_insert_user([
            'user_login' => $username,
            'user_email' => $email,
            'user_pass'  => $password,
            'first_name' => $first_name,
            'last_name'  => $last_name,
            'role'       => 'subscriber',
        ]);

        if (is_wp_error($user_id)) {
            wp_redirect(add_query_arg('message', 'error_invalid_data', admin_url('admin.php?page=add-new-subscriber')));
            exit;
        }
    } else {
        $user_id = $existing_user_id;
        if (! get_userdata($user_id)) {
            wp_redirect(add_query_arg('message', 'error_invalid_data', admin_url('admin.php?page=add-new-subscriber')));
            exit;
        }
    }

    $related_packages_map = [
        26710 => [26698, 26700, 26701, 26703],
        26702 => [26698, 26700, 26701],
        26709 => [26698, 26700, 26701, 26702, 26703, 26704, 26705, 26706, 26707, 26708, 26709, 26710, 37181, 37185, 39437, 43299],
    ];

    $package_ids_to_assign = [$package_id];
    if (isset($related_packages_map[$package_id])) {
        $package_ids_to_assign = array_merge($package_ids_to_assign, $related_packages_map[$package_id]);
    }
    $package_ids_to_assign = array_unique($package_ids_to_assign);

    foreach ($package_ids_to_assign as $pid) {
        $package_post = get_post($pid);
        if (! $package_post || $package_post->post_type !== 'package') {
            wp_redirect(add_query_arg('message', 'error_invalid_data', admin_url('admin.php?page=add-new-subscriber')));
            exit;
        }
    }

    $current_subscribed_packages = get_user_meta($user_id, 'subscribed_packages', true);
    if (! is_array($current_subscribed_packages)) {
        $current_subscribed_packages = [];
    }

    foreach ($package_ids_to_assign as $pid) {
        if (! in_array($pid, $current_subscribed_packages)) {
            $current_subscribed_packages[] = $pid;
        }
    }
    update_user_meta($user_id, 'subscribed_packages', array_values(array_unique($current_subscribed_packages)));

    $start_date = date('Y-m-d H:i:s', strtotime('-1 day', current_time('timestamp')));
    $end_date   = date('Y-m-d H:i:s', strtotime("+$duration_months months", strtotime($start_date)));

    foreach ($package_ids_to_assign as $pid) {
        update_user_meta($user_id, "subscription_{$pid}", [
            'price'           => $price,
            'upsell_price'    => $upsell_price,
            'duration_months' => $duration_months,
            'start'           => $start_date,
            'end'             => $end_date,
        ]);

        $term_ids = get_post_meta($pid, '_service_category_ids', true) ?: [];
        foreach ($term_ids as $term_id) {
            update_user_meta($user_id, "access_{$term_id}", [
                'start'      => $start_date,
                'end'        => $end_date,
                'package_id' => $pid,
            ]);
        }
    }

    foreach ($package_ids_to_assign as $pid) {
        $args = [
            'meta_query' => [
                [
                    'key'     => 'subscribed_packages',
                    'value'   => serialize(strval($pid)),
                    'compare' => 'LIKE',
                ],
            ],
            'count_total' => true,
            'fields'      => 'ids',
        ];
        $user_query = new WP_User_Query($args);
        $count      = $user_query->get_total();
        update_post_meta($pid, '_package_subscriber_count', $count);
    }

    wp_redirect(add_query_arg('message', 'user_added', admin_url('admin.php?page=add-new-subscriber')));
    exit;
}




add_action('admin_post_acelema_remove_subscription', 'acelema_handle_remove_subscription');


function acelema_handle_remove_subscription()
{
    if (!current_user_can('manage_options')) {
        wp_die(__('You do not have sufficient permissions to perform this action.'));
    }

    $user_id    = intval($_GET['user_id'] ?? 0);
    $package_id = intval($_GET['package_id'] ?? 0);
    $remove_all = isset($_GET['removeAll']) && $_GET['removeAll'] == 1;
    $nonce      = $_GET['_wpnonce'] ?? '';

    $nonce_action = $remove_all
        ? 'acelema_remove_subscription_all_' . $user_id
        : 'acelema_remove_subscription_' . $user_id . '_' . $package_id;

    // if (!wp_verify_nonce($nonce, $nonce_action)) {
    //     wp_redirect(add_query_arg('message', 'error_nonce', admin_url('admin.php?page=view-subscribers')));
    //     exit;
    // }

    $user = get_userdata($user_id);
    if (!$user) {
        wp_die(__('Invalid user ID.'));
    }

    if ($remove_all) {
        delete_user_meta($user_id, 'subscribed_packages');
        $all_meta = get_user_meta($user_id);
        foreach ($all_meta as $meta_key => $meta_value) {
            if (strpos($meta_key, 'subscription_') === 0 || strpos($meta_key, 'access_') === 0) {
                delete_user_meta($user_id, $meta_key);
            }
        }

        $packages = get_posts([
            'post_type'      => 'package',
            'post_status'    => 'publish',
            'fields'         => 'ids',
            'posts_per_page' => -1,
        ]);
        foreach ($packages as $pkg_id) {
            $args = [
                'meta_query' => [
                    [
                        'key'     => 'subscribed_packages',
                        'value'   => serialize(strval($pkg_id)),
                        'compare' => 'LIKE',
                    ],
                ],
                'count_total' => true,
                'fields'      => 'ids',
            ];
            $user_query = new WP_User_Query($args);
            update_post_meta($pkg_id, '_package_subscriber_count', $user_query->get_total());
        }

        error_log("Acelema Debug: Removed ALL packages from user $user_id.");
    } else {
        if (!$package_id) {
            wp_die(__('Invalid package ID.'));
        }
        $current_subscribed_packages = get_user_meta($user_id, 'subscribed_packages', true);
        if (is_array($current_subscribed_packages)) {
            $current_subscribed_packages = array_filter($current_subscribed_packages, function ($pkg_id) use ($package_id) {
                return intval($pkg_id) !== $package_id;
            });
            update_user_meta($user_id, 'subscribed_packages', array_values($current_subscribed_packages));
        }

        $term_ids = get_post_meta($package_id, '_service_category_ids', true) ?: [];
        foreach ($term_ids as $term_id) {
            $existing_access = get_user_meta($user_id, "access_{$term_id}", true);
            if (is_array($existing_access) && isset($existing_access['package_id']) && intval($existing_access['package_id']) === $package_id) {
                delete_user_meta($user_id, "access_{$term_id}");
            }
        }
        $args = [
            'meta_query' => [
                [
                    'key'     => 'subscribed_packages',
                    'value'   => serialize(strval($package_id)),
                    'compare' => 'LIKE',
                ],
            ],
            'count_total' => true,
            'fields'      => 'ids',
        ];
        $user_query = new WP_User_Query($args);
        update_post_meta($package_id, '_package_subscriber_count', $user_query->get_total());

        error_log("Acelema Debug: Removed package $package_id from user $user_id.");
    }

    wp_redirect(add_query_arg('message', 'subscription_updated', admin_url('admin.php?page=view-subscribers')));
    exit;
}
