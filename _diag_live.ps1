$base = "http://10.73.2.97"
$results = @{}
for ($i = 1; $i -le 30; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "$base/release-schedule" -UseBasicParsing -TimeoutSec 20 -ErrorAction Stop
        $key = [string]$r.StatusCode
        Write-Host "Request $i : $($r.StatusCode)"
    } catch {
        if ($_.Exception.Response) {
            $key = [string]([int]$_.Exception.Response.StatusCode)
            Write-Host "Request $i : $([int]$_.Exception.Response.StatusCode)"
        } else {
            $key = "ERR"
            Write-Host "Request $i : ERROR"
        }
    }
    if ($results.ContainsKey($key)) { $results[$key] = $results[$key] + 1 } else { $results[$key] = 1 }
}
Write-Host "----- SUMMARY -----"
$results.GetEnumerator() | ForEach-Object { Write-Output ("{0} : {1}" -f $_.Key, $_.Value) }
