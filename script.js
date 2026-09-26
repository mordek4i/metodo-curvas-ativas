/* ==================================================
   MÉTODO CURVAS ATIVAS — SCRIPT DE INTERATIVIDADE E NAVEGAÇÃO
   ================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ==================================================
     1. CONFIGURAÇÃO DA LANDING PAGE
     ================================================== */
  const DEFAULT_CONFIG = {
    checkoutUrl: "https://pay.cakto.com.br/35m5r2x_1122466",
    dataLimiteTexto: "Oferta válida durante este lote especial de lançamento."
  };

  const configEl = document.getElementById('landing-config');
  let checkoutUrl = DEFAULT_CONFIG.checkoutUrl;
  let dataLimite = DEFAULT_CONFIG.dataLimiteTexto;

  if (configEl) {
    const attrCheckout = configEl.getAttribute('data-checkout-url');
    const attrData = configEl.getAttribute('data-oferta-data-limite');
    
    if (attrCheckout && attrCheckout.trim() !== "") {
      checkoutUrl = attrCheckout;
    }
    if (attrData && attrData.trim() !== "") {
      dataLimite = attrData;
    }
  }

  const dataExibicaoEl = document.getElementById('oferta-data-exibicao');
  if (dataExibicaoEl && dataLimite) {
    dataExibicaoEl.textContent = dataLimite;
  }

  /* ==================================================
     2. GESTÃO DE NAVEGAÇÃO DOS BOTÕES E CHECKOUT CAKTO
     - Botões secundários: Rolam suavemente até o card de oferta (#oferta)
     - Botão da oferta (.direct-checkout-btn): Abre o checkout oficial da Cakto e dispara o Meta Pixel
     ================================================== */
  const scrollTriggers = document.querySelectorAll('.checkout-trigger, .scroll-to-offer');
  const ofertaSection = document.getElementById('oferta');

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

  // Botão principal da oferta abre o checkout da Cakto e dispara o Meta Pixel
  const directCheckoutBtns = document.querySelectorAll('.direct-checkout-btn');
  directCheckoutBtns.forEach(btn => {
    btn.setAttribute('href', checkoutUrl);

    btn.addEventListener('click', () => {
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'InitiateCheckout', {
          content_name: 'Método Curvas Ativas',
          value: 9.90,
          currency: 'BRL'
        });
      }
    });
  });

  /* ==================================================
     3. INTERATIVIDADE DOS ACCORDEONS (OBJEÇÕES E FAQ)
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
     4. ATUALIZAR ANO CORRENTE NO RODAPÉ
     ================================================== */
  const yearEl = document.getElementById('currentYear');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  /* ==================================================
     5. CONTADOR DINÂMICO DE VISITANTES AO VIVO
     ================================================== */
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
     6. POPUP DE COMPRAS AO VIVO (PROVA SOCIAL)
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
