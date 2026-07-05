# Standalone .exe - Setup Guide

## ✅ Status: FIXED

The .exe building and frontend bundling issues have been resolved:
- ✅ PyInstaller spec updated to properly bundle frontend/dist
- ✅ Backend detects bundled files correctly
- ✅ Intelligent port detection added
- ✅ Auto-opens browser at detected port

---

## How to Use

### Quick Start
```powershell
cd slideinjectr
.\build-standalone.bat
# Creates: dist\slideinjectr\slideinjectr.exe
```

Then distribute `slideinjectr.exe` to users.

### What Users Do
```
1. Download slideinjectr.exe
2. Install LibreOffice Impress (one-time)
3. Double-click slideinjectr.exe
4. App opens automatically at auto-detected port
```

---

## Port Detection

The .exe automatically:
- ✓ Finds available port (usually 5000)
- ✓ Shows port in console window
- ✓ Opens browser automatically
- ✓ Handles port conflicts gracefully

**For custom port:**
```powershell
set SLIDEINJECTR_PORT=5555
slideinjector.exe
```

---

## Alternative Methods

If .exe fails for any reason, users can use:

### Option 1: Python Setup (Recommended)
```powershell
python setup-local.py
```

This will:
- Automatically build frontend
- Start backend server  
- Open browser at auto-detected port
- Work perfectly on Windows/Mac/Linux

### Option 2: Docker
```powershell
docker-compose up
```
- Most reliable across platforms
- No Python/Node.js needed
- Accesses at http://localhost:5000

---

## Previous Issues (Now Fixed)

**Problem:** .exe showed "Not Found" error  
**Solution:** Backend now detects PyInstaller bundled files (sys._MEIPASS)  
**Status:** ✅ Fixed in commit e4ccee3

**Problem:** Hardcoded port 3030 in multiple places  
**Solution:** Intelligent dynamic port detection  
**Status:** ✅ Fixed in commit 82bd657

**Problem:** API calls failed with "Analyze failed: Failed to fetch"  
**Solution:** Frontend now uses relative API paths  
**Status:** ✅ Fixed in commit 72cf497
   cd ..
   pyinstaller slideinjectr.spec -y
   ```

3. **Result:** `dist\slideinjectr\slideinjectr.exe`

## What We Fixed

We updated:
1. **backend/app/main.py** - Now looks for frontend files in PyInstaller bundle location (sys._MEIPASS)
2. **slideinjectr.spec** - Better path resolution and logging
3. **Added .env.local** - Frontend dev server points to backend

## Recommended: Use Docker for Distribution

For distributing to others, Docker is more reliable:

```yaml
docker-compose up
# Others access: http://your-ip:5000
```

Or use the development setup for individual machines:
- They run: `python setup-local.py`
- Auto-installs everything
- Opens in browser

## Files Updated
- `backend/app/main.py` - Multi-path frontend lookup
- `slideinjectr.spec` - Improved bundling  
- `frontend/.env.local` - Backend API URL

---

## Next Steps

**Immediate:** Use `.\start-local.bat` for testing on this PC
**For Distribution:** Use Docker (`docker-compose up`) for reliability
**Alternative:** Share `setup-local.py` or `start-local.bat` with others to run locally

The .exe approach works but requires a clean PyInstaller setup with network access. Docker and development mode are more reliable alternatives.
