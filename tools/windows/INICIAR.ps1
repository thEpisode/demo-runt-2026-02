#Requires -Version 5.1
<#
    Punto de entrada unico de la demo.
    Todo lo que la demo necesita viaja dentro de esta carpeta.
#>

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

function Write-Aviso([string]$Texto) { Write-Host "  $Texto" -ForegroundColor Yellow }
function Write-Bien ([string]$Texto) { Write-Host "  $Texto" -ForegroundColor Green }
function Write-Mal  ([string]$Texto) { Write-Host "  $Texto" -ForegroundColor Red }

Write-Host ''
Write-Host '  Iniciando la demo del RUNT...' -ForegroundColor Cyan
Write-Host ''

# El paquete trae su propio Node; el del sistema es solo un respaldo.
$node = Join-Path $PSScriptRoot 'runtime\node.exe'

if (-not (Test-Path -LiteralPath $node)) {
    $sistema = Get-Command node -ErrorAction SilentlyContinue
    if (-not $sistema) {
        Write-Mal 'El paquete viene incompleto: falta runtime\node.exe'
        Read-Host '  Presiona Enter para cerrar'
        exit 1
    }
    $node = $sistema.Source
    Write-Aviso 'Usando el Node instalado en el sistema.'
    Write-Host ''
}

# La configuracion se lee como JSON, no como texto: asi el aviso distingue
# entre "falta configurar" y "apunta a la base de desarrollo".
$rutaConfig = Join-Path $PSScriptRoot 'backend\config\default.json'
$config = Get-Content -LiteralPath $rutaConfig -Raw -Encoding UTF8 | ConvertFrom-Json

$oracle = $config.modules.database.providers.oracle.settings
$llmNodo = $config.modules.llm
$llm = $llmNodo.providers.($llmNodo.settings.default).settings

if ($oracle.connectString -like 'xxxx__*') {
    Write-Aviso 'Falta la conexion a la base de datos.'
    Write-Aviso "Editala en backend\config\default.json"
    Write-Host ''
}
elseif ($oracle.connectString -match 'localhost|127\.0\.0\.1|FREEPDB1') {
    Write-Aviso "Estas usando la base de DESARROLLO ($($oracle.connectString)),"
    Write-Aviso 'no los datos reales del cliente.'
    Write-Host ''
}

if (-not $llm -or $llm.apiKey -like 'xxxx__*') {
    Write-Aviso 'Faltan las credenciales del modelo.'
    Write-Aviso 'El Buscador y el Asistente no podran interpretar preguntas;'
    Write-Aviso 'el Constructor si funciona, porque no usa el modelo.'
    Write-Host ''
}

# Una red que intercepta TLS hace que Node rechace el endpoint del modelo.
# Esto captura la cadena que presenta el proxy para que la peticion pase.
$rutaCa = Join-Path $PSScriptRoot 'ca.pem'

if (-not (Test-Path -LiteralPath $rutaCa)) {
    & $node (Join-Path $PSScriptRoot 'herramientas\capturar-ca.js') 2>$null | Out-Null
    if (Test-Path -LiteralPath $rutaCa) {
        Write-Bien 'Esta red intercepta el trafico seguro: certificado capturado.'
        Write-Host ''
    }
}

if (Test-Path -LiteralPath $rutaCa) {
    $env:NODE_EXTRA_CA_CERTS = $rutaCa
}

$puerto = [int]$config.server.port
if (-not $puerto) { $puerto = 3610 }

# Sin esto el servicio muere al enlazar y el navegador termina hablando con
# lo que ya estuviera ahi.
$ocupado = Get-NetTCPConnection -LocalPort $puerto -State Listen -ErrorAction SilentlyContinue
if ($ocupado) {
    Write-Mal "El puerto $puerto ya esta ocupado."
    Write-Mal 'Puede ser esta misma demo abierta en otra ventana. Cierrala y reintenta.'
    Read-Host '  Presiona Enter para cerrar'
    exit 1
}

$url = "http://localhost:$puerto"
Write-Host "  Abre el navegador en:  $url" -ForegroundColor Cyan
Write-Host ''
Write-Host '  Para detener la demo, cierra esta ventana.' -ForegroundColor DarkGray
Write-Host ''

Start-Process $url | Out-Null

$env:SUPPRESS_NO_CONFIG_WARNING = 'true'
Set-Location -LiteralPath (Join-Path $PSScriptRoot 'backend')

try {
    & $node 'app.js'
}
finally {
    Write-Host ''
    Write-Host '  La demo se detuvo.' -ForegroundColor DarkGray
    Read-Host '  Presiona Enter para cerrar'
}
