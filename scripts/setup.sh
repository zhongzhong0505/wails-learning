#!/bin/bash
# Wails v3 Learning Tutorial - Environment Setup Script
# Run: chmod +x scripts/setup.sh && ./scripts/setup.sh

set -e

echo "🚀 Setting up Wails v3 development environment..."
echo ""

# Check Go
if command -v go &> /dev/null; then
    echo "✅ Go is installed: $(go version)"
else
    echo "❌ Go is not installed. Please install Go 1.22.4+ from https://go.dev/dl/"
    exit 1
fi

# Check Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js is installed: $(node --version)"
else
    echo "❌ Node.js is not installed. Please install Node.js 20+ from https://nodejs.org/"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    echo "✅ npm is installed: $(npm --version)"
else
    echo "❌ npm is not installed."
    exit 1
fi

# Install Wails v3 CLI
echo ""
echo "📦 Installing Wails v3 CLI..."
go install github.com/wailsapp/wails/v3/cmd/wails3@latest

if command -v wails3 &> /dev/null; then
    echo "✅ Wails v3 CLI installed successfully"
    wails3 version
else
    echo "⚠️  wails3 installed but not in PATH. Add \$GOPATH/bin to your PATH."
    echo "   export PATH=\$PATH:\$(go env GOPATH)/bin"
fi

# macOS specific
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo ""
    echo "🍎 macOS detected. Checking Xcode Command Line Tools..."
    if xcode-select -p &> /dev/null; then
        echo "✅ Xcode Command Line Tools installed"
    else
        echo "📦 Installing Xcode Command Line Tools..."
        xcode-select --install
    fi
fi

echo ""
echo "🎉 Setup complete! You can now run any demo:"
echo "   cd demos/01-hello-world"
echo "   cd frontend && npm install && cd .."
echo "   wails3 dev"
