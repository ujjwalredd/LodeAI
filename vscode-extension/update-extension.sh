#!/bin/bash

# LodeAI Extension Update Script
echo "🚀 Updating LodeAI Extension..."

# Check if version argument is provided
if [ -z "$1" ]; then
    echo "❌ Please provide a version number (e.g., 0.1.1)"
    echo "Usage: ./update-extension.sh 0.1.1"
    exit 1
fi

NEW_VERSION=$1

# Update version in package.json
echo "📝 Updating version to $NEW_VERSION..."
npm version $NEW_VERSION --no-git-tag-version

# Compile the extension
echo "🔨 Compiling extension..."
npm run compile

# Package the extension
echo "📦 Packaging extension..."
vsce package

# Publish the extension
echo "🚀 Publishing to VS Code Marketplace..."
vsce publish

echo "✅ Extension updated to version $NEW_VERSION!"
echo "🌐 Check it out at: https://marketplace.visualstudio.com/items?itemName=lodeai.lodeai-recruit"
