# LodeAI - AI-Powered Technical Recruitment Platform

An enterprise-grade AI-powered technical assessment platform that revolutionizes the hiring process by generating personalized coding assessments using advanced AI and providing candidates with fully configured, AI-guided development environments.

## Overview

LodeAI is a comprehensive technical recruitment platform that combines cutting-edge AI technology with modern development tools to streamline the hiring process. The platform enables recruiters to create personalized coding assessments automatically generated from job descriptions, while candidates receive fully prepared development environments with AI-powered assistance directly in their VS Code editor.

## Key Features

### AI-Powered Assessment Generation
- **Intelligent Assessment Creation**: Automatically generates personalized coding challenges based on job descriptions and candidate resumes using Claude AI (Anthropic Sonnet 4)
- **Multi-Assessment Types**: Supports LeetCode-style algorithms, system design, debugging, code review, real-world projects, and data analysis assessments
- **Smart Difficulty Matching**: Adapts assessment difficulty based on candidate experience level and job requirements
- **Comprehensive Test Generation**: Creates both visible sample tests and comprehensive hidden test suites with 50+ edge cases

### VS Code Extension
- **Seamless Integration**: Native VS Code extension providing integrated assessment experience
- **AI-Powered Assistance**: Real-time AI guidance and hints during coding assessments
- **Multi-Agent Architecture**: Coordinated system of specialized agents (Planner, Executor, Error Handler, Helper) for intelligent task orchestration
- **Streaming AI Responses**: Real-time streaming of AI-generated content for responsive user experience

### Docker Sandbox Environments
- **Secure Code Execution**: Isolated Docker containers for running candidate code safely
- **Multi-Language Support**: Python, JavaScript/TypeScript, Java, Go, C++ sandbox environments
- **Resource Management**: Automated container lifecycle management with cleanup and monitoring
- **Test Runner Integration**: Automated test execution within secure sandbox environments

### Recruiter Dashboard
- **Modern Web Interface**: Built with Next.js 14 and React 18 with TailwindCSS
- **Job Management**: Create, manage, and track job postings
- **Candidate Assignment**: Assign assessments to candidates with email notifications
- **Real-time Updates**: Live status updates for assignments and assessments

### Multi-Agent System Architecture
- **Planner Agent**: Analyzes job descriptions and resumes to create personalized assessment plans
- **Executor Agent**: Executes assessment setup tasks and manages project structure
- **Error Handler Agent**: Intelligent error resolution with AI-powered fallback strategies
- **Helper Agent**: Provides contextual assistance and project navigation guidance
- **Assessment Orchestrator**: Coordinates multi-agent workflows using MCP (Model Context Protocol)

## Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first CSS framework
- **Lucide React** - Modern icon library

### Backend & APIs
- **Next.js API Routes** - Serverless API endpoints
- **Supabase** - Backend-as-a-Service (PostgreSQL database, authentication, real-time subscriptions)
- **Claude AI (Anthropic SDK)** - Advanced AI capabilities for assessment generation
- **Mailgun** - Email notification service

### Development Tools & Infrastructure
- **Docker & Docker Compose** - Containerization and orchestration
- **VS Code Extension API** - Native editor integration
- **TypeScript** - Type-safe JavaScript
- **Node.js** - Runtime environment

### AI & Machine Learning
- **Claude Sonnet 4** (Anthropic) - Large language model for assessment generation
- **Model Context Protocol (MCP)** - Agent coordination and communication
- **AI Streaming Service** - Real-time AI response streaming

### Database & Storage
- **PostgreSQL** (via Supabase) - Relational database
- **Supabase Auth** - Authentication and authorization

### Languages & Frameworks Supported
- **Python** (Flask, FastAPI, Django, pytest)
- **JavaScript/TypeScript** (Node.js, Express, React)
- **Java** (Spring Boot)

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Recruiter Dashboard                       │
│              (Next.js 14 + React + TailwindCSS)              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (Next.js API Routes)            │
│         ┌──────────────┐         ┌──────────────┐           │
│         │ Supabase API │         │ Email Service│           │
│         │ (Database)   │         │  (Mailgun)   │           │
│         └──────────────┘         └──────────────┘           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              VS Code Extension (TypeScript)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Planner     │  │  Executor    │  │ Error Handler│      │
│  │   Agent      │  │   Agent      │  │    Agent     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │   Helper     │  │ Orchestrator │                        │
│  │   Agent      │  │   (MCP)      │                        │
│  └──────────────┘  └──────────────┘                        │
│  ┌─────────────────────────────────────────────┐            │
│  │        Claude AI (Anthropic SDK)            │            │
│  │      (Assessment Generation & Streaming)    │            │
│  └─────────────────────────────────────────────┘            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Docker Sandbox Environments                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Python   │  │  Node.js │  │   Java   │  │    Go    │   │
│  │ Sandbox  │  │ Sandbox  │  │ Sandbox  │  │ Sandbox  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Patterns

- **Multi-Agent Architecture**: Specialized agents for different tasks with coordinated workflows
- **Model Context Protocol (MCP)**: Inter-agent communication and shared state management
- **Streaming Architecture**: Real-time AI response streaming for improved UX
- **Container Orchestration**: Docker-based sandbox management for secure code execution
- **RESTful API Design**: Clean API architecture with Next.js API routes

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- VS Code (for extension development)
- Supabase account
- Anthropic Claude API key
- Mailgun account (optional, for email notifications)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd LodeAI-main
   ```

2. **Install dependencies**
   ```bash
   # Root dependencies
   npm install
   
   # Dashboard dependencies
   cd dashboard
   npm install
   
   # VS Code Extension dependencies
   cd ../vscode-extension
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Dashboard environment variables
   cd dashboard
   cp .env.example .env
   # Configure: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
   # SUPABASE_SERVICE_ROLE_KEY, MAILGUN_API_KEY, MAILGUN_DOMAIN
   ```

4. **Database Setup**
   ```bash
   cd dashboard
   # Run Supabase table creation script
   psql <your-supabase-connection> < setup-supabase-tables.sql
   ```

5. **Start Docker Services**
   ```bash
   docker-compose up -d
   ```

6. **Run Dashboard**
   ```bash
   cd dashboard
   npm run dev
   ```

7. **Build VS Code Extension**
   ```bash
   cd vscode-extension
   npm run compile
   ```

## Project Structure

```
LodeAI-main/
├── dashboard/                    # Next.js web application
│   ├── app/                     # Next.js App Router
│   │   ├── api/                 # API routes
│   │   ├── auth/                # Authentication pages
│   │   └── dashboard/           # Dashboard pages
│   ├── components/              # React components
│   │   ├── RecruiterDashboard.tsx
│   │   ├── CandidatePortal.tsx
│   │   └── JobPortal.tsx
│   └── lib/                     # Utilities and services
│       ├── supabaseClient.ts
│       └── emailService.ts
│
├── vscode-extension/            # VS Code extension
│   ├── src/
│   │   ├── agents/              # Multi-agent system
│   │   │   ├── planner-agent.ts
│   │   │   ├── executor-agent.ts
│   │   │   ├── error-handler-agent.ts
│   │   │   └── helper-agent.ts
│   │   ├── orchestrator/        # Assessment orchestration
│   │   ├── utils/               # Utilities
│   │   │   ├── claude-client.ts
│   │   │   ├── sandbox-manager.ts
│   │   │   └── mcp-service.ts
│   │   └── extension.ts         # Extension entry point
│   └── package.json
│
├── docker/                      # Docker configurations
│   ├── Dockerfile.dashboard
│   ├── Dockerfile.python-sandbox
│   └── Dockerfile.assessment
│
└── docker-compose.yml           # Docker orchestration
```

## Key Technologies & Concepts

- **AI Integration**: Advanced integration with Claude AI for intelligent assessment generation
- **Multi-Agent Systems**: Coordinated agent architecture for complex task execution
- **Container Security**: Secure, isolated Docker environments for code execution
- **Real-time Communication**: WebSocket-based real-time updates and AI streaming
- **Type Safety**: Comprehensive TypeScript implementation across the codebase
- **Modern React Patterns**: Hooks, context API, and server components
- **Database Design**: PostgreSQL schema design with Supabase integration
- **API Architecture**: RESTful API design with Next.js API routes

## Features in Detail

### Assessment Generation
- Analyzes job descriptions and candidate resumes using Claude AI
- Generates appropriate assessment types (algorithm, system design, debugging, etc.)
- Creates comprehensive test suites with visible and hidden test cases
- Supports multiple programming languages and frameworks

### VS Code Integration
- Native sidebar integration in VS Code
- Real-time AI assistance during coding
- Automated environment setup
- Integrated test execution

### Sandbox Security
- Isolated Docker containers for code execution
- Resource limits and timeouts
- Network isolation
- Automated cleanup

## Contributing

This is a personal project showcasing advanced full-stack development skills with AI integration. Feel free to explore the codebase and learn from the implementation.

## License

See LICENSE file for details.

## Skills Demonstrated

- **Full-Stack Development**: Next.js, React, TypeScript, Node.js
- **AI Integration**: Claude AI API, prompt engineering, streaming responses
- **System Architecture**: Multi-agent systems, microservices, event-driven architecture
- **DevOps**: Docker, containerization, CI/CD concepts
- **Database Design**: PostgreSQL, schema design, ORM usage
- **API Development**: RESTful APIs, authentication, real-time features
- **Extension Development**: VS Code Extension API, webview integration
- **Modern JavaScript**: ES6+, TypeScript, async/await, streams

---

**Built with ❤️ using Next.js, React, TypeScript, Claude AI, Docker, and Supabase**
