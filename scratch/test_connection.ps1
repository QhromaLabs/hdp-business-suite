$ports = @(22, 80, 443, 2222, 3389, 8080)
$ip = "159.198.46.193"

foreach ($port in $ports) {
    $t = New-Object Net.Sockets.TcpClient
    $connection = $t.ConnectAsync($ip, $port)
    if ($connection.Wait(1500)) {
        if ($t.Connected) {
            Write-Host "Port $port is OPEN"
        } else {
            Write-Host "Port $port is CLOSED"
        }
    } else {
        Write-Host "Port $port is TIMED OUT"
    }
    if ($t) { $t.Close() }
}
