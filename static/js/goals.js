// ── Metas ─────────────────────────────────────────────────────────────────

const Goals = (() => {
  let items = [];

  async function load() {
    try {
      items = await api('GET', '/goals/');
      render();
    } catch (e) {
      App.toast('Erro ao carregar metas', 'error');
    }
  }

  function render() {
    const list = document.getElementById('goalsList');
    if (!list) return;

    if (!items.length) {
      list.innerHTML = '<div class="empty-state">Nenhuma meta cadastrada.</div>';
      return;
    }

    list.innerHTML = items.map(item => {
      const progress = Math.min((item.current_savings / item.target_amount) * 100, 100);
      const remaining = item.target_amount - item.current_savings;
      const months = item.monthly_savings > 0 ? Math.ceil(remaining / item.monthly_savings) : null;

      let etaText = '';
      if (progress >= 100) {
        etaText = '<span style="color:var(--accent-green)">&#10003; Meta atingida!</span>';
      } else if (months !== null) {
        const targetDate = new Date();
        targetDate.setMonth(targetDate.getMonth() + months);
        etaText = `Previsão: ${targetDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} (${months} meses)`;
      } else {
        etaText = 'Defina um aporte mensal';
      }

      return `
        <div class="item-card goal-card">
          <div class="item-card-header">
            <div class="item-card-label">${item.label}</div>
            <div class="item-card-actions">
              <button class="btn-icon" title="Editar" onclick="Goals.openForm(${item.id})">&#9998;</button>
              <button class="btn-icon" title="Excluir" onclick="Goals.remove(${item.id})">&#128465;</button>
            </div>
          </div>
          <div class="item-card-amount text-purple">${fmt(item.target_amount)}</div>
          <div class="progress-bar"><div class="progress-fill" style="width:${progress}%"></div></div>
          <div class="item-card-meta">${fmt(item.current_savings)} de ${fmt(item.target_amount)} (${progress.toFixed(1)}%)</div>
          <div class="goal-eta">${etaText}</div>
          <div class="item-card-meta mt-1">Aporte mensal: ${fmt(item.monthly_savings)}</div>
        </div>
      `;
    }).join('');
  }

  async function calculate() {
    const target  = parseFloat(document.getElementById('calcTarget').value);
    const current = parseFloat(document.getElementById('calcCurrent').value) || 0;
    const monthly = parseFloat(document.getElementById('calcMonthly').value);

    if (isNaN(target) || target <= 0 || isNaN(monthly) || monthly <= 0) {
      App.toast('Preencha o valor do objetivo e o aporte mensal', 'error'); return;
    }

    try {
      const result = await api('GET', `/goals/calculate?target_amount=${target}&current_savings=${current}&monthly_savings=${monthly}`);

      const resultEl = document.getElementById('calcResult');
      resultEl.style.display = 'block';

      if (result.months === 0) {
        resultEl.innerHTML = '<span style="color:var(--accent-green)">&#10003; Você já tem o valor necessário!</span>';
        return;
      }

      resultEl.innerHTML = `
        Guardando <strong>${fmt(monthly)}/mês</strong>, você atingirá
        <strong>${fmt(target)}</strong> em
        <strong>${result.months} meses</strong>
        <br>Previsão: <strong>${result.target_date_label}</strong>
        <br>Progresso atual: <strong>${result.progress}%</strong>
      `;

      // Chart
      const canvas = document.getElementById('chartGoalCalc');
      canvas.style.display = 'block';
      Charts.goalTimeline('chartGoalCalc', result.chart_data, target);
    } catch (e) {
      App.toast(e.message, 'error');
    }
  }

  function openForm(id = null) {
    const item = id ? items.find(i => i.id === id) : null;
    App.openModal(item ? 'Editar Meta' : 'Nova Meta', `
      <div class="form-group">
        <label>Nome do Objetivo</label>
        <input class="input" id="goalLabel" value="${item?.label ?? ''}" placeholder="Ex: Carro, Viagem, Notebook..." />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Valor Alvo (R$)</label>
          <input class="input" id="goalTarget" type="number" min="0" step="0.01" value="${item?.target_amount ?? ''}" placeholder="0,00" />
        </div>
        <div class="form-group">
          <label>Já Tenho Guardado (R$)</label>
          <input class="input" id="goalCurrent" type="number" min="0" step="0.01" value="${item?.current_savings ?? '0'}" placeholder="0,00" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Aporte Mensal (R$)</label>
          <input class="input" id="goalMonthly" type="number" min="0" step="0.01" value="${item?.monthly_savings ?? ''}" placeholder="0,00" />
        </div>
        <div class="form-group">
          <label>Prioridade</label>
          <select class="input" id="goalPriority">
            <option value="1" ${item?.priority === 1 ? 'selected' : ''}>Alta</option>
            <option value="2" ${item?.priority === 2 ? 'selected' : ''}>Média</option>
            <option value="3" ${item?.priority === 3 ? 'selected' : ''}>Baixa</option>
          </select>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Goals.save(${id ?? 'null'})">Salvar</button>
      </div>
    `);
  }

  async function save(id) {
    const label          = document.getElementById('goalLabel').value.trim();
    const target_amount  = parseFloat(document.getElementById('goalTarget').value);
    const current_savings = parseFloat(document.getElementById('goalCurrent').value) || 0;
    const monthly_savings = parseFloat(document.getElementById('goalMonthly').value);
    const priority       = parseInt(document.getElementById('goalPriority').value);

    if (!label || isNaN(target_amount) || target_amount <= 0 || isNaN(monthly_savings) || monthly_savings <= 0) {
      App.toast('Preencha todos os campos corretamente', 'error'); return;
    }
    try {
      if (id) {
        await api('PUT', `/goals/${id}`, { label, target_amount, current_savings, monthly_savings, priority });
        App.toast('Meta atualizada!', 'success');
      } else {
        await api('POST', '/goals/', { label, target_amount, current_savings, monthly_savings, priority });
        App.toast('Meta criada!', 'success');
      }
      App.closeModal();
      await load();
    } catch (e) { App.toast(e.message, 'error'); }
  }

  async function remove(id) {
    if (!confirm('Excluir esta meta?')) return;
    try {
      await api('DELETE', `/goals/${id}`);
      App.toast('Meta excluída', 'success');
      await load();
    } catch (e) { App.toast(e.message, 'error'); }
  }

  return { load, render, calculate, openForm, save, remove };
})();
