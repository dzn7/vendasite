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

    const amountBase = Number(body.transaction_amount) || 297;
    const method = (body.payment_method_id || '').toLowerCase();

    // Pix: cria pagamento e retorna QR
    if (method === 'pix') {
      const pixData = {
        transaction_amount: amountBase,
        payment_method_id: 'pix',
        description: body.description || 'Guia Premium de Investimentos',
        payer: { email: body?.payer?.email }
      };
      const result = await paymentClient.create({ body: pixData });
      const td = result?.point_of_interaction?.transaction_data || {};
      return res.status(200).json({
        id: result.id,
        status: result.status,
        status_detail: result.status_detail,
        qr_code: td.qr_code || null,
        qr_code_base64: td.qr_code_base64 || null,
        ticket_url: td.ticket_url || null
      });
    }

    // Boleto: gera boleto e retorna linha digitável e URL
    if (method === 'boleto' || method === 'bolbradesco') {
      // Guard: CPF is required for boleto in BR
      const identification = body?.payer?.identification;
      if (!identification || !identification.number) {
        return res.status(400).json({ error: 'missing_cpf', message: 'CPF é obrigatório para boleto.' });
      }
      const boletoData = {
        transaction_amount: amountBase,
        payment_method_id: 'bolbradesco',
        description: body.description || 'Guia Premium de Investimentos',
        payer: {
          email: body?.payer?.email,
          first_name: body?.payer?.first_name,
          last_name: body?.payer?.last_name,
          identification
        }
      };
      const result = await paymentClient.create({ body: boletoData });
      const td = result?.point_of_interaction?.transaction_data || {};
      return res.status(200).json({
        id: result.id,
        status: result.status,
        status_detail: result.status_detail,
        barcode: td.barcode || null,
        ticket_url: td.ticket_url || null
      });
    }

    // Cartão: aplica juros 0,2% a.m. acima de 12 parcelas
    const installments = Math.max(1, Math.min(24, Number(body.installments) || 1));
    const monthlyRate = 0.002; // 0,2% ao mês
    const adjustedAmount = installments > 12
      ? Number((amountBase * Math.pow(1 + monthlyRate, installments)).toFixed(2))
      : amountBase;

    const paymentData = {
      transaction_amount: adjustedAmount,
      token: body.token,
      description: body.description || 'Guia Premium de Investimentos',
      installments,
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
    // Improve visibility into MP SDK errors
    const status = e?.status || 500;
    const payload = {
      error: 'payment_failed',
      message: e?.message || 'unknown_error',
      cause: e?.cause || e?.error || null
    };
    console.error('Payment error', payload, e);
    return res.status(status).json(payload);
  }
};
