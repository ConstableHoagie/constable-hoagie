"""Start Constable Hoagie with simulated outside data (Treasury, BLS, SEC, FRED, Finnhub...) for offline testing.
Usage: python dev/run_mock.py   then open http://127.0.0.1:8787
"""
import sys, runpy, datetime
import os
APP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app")
sys.path.insert(0, APP)
from hoagie import feeds, portfolio
real = feeds.http_json
def fake(url, headers=None, data=None, timeout=20):
    if "fiscaldata" in url: return {"data":[{"record_date":"2026-10-31","security_desc":"Treasury Bills","avg_interest_rate_amt":"4.10"},{"record_date":"2026-10-31","security_desc":"Treasury Notes","avg_interest_rate_amt":"3.2"}]}
    if "bls.gov" in url: return {"Results":{"series":[{"data":[{"year":"2026","period":"M10","periodName":"October","value":"330.0"},{"year":"2025","period":"M10","periodName":"October","value":"321.0"}]}]}}
    if "alternative.me" in url: return {"data":[{"value":"22","value_classification":"Extreme Fear"}]}
    if "company_tickers" in url: return {"0":{"cik_str":320193,"ticker":"AAPL","title":"Apple"}}
    if "data.sec.gov" in url: return {"filings":{"recent":{"form":["10-Q","8-K"],"accessionNumber":["0000320193-26-000100","0000320193-26-000090"],"primaryDocument":["aapl-10q.htm","8k.htm"],"filingDate":["2026-10-31","2026-10-20"]}}}
    if "stlouisfed" in url:
        v={"FEDFUNDS":"3.88","DGS10":"4.12","T10Y2Y":"0.45","MORTGAGE30US":"6.21","UNRATE":"4.3","GASREGW":"3.05"}
        sid=url.split("series_id=")[1].split("&")[0]; return {"observations":[{"date":"2026-11-14","value":v.get(sid,"1")}]}
    if "calendar/earnings" in url: return {"earningsCalendar":[{"date":(datetime.date.today()+datetime.timedelta(days=3)).isoformat(),"hour":"amc"}]}
    if "company-news" in url: return [{"headline":"Apple shares plunge on lawsuit","url":"#","source":"x"},{"headline":"Apple raises dividend as services revenue grows","url":"#","source":"y"}]
    return real(url, headers, data, timeout)
feeds.http_json = fake
from hoagie import ai as _ai
_ai.claude_cmd = lambda: None
sys.argv = ["server.py", "--no-browser"]
os.chdir(APP)
runpy.run_path(os.path.join(APP, "server.py"), run_name="__main__")
