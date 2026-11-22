"""Quick API smoke test against a running Hoagie (start dev/run_mock.py first). Exit code 1 on failure."""
import json, sys, urllib.request

B = "http://127.0.0.1:8787"
CHECKS = ["/api/status", "/api/me", "/api/integrations", "/api/ai/guide", "/api/costs", "/api/brokers", "/api/insights", "/api/checks"]


def get(path):
    with urllib.request.urlopen(B + path, timeout=30) as r:
        return r.status, json.loads(r.read() or b"{}")


bad = 0
for p in CHECKS:
    try:
        code, _ = get(p)
        print("OK  " if code == 200 else "BAD ", code, p)
        bad += code != 200
    except Exception as e:
        print("BAD ", p, e)
        bad += 1
# demo session must never see real data
req = urllib.request.Request(B + "/api/auth/demo", data=b"{}", headers={"Content-Type": "application/json"}, method="POST")
with urllib.request.urlopen(req) as r:
    cookie = r.headers.get("Set-Cookie", "").split(";")[0]
req = urllib.request.Request(B + "/api/status", headers={"Cookie": cookie})
with urllib.request.urlopen(req) as r:
    st = json.loads(r.read())
print("OK   demo persona:", st.get("demo", {}).get("persona")) if st.get("demo") else print("BAD  demo")
bad += not st.get("demo")
sys.exit(1 if bad else 0)
