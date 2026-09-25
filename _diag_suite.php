<?php

require __DIR__.'/vendor/autoload.php';

$app = require __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

function hit($kernel, string $uri, array $headers = []): int
{
    $request = Illuminate\Http\Request::create($uri, 'GET');
    foreach ($headers as $k => $v) {
        $request->headers->set($k, $v);
    }
    try {
        return $kernel->handle($request)->getStatusCode();
    } catch (\Throwable $e) {
        echo '  EXCEPTION '.get_class($e).': '.$e->getMessage()."\n";
        return 0;
    }
}

// Discover Inertia version from a normal load (from the X-Inertia-Verified header trick).
$probe = $kernel->handle(Illuminate\Http\Request::create('/release-schedule', 'GET'));
$version = $probe->headers->get('X-Inertia-Version');
if (! $version) {
    if (preg_match('/version["\']?\s*[:=]\s*["\']([a-f0-9]{16,})["\']/', (string) $probe->getContent(), $m)) {
        $version = $m[1];
    }
}

echo "Inertia version: ".var_export($version, true)."\n\n";

$partial = [
    'X-Inertia' => 'true',
    'X-Inertia-Version' => (string) $version,
    'X-Inertia-Partial-Component' => 'ReleaseSchedule/schedule-index',
    'X-Inertia-Partial-Data' => 'groups',
    'X-Requested-With' => 'XMLHttpRequest',
    'Accept' => 'text/html, application/xhtml+xml',
];

$tests = [
    'GET index (refresh #1)' => ['/release-schedule', []],
    'GET index (refresh #2)' => ['/release-schedule', []],
    'GET index (refresh #3)' => ['/release-schedule', []],
    'GET filter date' => ['/release-schedule?date=2026-09-13', []],
    'GET filter shift' => ['/release-schedule?date=2026-09-13&shift=J', []],
    'GET filter search' => ['/release-schedule?date=2026-09-13&search=CC', []],
    'GET page transition create' => ['/release-schedule/create', []],
];

$fail = 0;
foreach ($tests as $name => $t) {
    $s = hit($kernel, $t[0], $t[1]);
    $flag = in_array($s, [200, 302, 403], true) ? 'OK ' : 'FAIL';
    if ($flag === 'FAIL') { $fail++; }
    echo str_pad($flag, 5).' '.str_pad($name, 28).' -> '.$s."\n";
}

echo "\nPolling (router.reload partial) x50:\n";
$ok = 0;
for ($i = 0; $i < 50; $i++) {
    $s = hit($kernel, '/release-schedule', $partial);
    if ($s === 200) { $ok++; } else { $fail++; }
}
echo "  OK=$ok FAIL=".(50 - $ok)."\n";

echo "\nRESULT: ".($fail === 0 ? 'ALL PASS (no HTTP 500)' : "FAILURES: $fail")."\n";
