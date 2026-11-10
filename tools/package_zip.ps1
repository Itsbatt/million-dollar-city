$src = "C:\Users\bat\.gemini\antigravity\scratch\million-dollar-city"
$dst = "C:\Users\bat\Downloads\MillionDollarCity_Source_v2.3.zip"
$tmp = Join-Path $env:TEMP ("mdc_pack_" + (Get-Random))

New-Item -ItemType Directory -Path $tmp -Force | Out-Null
& robocopy $src $tmp /E /XD .git node_modules /XF *.db-wal *.db-shm *.log cloudflared.exe /NFL /NDL /NJH /NJS
if (Test-Path $dst) { Remove-Item $dst -Force }
Compress-Archive -Path (Join-Path $tmp "*") -DestinationPath $dst -Force
Remove-Item -Recurse -Force $tmp
Get-Item $dst | Select-Object Name, Length, LastWriteTime
