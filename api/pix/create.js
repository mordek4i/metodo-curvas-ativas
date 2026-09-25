const crypto = require('crypto');

function generateValidCpf() {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 9));
  let d1 = n.reduce((acc, digit, idx) => acc + digit * (10 - idx), 0);
  d1 = 11 - (d1 % 11);
  if (d1 >= 10) d1 = 0;
  
  let d2 = [...n, d1].reduce((acc, digit, idx) => acc + digit * (11 - idx), 0);
  d2 = 11 - (d2 % 11);
  if (d2 >= 10) d2 = 0;
  
  return [...n, d1, d2].join('');
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { name, email, phone, cpf } = req.body || {};

    if (!email) {
      return res.status(400).json({ success: false, error: 'E-mail é obrigatório para gerar o PIX.' });
    }

    const token = (process.env.MP_ACCESS_TOKEN || '').trim();

    if (!token) {
      return res.status(401).json({ success: false, error: 'MP_ACCESS_TOKEN não configurado.' });
    }

    const cleanName = (name && name.trim() !== '') ? name.trim() : 'Cliente Curvas Ativas';
    const nameParts = cleanName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || 'Cliente';
    const cleanCpf = cpf ? cpf.replace(/\D/g, '') : '';
    const finalCpf = (cleanCpf && cleanCpf.length === 11) ? cleanCpf : generateValidCpf();

    const payload = {
      transaction_amount: 9.90,
      description: 'Método Curvas Ativas - Acesso Digital',
      payment_method_id: 'pix',
      payer: {
        email: email.trim(),
        first_name: firstName,
        last_name: lastName,
        identification: {
          type: 'CPF',
          number: finalCpf
        }
      }
    };

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Idempotency-Key': crypto.randomUUID()
      },
      body: JSON.stringify(payload)
    });

    const data = await mpResponse.json();

    if (!mpResponse.ok) {
      return res.status(mpResponse.status).json({
        success: false,
        error: data.message || 'Erro ao comunicar com o Mercado Pago.',
        details: data
      });
    }

    const transactionData = data.point_of_interaction?.transaction_data || {};

    return res.status(200).json({
      success: true,
      payment_id: data.id,
      status: data.status,
      qr_code: transactionData.qr_code || '',
      qr_code_base64: transactionData.qr_code_base64 || '',
      ticket_url: transactionData.ticket_url || ''
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
