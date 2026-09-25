require('dotenv').config();

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const paymentId = req.query.id || req.url.split('/').pop();
    const token = (process.env.MP_ACCESS_TOKEN || '').trim();

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      return res.status(mpResponse.status).json({
        success: false,
        error: data.message || 'Erro ao consultar status.'
      });
    }

    return res.status(200).json({
      success: true,
      payment_id: data.id,
      status: data.status,
      approved: data.status === 'approved'
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
