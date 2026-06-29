<?php
/**
 * wp-export-all-subscribers.php
 * One-off exporter — EVERY WordPress user, package or not.
 *
 * Same JSON shape as wp-export-members.php so scripts/migrate-wp-members.mjs
 * can import it unchanged: subscribers WITH packages get their subscriptions,
 * subscribers WITHOUT packages get an empty subscriptions[] (account only).
 *
 * Use this to back-fill free / newsletter-only members that the package-only
 * export skipped. Re-importing is safe (importer matches by email).
 *
 * HOW TO RUN (pick one):
 *   A) wp-cli (preferred):
 *        wp eval-file wp-export-all-subscribers.php
 *      -> writes all-subscribers-export.json next to this file and prints counts.
 *
 *   B) Web: drop in WordPress ROOT (next to wp-load.php) and open:
 *        https://YOURSITE/wp-export-all-subscribers.php?key=CHANGE_ME_SECRET
 *      -> streams JSON (Save As all-subscribers-export.json). DELETE afterwards.
 *
 * Optional role filter (default: all roles):
 *        wp eval-file wp-export-all-subscribers.php subscriber
 *        ...?key=SECRET&role=subscriber
 *
 * Nothing is modified — read-only.
 */

const EXPORT_SECRET = 'pg-export-9f3a7c2e1b'; // web-mode key (used as ?key=...)

if (!function_exists('get_users')) {
    $root = __DIR__;
    $wp_load = null;
    for ($i = 0; $i < 5; $i++) {
        if (file_exists("$root/wp-load.php")) { $wp_load = "$root/wp-load.php"; break; }
        $root = dirname($root);
    }
    if (!$wp_load) { http_response_code(500); exit('wp-load.php not found'); }
    require $wp_load;
}

$is_cli = (php_sapi_name() === 'cli');
if (!$is_cli) {
    if (!isset($_GET['key']) || !hash_equals(EXPORT_SECRET, (string) $_GET['key'])) {
        http_response_code(403);
        exit('Forbidden');
    }
}

@set_time_limit(0);

// optional role filter (cli arg or ?role=)
$role = '';
if ($is_cli && isset($argv[1])) $role = (string) $argv[1];
elseif (!$is_cli && isset($_GET['role'])) $role = (string) $_GET['role'];

// --- package catalog (id -> name/price/duration/term ids) ----------------
$packages = get_posts(['post_type' => 'package', 'numberposts' => -1, 'post_status' => 'any']);
$pkg = [];
foreach ($packages as $p) {
    $pkg[$p->ID] = [
        'id'               => $p->ID,
        'name'             => html_entity_decode($p->post_title, ENT_QUOTES),
        'price'            => (float) (get_post_meta($p->ID, '_package_price', true) ?: 0),
        'sale_price'       => (float) (get_post_meta($p->ID, '_package_sale_price', true) ?: 0),
        'duration_months'  => (int) (get_post_meta($p->ID, '_package_duration_months', true) ?: 1),
        'service_category_ids' => array_map('intval', (array) (get_post_meta($p->ID, '_service_category_ids', true) ?: [])),
    ];
}

// --- ALL users (no package filter) ---------------------------------------
$args = ['fields' => 'ID', 'number' => -1];
if ($role !== '') $args['role'] = $role;
$user_ids = get_users($args);

$subscribers = [];
$with_pkg = 0;
$without_pkg = 0;
foreach ($user_ids as $uid) {
    $u = get_userdata($uid);
    if (!$u) continue;

    $subscribed = get_user_meta($uid, 'subscribed_packages', true);
    $subscribed = is_array($subscribed) ? array_unique(array_map('intval', $subscribed)) : [];

    $subs = [];
    foreach ($subscribed as $pid) {
        if (!isset($pkg[$pid])) continue; // package deleted
        $info = $pkg[$pid];

        $start = null; $end = null;
        foreach ($info['service_category_ids'] as $tid) {
            $acc = get_user_meta($uid, "access_{$tid}", true);
            if (!is_array($acc) || empty($acc['start']) || empty($acc['end'])) continue;
            if (!empty($acc['package_id']) && intval($acc['package_id']) !== $pid) continue;
            $s = strtotime($acc['start']); $e = strtotime($acc['end']);
            if ($s && ($start === null || $s < strtotime($start))) $start = $acc['start'];
            if ($e && ($end === null || $e > strtotime($end)))     $end = $acc['end'];
        }

        $sub_meta = get_user_meta($uid, "subscription_{$pid}", true);
        $price = $info['price']; $upsell = 0;
        if (is_array($sub_meta)) {
            if (isset($sub_meta['price']))        $price  = (float) $sub_meta['price'];
            if (isset($sub_meta['upsell_price'])) $upsell = (float) $sub_meta['upsell_price'];
            if ($start === null && !empty($sub_meta['start'])) $start = $sub_meta['start'];
            if ($end === null && !empty($sub_meta['end']))     $end   = $sub_meta['end'];
        }

        $subs[] = [
            'package_id'      => $pid,
            'package_name'    => $info['name'],
            'price'           => $price,
            'upsell_price'    => $upsell,
            'duration_months' => $info['duration_months'],
            'start'           => $start,
            'end'             => $end,
        ];
    }

    if (empty($subs)) $without_pkg++; else $with_pkg++;

    $subscribers[] = [
        'wp_id'        => (int) $uid,
        'email'        => $u->user_email,
        'login'        => $u->user_login,
        'display_name' => $u->display_name,
        'first_name'   => get_user_meta($uid, 'first_name', true) ?: '',
        'last_name'    => get_user_meta($uid, 'last_name', true) ?: '',
        'phone'        => get_user_meta($uid, 'billing_phone', true) ?: '',
        'registered'   => $u->user_registered,
        'roles'        => array_values((array) $u->roles),
        'subscriptions'=> $subs,
    ];
}

$out = [
    'exported_at'         => gmdate('c'),
    'site'                => home_url(),
    'role_filter'         => $role ?: 'all',
    'package_count'       => count($pkg),
    'subscriber_count'    => count($subscribers),
    'with_package'        => $with_pkg,
    'without_package'     => $without_pkg,
    'packages'            => array_values($pkg),
    'subscribers'         => $subscribers,
];

$json = wp_json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

if ($is_cli) {
    $path = __DIR__ . '/all-subscribers-export.json';
    file_put_contents($path, $json);
    fwrite(STDOUT, "Wrote {$out['subscriber_count']} users ({$with_pkg} with package, {$without_pkg} without), {$out['package_count']} packages -> $path\n");
} else {
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename="all-subscribers-export.json"');
    echo $json;
}
