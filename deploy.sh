#!/bin/bash

# 🚀 Keyboard Kingdom Deployment Script
# Production deployment automation for Vercel

echo "🎮 KEYBOARD KINGDOM - PRODUCTION DEPLOYMENT"
echo "================================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Check if user is logged in to Vercel
echo "🔐 Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
    echo "❌ Not logged in to Vercel"
    echo "🔑 Run: vercel login"
    exit 1
else
    echo "✅ Logged in to Vercel"
fi

# Run tests before deployment
echo "🧪 Running production tests..."
npm test

if [ $? -ne 0 ]; then
    echo "❌ Tests failed - aborting deployment"
    exit 1
fi

# Build for production
echo "🔨 Building for production..."
npm run vercel-build

if [ $? -ne 0 ]; then
    echo "❌ Build failed - aborting deployment"
    exit 1
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
npm run deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 DEPLOYMENT SUCCESSFUL!"
    echo "🌐 Your game is now live on Vercel!"
    echo "📊 Check your Vercel dashboard for analytics"
    echo "🔍 Test your production app at the provided URL"
else
    echo "❌ Deployment failed"
    echo "🔍 Check the error messages above"
    exit 1
fi

echo ""
echo "📋 Post-deployment checklist:"
echo "✅ Authentication system active"
echo "✅ Minecraft-style monsters loaded"
echo "✅ Character selection working"
echo "✅ Performance optimizations enabled"
echo "✅ Production configuration applied"
echo ""
echo "🎮 Ready to dominate the typing battle game!"
