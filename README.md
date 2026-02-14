# AI Governance Platform

A secure AI governance platform for managing sensitive data (PDFs, AI inference, tokenization) with frontend, backend, database, storage, AI pipelines, human review workflow, and comprehensive logging.

## Features

- **File Management**: Upload, encrypt, and manage sensitive documents
- **Tokenization**: Automatic tokenization of uploaded files
- **AI Inference**: Queue-based AI inference with Vertex AI integration
- **Human Review**: Workflow for human-in-the-loop approval
- **Audit Logging**: Comprehensive audit trail of all actions
- **Dashboard**: Real-time statistics and activity monitoring

## Architecture

- **Frontend**: Next.js 14 + React + Chakra UI + Supabase Auth
- **Backend**: Node.js + Express + PostgreSQL + Pub/Sub
- **Database**: PostgreSQL with comprehensive schema
- **Storage**: Local file storage with encryption (simulates Cloud Storage)
- **Queue**: Pub/Sub emulator for local development
- **AI**: Vertex AI integration stubs (ready for production)

## Project Structure

```
.
├── frontend/          # Next.js frontend application
├── backend/           # Express backend API
├── ai/                # AI workflow configurations
├── db/                # Database schema and migrations
├── storage/           # Local file storage (mapped to Cloud Storage)
├── logs/              # Application logs
├── docker-compose.yml # Docker Compose configuration
└── .env.example       # Environment variables template
```

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local development without Docker)
- Supabase account (optional for local dev)

## Quick Start

### 1. Clone and Setup

```bash
# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
# For local development, Supabase credentials are optional
```

### 2. Start with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **PostgreSQL**: localhost:5432
- **Pub/Sub Emulator**: localhost:8085

### 4. Database Setup

The database schema is automatically initialized when the PostgreSQL container starts. The schema includes:

- `raw_data` - Uploaded files metadata
- `tokenized_data` - Tokenized content
- `ai_inference` - AI inference results
- `review_tasks` - Human review tasks
- `audit_logs` - Audit trail
- `workflow_metadata` - Workflow tracking

## Local Development (Without Docker)

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Database

Start PostgreSQL locally or use Docker:

```bash
docker run -d \
  --name ai-gov-postgres \
  -e POSTGRES_USER=aigov \
  -e POSTGRES_PASSWORD=aigov_secret \
  -e POSTGRES_DB=ai_governance \
  -p 5432:5432 \
  postgres:15-alpine
```

Initialize schema:

```bash
psql -h localhost -U aigov -d ai_governance -f db/init.sql
```

### Pub/Sub Emulator

```bash
docker run -d \
  --name ai-gov-pubsub \
  -p 8085:8085 \
  gcr.io/google.com/cloudsdktool/cloud-sdk:emulators \
  gcloud beta emulators pubsub start --host-port=0.0.0.0:8085
```

## Environment Variables

### Required (Local Dev)

```env
POSTGRES_USER=aigov
POSTGRES_PASSWORD=aigov_secret
POSTGRES_DB=ai_governance
DATABASE_URL=postgresql://aigov:aigov_secret@localhost:5432/ai_governance
PUBSUB_PROJECT_ID=ai-gov-local
PUBSUB_EMULATOR_HOST=localhost:8085
```

### Optional (Local Dev)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

### Production (GCP)

```env
VERTEX_AI_PROJECT_ID=your-gcp-project-id
VERTEX_AI_LOCATION=us-central1
GCP_PROJECT_ID=your-gcp-project-id
GCP_REGION=us-central1
```

## API Endpoints

### Files

- `POST /api/files/upload` - Upload a file
- `GET /api/files` - List files
- `GET /api/files/:id` - Get file details
- `DELETE /api/files/:id` - Delete file

### Tokenization

- `GET /api/tokenization` - List tokenized data
- `GET /api/tokenization/:id` - Get tokenized data details
- `POST /api/tokenization/:fileId/tokenize` - Trigger tokenization

### AI Inference

- `POST /api/ai/inference` - Trigger AI inference
- `GET /api/ai/inference` - List inference results
- `GET /api/ai/inference/:id` - Get inference result
- `POST /api/ai/inference/:id/simulate` - Simulate inference (dev)

### Review

- `GET /api/review` - List review tasks
- `GET /api/review/:id` - Get review task
- `POST /api/review` - Create review task
- `POST /api/review/:id/approve` - Approve review
- `POST /api/review/:id/reject` - Reject review

### Dashboard

- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/activity` - Get recent activity

## Authentication

The platform uses Supabase Auth for authentication. In local development, if Supabase is not configured, authentication is bypassed for convenience.

### Setting up Supabase

1. Create a Supabase project at https://supabase.com
2. Get your project URL and anon key
3. Add them to `.env`:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-key
   ```

## AI Workflows

### Local Development

The AI service runs in simulation mode when `VERTEX_AI_PROJECT_ID` is not set. This allows you to develop and test the workflow without GCP credentials.

### Production (GCP)

To use real Vertex AI:

1. Set up a GCP project with Vertex AI enabled
2. Create a service account with Vertex AI permissions
3. Set environment variables:
   ```env
   VERTEX_AI_PROJECT_ID=your-project-id
   VERTEX_AI_LOCATION=us-central1
   ```
4. Update `backend/src/services/aiService.js` to use actual Vertex AI clients
5. Install Vertex AI SDK: `npm install @google-cloud/aiplatform`

## Storage

### Local Development

Files are stored in the `./storage` directory with encryption. The encryption keys are stored in the database metadata.

### Production (GCP Cloud Storage)

To use Cloud Storage:

1. Create a Cloud Storage bucket
2. Install Cloud Storage SDK: `npm install @google-cloud/storage`
3. Update `backend/src/utils/storage.js` to use Cloud Storage client
4. Configure service account with Storage permissions

## Queue Management

### Local Development

Uses Pub/Sub emulator running in Docker. Topics and subscriptions are created automatically.

### Production (GCP Pub/Sub)

1. Create Pub/Sub topics in GCP Console
2. Remove `PUBSUB_EMULATOR_HOST` from environment
3. Set `PUBSUB_PROJECT_ID` to your GCP project ID
4. Configure service account with Pub/Sub permissions

## Logging

### Local Development

Logs are written to:
- Console (with colors in development)
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only

### Production (GCP Cloud Logging)

To use Cloud Logging:

1. Install Cloud Logging: `npm install @google-cloud/logging-winston`
2. Uncomment Cloud Logging configuration in `backend/src/utils/logger.js`
3. Configure service account with Logging permissions

## Deployment to GCP

### 1. Build Docker Images

```bash
# Build backend
cd backend
docker build -t gcr.io/YOUR_PROJECT_ID/ai-gov-backend .

# Build frontend
cd ../frontend
docker build -t gcr.io/YOUR_PROJECT_ID/ai-gov-frontend .
```

### 2. Push to Container Registry

```bash
docker push gcr.io/YOUR_PROJECT_ID/ai-gov-backend
docker push gcr.io/YOUR_PROJECT_ID/ai-gov-frontend
```

### 3. Deploy to Cloud Run

```bash
# Deploy backend
gcloud run deploy ai-gov-backend \
  --image gcr.io/YOUR_PROJECT_ID/ai-gov-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

# Deploy frontend
gcloud run deploy ai-gov-frontend \
  --image gcr.io/YOUR_PROJECT_ID/ai-gov-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### 4. Set up Cloud SQL

```bash
# Create Cloud SQL instance
gcloud sql instances create ai-gov-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database
gcloud sql databases create ai_governance --instance=ai-gov-db
```

### 5. Configure Environment Variables

Set environment variables in Cloud Run:
- Database connection string (Cloud SQL)
- Pub/Sub project ID
- Vertex AI project ID
- Supabase credentials
- Storage bucket name

## Development Workflow

1. **File Upload**: User uploads a file → Stored encrypted → Queued for tokenization
2. **Tokenization**: Worker processes tokenization task → Creates tokenized data record
3. **AI Inference**: Tokenization triggers inference → Worker processes inference → Creates review task
4. **Human Review**: Reviewer approves/rejects → Updates workflow status

## Troubleshooting

### Database Connection Issues

- Check PostgreSQL is running: `docker-compose ps`
- Verify connection string in `.env`
- Check logs: `docker-compose logs postgres`

### Pub/Sub Emulator Issues

- Ensure emulator is running: `docker-compose ps pubsub-emulator`
- Check emulator logs: `docker-compose logs pubsub-emulator`
- Verify `PUBSUB_EMULATOR_HOST` is set correctly

### Authentication Issues

- In local dev, authentication is optional if Supabase is not configured
- Check Supabase credentials in `.env`
- Verify Supabase project is active

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request




