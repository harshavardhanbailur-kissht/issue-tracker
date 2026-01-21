#!/bin/bash

# Firebase Hosting Deployment Script
# This script ensures environment variables are loaded before building

set -e

echo "🚀 Starting deployment process..."

# Load environment variables from .env file
if [ -f .env ]; then
    echo "📝 Loading environment variables from .env file..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  Warning: .env file not found!"
    echo "Please ensure .env file exists with required variables:"
    echo "  - VITE_GOOGLE_CLIENT_ID"
    echo "  - VITE_GOOGLE_API_KEY"
    echo "  - VITE_FIREBASE_* (all Firebase config)"
fi

# Verify required Google Drive variables
if [ -z "$VITE_GOOGLE_CLIENT_ID" ]; then
    echo "❌ Error: VITE_GOOGLE_CLIENT_ID is not set!"
    exit 1
fi

if [ -z "$VITE_GOOGLE_API_KEY" ]; then
    echo "❌ Error: VITE_GOOGLE_API_KEY is not set!"
    exit 1
fi

echo "✅ Environment variables loaded"

# Reminder about Google Cloud Console configuration
echo ""
echo "⚠️  IMPORTANT: Before deploying, ensure Google Cloud Console is configured:"
echo "   1. Go to: https://console.cloud.google.com/apis/credentials"
echo "   2. Edit your OAuth Client ID"
echo "   3. Add these URLs to 'Authorized JavaScript origins':"
echo "      - http://localhost:5173"
echo "      - https://issue-tracker-app-1768880804.web.app"
echo "      - https://issue-tracker-app-1768880804.firebaseapp.com"
echo "   4. Add the SAME URLs to 'Authorized redirect URIs'"
echo "   5. See REDIRECT_URI_FIX.md for detailed instructions"
echo ""

# Build the project
echo "🔨 Building project..."
npm run build

# Verify Client ID is in the build
if grep -q "$VITE_GOOGLE_CLIENT_ID" dist/assets/*.js 2>/dev/null; then
    echo "✅ Client ID found in build"
else
    echo "⚠️  Warning: Client ID not found in build - deployment may fail"
fi

# Deploy to Firebase
echo "📤 Deploying to Firebase Hosting..."
firebase deploy --only hosting

echo "✅ Deployment complete!"
echo "🌐 Live URL: https://issue-tracker-app-1768880804.web.app"
