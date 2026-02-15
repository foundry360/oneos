# Project Structure

```
OneOS/
├── frontend/                    # Next.js 14 Frontend Application
│   ├── app/                    # Next.js App Router
│   │   ├── dashboard/         # Dashboard page
│   │   ├── files/             # File management page
│   │   ├── login/             # Login page
│   │   ├── reviews/           # Review tasks page
│   │   ├── tokenized/         # Tokenized data page
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page (redirects)
│   │   └── globals.css        # Global styles
│   ├── hooks/                  # React hooks
│   │   ├── useAuth.ts         # Authentication hook
│   │   ├── useDashboard.ts    # Dashboard data hook
│   │   ├── useFiles.ts        # File management hook
│   │   ├── useReviews.ts      # Review tasks hook
│   │   └── useTokenized.ts    # Tokenized data hook
│   ├── Dockerfile             # Frontend Docker image
│   ├── package.json           # Frontend dependencies
│   ├── next.config.js         # Next.js configuration
│   ├── tsconfig.json          # TypeScript configuration
│   └── .eslintrc.json        # ESLint configuration
│
├── backend/                    # Node.js/Express Backend API
│   ├── src/
│   │   ├── config/            # Configuration modules
│   │   │   ├── database.js    # PostgreSQL connection
│   │   │   └── pubsub.js      # Pub/Sub client
│   │   ├── middleware/        # Express middleware
│   │   │   ├── auth.js        # Authentication middleware
│   │   │   └── audit.js       # Audit logging middleware
│   │   ├── routes/            # API routes
│   │   │   ├── index.js       # Route aggregator
│   │   │   ├── files.js       # File endpoints
│   │   │   ├── tokenization.js # Tokenization endpoints
│   │   │   ├── ai.js          # AI inference endpoints
│   │   │   ├── review.js      # Review task endpoints
│   │   │   └── dashboard.js   # Dashboard endpoints
│   │   ├── services/          # Business logic
│   │   │   └── aiService.js   # AI service (Vertex AI stubs)
│   │   ├── utils/             # Utility functions
│   │   │   ├── logger.js      # Winston logger
│   │   │   └── storage.js     # File storage utilities
│   │   ├── workers/           # Background workers
│   │   │   ├── tokenizationWorker.js # Tokenization worker
│   │   │   └── inferenceWorker.js    # Inference worker
│   │   └── server.js          # Express server entry point
│   ├── Dockerfile             # Backend Docker image
│   ├── package.json           # Backend dependencies
│   └── nodemon.json           # Nodemon configuration
│
├── ai/                         # AI Workflow Configurations
│   └── README.md              # AI workflows documentation
│
├── db/                         # Database Schema
│   └── init.sql               # PostgreSQL initialization script
│
├── storage/                    # Local File Storage
│   └── .gitkeep               # Git placeholder
│
├── logs/                       # Application Logs
│   └── .gitkeep               # Git placeholder
│
├── docker-compose.yml          # Docker Compose configuration
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore rules
├── README.md                  # Main documentation
├── SETUP.md                   # Setup guide
└── PROJECT_STRUCTURE.md       # This file
```

## Key Components

### Frontend (Next.js 14)
- **Framework**: Next.js 14 with App Router
- **UI Library**: Chakra UI
- **State Management**: React Query
- **Authentication**: Supabase Auth (optional in dev)
- **Styling**: Chakra UI (can be switched to TailwindCSS)

### Backend (Node.js/Express)
- **Framework**: Express.js
- **Database**: PostgreSQL with connection pooling
- **Queue**: Google Cloud Pub/Sub (emulator for local)
- **Storage**: Local file system (simulates Cloud Storage)
- **Logging**: Winston (with Cloud Logging placeholder)
- **Authentication**: Supabase JWT verification

### Database Schema
- `raw_data` - Uploaded files metadata
- `tokenized_data` - Tokenized content
- `ai_inference` - AI inference results
- `review_tasks` - Human review workflow
- `audit_logs` - Audit trail
- `workflow_metadata` - Workflow tracking

### Workers
- **Tokenization Worker**: Processes file tokenization tasks
- **Inference Worker**: Processes AI inference tasks

### Services
- **AI Service**: Vertex AI integration stubs (ready for production)
- **Storage Service**: File encryption/decryption utilities
- **Logger Service**: Structured logging with Winston

## Data Flow

1. **File Upload** → Backend API → Encrypted Storage → Database → Pub/Sub Queue
2. **Tokenization** → Worker consumes queue → AI Service → Database → Pub/Sub Queue
3. **AI Inference** → Worker consumes queue → AI Service → Database → Review Task
4. **Human Review** → Frontend → Backend API → Database → Workflow Complete

## Environment Configuration

### Local Development
- Uses Docker Compose for all services
- Pub/Sub emulator for queue
- Local PostgreSQL database
- Local file storage with encryption
- Optional Supabase auth (bypassed if not configured)

### Production (GCP)
- Cloud Run for frontend/backend
- Cloud SQL for PostgreSQL
- Cloud Pub/Sub for queue
- Cloud Storage for files
- Vertex AI for AI services
- Cloud Logging for logs
- Supabase for authentication







