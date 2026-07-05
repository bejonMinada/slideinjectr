"""
SlideInjectr standalone launcher
Starts the FastAPI server and opens the browser
"""

import os
import sys
import time
import webbrowser
import socket
from pathlib import Path
from threading import Thread
import uvicorn

# Ensure backend directory is in Python path
backend_dir = Path(__file__).parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Change to backend directory
os.chdir(backend_dir)


def is_port_available(port):
    """Check if a port is available"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        result = sock.connect_ex(('127.0.0.1', port))
        sock.close()
        return result != 0
    except:
        return False


def find_available_port(preferred_port=None, start_port=5000, max_port=5100):
    """Find an available port with intelligent selection"""
    
    # 1. Check environment variable override
    env_port = os.environ.get('SLIDEINJECTR_PORT')
    if env_port:
        try:
            port = int(env_port)
            if is_port_available(port):
                return port
            else:
                print(f"⚠️  Port {port} (from SLIDEINJECTR_PORT) is in use, auto-detecting...")
        except ValueError:
            print(f"⚠️  Invalid SLIDEINJECTR_PORT: {env_port}")
    
    # 2. Try preferred port if provided
    if preferred_port and is_port_available(preferred_port):
        return preferred_port
    
    # 3. Try common development ports first
    preferred_ports = [5000, 5001, 5002, 8000, 3000, 8080]
    for port in preferred_ports:
        if start_port <= port <= max_port and is_port_available(port):
            return port
    
    # 4. Fall back to sequential search
    for port in range(start_port, max_port + 1):
        if is_port_available(port):
            return port
    
    # 5. If no port found, return default
    return start_port


def main():
    print("\n" + "=" * 60)
    print("  SlideInjectr - Standalone Version")
    print("=" * 60)
    
    # Find available ports
    port = find_available_port(preferred_port=5000)
    
    print(f"\n✓ Auto-detected available port: {port}")
    print(f"\n  Access the app at: http://localhost:{port}")
    print(f"\n  💡 Tips:")
    print(f"     • App will open automatically in your browser")
    print(f"     • Press Ctrl+C to stop the server")
    print(f"     • Ensure LibreOffice Impress is installed")
    print(f"     • Set SLIDEINJECTR_PORT env var to use a specific port\n")
    
    # Start server in background thread
    def run_server():
        from app.main import app
        uvicorn.run(
            app,
            host="127.0.0.1",
            port=port,
            log_level="info",
            access_log=False,
        )
    
    server_thread = Thread(target=run_server, daemon=True)
    server_thread.start()
    
    # Wait for server to start
    print("Starting server...")
    max_retries = 30
    for i in range(max_retries):
        if is_port_available(port):
            time.sleep(0.5)  # Give it a moment to fully start
            break
        if i < max_retries - 1:
            time.sleep(0.2)
    else:
        print("\n❌ Server failed to start")
        return
    
    # Open browser
    url = f"http://localhost:{port}"
    print(f"✓ Server is running!\n")
    print(f"Opening {url} in your browser...\n")
    webbrowser.open(url, new=2)
    
    # Keep the program running
    try:
        server_thread.join()
    except KeyboardInterrupt:
        print("\n\n✓ Server stopped")
        sys.exit(0)


if __name__ == "__main__":
    main()
