// Vercel Serverless Function: Process on-site payments (Card, Pix, etc.)
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
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(204).end();
  }

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

    const body = typeof req.body === 'object' && req.body ? req.body : JSON.parse(req.body || '{}');

    // Expected body from Bricks onSubmit
    // {
    //   token, issuer_id, payment_method_id, transaction_amount, installments,
    //   payer: { email, identification: { type, number } },
    //   description
    // }

    const mp = new MercadoPagoConfig({ accessToken });
    const paymentClient = new Payment(mp);

    const paymentData = {
      transaction_amount: Number(body.transaction_amount) || 297,
      token: body.token,
      description: body.description || 'Guia Premium de Investimentos',
      installments: Number(body.installments) || 1,
      payment_method_id: body.payment_method_id, // e.g. 'visa'
      issuer_id: body.issuer_id,
      statement_descriptor: 'GUIA PREMIUM',
      payer: {
        email: body?.payer?.email,
        identification: body?.payer?.identification
      }
    };

    const result = await paymentClient.create({ body: paymentData });

    return res.status(200).json({
      id: result.id,
      status: result.status,
      status_detail: result.status_detail,
      point_of_interaction: result.point_of_interaction || null
    });
  } catch (e) {
    console.error('Payment error', e);
    return res.status(500).json({ error: 'payment_failed' });
  }
};
