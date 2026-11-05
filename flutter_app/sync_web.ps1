# Copie la version web (sans tests ni outils) dans assets/www, avant chaque build Flutter.
$root = Split-Path -Parent $PSScriptRoot
$dst = Join-Path $PSScriptRoot 'assets\www'
if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
New-Item -ItemType Directory -Force $dst | Out-Null
Get-ChildItem $root -File | Where-Object {
  $_.Extension -in '.js','.css','.html','.png','.svg','.webmanifest','.mp3','.opus','.json','.woff2' -and $_.Name -notlike 'test-*' -and $_.Name -ne 'package.json'
} | Copy-Item -Destination $dst
# voix enregistrées (femme F5, homme M4) : manifeste + clips
$v = Join-Path $root 'voice'
if (Test-Path (Join-Path $v 'manifest.json')) {
  foreach ($d in 'f5','m4') { New-Item -ItemType Directory -Force (Join-Path $dst "voice\clips\$d") | Out-Null; Copy-Item (Join-Path $v "clips\$d\*.mp3") (Join-Path $dst "voice\clips\$d") }
  Copy-Item (Join-Path $v 'manifest.json') (Join-Path $dst 'voice')
}
"$((Get-ChildItem $dst -Recurse -File | Measure-Object).Count) fichiers copiés dans assets/www"
