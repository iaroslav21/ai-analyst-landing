/**
 * Configurare plata cu card.
 * mode: "demo" = simulare locala (pentru Netlify)
 */
window.PAYMENT_CONFIG = {
  mode: "demo",
  apiBase: "/api/pay",
  currency: "MDL",
  vatPercent: 20,
  wayforpay: { enabled: false },
  stripe: { enabled: false },
};
