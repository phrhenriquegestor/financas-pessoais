// ── Receitas ─────────────────────────────────────────────────────────────

const Income = (() => {
  let items = [];

  async function load() {
    try {
      items = await api('GET', '/income/');
      render();
    } catch (e) {
      App.toast('Erro ao carregar receitas', 'error');
    }
  }

  function toMonthly(amount, freq) {
    const m = { weekly: 52/12, biweekly: 26/12, monthly: 1, annual: 1/12, once: 0 };
    return amount * (m[freq] ?? 1);
  }

  function render() {
    const total = items.filter(i => i.active).reduce((s, i) => s + toMonthly(i.amount, i.frequency), 0);
    const totalEl = document.getElementById('incomeTotalLabel');
    if (totalEl) totalEl.textContent = fmt(total);

    const list = document.getElementById('incomeList');
    if (!list) return;

    if (!items.length) {
      list.innerHTML = '<div class="empty-state">Nenhuma receita cadastrada.</div>';
      return;
    }

    list.innerHTML = items.map(item => `
      <div class="table-row ${item.active ? '' : 'inactive'}">
        <div class="table-row-main">
          <div class="table-row-label">${item.label}</div>
          <div class="table-row-sub">
            ${FREQ_LABELS[item.frequency] ?? item.frequency}
            ${item.active ? '' : ' · Inativo'}
            · Mensal: ${fmt(toMonthly(item.amount, item.frequency))}
          </div>
        </div>
        <div class="table-row-amount text-green">${fmt(item.amount)}</div>
        <div class="table-row-actions">
          <button class="btn-icon" title="Ativar/Desativar" onclick="Income.toggleActive(${item.id}, ${item.active})">
            ${item.active ? '&#128274;' : '&#128275;'}
          </button>
          <button class="btn-icon" title="Editar" onclick="Income.openForm(${item.id})">&#9998;</button>
          <button class="btn-icon" title="Excluir" onclick="Income.remove(${item.id})">&#128465;</button>
        </div>
      </div>
    `).join('');
  }

  function openForm(id = null) {
    const item = id ? items.find(i => i.id === id) : null;
    App.openModal(item ? 'Editar Receita' : 'Nova Receita', `
      <div class="form-group">
        <label>Descrição</label>
        <input class="input" id="incLabel" value="${item?.label ?? ''}" placeholder="Ex: Salário" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Valor (R$)</label>
          <input class="input" id="incAmount" type="number" min="0" step="0.01" value="${item?.amount ?? ''}" placeholder="0,00" />
        </div>
        <div class="form-group">
          <label>Frequência</label>
          <select class="input" id="incFreq">
            ${['weekly','biweekly','monthly','annual','once'].map(f =>
              `<option value="${f}" ${item?.frequency === f ? 'selected' : ''}>${FREQ_LABELS[f]}</option>`
            ).join('')}
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Data de início (opcional)</label>
        <input class="input" id="incDate" type="date" value="${item?.start_date ?? ''}" />
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Income.save(${id ?? 'null'})">Salvar</button>
      </div>
    `);
  }

  async function save(id) {
    const label     = document.getElementById('incLabel').value.trim();
    const amount    = parseFloat(document.getElementById('incAmount').value);
    const frequency = document.getElementById('incFreq').value;
    const start_date = document.getElementById('incDate').value || null;

    if (!label || isNaN(amount) || amount <= 0) {
      App.toast('Preencha todos os campos corretamente', 'error'); return;
    }
    try {
      if (id) {
        await api('PUT', `/income/${id}`, { label, amount, frequency, start_date });
        App.toast('Receita atualizada!', 'success');
      } else {
        await api('POST', '/income/', { label, amount, frequency, start_date });
        App.toast('Receita adicionada!', 'success');
      }
      App.closeModal();
      await load();
      Dashboard.load();
    } catch (e) {
      App.toast(e.message, 'error');
    }
  }

  async function toggleActive(id, current) {
    try {
      await api('PUT', `/income/${id}`, { active: !current });
      await load();
      Dashboard.load();
    } catch (e) { App.toast(e.message, 'error'); }
  }

  async function remove(id) {
    if (!confirm('Excluir esta receita?')) return;
    try {
      await api('DELETE', `/income/${id}`);
      App.toast('Receita excluída', 'success');
      await load();
      Dashboard.load();
    } catch (e) { App.toast(e.message, 'error'); }
  }

  return { load, openForm, save, toggleActive, remove };
})();
