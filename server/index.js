/* Mercado Pago backend API - Express */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS: allow from env ALLOWED_ORIGINS (comma separated). If not set, allow all (for testing)
const allowed = (process.env.ALLOWED_ORIGINS || '*')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
app.use(cors({ origin: (origin, cb) => {
  if (!origin || allowed.includes('*') || allowed.includes(origin)) return cb(null, true);
  return cb(new Error('CORS not allowed'), false);
}, credentials: true }));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());

// Healthcheck
app.get('/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

// Mercado Pago client
const accessToken = process.env.MP_ACCESS_TOKEN;
if (!accessToken) {
  console.warn('[WARN] MP_ACCESS_TOKEN is not set. Set it in Render/Env for production.');
}
const mpClient = new MercadoPagoConfig({ accessToken });
const preferenceClient = new Preference(mpClient);

// Utility: base URL for redirects and webhook
function appBaseUrl(req) {
  // Prefer explicit env for production; fallback to request host
  const envUrl = process.env.APP_BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}

// Create checkout preference (Web Checkout)
// POST /api/checkout
// Body example: { title, quantity, currency_id, unit_price, description, payer: { name, email }, metadata }
app.post('/api/checkout', async (req, res) => {
  try {
    const {
      title = 'Guia Premium de Investimentos',
      description = 'Acesso vitalício + atualizações',
      quantity = 1,
      currency_id = 'BRL',
      unit_price = 297.0,
      payer = {},
      metadata = {},
    } = req.body || {};

    const base = appBaseUrl(req);
    const back_urls = {
      success: `${base}/success`,
      failure: `${base}/failure`,
      pending: `${base}/pending`,
    };

    const notification_url = process.env.MP_WEBHOOK_URL || `${base}/webhooks/mercadopago`;

    const preference = {
      items: [
        {
          title,
          description,
          quantity: Number(quantity) || 1,
          currency_id,
          unit_price: Number(unit_price),
        },
      ],
      payer: {
        name: payer.name,
        email: payer.email,
      },
      statement_descriptor: 'GUIA PREMIUM',
      back_urls,
      auto_return: 'approved',
      // Ex: allow Pix and card
      payment_methods: {
        excluded_payment_types: [],
        installments: 12,
        default_installments: 1,
      },
      metadata,
      notification_url,
    };

    const result = await preferenceClient.create({ body: preference });
    const pref = result && result.id ? result : (result || {});

    return res.status(201).json({
      id: pref.id,
      init_point: pref.init_point,
      sandbox_init_point: pref.sandbox_init_point,
      back_urls,
      notification_url,
    });
  } catch (err) {
    console.error('Error creating preference:', err?.message, err);
    return res.status(500).json({ error: 'failed_to_create_preference' });
  }
});

// Simple success/failure pages (can be replaced by your frontend routes)
app.get('/success', (req, res) => {
  res.send('<h1>Pagamento aprovado ✅</h1><p>Obrigado pela compra! Você receberá o acesso por e-mail.</p>');
});
app.get('/failure', (req, res) => {
  res.send('<h1>Pagamento falhou ❌</h1><p>Tente novamente ou use outra forma de pagamento.</p>');
});
app.get('/pending', (req, res) => {
  res.send('<h1>Pagamento pendente ⏳</h1><p>Assim que for aprovado, enviaremos seu acesso.</p>');
});

// Webhook (IPN). Mercado Pago envia eventos nesta rota.
// Configure a URL pública em MP_WEBHOOK_URL ou usaremos /webhooks/mercadopago.
// OBS: valide assinaturas/segurança conforme sua necessidade.
app.post('/webhooks/mercadopago', async (req, res) => {
  try {
    const event = req.body;
    // Opcional: validar header x-signature-id/x-signature, se configurado
    console.log('[MP WEBHOOK]', JSON.stringify(event));

    // TODO: consultar pagamento/preference status via SDK se necessário e atualizar seu sistema.
    // Exemplo: event.type === 'payment' && event.data.id
    //          depois client.payment.get({ id: event.data.id })

    res.status(200).json({ received: true });
  } catch (e) {
    console.error('Webhook error', e);
    res.status(500).json({ error: 'webhook_error' });
  }
});

app.listen(PORT, () => {
  console.log(`MP backend running on port ${PORT}`);
});
