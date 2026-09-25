/* ==================================================
   MÉTODO CURVAS ATIVAS — SCRIPT DE INTERATIVIDADE E INTEGRACAO PIX MERCADO PAGO
   ================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ==================================================
     1. GESTÃO DE NAVEGAÇÃO DOS BOTÕES
     - Botões secundários: Rolam suavemente até o card de oferta (#oferta)
     - Apenas o botão oficial da oferta (.direct-checkout-btn) abre o Modal PIX
     ================================================== */
  const ofertaSection = document.getElementById('oferta');
  const scrollTriggers = document.querySelectorAll('.checkout-trigger, .scroll-to-offer, a[href="#oferta"]');

  scrollTriggers.forEach(trigger => {
    if (!trigger.classList.contains('direct-checkout-btn')) {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        if (ofertaSection) {
          ofertaSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.location.hash = '#oferta';
        }
      });
    }
  });

  /* ==================================================
     2. LÓGICA E CONTROLE DO MODAL PIX (APENAS NA OFERTA)
     ================================================== */
  const pixModal = document.getElementById('pixCheckoutModal');
  const pixModalClose = document.getElementById('pixModalClose');

  const pixStepForm = document.getElementById('pixStepForm');
  const pixStepQr = document.getElementById('pixStepQr');
  const pixStepSuccess = document.getElementById('pixStepSuccess');

  const pixForm = document.getElementById('pixCheckoutForm');
  const pixFormError = document.getElementById('pixFormError');

  const pixLoadingState = document.getElementById('pixLoadingState');
  const pixQrContent = document.getElementById('pixQrContent');
  const pixQrCodeImg = document.getElementById('pixQrCodeImg');
  const pixCopyInput = document.getElementById('pixCopyInput');
  const pixCopyBtn = document.getElementById('pixCopyBtn');
  const copyBtnText = document.getElementById('copyBtnText');
  const pixTimerEl = document.getElementById('pixTimer');
  const pixBtnBack = document.getElementById('pixBtnBack');

  const successEmail = document.getElementById('successEmail');
  const successPhone = document.getElementById('successPhone');

  let pollingInterval = null;
  let countdownTimer = null;

  // APENAS o botão principal da oferta abre o modal de PIX
  const directCheckoutBtns = document.querySelectorAll('.direct-checkout-btn');
  directCheckoutBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();

      // Disparar evento InitiateCheckout no Meta Pixel
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'InitiateCheckout', {
          content_name: 'Método Curvas Ativas',
          value: 9.90,
          currency: 'BRL'
        });
      }

      openPixModal();
    });
  });

  function openPixModal() {
    if (!pixModal) return;
    showStep('form');
    pixModal.classList.add('active');
    pixModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    const firstInput = document.getElementById('pixCustomerName');
    if (firstInput) setTimeout(() => firstInput.focus(), 150);
  }

  function closePixModal() {
    if (!pixModal) return;
    pixModal.classList.remove('active');
    pixModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (pixModalClose) {
    pixModalClose.addEventListener('click', closePixModal);
  }

  if (pixModal) {
    pixModal.addEventListener('click', (e) => {
      if (e.target === pixModal) {
        closePixModal();
      }
    });
  }

  /* ==================================================
     3. MÁSCARA E FORMATAÇÃO DO CAMPO DE CELULAR
     ================================================== */
  const phoneInput = document.getElementById('pixCustomerPhone');

  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '');
      if (v.length > 11) v = v.substring(0, 11);
      if (v.length > 6) {
        v = `(${v.substring(0, 2)}) ${v.substring(2, 7)}-${v.substring(7)}`;
      } else if (v.length > 2) {
        v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
      } else if (v.length > 0) {
        v = `(${v}`;
      }
      e.target.value = v;
    });
  }

  /* ==================================================
     HELPER: FETCH SEGURO PARA TRATAR ERROS DE JSON E HTML
     ================================================== */
  async function safeFetchJson(url, options) {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      const text = await response.text();
      if (text.includes('Cannot GET') || text.includes('Cannot POST') || text.includes('404') || text.includes('The page')) {
        throw new Error('Servidor backend não encontrado. Certifique-se de estar rodando o comando "npm start" e abrindo http://localhost:3000');
      }
      throw new Error('O servidor retornou uma resposta inesperada. Tente novamente.');
    }

    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  }

  /* ==================================================
     4. SUBMISSÃO DO FORMULÁRIO E GERAÇÃO DO PIX
     ================================================== */
  if (pixForm) {
    pixForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (pixFormError) pixFormError.style.display = 'none';

      const name = document.getElementById('pixCustomerName')?.value.trim();
      const email = document.getElementById('pixCustomerEmail')?.value.trim();
      const phone = document.getElementById('pixCustomerPhone')?.value.trim();

      if (!email || !email.includes('@')) {
        showError('Por favor, informe um e-mail válido para receber o acesso.');
        return;
      }
      if (!phone || phone.replace(/\D/g, '').length < 10) {
        showError('Por favor, informe um WhatsApp/Celular válido.');
        return;
      }

      // Alternar para estado de carregamento do QR Code
      showStep('qr');
      if (pixLoadingState) pixLoadingState.style.display = 'block';
      if (pixQrContent) pixQrContent.style.display = 'none';

      try {
        const { ok, data } = await safeFetchJson('/api/pix/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone })
        });

        if (!ok || !data.success) {
          throw new Error(data.error || 'Não foi possível gerar o PIX. Verifique os dados digitados.');
        }

        // Renderizar imagem do QR Code
        if (data.qr_code_base64) {
          pixQrCodeImg.src = `data:image/png;base64,${data.qr_code_base64}`;
        } else {
          pixQrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(data.qr_code)}`;
        }

        // Preencher campo copia e cola
        pixCopyInput.value = data.qr_code || '';

        // Exibir conteúdo do PIX
        if (pixLoadingState) pixLoadingState.style.display = 'none';
        if (pixQrContent) pixQrContent.style.display = 'block';

        // Iniciar cronômetro de 15 min
        startCountdown(15 * 60);

        // Iniciar monitoramento automático de pagamento a cada 3 segundos
        startStatusPolling(data.payment_id, email, phone);

      } catch (err) {
        console.error('Erro na criação do PIX:', err);
        showStep('form');
        showError(err.message || 'Erro de conexão ao gerar o PIX. Tente novamente.');
      }
    });
  }

  function showError(msg) {
    if (pixFormError) {
      pixFormError.textContent = msg;
      pixFormError.style.display = 'block';
    }
  }

  function showStep(stepName) {
    if (pixStepForm) pixStepForm.style.display = stepName === 'form' ? 'block' : 'none';
    if (pixStepQr) pixStepQr.style.display = stepName === 'qr' ? 'block' : 'none';
    if (pixStepSuccess) pixStepSuccess.style.display = stepName === 'success' ? 'block' : 'none';
  }

  if (pixBtnBack) {
    pixBtnBack.addEventListener('click', () => {
      stopPolling();
      stopCountdown();
      showStep('form');
    });
  }

  /* ==================================================
     5. BOTÃO DE COPIAR CÓDIGO PIX (COPIA E COLA)
     ================================================== */
  if (pixCopyBtn && pixCopyInput) {
    pixCopyBtn.addEventListener('click', () => {
      pixCopyInput.select();
      pixCopyInput.setSelectionRange(0, 99999);

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(pixCopyInput.value);
      } else {
        document.execCommand('copy');
      }

      pixCopyBtn.classList.add('copied');
      if (copyBtnText) copyBtnText.textContent = '✓ Código Copiado!';

      setTimeout(() => {
        pixCopyBtn.classList.remove('copied');
        if (copyBtnText) copyBtnText.textContent = 'Copiar Código PIX';
      }, 2500);
    });
  }

  /* ==================================================
     6. MONITORAMENTO DO STATUS DO PAGAMENTO EM TEMPO REAL
     ================================================== */
  function startStatusPolling(paymentId, email, phone) {
    stopPolling();

    pollingInterval = setInterval(async () => {
      try {
        const { ok, data } = await safeFetchJson(`/api/pix/status/${paymentId}`);

        if (ok && data.success && (data.approved || data.status === 'approved')) {
          stopPolling();
          stopCountdown();

          // Disparar evento Purchase no Meta Pixel
          if (typeof window.fbq === 'function') {
            window.fbq('track', 'Purchase', {
              content_name: 'Método Curvas Ativas',
              value: 9.90,
              currency: 'BRL'
            });
          }

          // Exibir Tela de Sucesso
          if (successEmail) successEmail.textContent = email;
          if (successPhone) successPhone.textContent = phone;
          showStep('success');
        }
      } catch (e) {
        console.warn('Aguardando confirmação do PIX...', e);
      }
    }, 3000);
  }

  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  /* ==================================================
     7. CRONÔMETRO REGRESSIVO (15 MINUTOS)
     ================================================== */
  function startCountdown(secondsTotal) {
    stopCountdown();
    let timeLeft = secondsTotal;

    const updateTimerDisplay = () => {
      const mins = Math.floor(timeLeft / 60);
      const secs = timeLeft % 60;
      if (pixTimerEl) {
        pixTimerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
    };

    updateTimerDisplay();

    countdownTimer = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        stopCountdown();
        stopPolling();
        if (pixTimerEl) pixTimerEl.textContent = 'Expirado';
      } else {
        updateTimerDisplay();
      }
    }, 1000);
  }

  function stopCountdown() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  /* ==================================================
     8. ACCORDEONS DE FAQ E OBJEÇÕES
     ================================================== */
  const accordionHeaders = document.querySelectorAll('.accordion-header');

  accordionHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      const isExpanded = header.getAttribute('aria-expanded') === 'true';

      const parentGroup = item.parentElement;
      if (parentGroup) {
        const siblingItems = parentGroup.querySelectorAll('.accordion-item');
        siblingItems.forEach(sibling => {
          if (sibling !== item) {
            sibling.classList.remove('active');
            const siblingHeader = sibling.querySelector('.accordion-header');
            if (siblingHeader) siblingHeader.setAttribute('aria-expanded', 'false');
          }
        });
      }

      if (isExpanded) {
        item.classList.remove('active');
        header.setAttribute('aria-expanded', 'false');
      } else {
        item.classList.add('active');
        header.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ==================================================
     9. ATUALIZAR ANO E VISITANTES AO VIVO
     ================================================== */
  const yearEl = document.getElementById('currentYear');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  const liveVisitorEl = document.getElementById('liveVisitorCount');
  if (liveVisitorEl) {
    let currentVisitors = 134;
    setInterval(() => {
      const change = Math.floor(Math.random() * 7) - 3;
      currentVisitors = Math.min(Math.max(currentVisitors + change, 118), 152);
      liveVisitorEl.textContent = currentVisitors;
    }, 4500);
  }

  /* ==================================================
     10. POPUP DE COMPRAS AO VIVO (PROVA SOCIAL)
     ================================================== */
  const salesToast = document.getElementById('salesToast');
  const toastName = document.getElementById('toastName');
  const toastLocation = document.getElementById('toastLocation');
  const toastTime = document.getElementById('toastTime');
  const toastClose = document.getElementById('toastClose');

  const femaleBuyers = [
    { name: "Mariana S.", location: "(São Paulo - SP)", time: "há 2 min" },
    { name: "Camila O.", location: "(Rio de Janeiro - RJ)", time: "há 4 min" },
    { name: "Beatriz M.", location: "(Belo Horizonte - MG)", time: "há 1 min" },
    { name: "Juliana C.", location: "(Curitiba - PR)", time: "há 5 min" },
    { name: "Fernanda S.", location: "(Porto Alegre - RS)", time: "há 3 min" },
    { name: "Amanda R.", location: "(Salvador - BA)", time: "agora mesmo" },
    { name: "Larissa F.", location: "(Fortaleza - CE)", time: "há 6 min" },
    { name: "Bruna A.", location: "(Brasília - DF)", time: "há 2 min" },
    { name: "Patrícia L.", location: "(Goiânia - GO)", time: "há 7 min" },
    { name: "Vanessa R.", location: "(Florianópolis - SC)", time: "há 1 min" },
    { name: "Gabriela C.", location: "(Recife - PE)", time: "há 3 min" },
    { name: "Carolina M.", location: "(Manaus - AM)", time: "agora mesmo" },
    { name: "Letícia P.", location: "(Campinas - SP)", time: "há 4 min" },
    { name: "Renata G.", location: "(Vitória - ES)", time: "há 2 min" },
    { name: "Daniela B.", location: "(Belém - PA)", time: "há 8 min" },
    { name: "Jéssica M.", location: "(Campo Grande - MS)", time: "há 5 min" },
    { name: "Aline C.", location: "(Natal - RN)", time: "há 3 min" },
    { name: "Priscila K.", location: "(João Pessoa - PB)", time: "agora mesmo" },
    { name: "Thaís N.", location: "(Cuiabá - MT)", time: "há 6 min" },
    { name: "Tatiane D.", location: "(Maceió - AL)", time: "há 2 min" },
    { name: "Luana M.", location: "(Teresina - PI)", time: "há 4 min" },
    { name: "Carla F.", location: "(São Luís - MA)", time: "há 1 min" },
    { name: "Michele A.", location: "(Aracaju - SE)", time: "há 5 min" },
    { name: "Rebeca R.", location: "(Niterói - RJ)", time: "agora mesmo" },
    { name: "Monique T.", location: "(Uberlândia - MG)", time: "há 3 min" },
    { name: "Débora C.", location: "(Londrina - PR)", time: "há 7 min" },
    { name: "Natália M.", location: "(Sorocaba - SP)", time: "há 2 min" },
    { name: "Jaqueline F.", location: "(Ribeirão Preto - SP)", time: "há 4 min" },
    { name: "Paloma B.", location: "(Caxias do Sul - RS)", time: "há 1 min" },
    { name: "Sabrina V.", location: "(Vila Velha - ES)", time: "agora mesmo" }
  ];

  if (salesToast && toastName && toastLocation && toastTime) {
    let currentIndex = 0;
    let toastTimeout = null;

    const showNextToast = () => {
      const buyer = femaleBuyers[currentIndex];
      toastName.textContent = buyer.name;
      toastLocation.textContent = buyer.location;
      toastTime.textContent = buyer.time;

      salesToast.classList.add('visible');

      toastTimeout = setTimeout(() => {
        salesToast.classList.remove('visible');
      }, 3800);

      currentIndex = (currentIndex + 1) % femaleBuyers.length;
    };

    if (toastClose) {
      toastClose.addEventListener('click', () => {
        salesToast.classList.remove('visible');
        if (toastTimeout) clearTimeout(toastTimeout);
      });
    }

    setTimeout(() => {
      showNextToast();
      setInterval(showNextToast, 5000);
    }, 1200);
  }

});
