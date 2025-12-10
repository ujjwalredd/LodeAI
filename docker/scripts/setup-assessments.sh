#!/bin/bash

# Assessment Setup Functions

setup_fullstack_assessment() {
    echo "Setting up Full-Stack Assessment..."
    
    # Initialize Next.js project
    npx create-next-app@latest assessment-project --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
    cd assessment-project
    
    # Install additional dependencies
    npm install @supabase/supabase-js prisma @prisma/client
    npm install -D @types/node
    
    # Create basic project structure
    mkdir -p src/components src/lib src/types src/utils
    mkdir -p tests/unit tests/integration tests/e2e
    
    # Create sample files
    cat > src/lib/database.ts << 'EOF'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)
EOF

    cat > tests/unit/database.test.ts << 'EOF'
import { describe, it, expect } from '@jest/globals'

describe('Database Connection', () => {
  it('should connect to database', () => {
    expect(true).toBe(true)
  })
})
EOF

    # Create package.json scripts
    npm pkg set scripts.test="jest"
    npm pkg set scripts.test:watch="jest --watch"
    npm pkg set scripts.test:coverage="jest --coverage"
}

setup_frontend_assessment() {
    echo "Setting up Frontend Assessment..."
    
    # Initialize React project
    npx create-react-app assessment-project --template typescript
    cd assessment-project
    
    # Install testing dependencies
    npm install -D @testing-library/react @testing-library/jest-dom
    npm install axios react-router-dom
    
    # Create component structure
    mkdir -p src/components src/hooks src/utils src/types
    mkdir -p tests/components tests/hooks tests/utils
}

setup_backend_assessment() {
    echo "Setting up Backend Assessment..."
    
    # Initialize Node.js project
    npm init -y
    npm install express cors helmet morgan
    npm install -D @types/express @types/cors @types/node typescript ts-node nodemon
    
    # Create basic server structure
    mkdir -p src/controllers src/routes src/middleware src/models src/utils
    mkdir -p tests/unit tests/integration
    
    # Create basic server file
    cat > src/server.ts << 'EOF'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'

const app = express()
const PORT = process.env.PORT || 3000

app.use(helmet())
app.use(cors())
app.use(morgan('combined'))
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
EOF
}

setup_datascience_assessment() {
    echo "Setting up Data Science Assessment..."
    
    # Create Python environment
    python3 -m venv venv
    source venv/bin/activate
    
    # Install Python dependencies
    pip install jupyter pandas numpy matplotlib seaborn scikit-learn
    
    # Create Jupyter notebook structure
    mkdir -p notebooks data models
    mkdir -p tests/unit tests/integration
    
    # Create sample notebook
    cat > notebooks/analysis.ipynb << 'EOF'
{
 "cells": [
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": [
    "# Data Science Assessment"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": [
    "import pandas as pd\n",
    "import numpy as np\n",
    "import matplotlib.pyplot as plt\n",
    "import seaborn as sns"
   ]
  }
 ],
 "metadata": {
  "kernelspec": {
   "display_name": "Python 3",
   "language": "python",
   "name": "python3"
  }
 },
 "nbformat": 4,
 "nbformat_minor": 4
}
EOF
}

setup_generic_assessment() {
    echo "Setting up Generic Assessment..."
    
    # Create basic project structure
    mkdir -p src tests docs
    touch README.md package.json
    
    # Initialize package.json
    cat > package.json << 'EOF'
{
  "name": "lodeai-assessment",
  "version": "1.0.0",
  "description": "LodeAI Assessment Project",
  "main": "index.js",
  "scripts": {
    "start": "node src/index.js",
    "test": "jest",
    "dev": "nodemon src/index.js"
  },
  "dependencies": {},
  "devDependencies": {
    "jest": "^29.0.0",
    "nodemon": "^2.0.0"
  }
}
EOF
}
