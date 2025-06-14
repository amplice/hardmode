# Hardmode Development Environment Setup Script (Windows)
# This script sets up the development environment for the Hardmode multiplayer game

Write-Host "🎮 Hardmode Development Setup" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan

# Check Node.js version
Write-Host "`n📦 Checking Node.js version..." -ForegroundColor Yellow
try {
    $nodeVersion = node -v
    $requiredVersion = 18
    if ($nodeVersion -match "v(\d+)\.") {
        $majorVersion = [int]$matches[1]
        if ($majorVersion -lt $requiredVersion) {
            Write-Host "❌ Error: Node.js $requiredVersion or higher is required. Current version: $nodeVersion" -ForegroundColor Red
            Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
            exit 1
        }
    }
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Node.js is not installed." -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Install client dependencies
Write-Host "`n📦 Installing client dependencies..." -ForegroundColor Yellow
npm install

# Install server dependencies
Write-Host "`n📦 Installing server dependencies..." -ForegroundColor Yellow
Set-Location server
npm install
Set-Location ..

# Create environment file if it doesn't exist
if (!(Test-Path "server\.env")) {
    Write-Host "`n🔧 Creating server environment configuration..." -ForegroundColor Yellow
    Copy-Item "server\.env.example" "server\.env"
    Write-Host "✅ Created server\.env from .env.example" -ForegroundColor Green
    Write-Host "⚠️  Please update server\.env with your configuration" -ForegroundColor Yellow
}

# Create necessary directories
Write-Host "`n📁 Creating necessary directories..." -ForegroundColor Yellow
$directories = @(
    "server\logs",
    "server\src\systems",
    "server\src\entities", 
    "server\src\network",
    "server\src\utils",
    "shared\types",
    "shared\constants",
    "shared\utils",
    "protocol\messages",
    "protocol\events"
)

foreach ($dir in $directories) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}
Write-Host "✅ Directories created" -ForegroundColor Green

# Check PostgreSQL
Write-Host "`n💾 Database setup..." -ForegroundColor Yellow
try {
    $psqlVersion = psql --version 2>$null
    Write-Host "✅ PostgreSQL is installed: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "⚠️  PostgreSQL is not installed. You'll need it for persistence features." -ForegroundColor Yellow
    Write-Host "   Install from: https://www.postgresql.org/download/" -ForegroundColor Yellow
}

# Check VS Code
Write-Host "`n🛠️  Checking recommended development tools..." -ForegroundColor Yellow
try {
    $codeVersion = code --version 2>$null
    Write-Host "✅ VS Code is installed" -ForegroundColor Green
    
    # Install recommended extensions
    Write-Host "   Installing recommended VS Code extensions..." -ForegroundColor Yellow
    code --install-extension dbaeumer.vscode-eslint 2>$null
    code --install-extension esbenp.prettier-vscode 2>$null
    code --install-extension ms-vscode.vscode-typescript-next 2>$null
} catch {
    Write-Host "⚠️  VS Code is not installed. Recommended for development." -ForegroundColor Yellow
}

# Summary
Write-Host "`n✨ Development environment setup complete!" -ForegroundColor Green
Write-Host "`n📋 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Update server\.env with your configuration"
Write-Host "  2. Start the server: cd server && npm run dev"
Write-Host "  3. Start the client: npm run dev (in another terminal)"
Write-Host "  4. Open http://localhost:5173 in your browser"
Write-Host "`n📚 For more information, see README.md" -ForegroundColor Cyan
Write-Host "Happy coding! 🚀" -ForegroundColor Green