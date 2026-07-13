$payload = @{ email = 'admin@udlms.local'; password = 'password123' } | ConvertTo-Json
try {
  $response = Invoke-RestMethod -Method Post -Uri 'http://localhost:4000/auth/login' -Body $payload -ContentType 'application/json' -ErrorAction Stop
  $response | ConvertTo-Json -Depth 5
} catch {
  if ($_.Exception.Response) {
    $resp = $_.Exception.Response
    $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
    $body = $reader.ReadToEnd()
    "$([int]$resp.StatusCode)`n$body"
  } else {
    $_.Exception.Message
  }
}
