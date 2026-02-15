# Docker Engine Won't Start - Troubleshooting Guide

## Quick Fixes

### 1. Restart Docker Desktop
- Right-click Docker Desktop icon in system tray
- Select "Restart Docker Desktop"
- Wait 1-2 minutes for it to fully start

### 2. Check Docker Desktop Status
- Open Docker Desktop application
- Look for error messages in the UI
- Check if it says "Docker Desktop is starting..." or shows an error

### 3. Common Windows Issues

#### Issue: WSL 2 Backend Not Running
```powershell
# Check WSL status
wsl --status

# If WSL 2 is not the default, set it:
wsl --set-default-version 2

# Restart WSL
wsl --shutdown
```

#### Issue: Hyper-V Not Enabled
```powershell
# Check if Hyper-V is enabled (required for WSL 2)
Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All

# Enable if needed (requires admin):
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All -All
```

#### Issue: Docker Service Not Running
```powershell
# Check Docker service
Get-Service com.docker.service

# Start if stopped (requires admin):
Start-Service com.docker.service
```

### 4. Restart Docker Services (Admin PowerShell)
```powershell
# Stop Docker services
Stop-Service com.docker.service
Stop-Service docker

# Start Docker services
Start-Service com.docker.service
Start-Service docker
```

### 5. Reset Docker Desktop
If nothing works:
1. Open Docker Desktop
2. Go to Settings → Troubleshoot
3. Click "Reset to factory defaults"
4. Restart Docker Desktop

### 6. Check System Requirements
- Windows 10/11 64-bit
- WSL 2 enabled
- Virtualization enabled in BIOS
- At least 4GB RAM available

## For Your Hybrid Setup

Since you're using WSL2 Ubuntu for blockchain services:

### Check WSL2 Docker
```bash
# In WSL2 Ubuntu
wsl -d Ubuntu-22.04

# Check if Docker is running in WSL2
sudo service docker status

# Start Docker in WSL2 if needed
sudo service docker start
```

### Alternative: Use WSL2 Docker Only
If Docker Desktop won't start, you can:
1. Use Docker directly in WSL2 Ubuntu (already installed)
2. Run Fabric services in WSL2
3. Run app services (backend, frontend) in WSL2 as well

## Quick Test

Once Docker starts, test with:
```powershell
docker ps
```

If this works, Docker is running!






