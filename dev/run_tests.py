"""Everything the autopatcher and CI run: compile all Python, syntax-check all JS, smoke-test the mock server, then dev/tests/.
Usage: python dev/run_tests.py   (exit code 0 = all good)"""
import glob
import os
import py_compile
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bad = 0
py_files = (glob.glob(os.path.join(ROOT, "app", "**", "*.py"), recursive=True) + glob.glob(os.path.join(ROOT, "setup", "*.py"))
            + glob.glob(os.path.join(ROOT, "dev", "**", "*.py"), recursive=True))
for f in py_files:
    try:
        py_compile.compile(f, doraise=True)
    except py_compile.PyCompileError as e:
        print("COMPILE FAIL", f, e)
        bad += 1
if shutil.which("node"):
    for f in glob.glob(os.path.join(ROOT, "app", "web", "*.js")):
        r = subprocess.run(["node", "--check", f], capture_output=True, text=True)
        if r.returncode:
            print("JS FAIL", f, r.stderr[:300])
            bad += 1
# the mock server runs in a throwaway data folder, so tests never touch real data
env = dict(os.environ, HOME=tempfile.mkdtemp(), LOCALAPPDATA=tempfile.mkdtemp())
srv = subprocess.Popen([sys.executable, os.path.join(ROOT, "dev", "run_mock.py")], env=env, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
try:
    for _ in range(60):
        try:
            urllib.request.urlopen("http://127.0.0.1:8787/api/status", timeout=2)
            break
        except Exception:
            time.sleep(0.5)
    tests = [os.path.join(ROOT, "dev", "smoke_test.py")] + sorted(glob.glob(os.path.join(ROOT, "dev", "tests", "test_*.py")))
    for t in tests:
        r = subprocess.run([sys.executable, t], env=env, capture_output=True, text=True, timeout=180)
        print(("OK   " if r.returncode == 0 else "FAIL ") + os.path.relpath(t, ROOT))
        if r.returncode:
            print(r.stdout[-1500:], r.stderr[-1500:])
            bad += 1
finally:
    srv.terminate()
print("ALL GOOD" if not bad else "%d problem(s)" % bad)
sys.exit(1 if bad else 0)
