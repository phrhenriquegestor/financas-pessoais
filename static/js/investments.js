// ── Investimentos ─────────────────────────────────────────────────────────

const Investments = (() => {
  let items = [];
  let selectedId = null;

  async function load() {
    try {
      items = await api('GET', '/investments/');
      render();
    } catch (e) {
      App.toast('Erro ao carregar investimentos', 'error');
    }
  }

  function render() {
    const total = items.reduce((s, i) => s + i.principal, 0);
    const totalEl = document.getElementById('invTotalLabel');
    if (totalEl) totalEl.textContent = fmt(total);

    const list = document.getElementById('investmentsList');
    if (!list) return;

    if (!items.length) {
      list.innerHTML = '<div class="empty-state">Nenhum investimento cadastrado.</div>';
      return;
    }

    list.innerHTML = items.map(item => {
      // Estimate 1-year growth
      const r = (item.annual_rate / 100) / 12;
      const months12 = 12;
      const est = r === 0
        ? item.principal + item.monthly_contribution * months12
        : item.principal * Math.pow(1 + r, months12) + item.monthly_contribution * ((Math.pow(1 + r, months12) - 1) / r);

      return `
        <div class="inv-card ${selectedId === item.id ? 'selected' : ''}" onclick="Investments.selectItem(${item.id})">
          <div class="inv-card-header">
            <div>
              <div class="inv-card-label">${item.label}</div>
              <div style="font-size:0.75rem;color:var(--text-muted)">${INV_TYPES[item.type] ?? item.type}</div>
            </div>
            <div>
              <div class="inv-card-rate">${item.annual_rate}% a.a.</div>
              <div style="display:flex;gap:0.3rem;margin-top:0.3rem;justify-content:flex-end">
                <button class="btn-icon" onclick="event.stopPropagation();Investments.openForm(${item.id})">&#9998;</button>
                <button class="btn-icon" onclick="event.stopPropagation();Investments.remove(${item.id})">&#128465;</button>
              </div>
            </div>
          </div>
          <div class="inv-card-principal">${fmt(item.principal)}</div>
          <div class="inv-card-meta">
            Aporte: ${fmt(item.monthly_contribution)}/mês &bull;
            Estimativa 12m: <span style="color:var(--accent-green)">${fmt(est)}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function selectItem(id) {
    selectedId = id;
    render();

    const item = items.find(i => i.id === id);
    if (!item) return;

    document.getElementById('projectionPlaceholder').style.display = 'none';
    document.getElementById('projectionContent').style.display = 'block';
    document.getElementById('projRate').value = item.annual_rate;

    runProjection();
  }

  async function runProjection() {
    if (!selectedId) return;
    const rate  = parseFloat(document.getElementById('projRate').value) || 0;
    const years = parseInt(document.getElementById('projYears').value) || 10;

    try {
      const proj = await api('GET', `/investments/${selectedId}/projection?years=${years}&annual_rate=${rate}`);

      const resultsEl = document.getElementById('projResults');
      if (resultsEl) {
        resultsEl.innerHTML = `
          <div class="proj-stat">
            <div class="proj-stat-label">Valor Final</div>
            <div class="proj-stat-value text-blue">${fmt(proj.final_total)}</div>
          </div>
          <div class="proj-stat">
            <div class="proj-stat-label">Total Investido</div>
            <div class="proj-stat-value text-green">${fmt(proj.final_invested)}</div>
          </div>
          <div class="proj-stat">
            <div class="proj-stat-label">Juros Gerados</div>
            <div class="proj-stat-value text-purple">${fmt(proj.final_interest)}</div>
          </div>
        `;
      }

      Charts.investment('chartInvestment', proj.chart_data);
    } catch (e) {
      App.toast(e.message, 'error');
    }
  }

  function openForm(id = null) {
    const item = id ? items.find(i => i.id === id) : null;
    const today = new Date().toISOString().split('T')[0];
    App.openModal(item ? 'Editar Investimento' : 'Novo Investimento', `
      <div class="form-group">
        <label>Nome do Investimento</label>
        <input class="input" id="invLabel" value="${item?.label ?? ''}" placeholder="Ex: Tesouro Selic" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Tipo</label>
          <select class="input" id="invType">
            ${Object.entries(INV_TYPES).map(([k, v]) =>
              `<option value="${k}" ${item?.type === k ? 'selected' : ''}>${v}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Taxa Anual (%)</label>
          <input class="input" id="invRate" type="number" step="0.01" min="0" max="100" value="${item?.annual_rate ?? ''}" placeholder="Ex: 10.5" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Principal Investido (R$)</label>
          <input class="input" id="invPrincipal" type="number" min="0" step="0.01" value="${item?.principal ?? ''}" placeholder="0,00" />
        </div>
        <div class="form-group">
          <label>Aporte Mensal (R$)</label>
          <input class="input" id="invPmt" type="number" min="0" step="0.01" value="${item?.monthly_contribution ?? '0'}" placeholder="0,00" />
        </div>
      </div>
      <div class="form-group">
        <label>Data de Início (opcional)</label>
        <input class="input" id="invDate" type="date" value="${item?.start_date ?? today}" />
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Investments.save(${id ?? 'null'})">Salvar</button>
      </div>
    `);
  }

  async function save(id) {
    const label               = document.getElementById('invLabel').value.trim();
    const type                = document.getElementById('invType').value;
    const annual_rate         = parseFloat(document.getElementById('invRate').value);
    const principal           = parseFloat(document.getElementById('invPrincipal').value);
    const monthly_contribution = parseFloat(document.getElementById('invPmt').value) || 0;
    const start_date          = document.getElementById('invDate').value || null;

    if (!label || isNaN(annual_rate) || isNaN(principal) || principal < 0) {
      App.toast('Preencha todos os campos corretamente', 'error'); return;
    }
    try {
      if (id) {
        await api('PUT', `/investments/${id}`, { label, type, annual_rate, principal, monthly_contribution, start_date });
        App.toast('Investimento atualizado!', 'success');
      } else {
        await api('POST', '/investments/', { label, type, annual_rate, principal, monthly_contribution, start_date });
        App.toast('Investimento adicionado!', 'success');
      }
      App.closeModal();
      await load();
      Dashboard.load();
    } catch (e) { App.toast(e.message, 'error'); }
  }

  async function remove(id) {
    if (!confirm('Excluir este investimento?')) return;
    try {
      await api('DELETE', `/investments/${id}`);
      if (selectedId === id) {
        selectedId = null;
        document.getElementById('projectionPlaceholder').style.display = 'block';
        document.getElementById('projectionContent').style.display = 'none';
        Charts.destroy('chartInvestment');
      }
      App.toast('Investimento excluído', 'success');
      await load();
      Dashboard.load();
    } catch (e) { App.toast(e.message, 'error'); }
  }

  return { load, openForm, save, remove, selectItem, runProjection };
})();
