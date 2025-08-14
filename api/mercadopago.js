// Vercel Serverless Function: Mercado Pago Webhook Receiver

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
  if (allow) {
    res.setHeader('Access-Control-Allow-Origin', allow);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(204).end();
  }

  // GET: expõe configuração pública (chave pública) para o frontend inicializar o SDK
  if (req.method === 'GET') {
    const pk = process.env.MP_PUBLIC_KEY || '';
    return res.status(200).json({ publicKey: pk });
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end('Method not allowed');
  }

  try {
    // Mercado Pago envia JSON no body
    const event = typeof req.body === 'object' && req.body ? req.body : JSON.parse(req.body || '{}');
    console.log('[MP WEBHOOK]', JSON.stringify(event));

    // TODO: consultar pagamento/preference status via API do Mercado Pago, se necessário.
    // Ex.: if (event.type === 'payment') { /* consultar pelo event.data.id */ }

    return res.status(200).json({ received: true });
  } catch (e) {
    console.error('Webhook error', e);
    return res.status(500).json({ error: 'webhook_error' });
  }
}
