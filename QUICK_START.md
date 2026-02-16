# Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Setup Environment
```bash
# Copy environment template (optional - defaults work for local dev)
cp .env.example .env
# Edit .env if needed (Supabase is optional for local dev)
```

### 2. Start Services
```bash
docker-compose up -d
```

### 3. Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## 📋 What's Included

✅ **Frontend**: Next.js 14 + React + Chakra UI  
✅ **Backend**: Node.js + Express + PostgreSQL  
✅ **Database**: PostgreSQL with full schema  
✅ **Queue**: Pub/Sub emulator  
✅ **Storage**: Local file storage with encryption  
✅ **AI Workflows**: Vertex AI stubs (ready for GCP)  
✅ **Auth**: Supabase (optional in dev)  
✅ **Logging**: Winston with Cloud Logging placeholders  

## 🔑 Default Credentials

- **Database**: `aigov` / `aigov_secret`
- **Auth**: Bypassed in dev mode (if Supabase not configured)

## 📝 First Steps

1. **Upload a file** via the Files page
2. **Watch tokenization** happen automatically
3. **Review AI inference** results
4. **Approve/Reject** review tasks

## 🛠️ Common Commands

```bash
# View logs
docker-compose logs -f

# Restart a service
docker-compose restart backend

# Stop all services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

## 🐛 Troubleshooting

**Services not starting?**
```bash
docker-compose ps  # Check status
docker-compose logs [service-name]  # Check logs
```

**Database connection issues?**
- Wait 10-15 seconds after starting for DB to initialize
- Check `docker-compose logs postgres`

**Frontend can't reach backend?**
- Verify backend is running: `curl http://localhost:3001/health`
- Check `NEXT_PUBLIC_API_URL` in frontend environment

## 📚 More Information

- **Full Setup**: See [SETUP.md](./SETUP.md)
- **Architecture**: See [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)
- **Deployment**: See [README.md](./README.md)








