# Quick Start - Distribution Options

## For Your Users

### **Option 1: Easy (Pre-built .exe) - Windows Only**
```
1. Download: slideinjectr.exe
2. Install: LibreOffice Impress (one-time: https://libreoffice.org)
3. Run: Double-click slideinjectr.exe
4. Browser opens automatically at auto-detected port ✨
   - Usually: http://localhost:5000
   - Check console if different: "✓ Auto-detected port: 5000"
```

**No Python needed. Just works.**

---

### **Option 2: Flexible (Python-based) - Windows/Mac/Linux**
```
1. Install: Python 3.10+ (https://python.org)
2. Download: slideinjectr folder
3. Run: Double-click start-local.bat (Windows) or python setup-local.py
4. Browser opens automatically at auto-detected port
   - Prefers port 8000 if available
   - Auto-finds next available if busy
```

**Works on any OS with Python.**

---

### **Option 3: Team (Docker) - Any OS**
```
1. Install: Docker Desktop (https://docker.com)
2. Run: docker-compose up
3. Open: http://localhost:5000 or http://192.168.1.9:5000
```

**Share across multiple devices on network.**

---

## For Developers

### Build Standalone Executable
```powershell
cd slideinjectr
.\build-standalone.ps1
# Output: dist/slideinjectr/slideinjectr.exe
```

### Run from Source (Dev Mode)
```powershell
cd slideinjectr
python setup-local.py
```

### Run with Docker (Prod Mode)
```powershell
docker-compose up --build
```

---

## File Structure

```
slideinjectr/
├── README.md                 # Setup instructions
├── STANDALONE_GUIDE.md       # Detailed standalone setup
├── DEPLOYMENT_OPTIONS.md     # Options comparison
│
├── start-local.bat           # ⚡ Click this for quick start (Windows)
├── setup-local.py            # Python-based setup
├── build-standalone.ps1      # Build .exe
├── slideinjectr.spec         # PyInstaller config
│
├── docker-compose.yml        # Docker setup
├── frontend/                 # React app
├── backend/                  # FastAPI server
└── generated/                # Output folder

```

---

## Supported Folder Path Formats

```
Windows:
  C:\Users\YourName\Documents\MyProject
  C:\path\to\folder

Unix/Mac/Linux:
  /home/user/Documents/MyProject
  /path/to/folder

UNC Network Path:
  \\server\share\folder
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `.exe` won't start | Install LibreOffice Impress, restart computer |
| Port 5000 in use | App finds alternate port automatically |
| "Python not found" | Install Python 3.10+ from python.org |
| Browser won't open | Manually go to http://localhost:5000 |
| No data files loading | Check folder path is correct |

---

## Recommended Distribution

### For Customers
→ **Pre-built .exe** (`slideinjectr.exe`)
- Easiest setup
- Include LibreOffice installer link
- One file to distribute

### For Tech Teams
→ **Docker setup** (`docker-compose up`)
- Centralized management
- Easy updates
- Multi-device access

### For Developers
→ **Source with setup-local.py**
- Full control
- Easy to customize
- Cross-platform compatible

---

## Support Information

### Requirements by Option

**Pre-built .exe:**
- Windows 10+ 
- LibreOffice Impress (free, one-time install)
- 200MB disk space

**Python Setup:**
- Windows/Mac/Linux
- Python 3.10+
- Node.js (for building)
- 500MB disk space

**Docker:**
- Windows/Mac/Linux
- Docker Desktop
- 2GB disk space
- Network access (optional)

---

## Access After Launch

**Local (current device):**
```
http://localhost:5000
```

**From other device on network:**
```
http://YOUR_IP_ADDRESS:5000
Example: http://192.168.1.9:5000
```

**Check your IP:**
```
Windows: ipconfig
Mac/Linux: ifconfig
```
