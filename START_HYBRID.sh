#!/bin/bash
# Bash script to start hybrid setup
# Run this from WSL2 Ubuntu

echo "🚀 Starting Hybrid Setup"
echo ""

echo "Step 1: Starting Fabric Services (WSL2 Ubuntu)..."
cd /mnt/c/OneOS
docker-compose -f docker-compose.fabric.yml up -d

echo ""
echo "✅ Fabric services started in WSL2 Ubuntu"
echo ""
echo "Step 2: Starting App Services (Docker Desktop)..."
echo "Please run the following in Windows PowerShell:"
echo ""
echo "  cd C:\OneOS"
echo "  docker-compose up -d"
echo ""
echo "⏳ App services need to be started in Docker Desktop (see above)"



