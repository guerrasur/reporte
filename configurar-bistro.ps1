param(
  [Parameter(Mandatory = $true)][ValidateSet('save', 'read')][string]$Mode,
  [Parameter(Mandatory = $true)][string]$FilePath
)

$ErrorActionPreference = 'Stop'

if ($Mode -eq 'save') {
  $user = Read-Host 'Usuario de Bistrosoft'
  $password = Read-Host 'Contrasena de Bistrosoft (no se muestra)' -AsSecureString
  if ([string]::IsNullOrWhiteSpace($user) -or $password.Length -eq 0) {
    Write-Error 'El usuario y la contrasena son obligatorios.'
    exit 1
  }

  $data = @{ user = $user; password = (ConvertFrom-SecureString -SecureString $password) } |
    ConvertTo-Json -Compress
  [System.IO.File]::WriteAllText($FilePath, $data, (New-Object System.Text.UTF8Encoding $false))
  Write-Host 'Credenciales guardadas solo en esta PC y para este usuario de Windows.'
  exit 0
}

$data = Get-Content -LiteralPath $FilePath -Raw -Encoding UTF8 | ConvertFrom-Json
$password = ConvertTo-SecureString -String $data.password
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
try {
  [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
  @{ user = $data.user; pass = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) } |
    ConvertTo-Json -Compress | Write-Output
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
}
