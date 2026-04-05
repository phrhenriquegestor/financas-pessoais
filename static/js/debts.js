// ── Dívidas Fixas ─────────────────────────────────────────────────────────

const Debts = (() => {
  let items = [];

  async function load() {
    try {
      items = await api('GET', '/debts/');
      render();
    } catch (e) {
      App.toast('Erro ao carregar dívidas', 'error');
    }
  }

  function render() {
    const total = items.filter(i => i.active).reduce((s, i) => s + i.amount, 0);
    const totalEl = document.getElementById('debtsTotalLabel');
    if (totalEl) totalEl.textContent = fmt(total);

    const list = document.getElementById('debtsList');
    if (!list) return;

    if (!items.length) {
      list.innerHTML = '<div class="empty-state">Nenhuma dívida fixa cadastrada.</div>';
      return;
    }

    const today = new Date().getDate();
    list.innerHTML = items.map(item => {
      let daysText = '';
      const diff = item.due_day - today;
      if (diff === 0) daysText = '<span style="color:var(--accent-red)">Vence hoje!</span>';
      else if (diff > 0) daysText = `Vence em ${diff} dia${diff > 1 ? 's' : ''}`;
      else daysText = `<span style="color:var(--accent-red)">Venceu há ${Math.abs(diff)} dia${Math.abs(diff)>1?'s':''}</span>`;

      return `
        <div class="item-card ${item.active ? '' : 'inactive'}">
          <div class="item-card-header">
            <div>
              <div class="item-card-label">${item.label}</div>
              <span class="badge badge-${item.category}">${CAT_LABELS[item.category] ?? item.category}</span>
            </div>
            <div class="item-card-actions">
              <button class="btn-icon" title="Ativar/Desativar" onclick="Debts.toggleActive(${item.id}, ${item.active})">${item.active ? '&#128274;' : '&#128275;'}</button>
              <button class="btn-icon" title="Editar" onclick="Debts.openForm(${item.id})">&#9998;</button>
              <button class="btn-icon" title="Excluir" onclick="Debts.remove(${item.id})">&#128465;</button>
            </div>
          </div>
          <div class="item-card-amount text-red">${fmt(item.amount)}</div>
          <div class="item-card-meta due-day">Dia ${item.due_day} &bull; ${daysText}</div>
        </div>
      `;
    }).join('');
  }

  function openForm(id = null) {
    const item = id ? items.find(i => i.id === id) : null;
    App.openModal(item ? 'Editar Dívida' : 'Nova Dívida Fixa', `
      <div class="form-group">
        <label>Descrição</label>
        <input class="input" id="dbtLabel" value="${item?.label ?? ''}" placeholder="Ex: Aluguel" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Valor Mensal (R$)</label>
          <input class="input" id="dbtAmount" type="number" min="0" step="0.01" value="${item?.amount ?? ''}" placeholder="0,00" />
        </div>
        <div class="form-group">
          <label>Dia do Vencimento</label>
          <input class="input" id="dbtDueDay" type="number" min="1" max="31" value="${item?.due_day ?? 1}" />
        </div>
      </div>
      <div class="form-group">
        <label>Categoria</label>
        <select class="input" id="dbtCategory">
          ${['housing','utilities','insurance','subscription','loan','other'].map(c =>
            `<option value="${c}" ${item?.category === c ? 'selected' : ''}>${CAT_LABELS[c]}</option>`
          ).join('')}
        </select>
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Debts.save(${id ?? 'null'})">Salvar</button>
      </div>
    `);
  }

  async function save(id) {
    const label    = document.getElementById('dbtLabel').value.trim();
    const amount   = parseFloat(document.getElementById('dbtAmount').value);
    const due_day  = parseInt(document.getElementById('dbtDueDay').value);
    const category = document.getElementById('dbtCategory').value;

    if (!label || isNaN(amount) || amount <= 0) {
      App.toast('Preencha todos os campos corretamente', 'error'); return;
    }
    try {
      if (id) {
        await api('PUT', `/debts/${id}`, { label, amount, due_day, category });
        App.toast('Dívida atualizada!', 'success');
      } else {
        await api('POST', '/debts/', { label, amount, due_day, category });
        App.toast('Dívida adicionada!', 'success');
      }
      App.closeModal();
      await load();
      Dashboard.load();
    } catch (e) { App.toast(e.message, 'error'); }
  }

  async function toggleActive(id, current) {
    try {
      await api('PUT', `/debts/${id}`, { active: !current });
      await load();
      Dashboard.load();
    } catch (e) { App.toast(e.message, 'error'); }
  }

  async function remove(id) {
    if (!confirm('Excluir esta dívida?')) return;
    try {
      await api('DELETE', `/debts/${id}`);
      App.toast('Dívida excluída', 'success');
      await load();
      Dashboard.load();
    } catch (e) { App.toast(e.message, 'error'); }
  }

  return { load, openForm, save, toggleActive, remove };
})();
