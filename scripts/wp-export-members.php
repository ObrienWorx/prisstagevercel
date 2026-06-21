<?php
/**
 * wp-export-members.php
 * One-off exporter for the "Taxonomy Package Access" plugin (serve-package-access.php).
 *
 * Dumps every subscriber that has at least one package, together with their
 * package subscriptions (name, price, upsell, start/end dates, duration) so the
 * Node importer (scripts/migrate-wp-members.mjs) can recreate them in MongoDB.
 *
 * The subscription dates are read the same way the plugin's own UI reads them:
 *   - per package, look at each linked service-category term's `access_{term_id}`
 *     user-meta ({start,end,package_id}); take the EARLIEST start and LATEST end
 *     among the terms that belong to this package.
 *   - price / upsell come from `subscription_{package_id}` user-meta.
 *
 * HOW TO RUN (pick one):
 *   A) wp-cli (preferred, no secret needed):
 *        wp eval-file wp-export-members.php
 *      -> writes members-export.json next to this file and prints the path.
 *
 *   B) Web: drop this file in the WordPress ROOT (next to wp-load.php) and open:
 *        https://YOURSITE/wp-export-members.php?key=CHANGE_ME_SECRET
 *      -> streams the JSON to the browser (Save As members-export.json).
 *      DELETE the file from the server afterwards.
 *
 * Nothing is modified — this is read-only.
 */

const EXPORT_SECRET = 'CHANGE_ME_SECRET'; // change before web use

// --- bootstrap WordPress if not already loaded (web mode) ----------------
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

// --- subscribers (users with a non-empty subscribed_packages) ------------
$user_ids = get_users([
    'meta_query' => [
        'relation' => 'AND',
        ['key' => 'subscribed_packages', 'compare' => 'EXISTS'],
        ['key' => 'subscribed_packages', 'value' => '', 'compare' => '!='],
    ],
    'fields' => 'ID',
    'number' => -1,
]);

$subscribers = [];
foreach ($user_ids as $uid) {
    $u = get_userdata($uid);
    if (!$u) continue;

    $subscribed = get_user_meta($uid, 'subscribed_packages', true);
    if (!is_array($subscribed) || empty($subscribed)) continue;

    $subs = [];
    foreach (array_unique(array_map('intval', $subscribed)) as $pid) {
        if (!isset($pkg[$pid])) continue; // package deleted
        $info = $pkg[$pid];

        // dates from access_{term_id} (authoritative), matching this package
        $start = null; $end = null;
        foreach ($info['service_category_ids'] as $tid) {
            $acc = get_user_meta($uid, "access_{$tid}", true);
            if (!is_array($acc) || empty($acc['start']) || empty($acc['end'])) continue;
            if (!empty($acc['package_id']) && intval($acc['package_id']) !== $pid) continue; // belongs to another pkg
            $s = strtotime($acc['start']); $e = strtotime($acc['end']);
            if ($s && ($start === null || $s < strtotime($start))) $start = $acc['start'];
            if ($e && ($end === null || $e > strtotime($end)))     $end = $acc['end'];
        }

        // price / upsell (and date fallback) from subscription_{pid}
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
            'start'           => $start, // 'Y-m-d H:i:s' or null
            'end'             => $end,
        ];
    }

    if (empty($subs)) continue;

    $subscribers[] = [
        'wp_id'        => (int) $uid,
        'email'        => $u->user_email,
        'login'        => $u->user_login,
        'display_name' => $u->display_name,
        'first_name'   => get_user_meta($uid, 'first_name', true) ?: '',
        'last_name'    => get_user_meta($uid, 'last_name', true) ?: '',
        'phone'        => get_user_meta($uid, 'billing_phone', true) ?: '',
        'registered'   => $u->user_registered, // UTC 'Y-m-d H:i:s'
        'subscriptions'=> $subs,
    ];
}

$out = [
    'exported_at'      => gmdate('c'),
    'site'             => home_url(),
    'package_count'    => count($pkg),
    'subscriber_count' => count($subscribers),
    'packages'         => array_values($pkg),
    'subscribers'      => $subscribers,
];

$json = wp_json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

if ($is_cli) {
    $path = __DIR__ . '/members-export.json';
    file_put_contents($path, $json);
    fwrite(STDOUT, "Wrote {$out['subscriber_count']} subscribers, {$out['package_count']} packages -> $path\n");
} else {
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename="members-export.json"');
    echo $json;
}
