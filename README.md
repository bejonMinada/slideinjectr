# SlideInjectr

Production-oriented full-stack application that maps CSV/Excel data to named PowerPoint template objects.

## Architecture

```text
slideinjectr/
  backend/
    app/
      api/v1/endpoints/presentation.py   # FastAPI HTTP endpoints
      services/template_analyzer.py       # .pptx shape discovery
      services/generation_engine.py       # Mapping + output generation
      schemas/presentation.py             # Shared request/response models
      core/config.py                      # Environment-driven settings
    Dockerfile
    requirements.txt

  frontend/
    src/App.tsx                           # Upload + mapping UI
    src/api.ts                            # HTTP client to backend
    Dockerfile                            # Build React, serve with nginx
    nginx.conf                            # Proxies /api to backend

  docker-compose.yml                      # Full stack orchestration
  .env.example                            # Deployment variables
```

## Core Backend Modules

1. Template Analyzer
   - Reads uploaded `.pptx` via `python-pptx`.
   - Extracts shape metadata (slide index, shape name/id, type, text/chart capabilities).
   - Returns normalized JSON through `POST /api/v1/templates/analyze`.

2. Data Injection Engine
   - Accepts template + multiple data files + mapping rules (`mapping_json`) via multipart request.
   - Reads `.csv`/`.xlsx`/`.xls` with `pandas`.
   - Supports per-element mapping mode: `keep`, `text`, `table`, or `chart`.
   - Applies mapping using selected file + sheet + column and row index for text placeholders.
   - Applies table mapping for PPT table shapes using selected sheet data (headers + rows).
   - Applies chart mapping for PPT chart shapes using selected sheet data (first column = categories, remaining columns = series).
   - Saves output deck and returns generated `.pptx` directly.

3. Data Source Analyzer
   - Inspects one or more uploaded CSV/Excel files.
   - Returns detected sheets, columns, row counts, and workbook table names.
   - Enables smart UI mapping without manual header entry.

## System Requirements & Installation

### Choose Your Deployment Method

SlideInjectr supports two deployment options:

#### Option 1: Docker (Recommended for Teams/Hosting)
- Run on any machine with Docker installed
- Access from multiple devices on the network
- Consistent environment across platforms
- See: [Docker Setup Instructions](#docker-setup-windows)

#### Option 2: Standalone Desktop App (Recommended for Individual Use)
- No Docker required
- Single `.exe` file on Windows
- Works offline
- See: [Standalone Setup Instructions](#standalone-setup-windows)

---

## Standalone Setup (Windows)

### Requirements

- **Windows 10+**
- **Python 3.10+** (or use pre-built `.exe`)
- **LibreOffice Impress** (free)

### Option A: Pre-built Executable (Easiest)

1. Download `slideinjectr.exe` from releases
2. Install LibreOffice: https://www.libreoffice.org/download/
3. Double-click `slideinjectr.exe`
4. **Application auto-detects available port and opens automatically**
   - Usually opens at: `http://localhost:5000`
   - Or next available: `http://localhost:5001`, etc.

### Option B: Run from Source (Python)

1. **Install LibreOffice Impress:**
   - Download from: https://www.libreoffice.org/download/
   - Run installer, restart computer

2. **Run setup script:**
   ```powershell
   cd slideinjectr
   .\start-local.bat
   ```

3. **Application opens automatically** (auto-detected port shown in console)
   - Check console output for the URL
   - Example: "✓ Auto-detected port: 5000"

### Option C: Custom Port (Python Setup)

Force a specific port using environment variable:

```powershell
# Windows PowerShell
$env:SLIDEINJECTR_PORT=5555
python setup-local.py

# Or one-liner
$env:SLIDEINJECTR_PORT=5555; python setup-local.py
```

Application will use port 5555 if available, otherwise auto-detect next available.

### Option D: Build Your Own Executable

```powershell
cd slideinjectr
.\build-standalone.bat
# Creates: dist\slideinjectr\slideinjectr.exe
```

### Option C: Build Your Own Executable

```powershell
cd slideinjectr
.\build-standalone.ps1
# Creates: dist/slideinjectr/slideinjectr.exe
```

See [STANDALONE_GUIDE.md](STANDALONE_GUIDE.md) for detailed instructions.

---

## Docker Setup (Windows) {#docker-setup-windows}

### Windows Prerequisites

Before running SlideInjectr on a fresh Windows device, install:

1. **Docker Desktop for Windows**
   - Download: https://www.docker.com/products/docker-desktop
   - Install with default settings
   - During installation, ensure **Windows Subsystem for Linux 2 (WSL 2)** is enabled
   - Start Docker Desktop application
   - Verify in PowerShell: `docker --version`

2. **PowerShell or Terminal**
   - Windows PowerShell (built-in) or Windows Terminal (recommended from Microsoft Store)
   - Run as Administrator when launching docker commands

3. **Git** (Optional, for cloning repository)
   - Download: https://git-scm.com/download/win

**Disk Space**: Minimum 2GB free for Docker images and generated files

### Linux Prerequisites (Ubuntu/Debian)

Install on a fresh Linux device:

```bash
# Update package manager
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
sudo apt install -y docker.io docker-compose

# Start Docker service and enable at boot
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group (allows docker commands without sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker-compose --version
```

**Disk Space**: Minimum 2GB free for Docker images and generated files

### macOS Prerequisites

Install on a fresh macOS device:

1. **Docker Desktop for Mac**
   - Download: https://www.docker.com/products/docker-desktop
   - Install and launch application
   - Verify in Terminal: `docker --version`

2. **Terminal**
   - Built-in Terminal app or use iTerm2 (optional)

---

## Run with Docker (Default: Port 5000)

### Quick Start

1. Clone or extract the project:
   ```bash
   cd slideinjectr
   ```

2. Build and run containers:
   ```bash
   # Windows (PowerShell)
   docker compose up --build -d

   # Linux/macOS (Terminal)
   docker-compose up --build -d
   ```
   The `-d` flag runs in background (detached mode)

3. Open in browser:
   ```
   http://localhost:5000
   ```

4. Stop containers:
   ```bash
   docker compose down
   ```

### View Application Status

Check running containers:
```bash
docker compose ps
```

View logs:
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f frontend
docker compose logs -f backend
```

---

## Custom Port Configuration (Docker)

### Option 1: Change Frontend Port Only

Edit `docker-compose.yml`:

```yaml
services:
  frontend:
    ports:
      - "8080:80"        # Change 5000 to 8080
```

Rebuild:
```bash
docker compose up --build -d
```

Access at: `http://localhost:8080`

### Option 2: Use Environment Variable (Recommended)

Set port before running:

**Windows PowerShell:**
```powershell
$env:SLIDEINJECTR_PORT=8080
docker compose up
```

**Linux/macOS:**
```bash
export SLIDEINJECTR_PORT=8080
docker-compose up
```

Access at: `http://localhost:8080`

### Environment Variables & Configuration

Edit `docker-compose.yml` environment section for backend customization:

```yaml
backend:
  environment:
    - MAX_UPLOAD_SIZE_MB=50          # Upload limit (default: 25)
    - RETURN_FILE_DIRECTLY=true      # Download PPT to browser
    - TEMP_DIR=/app/tmp/uploads      # Temp file location
    - OUTPUT_DIR=/app/tmp/output     # Generated files location
```

---

## Full Application Startup Commands

### Windows PowerShell

```powershell
# Build and start
docker compose up --build -d

# Rebuild specific service (frontend only)
docker compose up --build frontend -d

# View status
docker compose ps

# View real-time logs
docker compose logs -f

# Stop and remove containers
docker compose down

# Full reset (remove volumes/data)
docker compose down -v
```

### Linux/macOS Terminal

```bash
# Build and start
docker-compose up --build -d

# Rebuild specific service
docker-compose up --build frontend -d

# View status
docker-compose ps

# View real-time logs
docker-compose logs -f

# Stop and remove containers
docker-compose down

# Full reset (remove volumes/data)
docker-compose down -v
```

---

## API Documentation

After starting, access interactive API documentation at your running port:

**Docker (Port 5000):**
```
http://localhost:5000/api/docs     # Swagger UI
http://localhost:5000/api/redoc    # ReDoc
```

**Standalone (Auto-detected - check console):**
```
http://localhost:5003/api/docs     # Example (port varies)
http://localhost:5003/api/redoc
```

Main API endpoints:
- `POST /api/v1/templates/analyze` - Analyze PowerPoint structure
- `POST /api/v1/data-sources/analyze` - Analyze CSV/Excel files
- `POST /api/v1/presentations/generate` - Generate presentation
- `POST /api/v1/presentations/preview` - Generate PDF preview
- `POST /api/v1/settings/export` - Export mapping as YAML
- `POST /api/v1/settings/import` - Import mapping from YAML

---

## File Volumes & Generated Output

### Docker Volumes

The `docker-compose.yml` mounts these volumes:

- **`./generated`** → Container `/app/tmp/output`
  - Generated `.pptx` files saved here
  - PDF previews stored here
  - Accessible from host machine

- **App volumes** (internal)
  - Temporary uploads: `/app/tmp/uploads` (auto-cleaned)
  - LibreOffice runtime: `/tmp/slideinjectr-libreoffice` (auto-cleaned)

### Generated Files Location

```
slideinjectr/
├── generated/
│   ├── generated-presentation-1234.pptx
│   ├── generated-presentation-5678.pptx
│   └── preview-{uuid}.pdf
```

All generated files are available to download from the web UI or directly accessible via host filesystem.

---

## Troubleshooting

### Port Already in Use

**For Standalone/Development Setup:**
The application automatically detects and uses the next available port (5000-5100). No action needed!

If you want a specific port and it's in use:

```powershell
# Set custom port and run
$env:SLIDEINJECTR_PORT=5555
python setup-local.py
```

**For Docker:**
Edit `docker-compose.yml` or use environment variable (see Custom Port Configuration above).

**To find what's using a port:**

**Windows PowerShell:**
```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

**Linux/macOS Terminal:**
```bash
# Find process using port 5000
lsof -i :5000

# Kill process (replace PID with actual process ID)
kill -9 <PID>
```

### Docker Daemon Not Running

**Windows:**
- Start Docker Desktop application from Start menu
- Or run: `docker ps` (will show error if daemon not running)

**Linux:**
```bash
sudo systemctl start docker
```

**macOS:**
- Launch Docker.app from Applications folder

### Container Crashes or Exit Code Errors

Check backend logs:
```bash
docker compose logs backend
```

Common issues:
- Port conflict: Change port in `docker-compose.yml`
- Insufficient disk space: Free up space or delete old generated files
- LibreOffice initialization: Container may take 10-15 seconds to fully start

### Frontend Page Downloads Instead of Loading

Issue: Nginx serving incorrect MIME type

The current `nginx.conf` is pre-configured with proper MIME types. If issues persist, verify:

```nginx
include /etc/nginx/mime.types;
types { application/javascript js mjs; }
default_type application/octet-stream;
```

### PDF Preview Fails

Ensure PDF.js worker is bundled correctly. Check browser console for errors.

---

## Performance Optimization Tips

- **Large Excel Files**: Keep files under 50MB for optimal performance
- **Multiple Charts**: 2-3 Y-series per chart recommended
- **First Preview**: Takes 10-15 seconds (LibreOffice initialization)
- **Disk Space**: Keep 1GB+ free in container volume
- **Memory**: Docker Desktop default 2GB usually sufficient; increase if slow

---

## Security & Data Privacy

✅ **100% Offline Operation**
- No internet connection required
- All processing stays on your machine

✅ **Complete Data Privacy**
- No telemetry, tracking, or cloud uploads
- No external API calls
- Files stay in local `./generated` directory

✅ **Docker Isolation**
- Containers isolated from host system
- Temporary files auto-cleaned
- YAML settings never sent anywhere

---

## Development (Without Docker)

### Recommended: Automated Setup

**Windows:**
```powershell
.\start-local.bat
```

**Manually (any OS):**
```bash
python setup-local.py
```

This will:
1. Verify Python 3.10+ installed
2. Check for LibreOffice Impress
3. Install Python dependencies
4. Build React frontend
5. Start FastAPI server on auto-detected port
6. Open browser automatically

### Manual Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows
source .venv/bin/activate   # Linux/macOS

pip install -r requirements.txt

# Start with auto port detection
python setup-local.py

# Or specify port
set SLIDEINJECTR_PORT=8000
python setup-local.py
```

### Manual Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`

---

## Intelligent Port Detection

Both **standalone** and **development** modes use intelligent port detection:

### How It Works

1. **Environment Variable Override** (highest priority)
   ```powershell
   $env:SLIDEINJECTR_PORT=5555
   python setup-local.py      # Uses port 5555 if available
   ```

2. **Preferred Port Selection**
   - Tries common dev ports in order: **5000** → 5001 → 5002 → 8000 → 3000 → 8080
   - If all preferred ports busy, searches sequential range (5000-5100)
   - Returns first available port

3. **Automatic Fallback**
   - If no port available in range, uses port 5000 (may fail if actually in use)
   - Application will show error and exit gracefully

### Example Scenarios

**Scenario 1: First run (clean system)**
```
✓ Auto-detected port: 5000
  Access at: http://localhost:5000
```

**Scenario 2: Port 5000 in use**
```
✓ Auto-detected port: 5001
  Access at: http://localhost:5001
```

**Scenario 3: Force specific port**
```powershell
$env:SLIDEINJECTR_PORT=9999
python setup-local.py

✓ Auto-detected port: 9999
  Access at: http://localhost:9999
```

### Benefits

✅ No manual port configuration needed  
✅ Works alongside Docker on same machine  
✅ Handles port conflicts automatically  
✅ Clean user experience (browser opens automatically)  
✅ Supports both `.exe` and Python setups  

---

## Strategy for Embedded Chart Data (Excel-Linked Objects)

For enterprise chart handling, use a two-tier strategy:

1. Native chart updates first
   - For charts embedded directly in the presentation package, use `python-pptx` chart data APIs to replace categories/series.
2. Open XML fallback for linked workbooks
   - Detect external workbook relationships (`/ppt/charts/_rels/*.rels`, external links).
   - Unzip the `.pptx`, patch linked workbook parts using `openpyxl`, then repackage.
   - Preserve relationship IDs and content types to avoid corruption.
3. Controlled compatibility mode
   - If chart type is unsupported, emit a validation warning and skip mutation rather than producing broken output.

## Security, Memory Efficiency, and Thread Safety Guidance

1. Upload constraints
   - Enforce file extension and MIME checks.
   - Add request-size limits at reverse proxy and ASGI layer.
2. Isolated processing
   - Process each request in a unique temporary directory.
   - Delete temporary artifacts after successful response.
3. Thread/process safety
   - Keep services stateless; avoid mutable globals.
   - Run with multiple workers in production (`gunicorn` + `uvicorn workers`).
4. Resource controls
   - Reject oversized files and excessive row counts.
   - Stream uploads to disk in chunks to avoid memory spikes.
5. Malicious document hardening
   - Scan uploaded files with antivirus in high-trust environments.
   - Validate zip structure before opening Office files.
6. Auditability
   - Add structured logs with request IDs, timings, and sanitized error messages.

## Next Engineering Enhancements

1. Add chart mapping UI (category + series selectors per chart object).
2. Add transformation rules (formatting, arithmetic, fallback values) per mapping.
3. Add job queue (RQ/Celery) for large generation tasks.
4. Add integration tests using sample template/data fixtures.
