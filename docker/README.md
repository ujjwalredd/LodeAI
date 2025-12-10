# LodeAI Docker Environment

This directory contains the Docker configuration and setup scripts for the LodeAI assessment platform.

## 🐳 Docker Architecture

The LodeAI platform uses Docker containers to provide isolated, reproducible assessment environments for candidates. This ensures:

- **Consistent Environment**: Every candidate gets the same development environment
- **Isolation**: Each assessment runs in its own container
- **Reproducibility**: Tests and results are consistent across different machines
- **Scalability**: Multiple assessments can run simultaneously

## 📁 Directory Structure

```
docker/
├── Dockerfile.assessment      # Assessment environment container
├── Dockerfile.dashboard      # Dashboard container
├── scripts/
│   ├── start-assessment.sh   # Assessment startup script
│   ├── setup-assessments.sh  # Environment setup script
│   └── run-tests.sh          # Test execution script
├── init-db.sql               # Database initialization
├── setup-environment.sh     # Environment setup script
└── README.md                # This file
```

## 🚀 Quick Start

### Prerequisites

- Docker Desktop installed and running
- Docker Compose v2.0+
- Node.js 18+ (for development)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd LodeAI
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

3. **Start the Docker environment**
   ```bash
   chmod +x docker/setup-environment.sh
   ./docker/setup-environment.sh
   ```

4. **Verify services are running**
   ```bash
   docker-compose ps
   ```

## 🔧 Services

### Dashboard Service
- **Port**: 3003
- **Purpose**: LodeAI recruiter dashboard
- **Health Check**: `http://localhost:3003/api/health`

### Assessment Service
- **Ports**: 3000, 3001, 8080
- **Purpose**: Candidate assessment environment
- **Features**: 
  - Pre-configured development tools
  - Test frameworks
  - AI assistant integration

### Database Service
- **Port**: 5432
- **Purpose**: PostgreSQL database
- **Credentials**: lodeai/lodeai123

### Redis Service
- **Port**: 6379
- **Purpose**: Caching and session management

## 🧪 Assessment Types

The Docker environment supports multiple assessment types:

### Full-Stack Assessment
- **Technologies**: Node.js, React, Express, PostgreSQL
- **Tools**: Jest, ESLint, Prettier
- **Duration**: 2-4 hours

### Frontend Assessment
- **Technologies**: React, TypeScript, Tailwind CSS
- **Tools**: Jest, Testing Library
- **Duration**: 1-2 hours

### Backend Assessment
- **Technologies**: Node.js, Express, PostgreSQL
- **Tools**: Jest, Supertest
- **Duration**: 1-3 hours

### Data Science Assessment
- **Technologies**: Python, Jupyter, Pandas, NumPy
- **Tools**: Pytest, Matplotlib
- **Duration**: 2-4 hours

## 🔄 Workflow

### For Recruiters
1. **Create Assessment**: Use the dashboard to create assessment tasks
2. **Assign to Candidate**: Send assessment link to candidate
3. **Monitor Progress**: View real-time assessment progress
4. **Review Results**: Analyze test results and code quality

### For Candidates
1. **Authenticate**: Enter email to start assessment
2. **Environment Setup**: Docker environment is automatically created
3. **Development**: Code in the isolated Docker environment
4. **Testing**: Run tests to validate solutions
5. **Submission**: Submit completed assessment

## 🛠️ Development

### Building Images
```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build assessment
```

### Running Services
```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d assessment

# View logs
docker-compose logs -f assessment
```

### Testing
```bash
# Run tests in assessment container
docker-compose exec assessment npm test

# Run specific test suite
docker-compose exec assessment npm test -- --testNamePattern="API Tests"
```

## 🔍 Monitoring

### Container Status
```bash
# View running containers
docker-compose ps

# View container logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f assessment
```

### Health Checks
```bash
# Check dashboard health
curl http://localhost:3003/api/health

# Check database connection
docker-compose exec postgres pg_isready -U lodeai

# Check Redis connection
docker-compose exec redis redis-cli ping
```

## 🧹 Cleanup

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Clean Up Resources
```bash
# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune

# Full cleanup
docker system prune -a
```

## 🐛 Troubleshooting

### Common Issues

1. **Port conflicts**
   ```bash
   # Check if ports are in use
   lsof -i :3003
   lsof -i :5432
   ```

2. **Permission issues**
   ```bash
   # Fix file permissions
   chmod +x docker/scripts/*.sh
   ```

3. **Container startup failures**
   ```bash
   # Check container logs
   docker-compose logs assessment
   ```

4. **Database connection issues**
   ```bash
   # Check database status
   docker-compose exec postgres pg_isready -U lodeai
   ```

### Debug Mode

Enable debug logging:
```bash
export DEBUG=true
docker-compose up
```

## 📊 Performance

### Resource Requirements
- **Minimum**: 4GB RAM, 2 CPU cores
- **Recommended**: 8GB RAM, 4 CPU cores
- **Storage**: 10GB free space

### Optimization
- Use `.dockerignore` to exclude unnecessary files
- Leverage Docker layer caching
- Use multi-stage builds for production images

## 🔒 Security

### Best Practices
- Use non-root users in containers
- Keep base images updated
- Scan images for vulnerabilities
- Use secrets management for sensitive data

### Network Security
- Containers communicate through isolated network
- No direct external access to assessment containers
- Dashboard and database are properly secured

## 📈 Scaling

### Horizontal Scaling
```bash
# Scale assessment service
docker-compose up -d --scale assessment=3
```

### Load Balancing
- Use nginx or traefik for load balancing
- Implement health checks
- Configure auto-scaling policies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Docker environment
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

# 🌐 Multi-Language Assessment Sandbox

## Overview

The `Dockerfile.multi-language-sandbox` provides a secure, isolated environment for running candidate assessments in **multiple programming languages**.

### Supported Languages

- ✅ **Python 3.11** - pytest, pandas, numpy, scikit-learn, matplotlib
- ✅ **Node.js 20.x** - Jest, Mocha, TypeScript, ts-node
- ✅ **Java 17** - OpenJDK with JUnit 5
- ✅ **Go 1.21.5** - Go testing package
- ✅ **C++** - g++ with C++17 support

## Building the Multi-Language Image

From the LodeAI project root:

```bash
docker build -t lodeai-multi-language-sandbox -f docker/Dockerfile.multi-language-sandbox .
```

**Build time**: ~5-10 minutes (downloads and installs all language runtimes)

## Verifying the Image

Test that all languages are installed:

```bash
docker run --rm lodeai-multi-language-sandbox bash -c \
  "python3 --version && node --version && java -version && go version && g++ --version"
```

Expected output:
```
Python 3.11.x
v20.x.x
openjdk version "17.x.x"
go version go1.21.5 linux/amd64
g++ (Ubuntu 11.x.x)
```

## How It Works

### 1. Language Detection
The VSCode extension reads `.lodeai.json` metadata:
```json
{
  "language": "python",
  "main_file": "runner.py",
  "test_command": "python runner.py"
}
```

### 2. Automatic Execution
Based on the language, the sandbox:
- **Python**: Installs `requirements.txt` → Runs `python3 runner.py`
- **JavaScript**: Installs `package.json` → Runs `node runner.js`
- **TypeScript**: Installs packages → Runs `ts-node runner.ts`
- **Java**: Compiles `.java` files → Runs `java TestRunner`
- **Go**: Auto-fetches modules → Runs `go run runner.go`
- **C++**: Compiles with g++ → Runs compiled binary

### 3. Test Execution Flow
```
1. Mount assessment folder (read-only)
2. Install language-specific dependencies
3. Execute main_file (runner)
4. Runner executes:
   - test_visible.* (2-3 basic tests)
   - .hidden/test_hidden.* (8-12 edge case tests)
5. Return results + resource usage
```

## Security Features

- 🔒 **Non-root user**: All code runs as `sandbox` user
- 🔒 **Read-only mounting**: Assessment code cannot be modified
- 🔒 **Network isolation**: No external network access by default
- 🔒 **Resource limits**: CPU (0.5 cores), Memory (512MB), Timeout (5min)
- 🔒 **No privilege escalation**: Capabilities dropped
- 🔒 **Temporary filesystems**: Cache directories are tmpfs

## Language-Specific Details

### Python
**Packages Included:**
- pytest, pytest-timeout
- pandas, numpy, scipy
- scikit-learn, matplotlib, seaborn
- requests, flask

**Dependency Installation:**
```bash
pip3 install --user -q -r requirements.txt
```

### JavaScript/TypeScript
**Packages Included:**
- Jest, Mocha, Chai
- TypeScript, ts-node
- @types/node

**Dependency Installation:**
```bash
npm install --silent
```

### Java
**Included:**
- OpenJDK 17
- JUnit 5 (via Maven/Gradle if configured)

**Compilation:**
```bash
javac TestRunner.java && java TestRunner
```

### Go
**Version:** 1.21.5
**Auto-dependency handling** via `go mod`

### C++
**Compiler:** g++ 11.x with C++17 support
**Compilation:**
```bash
g++ -std=c++17 runner.cpp -o runner && ./runner
```

## Usage in LodeAI Extension

### Automatic Flow
1. User selects language in dropdown (Python/JavaScript/TypeScript/Java/Go/C++)
2. Planner agent generates assessment in selected language
3. Executor creates files: `runner.*`, `test_visible.*`, `.hidden/test_hidden.*`
4. User codes solution
5. **"Run in Sandbox"** button:
   - Reads `.lodeai.json` for language
   - Builds Docker container with multi-language image
   - Executes language-specific test command
   - Shows results in terminal

### Test Output
```
============================================================
ASSESSMENT TEST RUNNER
============================================================

[VISIBLE TESTS] Basic functionality
------------------------------------------------------------
✓ test_basic_case
✓ test_simple_input

[HIDDEN TESTS] Edge cases & performance
------------------------------------------------------------
✓ test_edge_case_1
✓ test_edge_case_2
✓ test_performance
✓ test_boundary_conditions
...

============================================================
✅ ALL TESTS PASSED
============================================================
```

## Updating the Image

If you need to add packages:

### Python packages
Edit `docker/python-requirements.txt`:
```txt
pytest>=7.0.0
pandas>=2.0.0
your-new-package>=1.0.0
```

### Node packages
Modify Dockerfile:
```dockerfile
RUN npm install -g \
    typescript \
    ts-node \
    your-new-package
```

### Rebuild
```bash
docker build -t lodeai-multi-language-sandbox -f docker/Dockerfile.multi-language-sandbox .
```

## Troubleshooting

### Build fails
- Ensure Docker Desktop is running
- Check internet connection (downloads ~2GB of packages)
- Increase Docker memory limit to 4GB+ in Docker Desktop settings

### Tests don't run
- Verify `.lodeai.json` exists with correct `language` and `main_file`
- Check assessment files are valid (syntax errors will cause failures)
- View Docker logs: `docker logs <container_id>`

### Dependency installation fails
- **Python**: Check `requirements.txt` format and package availability
- **Node**: Verify `package.json` is valid JSON
- **Java**: Ensure classpath and dependencies are correct
- **Go**: Check `go.mod` file if using modules

### "Command not found" errors
- Ensure you're using the multi-language image: `lodeai-multi-language-sandbox`
- Rebuild the image if recently updated
- Check the language is supported (Python/JS/TS/Java/Go/C++)

## Performance Considerations

**Image Size**: ~2.5 GB (includes all language runtimes)
**Container Startup**: ~2-3 seconds
**First dependency install**: Varies by language
- Python: 5-30 seconds
- Node: 10-60 seconds
- Java: Instant (compilation time varies)
- Go: 5-20 seconds (module download)
- C++: Instant (compilation time varies)

## Resource Requirements

**Minimum:**
- 4GB RAM
- 2 CPU cores
- 5GB disk space

**Recommended for production:**
- 8GB RAM
- 4 CPU cores
- 20GB disk space

## Coming Soon

- 🔜 Rust support
- 🔜 Ruby support
- 🔜 PHP support
- 🔜 Kotlin/Scala (JVM languages)
- 🔜 Custom language plugins
