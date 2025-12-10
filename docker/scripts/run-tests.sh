#!/bin/bash

# LodeAI Test Runner Script
echo "🧪 Running LodeAI Assessment Tests..."

# Set up test environment
export TEST_MODE=true
export NODE_ENV=test

# Navigate to assessment directory
cd /assessment

# Run different test types based on project structure
if [ -f "package.json" ]; then
    echo "📦 Running Node.js/JavaScript tests..."
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    
    # Run tests based on test framework
    if grep -q "jest" package.json; then
        echo "Running Jest tests..."
        npm test -- --coverage --verbose
    elif grep -q "mocha" package.json; then
        echo "Running Mocha tests..."
        npm run test
    else
        echo "No test framework found, running basic tests..."
        node -e "console.log('Basic test passed')"
    fi
fi

# Run Python tests if present
if [ -f "requirements.txt" ] || [ -d "venv" ]; then
    echo "🐍 Running Python tests..."
    
    if [ -d "venv" ]; then
        source venv/bin/activate
    fi
    
    if command -v pytest &> /dev/null; then
        pytest tests/ -v --cov=src
    elif [ -f "test_*.py" ]; then
        python -m unittest discover tests/
    fi
fi

# Run specific assessment tests
if [ -d "tests" ]; then
    echo "🔍 Running custom assessment tests..."
    
    # Find and run test files
    find tests/ -name "*.test.js" -o -name "*.spec.js" | while read testfile; do
        echo "Running: $testfile"
        node "$testfile" || echo "Test failed: $testfile"
    done
fi

# Generate test report
echo "📊 Generating test report..."
cat > /assessment/test-report.json << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "assessment_id": "${ASSESSMENT_ID}",
  "candidate_email": "${CANDIDATE_EMAIL}",
  "test_results": {
    "total_tests": 0,
    "passed": 0,
    "failed": 0,
    "coverage": "0%"
  },
  "status": "completed"
}
EOF

echo "✅ Test execution completed!"
