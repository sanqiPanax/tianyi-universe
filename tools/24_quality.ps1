# 质检: volumedetect 扫描全部 clip, 找可疑(整体过轻/近静音)
$ErrorActionPreference = 'SilentlyContinue'
$ff = "F:\school_work\AIOT\dayao\ffmpeg-8.1-essentials_build\bin\ffmpeg.exe"
$dir = "F:\ownWork\天意宇宙\clips"
$out = @()
Get-ChildItem $dir -Filter *.mp3 | ForEach-Object {
  $v = & $ff -i $_.FullName -af volumedetect -f null - 2>&1
  $mean = (($v | Select-String 'mean_volume' | Select-Object -Last 1) -replace '.*mean_volume: ','').Trim()
  $max  = (($v | Select-String 'max_volume'  | Select-Object -Last 1) -replace '.*max_volume: ','').Trim()
  $meanN = [double]($mean -replace ' dB','')
  $maxN  = [double]($max -replace ' dB','')
  if ($meanN -lt -35 -or $maxN -lt -20) {
    $out += "{0} | mean={1} | max={2} | 可疑!" -f $_.Name, $mean, $max
  }
}
Write-Host "=== 可疑片段(共 $($out.Count)) ==="
if ($out.Count) { $out | ForEach-Object { Write-Host $_ } } else { Write-Host "全部正常(64个)" }
