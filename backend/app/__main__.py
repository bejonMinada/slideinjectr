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


def is_port_open(port):
    """Check if a port is available"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('127.0.0.1', port))
    sock.close()
    return result == 0


def find_available_port(start_port=5000, max_port=5100):
    """Find an available port"""
    for port in range(start_port, max_port + 1):
        if not is_port_open(port):
            return port
    return start_port


def main():
    print("=" * 50)
    print("SlideInjectr - Standalone Version")
    print("=" * 50)
    
    # Find available port
    port = find_available_port()
    if is_port_open(port):
        print(f"\n⚠️  Port {port} is already in use")
        print(f"Looking for alternative port...")
        port = find_available_port()
    
    print(f"\n✓ Starting server on http://localhost:{port}")
    print(f"\n💡 Tips:")
    print(f"   - The app will open automatically in your browser")
    print(f"   - Press Ctrl+C to stop the server")
    print(f"   - Make sure LibreOffice Impress is installed\n")
    
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
    print("Waiting for server to start...")
    max_retries = 30
    for i in range(max_retries):
        if is_port_open(port):
            time.sleep(0.5)  # Give it a moment to fully start
            break
        if i < max_retries - 1:
            time.sleep(0.2)
    else:
        print("\n❌ Server failed to start")
        return
    
    # Open browser
    url = f"http://localhost:{port}"
    print(f"\n✓ Server started! Opening {url}")
    webbrowser.open(url, new=2)
    
    # Keep the program running
    try:
        server_thread.join()
    except KeyboardInterrupt:
        print("\n\n✓ Server stopped")
        sys.exit(0)


if __name__ == "__main__":
    main()
