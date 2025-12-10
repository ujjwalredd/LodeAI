#!/bin/bash

# LodeAI Docker Environment Setup Script
echo "🐳 Setting up LodeAI Docker Environment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p assessments
mkdir -p logs
mkdir -p data

# Set up environment variables
echo "🔧 Setting up environment variables..."
if [ ! -f .env ]; then
    cat > .env << EOF
# LodeAI Environment Configuration
NODE_ENV=development
ASSESSMENT_MODE=true

# Database Configuration
POSTGRES_DB=lodeai
POSTGRES_USER=lodeai
POSTGRES_PASSWORD=lodeai123

# Supabase Configuration (replace with your actual values)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Docker Configuration
DOCKER_NETWORK=lodeai-network
DOCKER_VOLUME_PREFIX=lodeai
EOF
    echo "✅ Created .env file. Please update with your Supabase credentials."
fi

# Build Docker images
echo "🔨 Building Docker images..."
docker-compose build

# Start services
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🏥 Checking service health..."

# Check dashboard
if curl -f http://localhost:3003/api/health > /dev/null 2>&1; then
    echo "✅ Dashboard is running on http://localhost:3003"
else
    echo "❌ Dashboard is not responding"
fi

# Check database
if docker-compose exec postgres pg_isready -U lodeai > /dev/null 2>&1; then
    echo "✅ Database is running"
else
    echo "❌ Database is not responding"
fi

# Check Redis
if docker-compose exec redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is running"
else
    echo "❌ Redis is not responding"
fi

echo ""
echo "🎉 LodeAI Docker Environment Setup Complete!"
echo ""
echo "📋 Services:"
echo "  - Dashboard: http://localhost:3003"
echo "  - Database: localhost:5432"
echo "  - Redis: localhost:6379"
echo ""
echo "🔧 Management Commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Stop services: docker-compose down"
echo "  - Restart services: docker-compose restart"
echo "  - Clean up: docker-compose down -v"
echo ""
echo "📚 Next Steps:"
echo "  1. Update .env file with your Supabase credentials"
echo "  2. Run the VS Code extension"
echo "  3. Start an assessment session"
