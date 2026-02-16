#!/bin/bash
# Automated fixes for open source release
# Run this script to fix all critical issues found in audit

set -e

echo "🔧 Fixing critical issues for open source release..."
echo ""

# 1. Create LICENSE file
echo "📄 Creating MIT LICENSE file..."
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2026 Zishan Ashraf

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
echo "✅ LICENSE created"

# 2. Delete test/debug scripts
echo ""
echo "🗑️  Removing test/debug scripts..."
rm -f capture-*.js
rm -f test-*.js
rm -f extract-*.js
rm -f network-*.js
rm -f discover-*.js
echo "✅ Test scripts removed"

# 3. Clean up debug directories
echo ""
echo "🗑️  Cleaning debug directories..."
rm -rf basket-endpoints/
rm -rf clawhub/
echo "✅ Debug directories removed"

# 4. Update .gitignore
echo ""
echo "📝 Updating .gitignore..."
cat > .gitignore << 'EOF'
node_modules/
dist/
*.log
.DS_Store

# Session files
*.session.json
.sainsburys/

# Build artifacts
*.js
*.js.map
!jest.config.js
!setup.js

# IDE
.vscode/
.idea/
*.swp
*.swo

# Test
coverage/
.nyc_output/

# Environment
.env
.env.local

# Temp
*.tmp
tmp/
temp/

# Debug scripts (development only)
capture-*.js
test-*.js
discover-*.js
extract-*.js
network-*.js
EOF
echo "✅ .gitignore updated"

# 5. Update package.json author
echo ""
echo "📝 Updating package.json author..."
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' 's/"author": "zish"/"author": "Zishan Ashraf"/' package.json
else
  sed -i 's/"author": "zish"/"author": "Zishan Ashraf"/' package.json
fi
echo "✅ package.json updated"

# 6. Git status
echo ""
echo "📊 Git status:"
git status --short

echo ""
echo "✅ All critical fixes applied!"
echo ""
echo "Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Run tests: npm run build"
echo "  3. Commit: git add -A && git commit -m 'Prepare for v1.0.0 release'"
echo "  4. Tag: git tag v1.0.0"
echo "  5. Push: git push origin main --tags"
echo ""
echo "⚠️  Still TODO (see AUDIT-REPORT.md):"
echo "  - Make store number configurable (hardcoded '0560')"
echo "  - Add CONTRIBUTING.md"
echo "  - Add GitHub Actions"
echo ""
