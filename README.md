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

## Run Locally with Docker (Default: Port 3030)

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
   http://localhost:3030
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

## Custom Port Configuration

To run SlideInjectr on different ports, edit `docker-compose.yml`:

### Example: Frontend on Port 8080, Backend on Port 9000

**Before (default):**
```yaml
services:
  frontend:
    ports:
      - "3030:80"        # Host:Container port mapping
    
  backend:
    ports:
      - "8000:8000"
```

**After (custom ports):**
```yaml
services:
  frontend:
    ports:
      - "8080:80"        # Change 3030 to 8080
    
  backend:
    ports:
      - "9000:8000"      # Change 8000 to 9000
```

**Rebuild and restart:**
```bash
docker compose up --build -d
```

**Access at:**
```
http://localhost:8080
```

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

After starting, access interactive API documentation:

```
http://localhost:3030/api/docs     # Swagger UI
http://localhost:3030/api/redoc    # ReDoc
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

If you get "Address already in use" error:

**Windows PowerShell:**
```powershell
# Find process using port 3030
netstat -ano | findstr :3030

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

**Linux/macOS Terminal:**
```bash
# Find process using port 3030
lsof -i :3030

# Kill process (replace PID with actual process ID)
kill -9 <PID>
```

Or change to a different port in `docker-compose.yml`.

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

## API Documentation (Development)

After starting, access documentation:

```
http://localhost:3030/api/docs     # Swagger UI
http://localhost:3030/api/redoc    # ReDoc
```

Available endpoints:
- `POST /api/v1/templates/analyze` - Analyze PowerPoint structure
- `POST /api/v1/data-sources/analyze` - Analyze CSV/Excel files
- `POST /api/v1/presentations/generate` - Generate presentation
- `POST /api/v1/presentations/preview` - Generate PDF preview
- `POST /api/v1/settings/export` - Export mapping as YAML
- `POST /api/v1/settings/import` - Import mapping from YAML

The full application is exposed on host port `3030`.

## Development (Without Docker)

Backend:

1. `cd backend`
2. `python -m venv .venv`
3. `.venv\\Scripts\\activate`
4. `pip install -r requirements.txt`
5. `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`

Frontend:

1. `cd frontend`
2. `npm install`
3. `npm run dev`
4. Open `http://localhost:5173`

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
