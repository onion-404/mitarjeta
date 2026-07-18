import "server-only"

// Única fuente de verdad del dominio público de la app, usada por
// lib/mercadopago.ts (Checkout Pro) y lib/mercadopago-suscripciones.ts
// (Suscripciones) para armar back_urls absolutas — Mercado Pago las exige así
// en ambos productos. Antes vivía duplicada como una constante idéntica en
// los dos archivos; unificada acá para que no puedan desincronizarse el día
// que cambie el dominio (ver CLAUDE.md).
export const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
