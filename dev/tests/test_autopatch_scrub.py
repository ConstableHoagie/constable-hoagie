"""The autopatcher must never send personal data. (Also a template for the regression tests Claude adds.)"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "app"))
from hoagie import autopatch  # noqa: E402

raw = 'File "C:\\Users\\Alison\\x.py" email a@b.com token=abc123 Bearer ghp_abcdefghijklmnop1234 $1,234.56 ip 10.0.0.5 acct 9876543'
out = autopatch.scrub(raw)
for leak in ("Alison", "a@b.com", "abc123", "ghp_abcdefghijklmnop1234", "1,234.56", "10.0.0.5", "9876543"):
    assert leak not in out, (leak, out)
assert autopatch.fingerprint("server", "KeyError: 12", "") == autopatch.fingerprint("server", "KeyError: 99", "")
print("ok")
