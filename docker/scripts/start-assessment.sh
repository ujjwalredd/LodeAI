#!/bin/bash

# LodeAI Assessment Startup Script
echo "🚀 Starting LodeAI Assessment Environment..."

# Set up environment
export ASSESSMENT_ID=${ASSESSMENT_ID:-"default"}
export CANDIDATE_EMAIL=${CANDIDATE_EMAIL:-"candidate@example.com"}
export ASSESSMENT_TYPE=${ASSESSMENT_TYPE:-"fullstack"}

# Create assessment directory structure
mkdir -p /assessment/src
mkdir -p /assessment/tests
mkdir -p /assessment/docs
mkdir -p /assessment/logs

# Initialize project based on assessment type
case $ASSESSMENT_TYPE in
    "fullstack")
        echo "📦 Setting up Full-Stack Assessment Environment..."
        setup_fullstack_assessment
        ;;
    "frontend")
        echo "🎨 Setting up Frontend Assessment Environment..."
        setup_frontend_assessment
        ;;
    "backend")
        echo "⚙️ Setting up Backend Assessment Environment..."
        setup_backend_assessment
        ;;
    "data-science")
        echo "📊 Setting up Data Science Assessment Environment..."
        setup_datascience_assessment
        ;;
    *)
        echo "🔧 Setting up Generic Assessment Environment..."
        setup_generic_assessment
        ;;
esac

# Start development server
echo "🌐 Starting development server..."
npm run dev &

# Keep container running
tail -f /dev/null
