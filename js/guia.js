// guia.js - lógica do guia (modal de estudo, quiz/flashcards, tooltips seguros)
(function(){
  'use strict';

  // ========= Util =========
  function qs(sel, root){ return (root||document).querySelector(sel); }
  function qsa(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }

  // ========= Tippy seguro =========
  function inicializarTooltipsSeguro(){
    try {
      const hasTippy = !!window.tippy;
      const hasPopper = !!(window.Popper || window.createPopper);
      if (hasTippy && hasPopper) {
        window.tippy('[data-tooltip]');
      }
    } catch (e) { /* silencioso */ }
  }

  // ========= Study Modal =========
  const STORAGE_KEY = 'studyProgress';
  function loadProgress(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}'); } catch { return {}; } }
  function saveProgress(data){ try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {} }

  const topicContent = {
    'introducao-investimentos': {
      title: 'Introdução aos Investimentos',
      summary: 'Fundamentos, objetivos e mentalidade para começar a investir com segurança.',
      bullets: ['Defina metas (prazo, valor, risco).','Crie reserva de emergência.','Entenda o tripé: risco, retorno e liquidez.','Diversifique desde o início.'],
      actions: ['Ler capítulo 1.1 e 1.2','Montar checklist financeiro','Definir meta SMART de investimento']
    },
    'renda-fixa': {
      title: 'Renda Fixa',
      summary: 'Produtos, riscos e como escolher títulos conforme seus objetivos.',
      bullets: ['Tesouro Selic para reserva.','IPCA+ para objetivos longos.','Compare taxas líquidas.','Atenção a prazos e marcação a mercado.'],
      actions: ['Simular título no Tesouro Direto','Comparar CDBs com liquidez','Definir alocação base']
    }
  };

  function getTopicContent(id){
    if (topicContent[id]) return topicContent[id];
    const anchor = document.querySelector(`[data-topic-id="${id}"]`) || document.getElementById(id);
    const heading = anchor ? (anchor.closest('[id]')?.querySelector('h2,h3,h1')?.textContent?.trim() || id) : id;
    return {
      title: heading,
      summary: 'Conteúdo prático para dominar este tópico com passos acionáveis.',
      bullets: ['Entenda os conceitos-chave.','Revise exemplos reais.','Aplique com um pequeno experimento.','Anote dúvidas para revisar.'],
      actions: ['Ler a seção','Fazer um resumo em 5 linhas','Aplicar 1 ação prática hoje']
    };
  }

  function ensureStudyModal(){
    let overlay = qs('#studyOverlay');
    let modal = qs('#studyModal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'studyOverlay';
      overlay.className = 'hidden fixed inset-0 bg-black/40 z-40';
      document.body.appendChild(overlay);
    }
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'studyModal';
      modal.className = 'hidden fixed inset-0 z-50 flex items-start justify-center pt-20 px-4';
      modal.innerHTML = `
        <div class="w-full max-w-3xl rounded-lg bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100" data-s-title>Título</h3>
            <button id="studyClose" class="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"><i class="fas fa-times"></i></button>
          </div>
          <div class="p-5 space-y-4">
            <p class="text-gray-700 dark:text-gray-300" data-s-summary>Resumo do tópico.</p>
            <div class="grid md:grid-cols-2 gap-6">
              <div>
                <h4 class="font-medium text-gray-900 dark:text-gray-100 mb-2">Pontos-chave</h4>
                <ul class="text-sm text-gray-700 dark:text-gray-300 space-y-1" data-s-bullets></ul>
              </div>
              <div>
                <h4 class="font-medium text-gray-900 dark:text-gray-100 mb-2">Ações sugeridas</h4>
                <ul class="text-sm text-gray-700 dark:text-gray-300 space-y-1" data-s-actions></ul>
              </div>
            </div>
            <div class="flex flex-wrap gap-2 pt-2">
              <span class="text-xs text-gray-500">Progresso rápido:</span>
              <button id="set25" class="px-2 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">25%</button>
              <button id="set50" class="px-2 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">50%</button>
              <button id="set75" class="px-2 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">75%</button>
              <button id="set100" class="px-2 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">100%</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(modal);
    }
    // Bind
    qs('#studyClose')?.addEventListener('click', closeStudyModal, { once: true });
    overlay?.addEventListener('click', closeStudyModal, { once: true });
    ;['25','50','75','100'].forEach(p=>{
      qs('#set'+p)?.addEventListener('click', ()=>{
        const topicId = qs('#studyModal')?.getAttribute('data-topic');
        if (topicId) setProgress(topicId, parseInt(p));
      }, { once: false });
    });

    return { overlay, modal };
  }

  function updateTopicUI(id){
    const data = loadProgress();
    const entry = data[id];
    qsa(`.study-topic-btn[data-topic-id="${id}"]`).forEach(btn=>{
      const wrap = btn.parentElement;
      const bar = wrap?.querySelector('.progress-bar');
      const text = wrap?.querySelector('.progress-text');
      const last = wrap?.querySelector('.last-studied');
      const pct = entry?.percent ?? 0;
      if (bar) bar.style.width = `${pct}%`;
      if (text) text.textContent = `${pct}%`;
      if (last) { last.textContent = `Último estudo: ${entry?.date || '-'}`; last.classList.remove('hidden'); }
    });
  }

  function setProgress(topicId, percent){
    const data = loadProgress();
    const now = new Date();
    const date = now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
    data[topicId] = { percent, date };
    saveProgress(data);
    updateTopicUI(topicId);
  }

  function openStudyModal(topicId){
    const { overlay, modal } = ensureStudyModal();
    const content = getTopicContent(topicId);
    const titleEl = qs('[data-s-title]', modal);
    const summaryEl = qs('[data-s-summary]', modal);
    const bulletsEl = qs('[data-s-bullets]', modal);
    const actionsEl = qs('[data-s-actions]', modal);
    if (!titleEl || !summaryEl || !bulletsEl || !actionsEl) return;
    titleEl.textContent = content.title;
    summaryEl.textContent = content.summary;
    bulletsEl.innerHTML = content.bullets.map(i=>`<li class="list-disc ml-5">${i}</li>`).join('');
    actionsEl.innerHTML = content.actions.map(i=>`<li class="list-decimal ml-5">${i}</li>`).join('');
    modal.setAttribute('data-topic', topicId);
    overlay.classList.remove('hidden');
    modal.classList.remove('hidden');
  }

  function closeStudyModal(){
    qs('#studyOverlay')?.classList.add('hidden');
    qs('#studyModal')?.classList.add('hidden');
  }

  // Quiz no modal
  function showQuiz(topicId){
    openStudyModal(topicId || 'quiz');
    const modal = qs('#studyModal');
    if (!modal) return;
    qs('[data-s-title]', modal).textContent = 'Quiz Rápido';
    qs('[data-s-summary]', modal).textContent = 'Responda as 3 perguntas abaixo para validar seu entendimento.';
    const questions = [
      { q: 'O que é liquidez?', opts: ['Capacidade de o ativo render mais', 'Facilidade de converter em dinheiro', 'Garantia do FGC'], a: 1 },
      { q: 'Tesouro Selic é indicado para:', opts: ['Reserva de emergência', 'Objetivos de 20 anos', 'Alto risco'], a: 0 },
      { q: 'Diversificação ajuda a:', opts: ['Aumentar risco específico', 'Reduzir risco não-sistemático', 'Eliminar risco de mercado'], a: 1 }
    ];
    const bullets = qs('[data-s-bullets]', modal);
    const actions = qs('[data-s-actions]', modal);
    bullets.innerHTML = questions.map((it, idx)=>{
      const name = `q${idx}`;
      return `<div class="mb-2">
        <div class="font-medium mb-1">${idx+1}. ${it.q}</div>
        ${it.opts.map((o,i)=>`<label class="flex items-center gap-2 text-sm"><input type="radio" name="${name}" value="${i}" class="text-blue-600"> ${o}</label>`).join('')}
      </div>`;
    }).join('');
    actions.innerHTML = '<button id="quizSubmit" class="mt-2 px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700">Ver resultado</button> <span id="quizScore" class="ml-2 text-sm"></span>';
    setTimeout(()=>{
      qs('#quizSubmit')?.addEventListener('click', ()=>{
        let score = 0;
        questions.forEach((it,idx)=>{
          const sel = qs(`input[name="q${idx}"]:checked`, modal);
          if (sel && parseInt(sel.value) === it.a) score++;
        });
        const pct = Math.round((score / questions.length) * 100);
        const scoreEl = qs('#quizScore');
        if (scoreEl) scoreEl.textContent = `Acertos: ${score}/${questions.length} (${pct}%)`;
      });
    }, 0);
  }

  // Flashcards no modal
  function showFlashcards(topicId){
    openStudyModal(topicId || 'flashcards');
    const modal = qs('#studyModal');
    if (!modal) return;
    qs('[data-s-title]', modal).textContent = 'Flashcards';
    qs('[data-s-summary]', modal).textContent = 'Revise conceitos chave alternando frente/verso dos cartões.';
    const items = [
      { front: 'Liquidez', back: 'Facilidade de converter o ativo em dinheiro sem perda relevante.' },
      { front: 'Risco x Retorno', back: 'Em geral, maior risco exige maior retorno esperado.' },
      { front: 'Diversificação', back: 'Combinar ativos para reduzir risco específico sem reduzir muito o retorno.' }
    ];
    const bullets = qs('[data-s-bullets]', modal);
    bullets.innerHTML = `<div class="grid sm:grid-cols-2 gap-3">${items.map((it,idx)=>`
      <div class=\"p-3 border rounded-md bg-gray-50 dark:bg-gray-800/60 cursor-pointer\" data-card=\"${idx}\">
        <div class=\"front font-medium\">${it.front}</div>
        <div class=\"back hidden text-sm text-gray-700 dark:text-gray-300\">${it.back}</div>
      </div>`).join('')}</div>`;
    const actions = qs('[data-s-actions]', modal);
    actions.innerHTML = '<span class="text-xs text-gray-500">Clique em um cartão para virar</span>';
    qsa('[data-card]', bullets).forEach(card=>{
      card.addEventListener('click', ()=>{
        const front = qs('.front', card);
        const back = qs('.back', card);
        front.classList.toggle('hidden');
        back.classList.toggle('hidden');
      });
    });
  }

  function transformEmBreve(){
    qsa('span').forEach(sp=>{
      if (/^\s*Em Breve\s*$/i.test(sp.textContent||'')){
        const section = sp.closest('[id]');
        const inferred = section?.id || (section?.querySelector('h2,h3,h1')?.textContent?.trim().toLowerCase().replace(/[^a-z0-9à-ú]+/gi,'-')) || 'topico';
        const btn = document.createElement('button');
        btn.className = 'study-topic-btn inline-flex items-center px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-md';
        btn.setAttribute('data-topic-id', inferred);
        btn.innerHTML = '<i class="fas fa-graduation-cap mr-2"></i>Estudar Tópico';
        btn.addEventListener('click', ()=> openStudyModal(inferred));
        sp.replaceWith(btn);
        updateTopicUI(inferred);
      }
    });
  }

  function bindStudyButtons(){
    qsa('.study-topic-btn').forEach(btn=>{
      const id = btn.getAttribute('data-topic-id') || btn.getAttribute('onclick')?.match(/'(.*?)'/)?.[1];
      if (!id) return;
      btn.setAttribute('data-topic-id', id);
      btn.addEventListener('click', (e)=>{ e.preventDefault(); openStudyModal(id); });
      updateTopicUI(id);
    });
  }

  // Expor globais desejados
  window.openStudyModal = openStudyModal;
  window.showQuiz = showQuiz;
  window.showFlashcards = showFlashcards;

  document.addEventListener('DOMContentLoaded', function(){
    inicializarTooltipsSeguro();
    ensureStudyModal(); // garante estrutura para evitar null
    bindStudyButtons();
    transformEmBreve();

    // ====== Inject "PDF do Capítulo" buttons ======
    try {
      const chapterPdfMap = {
        cap1: 'pdf/introducao_investimentos.pdf',
        cap2: 'pdf/investimentos_renda_fixa.pdf',
        cap3: 'pdf/investimentos_renda_variavel.pdf',
        cap4: 'pdf/fundos_investimento.pdf',
        // cap5: (sem PDF no momento)
        cap6: 'pdf/etfs.pdf',
        cap7: 'pdf/planejamento_financeiro_completo.pdf',
        cap8: 'pdf/investimentos_exterior.pdf'
      };

      function createPdfBtn(href){
        const a = document.createElement('a');
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener';
        a.className = 'inline-flex items-center mt-2 px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 shadow-sm hover:shadow transition transform hover:scale-[1.02]';
        a.innerHTML = '<i class="fas fa-file-pdf mr-2"></i>PDF do Capítulo';
        return a;
      }

      function createSoonBtn(){
        const span = document.createElement('span');
        span.className = 'inline-flex items-center mt-2 px-4 py-2 rounded-lg bg-gray-200 text-gray-600 cursor-not-allowed';
        span.innerHTML = '<i class="fas fa-file-pdf mr-2"></i>PDF em breve';
        return span;
      }

      Object.keys(chapterPdfMap).forEach(id=>{
        const container = document.getElementById(id);
        if (!container) return;
        const headerFlex = container.querySelector('.mb-8 > .flex');
        const rightCol = headerFlex?.children?.[1];
        if (!rightCol) return;
        const href = chapterPdfMap[id];
        const btn = createPdfBtn(href);
        rightCol.appendChild(btn);
      });

      // Capítulo 5: sem PDF disponível lista. Exibe marcador "em breve" se existir header.
      const cap5 = document.getElementById('cap5');
      if (cap5){
        const headerFlex = cap5.querySelector('.mb-8 > .flex');
        const rightCol = headerFlex?.children?.[1];
        if (rightCol) rightCol.appendChild(createSoonBtn());
      }
    } catch(e){ /* noop */ }

    // ====== Enrich chapter intros with callouts ======
    try {
      function insertCallout(chapterId, items){
        const container = document.getElementById(chapterId);
        if (!container) return;
        const headerFlex = container.querySelector('.mb-8 > .flex');
        const leftCol = headerFlex?.children?.[0];
        if (!leftCol) return;
        const box = document.createElement('div');
        box.className = 'mt-4 grid sm:grid-cols-3 gap-3 text-sm';
        box.innerHTML = items.map(it=>`
          <div class="rounded-lg p-3 ${it.bg} ${it.border}">
            <div class="font-semibold mb-1 flex items-center gap-2">${it.icon} ${it.title}</div>
            <p class="text-gray-700 dark:text-gray-300">${it.text}</p>
          </div>
        `).join('');
        leftCol.appendChild(box);
      }

      insertCallout('cap1', [
        { title:'Quando usar', text:'Definir metas, montar reserva e escolher produtos simples.', bg:'bg-blue-50 dark:bg-slate-800/60', border:'border border-blue-100 dark:border-slate-700', icon:'<i class="fas fa-check-circle text-blue-600"></i>' },
        { title:'Evite', text:'Começar por ativos complexos sem entender riscos e liquidez.', bg:'bg-amber-50 dark:bg-yellow-900/20', border:'border border-amber-100 dark:border-yellow-800/40', icon:'<i class="fas fa-exclamation-triangle text-amber-600"></i>' },
        { title:'Dica prática', text:'Automatize aportes todo mês e acompanhe seu progresso.', bg:'bg-emerald-50 dark:bg-emerald-900/20', border:'border border-emerald-100 dark:border-emerald-800/40', icon:'<i class="fas fa-lightbulb text-emerald-600"></i>' }
      ]);

      insertCallout('cap2', [
        { title:'Quando usar', text:'Reserva de emergência e objetivos de curto/médio prazo.', bg:'bg-blue-50 dark:bg-slate-800/60', border:'border border-blue-100 dark:border-slate-700', icon:'<i class="fas fa-check-circle text-blue-600"></i>' },
        { title:'Evite', text:'Comparar taxas sem considerar impostos e liquidez.', bg:'bg-amber-50 dark:bg-yellow-900/20', border:'border border-amber-100 dark:border-yellow-800/40', icon:'<i class="fas fa-exclamation-triangle text-amber-600"></i>' },
        { title:'Dica prática', text:'Prefira Tesouro Selic para caixa e títulos IPCA+ para metas longas.', bg:'bg-emerald-50 dark:bg-emerald-900/20', border:'border border-emerald-100 dark:border-emerald-800/40', icon:'<i class="fas fa-lightbulb text-emerald-600"></i>' }
      ]);
    } catch(e){ /* noop */ }

    // ====== Reveal on scroll (fadeIn) com fallback ======
    try {
      const supportsIO = 'IntersectionObserver' in window;
      const els = Array.from(document.querySelectorAll('[data-reveal], .sumario-card, .bg-white.rounded-lg'));
      if (!supportsIO) {
        // Sem IO, apenas garante visibilidade
        els.forEach(el=>{ el.style.opacity = 1; el.style.transform = 'none'; });
      } else {
        const io = new IntersectionObserver((entries)=>{
          entries.forEach(ent=>{
            if (ent.isIntersecting){
              const el = ent.target;
              el.classList.add('animate-fadeIn');
              el.style.opacity = 1;
              el.style.transform = 'none';
              io.unobserve(el);
            }
          });
        }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

        els.forEach(el=>{
          el.style.opacity = 0;
          el.style.transform = 'translateY(8px)';
          el.style.transition = 'opacity .5s ease, transform .5s ease';
          io.observe(el);
        });

        // Fallback extra: após 1500ms garante tudo visível (evita tela preta)
        setTimeout(()=>{
          els.forEach(el=>{ el.style.opacity = 1; el.style.transform = 'none'; });
        }, 1500);
      }
    } catch(e){ /* noop */ }

    // Sumário toggle (revert: no FAB, no mobile auto-collapse)
    try {
      const sumario = document.getElementById('sumario');
      const toggle = document.getElementById('sumarioToggle');
      const KEY = 'sumarioCollapsed';
      if (sumario && toggle) {
        // Initial state: default expanded; apply saved state only
        const saved = localStorage.getItem(KEY);
        const preferCollapsed = saved === '1';
        if (preferCollapsed) sumario.classList.add('sumario-collapsed');
        updateToggleBtn(sumario.classList.contains('sumario-collapsed'));

        toggle.addEventListener('click', function(){
          sumario.classList.toggle('sumario-collapsed');
          const isCollapsed = sumario.classList.contains('sumario-collapsed');
          localStorage.setItem(KEY, isCollapsed ? '1' : '0');
          updateToggleBtn(isCollapsed);
        });

        function updateToggleBtn(isCollapsed){
          const icon = toggle.querySelector('i');
          const label = toggle.querySelector('span');
          if (icon){ icon.className = isCollapsed ? 'fas fa-eye' : 'fas fa-eye-slash'; }
          if (label){ label.textContent = isCollapsed ? 'Mostrar' : 'Ocultar'; }
        }
      }
    } catch (e) { /* noop */ }
  });
})();
