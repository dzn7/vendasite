// Vercel Serverless Function: Query payment status by ID
const { MercadoPagoConfig, Payment } = require('mercadopago');

function corsOrigin(origin) {
  const list = (process.env.ALLOWED_ORIGINS || '*')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (!origin || list.includes('*') || list.includes(origin)) return origin || '*';
  return '';
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allow = corsOrigin(origin);
  if (allow) {
    res.setHeader('Access-Control-Allow-Origin', allow);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(204).end();
  }

  if (req.method !== 'GET') {
    res.statusCode = 405;
    return res.end('Method not allowed');
  }

  try {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      res.statusCode = 500;
      return res.end('Missing MP_ACCESS_TOKEN');
    }
    const id = req.query.id || (req.url.split('?')[1] || '').split('id=')[1];
    if (!id) return res.status(400).json({ error: 'missing_id' });

    const mp = new MercadoPagoConfig({ accessToken });
    const paymentClient = new Payment(mp);

    const result = await paymentClient.get({ id });

    return res.status(200).json({
      id: result.id,
      status: result.status,
      status_detail: result.status_detail
    });
  } catch (e) {
    const status = e?.status || 500;
    const payload = {
      error: 'status_failed',
      message: e?.message || 'unknown_error',
      cause: e?.cause || e?.error || null
    };
    console.error('Status error', payload, e);
    return res.status(status).json(payload);
  }
};
