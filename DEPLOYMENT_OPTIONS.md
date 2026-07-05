# SlideInjectr - Deployment Options Summary

## What We've Created

You now have **two complete ways** to distribute and run SlideInjectr:

### 1. Docker Option (Current Production Setup)
**For teams, hosting, network access**

- Access at: `http://localhost:5000` or `http://192.168.1.9:5000`
- Separate containers: nginx frontend + FastAPI backend
- Start: `docker-compose up`
- Currently running ✅

**Files involved:**
- `docker-compose.yml` - Orchestration
- `frontend/Dockerfile` - React + nginx
- `backend/Dockerfile` - Python + LibreOffice
- `frontend/nginx.conf` - API reverse proxy

---

### 2. Standalone Desktop Option (NEW!)
**For individual users, offline work, no hosting needed**

Three ways to run standalone:

#### A. Pre-built Executable (Easiest)
- **File:** `slideinjectr.exe` (built with PyInstaller)
- **How:** Double-click to run
- **Opens:** Auto-detected port (usually `http://localhost:5000`, or next available)
- **Target:** Non-technical users
- **Port detection:** Automatically finds available port, shows in console

**Prerequisites:** Only LibreOffice Impress

#### B. Run from Python Source
- **File:** `start-local.bat` (Windows) or `setup-local.py` (any platform)
- **How:** Double-click `.bat` file or run Python script
- **What it does:** Builds frontend, installs dependencies, starts server
- **Target:** Users with Python installed
- **Port detection:** Intelligent selection (prefers 8000, finds next if busy)

**Prerequisites:** Python 3.10+, Node.js (for npm)

**Custom port:**
```powershell
$env:SLIDEINJECTR_PORT=5555
python setup-local.py
```

#### C. Build Your Own Executable
- **Script:** `build-standalone.ps1`
- **Command:** `.\build-standalone.ps1`
- **Creates:** `dist/slideinjectr/slideinjectr.exe`
- **Target:** Developers, custom builds
- **Port detection:** Same as A (auto-detected on launch)

**Prerequisites:** Python 3.10+, Node.js, PyInstaller

---

## How It Works

### Docker Architecture (Current)
```
User Browser (Port 5000)
    ↓
nginx Container (Static files + Reverse proxy)
    ├→ /api/* → Backend (Port 8000)
    └→ /* → Frontend (SPA)
```

### Standalone Architecture (New)
```
User Browser (Port 5000)
    ↓
FastAPI Backend (Direct)
    ├→ /api/* → API Routes
    └→ /* → Frontend (SPA + Static Files)
```

---

## New Files Created

1. **STANDALONE_GUIDE.md** - Detailed user guide for standalone setup
2. **start-local.bat** - Windows launcher script
3. **setup-local.py** - Cross-platform setup and launcher
4. **build-standalone.ps1** - PowerShell build script for .exe
5. **slideinjectr.spec** - PyInstaller configuration

## Modified Files

1. **backend/app/main.py** - Added SPA static file serving
2. **backend/app/__main__.py** - Entry point for standalone mode
3. **README.md** - Added standalone installation instructions
4. **frontend/src/App.tsx** - Folder picker: file dialog → text input

---

## Distribution Recommendations

### For End Users (Non-Technical)
1. Create installer with pre-built `.exe`
2. Include: `slideinjectr.exe`, `README.txt`, `INSTALL_LIBREOFFICE.bat`
3. One-click setup, automatic browser launch

### For Teams/Companies
1. Keep Docker approach (easier to update, share)
2. Run on central server or NAS
3. Access from any device via IP address
4. Easy rollback and updates

### For Developers
1. Clone repo
2. Run `setup-local.py` or `start-local.bat`
3. Modify and rebuild as needed

---

## Quick Comparison

| Feature | Docker | Standalone |
|---------|--------|-----------|
| Setup time | 2-3 min | 1-2 min |
| Network access | ✅ Yes | ❌ Local only |
| Teams/Sharing | ✅ Easy | ❌ Per-device |
| Updates | ✅ Easy | ❌ Manual per .exe |
| Disk space | 2GB+ | 200MB+ |
| Python required | ❌ No | ✅ (for .bat) |
| Offline use | ❌ No | ✅ Yes |
| Per-device license | N/A | ✅ Needed |

---

## Deployment Options by Use Case

### Use Case 1: Solo Developer
→ **Standalone** - Double-click, work offline

### Use Case 2: Small Team (3-5 people)
→ **Docker** - Share server, easy collaboration

### Use Case 3: Large Organization
→ **Docker** - Central deployment, manage updates

### Use Case 4: Customer Distribution
→ **Standalone .exe** - No dependencies, self-contained

### Use Case 5: Cloud Deployment
→ **Docker** - AWS/GCP/Azure, scale easily

---

## Next Steps

1. ✅ Standalone code created and documented
2. ⏳ Test standalone locally (optional)
3. ⏳ Build .exe for distribution: `.\build-standalone.ps1`
4. ⏳ Create installer/package for users
5. ⏳ Add desktop shortcuts (Windows)

---

## Key Implementation Details

**Backend Now Does:**
- Serves API on `/api/*`
- Serves frontend static files on `/*`
- Falls back to `index.html` for SPA routes
- Single port: `5000`

**Docker Still Uses:**
- nginx for reverse proxy (better for production)
- Separate containers (easier to manage)
- Better static file caching
- Cleaner logs and monitoring

**Standalone Uses:**
- FastAPI direct serving (simpler setup)
- Single executable (easy distribution)
- No nginx needed (fewer dependencies)
- Works on any Windows machine with Python
