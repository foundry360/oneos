# Setup Guide

## Quick Start

1. **Copy environment variables:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` file** with your configuration (optional for local dev)

3. **Start all services:**
   ```bash
   docker-compose up -d
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Health check: http://localhost:3001/health

## Environment Variables

### Minimum Required (Local Dev)

For local development, you can use these defaults:

```env
POSTGRES_USER=aigov
POSTGRES_PASSWORD=aigov_secret
POSTGRES_DB=ai_governance
DATABASE_URL=postgresql://aigov:aigov_secret@localhost:5432/ai_governance
PUBSUB_PROJECT_ID=ai-gov-local
PUBSUB_EMULATOR_HOST=localhost:8085
```

### Optional (Supabase Auth)

If you want to use Supabase authentication:

1. Create a project at https://supabase.com
2. Get your project URL and keys from Settings > API
3. Add to `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Note:** Without Supabase, authentication is bypassed in development mode for convenience.

## First Run

1. **Check services are running:**
   ```bash
   docker-compose ps
   ```

2. **Check logs:**
   ```bash
   docker-compose logs -f
   ```

3. **Verify database:**
   ```bash
   docker-compose exec postgres psql -U aigov -d ai_governance -c "\dt"
   ```

4. **Test API:**
   ```bash
   curl http://localhost:3001/health
   ```

## Troubleshooting

### Database Connection Issues

- Ensure PostgreSQL container is running: `docker-compose ps postgres`
- Check connection string matches container name: use `postgres` not `localhost` in Docker
- Verify credentials in `.env` match docker-compose.yml

### Pub/Sub Emulator Issues

- Check emulator is running: `docker-compose ps pubsub-emulator`
- Verify `PUBSUB_EMULATOR_HOST` is set correctly
- Wait a few seconds after starting for emulator to initialize

### Frontend Not Loading

- Check backend is running: `curl http://localhost:3001/health`
- Verify `NEXT_PUBLIC_API_URL` in frontend `.env` or `next.config.js`
- Check browser console for CORS errors

### Authentication Issues

- In development, auth is optional if Supabase is not configured
- Check Supabase credentials are correct
- Verify Supabase project is active

## Development Workflow

1. **Make code changes** in `frontend/` or `backend/`
2. **Hot reload** is enabled - changes reflect automatically
3. **View logs** in real-time: `docker-compose logs -f [service-name]`
4. **Restart service**: `docker-compose restart [service-name]`

## Production Deployment

See README.md for GCP deployment instructions.







