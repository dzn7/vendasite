// Vercel Serverless Function: Create Mercado Pago Preference
const { MercadoPagoConfig, Preference } = require('mercadopago');

function corsOrigin(origin) {
  const list = (process.env.ALLOWED_ORIGINS || '*')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (!origin || list.includes('*') || list.includes(origin)) return origin || '*';
  return ''; // will be rejected
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allow = corsOrigin(origin);
  if (!allow) {
    res.statusCode = 403;
    return res.end('CORS not allowed');
  }
  res.setHeader('Access-Control-Allow-Origin', allow);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end('Method not allowed');
  }

  try {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      res.statusCode = 500;
      return res.end('Missing MP_ACCESS_TOKEN');
    }

    // Parse body (Vercel provides parsed body for JSON by default; fallback if needed)
    const body = typeof req.body === 'object' && req.body ? req.body : JSON.parse(req.body || '{}');

    const {
      title = 'Guia Premium de Investimentos',
      description = 'Acesso vitalício + atualizações',
      quantity = 1,
      currency_id = 'BRL',
      unit_price = 297.0,
      payer = {},
      metadata = {},
    } = body;

    const base = process.env.APP_BASE_URL || (req.headers['x-forwarded-proto'] ? `${req.headers['x-forwarded-proto']}://${req.headers['x-forwarded-host']}` : '');
    const back_urls = {
      success: `${base}/success.html`,
      failure: `${base}/failure.html`,
      pending: `${base}/pending.html`,
    };

    const notification_url = process.env.MP_WEBHOOK_URL || (base ? `${base}/api/mercadopago` : undefined);

    const mpClient = new MercadoPagoConfig({ accessToken });
    const preferenceClient = new Preference(mpClient);

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

    res.statusCode = 201;
    return res.json({
      id: pref.id,
      init_point: pref.init_point,
      sandbox_init_point: pref.sandbox_init_point,
      back_urls,
      notification_url,
    });
  } catch (err) {
    console.error('Error creating preference:', err?.message, err);
    res.statusCode = 500;
    return res.json({ error: 'failed_to_create_preference' });
  }
}
