#!/usr/bin/env python3
"""
SlideInjectr Setup Helper
Assists with setting up and running SlideInjectr locally
"""

import os
import sys
import subprocess
import webbrowser
import socket
import time
from pathlib import Path


def check_python_version():
    """Verify Python 3.10+"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 10):
        print(f"❌ Python 3.10+ required. You have Python {version.major}.{version.minor}")
        print("   Download from: https://www.python.org/downloads/")
        return False
    print(f"✓ Python {version.major}.{version.minor}.{version.micro} detected")
    return True


def check_libreoffice():
    """Check if LibreOffice is installed"""
    print("\nChecking LibreOffice...")
    
    # Common paths
    paths = [
        r"C:\Program Files\LibreOffice\program\soffice.exe",
        r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        "/Applications/LibreOffice.app/Contents/MacOS/soffice",
        "/usr/bin/libreoffice",
        "/usr/bin/soffice",
    ]
    
    for path in paths:
        if Path(path).exists():
            print(f"✓ LibreOffice found at: {path}")
            return True
    
    print("⚠️  LibreOffice not found")
    print("   Download from: https://www.libreoffice.org/download/")
    response = input("   Continue anyway? (y/n): ").lower()
    return response == 'y'


def install_dependencies():
    """Install Python dependencies"""
    print("\nInstalling Python dependencies...")
    
    requirements = [
        "fastapi==0.116.0",
        "uvicorn[standard]==0.35.0",
        "python-multipart==0.0.20",
        "python-pptx==1.0.2",
        "pandas==2.3.1",
        "openpyxl==3.1.5",
        "pydantic-settings==2.10.1",
    ]
    
    for req in requirements:
        print(f"  Installing {req}...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", req])
    
    print("✓ Dependencies installed")


def build_frontend():
    """Build React frontend"""
    print("\nBuilding frontend...")
    
    frontend_dir = Path(__file__).parent / "frontend"
    if not frontend_dir.exists():
        print("❌ Frontend directory not found")
        return False
    
    # Check if node_modules exists
    if not (frontend_dir / "node_modules").exists():
        print("  Installing frontend dependencies...")
        subprocess.check_call(["npm", "install"], cwd=frontend_dir)
    
    print("  Building...")
    subprocess.check_call(["npm", "run", "build"], cwd=frontend_dir)
    print("✓ Frontend built")
    return True


def is_port_free(port):
    """Check if port is available"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('127.0.0.1', port))
    sock.close()
    return result != 0


def find_available_port(start=5000, end=5100):
    """Find an available port"""
    for port in range(start, end + 1):
        if is_port_free(port):
            return port
    return None


def start_server():
    """Start the FastAPI server"""
    print("\n" + "="*50)
    print("Starting SlideInjectr...")
    print("="*50)
    
    port = find_available_port()
    if not port:
        print("❌ No available ports found (5000-5100)")
        return False
    
    print(f"\n✓ Server starting on http://localhost:{port}")
    print("  Press Ctrl+C to stop\n")
    
    # Change to backend directory so app module can be found
    backend_dir = Path(__file__).parent / "backend"
    os.chdir(backend_dir)
    sys.path.insert(0, str(backend_dir))
    
    # Wait a moment then open browser
    def open_browser():
        time.sleep(2)
        url = f"http://localhost:{port}"
        print(f"\n🌐 Opening {url} in browser...")
        webbrowser.open(url, new=2)
    
    browser_thread = __import__("threading").Thread(target=open_browser, daemon=True)
    browser_thread.start()
    
    # Start server
    try:
        from app.main import app
        import uvicorn
        
        uvicorn.run(
            app,
            host="127.0.0.1",
            port=port,
            log_level="info",
        )
    except KeyboardInterrupt:
        print("\n\n✓ Server stopped")
        return True
    except Exception as e:
        print(f"\n❌ Server error: {e}")
        return False


def main():
    print("""
    ╔═══════════════════════════════════╗
    ║     SlideInjectr Setup Helper     ║
    ╚═══════════════════════════════════╝
    """)
    
    # Checks
    if not check_python_version():
        sys.exit(1)
    
    if not check_libreoffice():
        sys.exit(1)
    
    # Attempt to import dependencies
    try:
        import fastapi
        import uvicorn
        print("✓ Python dependencies already installed")
    except ImportError:
        print("\nInstalling Python packages...")
        try:
            install_dependencies()
        except Exception as e:
            print(f"❌ Failed to install dependencies: {e}")
            sys.exit(1)
    
    # Build frontend if needed
    dist_dir = Path(__file__).parent / "frontend" / "dist"
    if not dist_dir.exists():
        try:
            if not build_frontend():
                sys.exit(1)
        except Exception as e:
            print(f"❌ Failed to build frontend: {e}")
            print("   Do you have Node.js installed?")
            sys.exit(1)
    
    # Start server
    try:
        start_server()
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
