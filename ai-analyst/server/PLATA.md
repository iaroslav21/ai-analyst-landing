# Server plată cu card

## Pornire

Cu `PORNESTE-SITE.bat` (pornește automat) sau manual:

```powershell
cd ai-analyst\server
python payment_server.py
```

## Endpoints

| Metodă | URL | Descriere |
|--------|-----|-----------|
| GET | `/api/pay/health` | Verificare server |
| POST | `/api/pay/charge` | Plată cu card + 3D Secure |
| POST | `/api/pay/create-order` | Comandă + redirect WayForPay |
| GET | `/api/pay/status/:orderId` | Status comandă |

## WayForPay (bani reali)

Setează variabile de mediu înainte de pornire:

```
set WAYFORPAY_MERCHANT=contul_tau
set WAYFORPAY_SECRET=cheia_secreta
```

## Fișier comenzi

Comenzile plătite se salvează în `server/orders.json`.
