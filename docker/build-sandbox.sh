#!/bin/bash

# Build script for LodeAI Multi-Language Sandbox Docker Image
# This script builds the Docker image that supports Python, JavaScript, TypeScript, Java, Go, and C++

set -e  # Exit on error

echo "======================================"
echo "LodeAI Multi-Language Sandbox Builder"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
echo -e "${YELLOW}Checking Docker...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running. Please start Docker Desktop and try again.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"
echo ""

# Get the project root directory (parent of docker/)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo -e "${YELLOW}Project root: ${PROJECT_ROOT}${NC}"
echo ""

# Check if Dockerfile exists
DOCKERFILE="${SCRIPT_DIR}/Dockerfile.multi-language-sandbox"
if [ ! -f "$DOCKERFILE" ]; then
    echo -e "${RED}Error: Dockerfile not found at ${DOCKERFILE}${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Dockerfile found${NC}"
echo ""

# Check if python-requirements.txt exists
REQUIREMENTS="${SCRIPT_DIR}/python-requirements.txt"
if [ ! -f "$REQUIREMENTS" ]; then
    echo -e "${RED}Error: python-requirements.txt not found at ${REQUIREMENTS}${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python requirements file found${NC}"
echo ""

# Build the image
IMAGE_NAME="lodeai-multi-language-sandbox"
echo -e "${YELLOW}Building Docker image: ${IMAGE_NAME}${NC}"
echo -e "${YELLOW}This may take 5-10 minutes (downloading and installing all language runtimes)...${NC}"
echo ""

# Run the build
docker build \
    -t "${IMAGE_NAME}" \
    -f "${DOCKERFILE}" \
    "${PROJECT_ROOT}" \
    --progress=plain

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}======================================"
    echo -e "✓ Build successful!"
    echo -e "======================================${NC}"
    echo ""
    echo "Image: ${IMAGE_NAME}"
    echo ""
    echo -e "${YELLOW}Verifying installed languages...${NC}"
    echo ""

    # Verify all languages are installed
    docker run --rm "${IMAGE_NAME}" bash -c "
        echo '✓ Python:' && python3 --version &&
        echo '✓ Node.js:' && node --version &&
        echo '✓ Java:' && java -version 2>&1 | head -n 1 &&
        echo '✓ Go:' && go version &&
        echo '✓ C++:' && g++ --version | head -n 1
    "

    echo ""
    echo -e "${GREEN}======================================"
    echo -e "All languages verified successfully!"
    echo -e "======================================${NC}"
    echo ""
    echo "You can now run assessments in:"
    echo "  • Python"
    echo "  • JavaScript"
    echo "  • TypeScript"
    echo "  • Java"
    echo "  • Go"
    echo "  • C++"
    echo ""
    echo "The VSCode extension will automatically use this image."
    echo ""
else
    echo ""
    echo -e "${RED}======================================"
    echo -e "✗ Build failed"
    echo -e "======================================${NC}"
    echo ""
    echo "Please check the error messages above."
    echo ""
    exit 1
fi
