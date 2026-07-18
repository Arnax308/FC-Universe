"""Launcher to start both backend (FastAPI) and frontend (Vite) concurrently."""

import sys
import subprocess
import time
import os
import signal
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
        print("Please set up the backend virtual environment first.")
        sys.exit(1)

    print("🚀 Starting FC Universe Backend (FastAPI)...")
    # Launch backend (FastAPI)
    backend_proc = subprocess.Popen(
        [str(python_exe), "-m", "uvicorn", "fc_universe.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
        cwd=str(backend_dir / "src"),
        stdout=sys.stdout,
        stderr=sys.stderr,
    )

    # Small delay to let the backend initialize port 8000
    time.sleep(1.5)

    print("\n🚀 Starting FC Universe Frontend (Vite)...")
    # Launch frontend (Vite)
    # Check if node_modules exists
    if not (frontend_dir / "node_modules").exists():
        print("📦 node_modules not found in frontend. Running 'npm install'...")
        npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
        subprocess.run([npm_cmd, "install"], cwd=str(frontend_dir))

    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=str(frontend_dir),
        stdout=sys.stdout,
        stderr=sys.stderr,
    )

    print("\n🎉 Both servers are running!")
    print("👉 Frontend: http://localhost:5173")
    print("👉 Backend API Docs: http://127.0.0.1:8000/docs")
    print("Press Ctrl+C to terminate both servers...\n")

    # Monitor and handle shutdown
    try:
        while True:
            # Check if either process terminated unexpectedly
            if backend_proc.poll() is not None:
                print("⚠️ Backend server stopped.")
                break
            if frontend_proc.poll() is not None:
                print("⚠️ Frontend server stopped.")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down servers gracefully...")
    finally:
        # Terminate both processes
        for proc, name in [(backend_proc, "Backend"), (frontend_proc, "Frontend")]:
            if proc.poll() is None:
                try:
                    if sys.platform == "win32":
                        # Send taskkill to make sure child processes are also terminated
                        subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    else:
                        proc.terminate()
                        proc.wait(timeout=3)
                except Exception as e:
                    print(f"Error terminating {name} process: {e}")
        print("👋 Goodbye!")

if __name__ == "__main__":
    run()
