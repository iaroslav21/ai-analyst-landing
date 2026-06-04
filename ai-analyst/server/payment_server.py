"""
Server AI Analyst — serveste site-ul static + endpoint-uri plata cu card.
Port: $PORT (Railway il seteaza automat) | local: 8080
"""
import hashlib
import hmac
import json
import mimetypes
import os
import time
import uuid
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

PORT = int(os.environ.get("PORT", os.environ.get("PAYMENT_PORT", "8080")))
ORDERS_FILE = os.path.join(os.path.dirname(__file__), "orders.json")
WF_MERCHANT = os.environ.get("WAYFORPAY_MERCHANT", "")
WF_SECRET = os.environ.get("WAYFORPAY_SECRET", "")

# Radacina site-ului static (un nivel deasupra folderului server/)
STATIC_ROOT = Path(__file__).parent.parent


def load_orders():
    if os.path.exists(ORDERS_FILE):
        with open(ORDERS_FILE, encoding="utf-8") as f:
            return json.load(f)
    return []


def save_orders(orders):
    with open(ORDERS_FILE, "w", encoding="utf-8") as f:
        json.dump(orders, f, indent=2, ensure_ascii=False)


def cors_headers(handler):
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type")


def json_response(handler, code, data):
    body = json.dumps(data, ensure_ascii=False).encode("utf-8")
    handler.send_response(code)
    cors_headers(handler)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def serve_static(handler, url_path):
    """Serveste fisiere statice din STATIC_ROOT."""
    # Normalizeaza calea
    clean = url_path.lstrip("/") or "index.html"
    file_path = (STATIC_ROOT / clean).resolve()

    # Securitate: nu permite traversarea in afara STATIC_ROOT
    try:
        file_path.relative_to(STATIC_ROOT)
    except ValueError:
        handler.send_response(403)
        handler.end_headers()
        return

    # Daca este director, incearca index.html
    if file_path.is_dir():
        file_path = file_path / "index.html"

    if not file_path.exists():
        # Fallback la index.html pentru SPA routing
        file_path = STATIC_ROOT / "index.html"
        if not file_path.exists():
            handler.send_response(404)
            handler.end_headers()
            return

    mime, _ = mimetypes.guess_type(str(file_path))
    mime = mime or "application/octet-stream"

    content = file_path.read_bytes()
    handler.send_response(200)
    handler.send_header("Content-Type", mime)
    handler.send_header("Content-Length", str(len(content)))
    cors_headers(handler)
    handler.end_headers()
    handler.wfile.write(content)


def luhn_ok(num: str) -> bool:
    s = "".join(c for c in num if c.isdigit())
    if len(s) < 13:
        return False
    total, alt = 0, False
    for d in reversed(s):
        n = int(d)
        if alt:
            n *= 2
            if n > 9:
                n -= 9
        total += n
        alt = not alt
    return total % 10 == 0


def detect_brand(num: str) -> str:
    s = "".join(c for c in num if c.isdigit())
    if s.startswith("4"):
        return "visa"
    if s[:2] in ("51", "52", "53", "54", "55") or (2221 <= int(s[:4] or "0") <= 2720):
        return "mastercard"
    if s.startswith(("50", "56", "57", "58", "63", "67")):
        return "maestro"
    return "card"


def wayforpay_signature(fields: list) -> str:
    raw = ";".join(str(f) for f in fields)
    return hmac.new(WF_SECRET.encode(), raw.encode(), hashlib.md5).hexdigest()


def create_wayforpay_redirect(order: dict, domain: str) -> str | None:
    if not WF_MERCHANT or not WF_SECRET:
        return None
    ref = order["orderId"]
    amount = order["amount"]
    date = int(time.time())
    product = order["planName"]
    fields = [
        WF_MERCHANT, domain, ref, date, amount,
        order.get("currency", "MDL"), product, 1, amount,
    ]
    sig = wayforpay_signature(fields)
    return (
        f"https://secure.wayforpay.com/pay?"
        f"merchantAccount={WF_MERCHANT}&merchantDomainName={domain}"
        f"&orderReference={ref}&orderDate={date}&amount={amount}&currency=MDL"
        f"&productName[]={product}&productCount[]=1&productPrice[]={amount}"
        f"&merchantSignature={sig}"
        f"&returnUrl=https://{domain}/payment-return.html?status=success&order={ref}"
        f"&serviceUrl=https://{domain}/api/pay/webhook/wayforpay"
    )


class PaymentHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"[{args[0]}] {args[1]}")

    def do_OPTIONS(self):
        self.send_response(204)
        cors_headers(self)
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path

        if path.startswith("/api/pay/status/"):
            oid = path.split("/")[-1]
            orders = load_orders()
            o = next((x for x in orders if x.get("orderId") == oid), None)
            if o:
                json_response(self, 200, {"ok": True, "order": o})
            else:
                json_response(self, 404, {"ok": False, "error": "not_found"})
            return

        if path == "/api/pay/health":
            json_response(self, 200, {"ok": True, "service": "ai-analyst-payment"})
            return

        # Serveste fisiere statice
        serve_static(self, path)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length).decode("utf-8") if length else "{}"
        try:
            data = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            json_response(self, 400, {"error": "invalid_json"})
            return

        path = urlparse(self.path).path

        if path == "/api/pay/webhook/wayforpay":
            orders = load_orders()
            ref = data.get("orderReference", "")
            for o in orders:
                if o.get("orderId") == ref:
                    o["status"] = "paid"
                    o["paidAt"] = datetime.utcnow().isoformat()
            save_orders(orders)
            json_response(self, 200, {"orderReference": ref, "status": "accept"})
            return

        if path == "/api/pay/charge":
            self.handle_charge(data)
            return

        if path == "/api/pay/create-order":
            self.handle_create_order(data)
            return

        json_response(self, 404, {"error": "not_found"})

    def handle_create_order(self, data):
        amount = float(data.get("amount", 0))
        domain = self.headers.get("Host", "localhost")
        order = {
            "orderId": "AA-" + uuid.uuid4().hex[:10].upper(),
            "planId": data.get("planId"),
            "planName": data.get("planName"),
            "amount": amount,
            "currency": data.get("currency", "MDL"),
            "customer": data.get("customer", {}),
            "status": "pending",
            "createdAt": datetime.utcnow().isoformat(),
        }
        redirect = create_wayforpay_redirect(order, domain)
        if redirect:
            order["gateway"] = "wayforpay"
            order["redirectUrl"] = redirect
        orders = load_orders()
        orders.append(order)
        save_orders(orders)
        json_response(self, 200, {"ok": True, "orderId": order["orderId"], "redirectUrl": redirect})

    def handle_charge(self, data):
        card = data.get("card", {})
        number = card.get("number", "")
        three_ds = data.get("threeDsCode", "")

        if not luhn_ok(number):
            json_response(self, 400, {"status": "declined", "message": "invalid_card"})
            return

        amount = float(data.get("amount", 0))
        if amount <= 0:
            json_response(self, 200, {"status": "approved", "orderId": "FREE-" + uuid.uuid4().hex[:6].upper()})
            return

        order_id = data.get("orderId") or ("AA-" + uuid.uuid4().hex[:10].upper())

        if not three_ds:
            brand = detect_brand(number)
            json_response(self, 200, {
                "status": "requires_3ds",
                "orderId": order_id,
                "cardBrand": brand,
                "message": "3d_secure_required",
            })
            return

        if len(three_ds) < 4:
            json_response(self, 400, {"status": "declined", "message": "invalid_3ds"})
            return

        order = {
            "orderId": order_id,
            "planId": data.get("planId"),
            "planName": data.get("planName"),
            "amount": amount,
            "currency": data.get("currency", "MDL"),
            "customer": data.get("customer", {}),
            "cardBrand": detect_brand(number),
            "cardLast4": "".join(c for c in number if c.isdigit())[-4:],
            "autoRenew": data.get("autoRenew", False),
            "invoice": data.get("invoice", False),
            "status": "paid",
            "paidAt": datetime.utcnow().isoformat(),
            "transactionId": "TXN-" + uuid.uuid4().hex[:12].upper(),
        }
        orders = load_orders()
        orders.append(order)
        save_orders(orders)

        json_response(self, 200, {
            "status": "approved",
            "orderId": order_id,
            "transactionId": order["transactionId"],
            "cardBrand": order["cardBrand"],
        })


if __name__ == "__main__":
    print(f"AI Analyst server pornit pe portul {PORT}")
    print(f"Site disponibil la: http://localhost:{PORT}")
    print("API: POST /api/pay/charge, POST /api/pay/create-order, GET /api/pay/status/:id")
    if WF_MERCHANT:
        print("WayForPay: activ")
    else:
        print("WayForPay: modul demo (seteaza WAYFORPAY_MERCHANT + WAYFORPAY_SECRET pentru live)")
    HTTPServer(("0.0.0.0", PORT), PaymentHandler).serve_forever()
