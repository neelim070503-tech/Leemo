param(
  [int]$Port = 0,
  [string]$Root = $PSScriptRoot
)

if ($Port -eq 0) {
  if ($env:PORT) { $Port = [int]$env:PORT } else { $Port = 5173 }
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $Root on http://localhost:$Port/"

$mime = @{
  ".html" = "text/html"
  ".css"  = "text/css"
  ".js"   = "application/javascript"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".svg"  = "image/svg+xml"
  ".ico"  = "image/x-icon"
  ".mp4"  = "video/mp4"
  ".webm" = "video/webm"
}

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $req = $context.Request
  $res = $context.Response

  $res.KeepAlive = $false
  $res.SendChunked = $false

  $path = $req.Url.LocalPath
  if ($path -eq "/") { $path = "/index.html" }
  $filePath = Join-Path $Root ($path.TrimStart("/"))

  if (Test-Path $filePath -PathType Leaf) {
    $ext = [System.IO.Path]::GetExtension($filePath)
    $contentType = $mime[$ext]
    if (-not $contentType) { $contentType = "application/octet-stream" }
    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    $res.ContentType = $contentType
    $res.ContentLength64 = $bytes.Length
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $res.StatusCode = 404
    $res.ContentLength64 = 0
  }
  try { $res.OutputStream.Close() } catch {}
}
