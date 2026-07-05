# SlideInjectr - Standalone Distribution Guide

## Two Ways to Use SlideInjectr

### Option 1: Docker (Current - Hosted)
**Best for:** Team collaboration, web access, running on a server
- Access from any device on the network
- Single command: `docker-compose up`
- Currently running at: http://192.168.1.9:5000

### Option 2: Standalone Desktop App (New)
**Best for:** Local use, offline work, no internet needed, cross-platform
- Single `.exe` file on Windows
- One-click launch
- No hosting or server required

---

## Installing Standalone Version

### Requirements
- **Windows 10+** or macOS/Linux
- **Python 3.10+** (for building from source)
- **LibreOffice Impress** (free - download at https://www.libreoffice.org/)

### Quick Setup (2 steps)

#### Step 1: Install LibreOffice Impress (One-time)
1. Go to https://www.libreoffice.org/download/
2. Download the full suite
3. Run installer and follow prompts
4. Restart your computer

#### Step 2: Run SlideInjectr

**Option A: Pre-built Executable** (Easiest)
- Download `slideinjectr.exe` from releases
- Double-click to run
- Browser opens automatically ✨

**Option B: Build from Source**
```powershell
cd slideinjectr
.\build-standalone.ps1
cd dist/slideinjectr
.\slideinjectr.exe
```

---

## Using Standalone Version

1. **Application opens at** `http://localhost:5000` (automatic)
2. **Enter folder path:** Paste your project directory into the text field
3. **Upload files:** Drag template (.pptx), data files (.csv/.xlsx)
4. **Generate:** Click "Generate Presentation"
5. **All work is local** - No data sent anywhere

---

## Distribution for Others

### For Non-Technical Users:
Create a simple installer that includes:
```
slideinjectr/
├── slideinjectr.exe
├── README.txt (with step-by-step instructions)
└── INSTALL_LIBREOFFICE.bat (opens download link)
```

### For Developers:
```
git clone <repo>
cd slideinjectr
python -m pip install -r backend/requirements.txt
cd frontend && npm install && npm run build
cd .. && python backend/app/__main__.py
```

---

## Troubleshooting

### "Port 5000 is already in use"

**Solution:** App auto-detects next available port and shows it

```
✓ Auto-detected port: 5001
  Access at: http://localhost:5001
```

No action needed! The app handles it automatically.

**Or force specific port:**

```powershell
$env:SLIDEINJECTR_PORT=5555
python setup-local.py
# Uses 5555 if available, otherwise auto-detects next
```

### "LibreOffice not found"
- Ensure LibreOffice Impress is installed
- Restart the application

### "Server won't start"
- Check that Python 3.10+ is installed: `python --version`
- Open Task Manager and kill any old `slideinjectr.exe` processes
- Try again

---

## File Paths Supported

**Windows:**
```
C:\Users\YourName\Documents\MyProject
C:\Projects\data
```

**macOS/Linux:**
```
/Users/YourName/Documents/MyProject
/home/user/projects/data
```

---

## Next Steps

- [ ] Build standalone executable: `.\build-standalone.ps1`
- [ ] Test with sample data
- [ ] Create installer for end users
- [ ] Add desktop shortcuts (Windows)
- [ ] Create macOS app bundle

