#!/bin/bash

# Gaming Achievement Dashboard Setup Script
echo "🎮 Setting up Gaming Achievement Dashboard..."

# Check if we're in the right directory
if [ ! -f "index.html" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

echo "✅ Project structure looks good!"

# Check if Git is initialized
if [ ! -d ".git" ]; then
    echo "📁 Initializing Git repository..."
    git init
    echo "✅ Git repository initialized"
else
    echo "✅ Git repository already exists"
fi

# Add meta tags to index.html if not already present
if ! grep -q "og:title" index.html; then
    echo "🏷️  Adding meta tags for better SEO..."
    # Insert meta tags after the charset declaration
    sed -i '/<meta charset="UTF-8">/r meta-tags.html' index.html
    echo "✅ Meta tags added"
else
    echo "✅ Meta tags already present"
fi

# Create initial commit if needed
if [ -d ".git" ] && [ -z "$(git log --oneline 2>/dev/null)" ]; then
    echo "💾 Creating initial commit..."
    git add .
    git commit -m "Initial commit: Gaming Achievement Dashboard"
    echo "✅ Initial commit created"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit the achievement data files in the 'data/' folder"
echo "2. Push to GitHub: git remote add origin <your-repo-url> && git push -u origin main"
echo "3. Enable GitHub Pages in your repository settings"
echo "4. Your dashboard will be available at: https://<username>.github.io/<repository-name>"
echo ""
echo "📖 For detailed instructions, see README.md"