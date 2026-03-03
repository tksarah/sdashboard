from flask import Flask, jsonify, send_from_directory
import psutil, subprocess, json, os, requests
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='static')

RPC_URL = "http://localhost:9944"

# Subscan v2 API
SUBSCAN_API = "https://shiden.api.subscan.io/api/v2/scan/account/tokens"

# Secrets (read from environment or .env). Do NOT commit real secrets.
SUBSCAN_KEY = os.getenv('SUBSCAN_KEY')
CMC_API_KEY = os.getenv('CMC_API_KEY')
WALLET_ADDRESS = os.getenv('WALLET_ADDRESS')

# Fail fast if required secrets are not provided
if not (SUBSCAN_KEY and CMC_API_KEY and WALLET_ADDRESS):
    raise RuntimeError("Missing required environment variables: SUBSCAN_KEY, CMC_API_KEY, WALLET_ADDRESS")


def rpc(method, params=None):
    payload = {"id": 1, "jsonrpc": "2.0", "method": method}
    if params:
        payload["params"] = params

    res = subprocess.check_output([
        "curl", "-s", "-H", "Content-Type: application/json",
        "-d", json.dumps(payload),
        RPC_URL
    ])
    return json.loads(res)


def check_collator_alive():
    try:
        status = subprocess.check_output(
            ["systemctl", "is-active", "astar.service"],
            text=True
        ).strip()
        systemctl_alive = (status == "active")
    except:
        systemctl_alive = False

    process_alive = False
    for p in psutil.process_iter(attrs=["name", "cmdline"]):
        try:
            name = p.info["name"] or ""
            cmd = " ".join(p.info["cmdline"]) if p.info["cmdline"] else ""
            if "astar" in name.lower() or "astar" in cmd.lower():
                process_alive = True
                break
        except:
            pass

    return systemctl_alive or process_alive


# ★ Subscan v2 のレスポンス形式に対応
def get_sdn_balance():
    headers = {
        "Content-Type": "application/json",
        "X-API-Key": SUBSCAN_KEY
    }

    body = {"address": WALLET_ADDRESS}

    try:
        r = requests.post(SUBSCAN_API, headers=headers, json=body, timeout=5)
        data = r.json()

        if "data" not in data or "list" not in data["data"]:
            return None

        for token in data["data"]["list"]:
            if token.get("symbol") == "SDN":
                raw = token.get("balance") or "0"
                return float(raw) / 10**18

    except Exception as e:
        print("SDN balance error:", e)
        return None

    return None


# ★ CoinMarketCap で USD と JPY を別々に取得
def get_sdn_price():
    url = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest"
    headers = {
        "Accepts": "application/json",
        "X-CMC_PRO_API_KEY": CMC_API_KEY
    }

    # USD 取得
    try:
        r_usd = requests.get(url, headers=headers,
                             params={"symbol": "SDN", "convert": "USD"},
                             timeout=5)
        data_usd = r_usd.json()
        price_usd = data_usd["data"]["SDN"]["quote"]["USD"]["price"]
    except Exception as e:
        print("CMC USD error:", e)
        price_usd = None

    # JPY 取得（別リクエスト）
    try:
        r_jpy = requests.get(url, headers=headers,
                             params={"symbol": "SDN", "convert": "JPY"},
                             timeout=5)
        data_jpy = r_jpy.json()
        price_jpy = data_jpy["data"]["SDN"]["quote"]["JPY"]["price"]
    except Exception as e:
        print("CMC JPY error:", e)
        price_jpy = None

    return price_usd, price_jpy


# ★ SDN 残高はページ読み込み時のみ取得
@app.get("/api/sdn_balance")
def sdn_balance():
    bal = get_sdn_balance()
    usd, jpy = get_sdn_price()

    return jsonify({
        "sdn_balance": bal,
        "sdn_price_usd": usd,
        "sdn_price_jpy": jpy,
        "sdn_value_usd": None if (bal is None or usd is None) else bal * usd,
        "sdn_value_jpy": None if (bal is None or jpy is None) else bal * jpy
    })


@app.get("/api/status")
def status():
    cpu_total = psutil.cpu_percent(interval=0.5)
    cpu_per_core = psutil.cpu_percent(interval=0.5, percpu=True)
    cpu_count = psutil.cpu_count()

    load1, load5, load15 = os.getloadavg()
    mem = psutil.virtual_memory()._asdict()
    disk = psutil.disk_usage('/var/lib/astar')._asdict()
    net = psutil.net_io_counters()._asdict()

    best_header = rpc("chain_getHeader")
    best_hex = best_header["result"]["number"]
    best_number = int(best_hex, 16)

    finalized_head = rpc("chain_getFinalizedHead")["result"]
    finalized_header = rpc("chain_getHeader", [finalized_head])
    finalized_hex = finalized_header["result"]["number"]
    finalized_number = int(finalized_hex, 16)

    sync_diff = best_number - finalized_number
    sync_rate = 100 if best_number == 0 else round(
        (finalized_number / best_number) * 100, 2
    )

    logs = subprocess.check_output(
        ["journalctl", "-u", "astar.service",
         "--since", "1 minute ago", "--no-pager"],
        text=True
    )

    return jsonify({
        "cpu_total": cpu_total,
        "cpu_per_core": cpu_per_core,
        "cpu_count": cpu_count,
        "loadavg": [load1, load5, load15],
        "memory": mem,
        "disk": disk,
        "network": net,
        "best_block": best_number,
        "finalized_block": finalized_number,
        "sync_rate": sync_rate,
        "sync_diff": sync_diff,
        "collator_alive": check_collator_alive(),
        "logs": logs.split("\n")
    })


@app.get("/")
def index():
    return send_from_directory("static", "index.html")


app.run(host="0.0.0.0", port=8080)