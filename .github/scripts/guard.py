"""After Claude edits: did anything change, is it small, and does it touch protected files? Writes GitHub step outputs."""
import os
import subprocess

PROTECTED = ("app/hoagie/auth.py", "app/hoagie/store.py", "app/hoagie/brokers.py", "app/hoagie/agentapi.py", "app/hoagie/updater.py",
             "app/hoagie/autopatch.py", "setup/", ".github/", "app/seed/", "media/")
out = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True).stdout.splitlines()
files = [l[3:].strip().strip('"') for l in out if l[3:].strip() and not l[3:].strip().endswith(".autopatch-summary.md")]
subprocess.run(["git", "add", "-N", "."], capture_output=True)   # count new files in the diff too
stat = subprocess.run(["git", "diff", "--numstat"], capture_output=True, text=True).stdout.splitlines()
lines = sum(int(a) + int(b) for a, b, *_ in (l.split("\t") for l in stat) if a.isdigit() and b.isdigit())
prot = [f for f in files if f.startswith(PROTECTED)]
res = {"changed": str(bool(files)).lower(), "hold": str(bool(prot)).lower(), "small": str(lines <= 60 and len(files) <= 4).lower(),
       "protected": ", ".join(prot)[:200], "files": ", ".join(files)[:300], "lines": str(lines)}
with open(os.environ.get("GITHUB_OUTPUT", os.devnull), "a") as f:
    for k, v in res.items():
        f.write("%s=%s\n" % (k, v))
print(res)
