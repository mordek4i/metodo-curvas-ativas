const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos (HTML, CSS, JS, Imagens)
app.use(express.static(path.join(__dirname)));

/**
 * ROTA 1: CRIAR PAGAMENTO PIX VIA MERCADO PAGO
 * POST /api/pix/create
 */
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

app.post('/api/pix/create', async (req, res) => {
  try {
    const { name, email, phone, cpf } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'E-mail é obrigatório para gerar o PIX.'
      });
    }

    const token = (process.env.MP_ACCESS_TOKEN || '').trim();

    if (!token || token.includes('seu-access-token-aqui')) {
      return res.status(401).json({
        success: false,
        error: 'Access Token do Mercado Pago não configurado. Por favor, cole o Access Token correto no arquivo .env.'
      });
    }

    // Tratar nome e CPF (Gera CPF matematicamente válido automaticamente)
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
      console.error('❌ Erro Mercado Pago API:', data);
      
      let errorMsg = data.message || (data.cause && data.cause[0] ? data.cause[0].description : 'Erro ao comunicar com o Mercado Pago.');
      
      if (data.message === 'authorization value not present' || mpResponse.status === 401) {
        errorMsg = 'O Access Token inserido é inválido ou incompleto. Certifique-se de copiar o longo "Access Token" (que começa com APP_USR-...) no painel do Mercado Pago.';
      }

      return res.status(mpResponse.status).json({
        success: false,
        error: errorMsg,
        details: data
      });
    }

    // Extrair dados da transação PIX
    const transactionData = data.point_of_interaction?.transaction_data || {};

    return res.json({
      success: true,
      payment_id: data.id,
      status: data.status,
      qr_code: transactionData.qr_code || '',
      qr_code_base64: transactionData.qr_code_base64 || '',
      ticket_url: transactionData.ticket_url || ''
    });

  } catch (error) {
    console.error('❌ Erro no servidor:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno no servidor ao gerar o PIX: ' + error.message
    });
  }
});

/**
 * ROTA 2: VERIFICAR STATUS DO PAGAMENTO PIX
 * GET /api/pix/status/:id
 */
app.get('/api/pix/status/:id', async (req, res) => {
  try {
    const paymentId = req.params.id;
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
        error: data.message || 'Erro ao consultar o status do pagamento.'
      });
    }

    return res.json({
      success: true,
      payment_id: data.id,
      status: data.status, // "approved", "pending", "rejected", etc.
      status_detail: data.status_detail,
      approved: data.status === 'approved'
    });

  } catch (error) {
    console.error('❌ Erro ao verificar status:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao consultar o status do pagamento.'
    });
  }
});

// Inicialização do Servidor
app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Servidor Método Curvas Ativas rodando com sucesso!`);
  console.log(`🌐 Acesse no seu navegador: http://localhost:${PORT}`);
  console.log(`==================================================\n`);
});
