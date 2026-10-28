"""Launcher to start both backend (FastAPI) and frontend (Vite) concurrently, then open the app."""

import socket
import sys
import subprocess
import time
import urllib.request
import webbrowser
from pathlib import Path

# Set console encoding to UTF-8 on Windows
if sys.platform == "win32":
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        kernel32.SetConsoleCP(65001)
        kernel32.SetConsoleOutputCP(65001)
    except Exception:
        pass
    sys.stdout.reconfigure(encoding="utf-8")
# Print progress immediately even when output is redirected to a file
sys.stdout.reconfigure(line_buffering=True)

BACKEND_PORT = 8000
FRONTEND_PORT = 5173
APP_URL = f"http://localhost:{FRONTEND_PORT}"


def port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) == 0


def wait_for(url: str, timeout: float) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            urllib.request.urlopen(url, timeout=2)
            return True
        except Exception:
            time.sleep(0.5)
    return False


def run():
    root_dir = Path(__file__).parent.resolve()
    backend_dir = root_dir / "backend"
    frontend_dir = root_dir / "frontend"

    # Virtual environment Python executable path
    if sys.platform == "win32":
        python_exe = backend_dir / "venv" / "Scripts" / "python.exe"
    else:
        python_exe = backend_dir / "venv" / "bin" / "python"

    if not python_exe.exists():
        print(f"Error: Python virtual environment not found at {python_exe}")
        print("Run start.bat (it sets everything up), or create the venv manually.")
        sys.exit(1)

    for port in (BACKEND_PORT, FRONTEND_PORT):
        if port_in_use(port):
            print(f"⚠️ Port {port} is already in use — is FC Universe already running in another window?")
            print(f"   Close that window (or whatever uses port {port}) and try again.")
            sys.exit(1)

    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"

    # Install frontend packages when missing or when package.json changed since the last install
    lock_marker = frontend_dir / "node_modules" / ".package-lock.json"
    if not lock_marker.exists() or lock_marker.stat().st_mtime < (frontend_dir / "package.json").stat().st_mtime:
        print("📦 Installing frontend packages (npm install)...")
        subprocess.run([npm_cmd, "install", "--no-audit", "--no-fund"], cwd=str(frontend_dir), check=True)

    print("🚀 Starting FC Universe Backend (FastAPI)...")
    backend_proc = subprocess.Popen(
        [str(python_exe), "-m", "uvicorn", "fc_universe.main:app", "--host", "127.0.0.1", "--port", str(BACKEND_PORT)],
        cwd=str(backend_dir / "src"),
        stdout=sys.stdout,
        stderr=sys.stderr,
    )

    print("🚀 Starting FC Universe Frontend (Vite)...")
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev", "--", "--port", str(FRONTEND_PORT), "--strictPort"],
        cwd=str(frontend_dir),
        stdout=sys.stdout,
        stderr=sys.stderr,
    )

    if wait_for(APP_URL, timeout=60):
        print(f"\n🎉 FC Universe is running at {APP_URL}")
        print("   Your saves are synced in the background — new or updated careers appear within a minute.")
        print("   Close this window or press Ctrl+C to stop.\n")
        if "--no-browser" not in sys.argv:
            webbrowser.open(APP_URL)
    else:
        print(f"\n⚠️ The frontend didn't respond at {APP_URL} yet — check the messages above.")

    # Monitor and handle shutdown; a server dying on its own counts as a failure
    crashed = False
    try:
        while True:
            if backend_proc.poll() is not None:
                print("⚠️ Backend server stopped.")
                crashed = True
                break
            if frontend_proc.poll() is not None:
                print("⚠️ Frontend server stopped.")
                crashed = True
                break
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down servers gracefully...")
    finally:
        for proc, name in [(backend_proc, "Backend"), (frontend_proc, "Frontend")]:
            if proc.poll() is None:
                try:
                    if sys.platform == "win32":
                        # taskkill /T also stops child processes (node, uvicorn workers)
                        subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    else:
                        proc.terminate()
                        proc.wait(timeout=3)
                except Exception as e:
                    print(f"Error terminating {name} process: {e}")
        print("👋 Goodbye!")
    sys.exit(1 if crashed else 0)


if __name__ == "__main__":
    run()
