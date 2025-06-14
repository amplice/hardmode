#!/bin/bash

# Hardmode Development Environment Setup Script
# This script sets up the development environment for the Hardmode multiplayer game

set -e  # Exit on error

echo "🎮 Hardmode Development Setup"
echo "============================"

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v)
REQUIRED_NODE_VERSION="18"
if [[ ! "$NODE_VERSION" =~ ^v($REQUIRED_NODE_VERSION|[2-9][0-9])\. ]]; then
    echo "❌ Error: Node.js $REQUIRED_NODE_VERSION or higher is required. Current version: $NODE_VERSION"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi
echo "✅ Node.js version: $NODE_VERSION"

# Install client dependencies
echo ""
echo "📦 Installing client dependencies..."
npm install

# Install server dependencies
echo ""
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..

# Create environment file if it doesn't exist
if [ ! -f "server/.env" ]; then
    echo ""
    echo "🔧 Creating server environment configuration..."
    cp server/.env.example server/.env
    echo "✅ Created server/.env from .env.example"
    echo "⚠️  Please update server/.env with your configuration"
fi

# Create necessary directories
echo ""
echo "📁 Creating necessary directories..."
mkdir -p server/logs
mkdir -p server/src/{systems,entities,network,utils}
mkdir -p shared/{types,constants,utils}
mkdir -p protocol/{messages,events}

# Install PostgreSQL if not installed (optional)
echo ""
echo "💾 Database setup..."
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL is installed"
else
    echo "⚠️  PostgreSQL is not installed. You'll need it for persistence features."
    echo "   Install from: https://www.postgresql.org/download/"
fi

# Setup git hooks (optional)
echo ""
echo "🔗 Setting up git hooks..."
if [ -d ".git" ]; then
    # Pre-commit hook for linting
    cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
echo "Running pre-commit checks..."

# Run ESLint on staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$')
if [ -n "$STAGED_FILES" ]; then
    echo "Running ESLint..."
    npx eslint $STAGED_FILES
    if [ $? -ne 0 ]; then
        echo "❌ ESLint found errors. Please fix them before committing."
        exit 1
    fi
fi

echo "✅ Pre-commit checks passed!"
EOF
    chmod +x .git/hooks/pre-commit
    echo "✅ Git hooks configured"
fi

# Development tools check
echo ""
echo "🛠️  Checking recommended development tools..."

# Check VS Code
if command -v code &> /dev/null; then
    echo "✅ VS Code is installed"
    
    # Install recommended extensions
    echo "   Installing recommended VS Code extensions..."
    code --install-extension dbaeumer.vscode-eslint &> /dev/null || true
    code --install-extension esbenp.prettier-vscode &> /dev/null || true
    code --install-extension ms-vscode.vscode-typescript-next &> /dev/null || true
else
    echo "⚠️  VS Code is not installed. Recommended for development."
fi

# Summary
echo ""
echo "✨ Development environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "  1. Update server/.env with your configuration"
echo "  2. Start the server: cd server && npm run dev"
echo "  3. Start the client: npm run dev (in another terminal)"
echo "  4. Open http://localhost:5173 in your browser"
echo ""
echo "📚 For more information, see README.md"
echo "Happy coding! 🚀"