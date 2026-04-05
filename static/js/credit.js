// ── Cartões de Crédito ───────────────────────────────────────────────────

const Credit = (() => {
  let cards = [];
  let purchases = [];

  async function load() {
    try {
      [cards, purchases] = await Promise.all([
        api('GET', '/credit/cards'),
        api('GET', '/credit/purchases'),
      ]);
      render();
    } catch (e) {
      App.toast('Erro ao carregar cartões', 'error');
    }
  }

  function cardBalance(cardId) {
    return purchases
      .filter(p => p.card_id === cardId && p.installments_paid < p.installments)
      .reduce((s, p) => s + p.monthly_amount, 0);
  }

  function render() {
    const container = document.getElementById('creditCards');
    if (!container) return;

    if (!cards.length) {
      container.innerHTML = '<div class="empty-state card" style="margin-top:1rem">Nenhum cartão cadastrado.</div>';
      return;
    }

    container.innerHTML = cards.map(card => {
      const balance   = cardBalance(card.id);
      const available = card.limit - balance;
      const util      = card.limit > 0 ? (balance / card.limit) * 100 : 0;
      const cardPurchases = purchases.filter(p => p.card_id === card.id);

      const purchasesHTML = cardPurchases.length
        ? cardPurchases.map(p => {
            const remaining = p.installments - p.installments_paid;
            return `
              <div class="table-row">
                <div class="table-row-main">
                  <div class="table-row-label">${p.label}</div>
                  <div class="table-row-sub">
                    ${fmtDate(p.purchase_date)} &bull;
                    ${CAT_LABELS[p.category] ?? p.category} &bull;
                    ${remaining}/${p.installments} parcela${p.installments > 1 ? 's' : ''} restante${remaining !== 1 ? 's' : ''}
                  </div>
                </div>
                <div class="table-row-amount text-yellow">${fmt(p.monthly_amount)}/mês</div>
                <div class="table-row-actions">
                  ${p.installments_paid < p.installments
                    ? `<button class="btn btn-sm btn-secondary" title="Marcar parcela paga" onclick="Credit.payInstallment(${p.id})">&#10003;</button>`
                    : ''}
                  <button class="btn-icon" title="Excluir" onclick="Credit.removePurchase(${p.id})">&#128465;</button>
                </div>
              </div>
            `;
          }).join('')
        : '<div class="empty-state" style="padding:1rem">Nenhuma compra neste cartão.</div>';

      return `
        <div class="credit-section">
          <div class="cc-card-row">
            <div class="cc-visual" style="background:linear-gradient(135deg, ${card.color}dd, ${card.color}88);">
              <div>
                <div class="cc-name">${card.name}</div>
                <div class="cc-limit-text">Limite: ${fmt(card.limit)}</div>
              </div>
              <div>
                <div class="cc-balance">${fmt(balance)}</div>
                <div class="cc-available">Disponível: ${fmt(available)}</div>
                <div class="limit-bar"><div class="limit-fill" style="width:${Math.min(util, 100)}%"></div></div>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:0.5rem">
              <button class="btn btn-primary btn-sm" onclick="Credit.openPurchaseForm(${card.id})">+ Compra</button>
              <button class="btn btn-secondary btn-sm" onclick="Credit.openCardForm(${card.id})">&#9998; Editar</button>
              <button class="btn btn-danger btn-sm" onclick="Credit.removeCard(${card.id})">&#128465; Excluir</button>
            </div>
          </div>
          <div class="card-section-title">Compras no Cartão</div>
          <div class="table-card">${purchasesHTML}</div>
        </div>
      `;
    }).join('');
  }

  function openCardForm(id = null) {
    const card = id ? cards.find(c => c.id === id) : null;
    App.openModal(card ? 'Editar Cartão' : 'Novo Cartão de Crédito', `
      <div class="form-group">
        <label>Nome do Cartão</label>
        <input class="input" id="ccName" value="${card?.name ?? ''}" placeholder="Ex: Nubank" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Limite (R$)</label>
          <input class="input" id="ccLimit" type="number" min="0" step="0.01" value="${card?.limit ?? ''}" placeholder="0,00" />
        </div>
        <div class="form-group">
          <label>Cor do Cartão</label>
          <input class="input" id="ccColor" type="color" value="${card?.color ?? '#4f8ef7'}" style="height:42px;padding:4px" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Dia de Fechamento</label>
          <input class="input" id="ccClosing" type="number" min="1" max="31" value="${card?.closing_day ?? 15}" />
        </div>
        <div class="form-group">
          <label>Dia de Vencimento</label>
          <input class="input" id="ccDue" type="number" min="1" max="31" value="${card?.due_day ?? 22}" />
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Credit.saveCard(${id ?? 'null'})">Salvar</button>
      </div>
    `);
  }

  async function saveCard(id) {
    const name        = document.getElementById('ccName').value.trim();
    const limit       = parseFloat(document.getElementById('ccLimit').value);
    const color       = document.getElementById('ccColor').value;
    const closing_day = parseInt(document.getElementById('ccClosing').value);
    const due_day     = parseInt(document.getElementById('ccDue').value);

    if (!name || isNaN(limit) || limit <= 0) {
      App.toast('Preencha todos os campos corretamente', 'error'); return;
    }
    try {
      if (id) {
        await api('PUT', `/credit/cards/${id}`, { name, limit, color, closing_day, due_day });
        App.toast('Cartão atualizado!', 'success');
      } else {
        await api('POST', '/credit/cards', { name, limit, color, closing_day, due_day });
        App.toast('Cartão adicionado!', 'success');
      }
      App.closeModal();
      await load();
      Dashboard.load();
    } catch (e) { App.toast(e.message, 'error'); }
  }

  async function removeCard(id) {
    if (!confirm('Excluir este cartão e todas as compras?')) return;
    try {
      await api('DELETE', `/credit/cards/${id}`);
      App.toast('Cartão excluído', 'success');
      await load();
      Dashboard.load();
    } catch (e) { App.toast(e.message, 'error'); }
  }

  function openPurchaseForm(cardId) {
    const today = new Date().toISOString().split('T')[0];
    App.openModal('Nova Compra no Cartão', `
      <div class="form-group">
        <label>Descrição</label>
        <input class="input" id="pLabel" value="" placeholder="Ex: Mercado" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Valor Total (R$)</label>
          <input class="input" id="pAmount" type="number" min="0" step="0.01" placeholder="0,00" oninput="Credit.updateParcela()" />
        </div>
        <div class="form-group">
          <label>Parcelas</label>
          <input class="input" id="pInstallments" type="number" min="1" max="48" value="1" oninput="Credit.updateParcela()" />
        </div>
      </div>
      <div class="form-group" style="background:var(--bg-tertiary);border-radius:8px;padding:0.6rem 0.85rem;font-size:0.85rem;color:var(--text-secondary)">
        Valor por parcela: <strong id="pParcelaPreview" style="color:var(--accent-yellow);font-family:monospace">R$ 0,00</strong>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Data da Compra</label>
          <input class="input" id="pDate" type="date" value="${today}" />
        </div>
        <div class="form-group">
          <label>Categoria</label>
          <select class="input" id="pCategory">
            ${['shopping','food','travel','health','other'].map(c =>
              `<option value="${c}">${CAT_LABELS[c]}</option>`
            ).join('')}
          </select>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="App.closeModal()">Cancelar</button>
        <button class="btn btn-primary" onclick="Credit.savePurchase(${cardId})">Salvar</button>
      </div>
    `);
  }

  function updateParcela() {
    const amount       = parseFloat(document.getElementById('pAmount')?.value) || 0;
    const installments = parseInt(document.getElementById('pInstallments')?.value) || 1;
    const preview      = document.getElementById('pParcelaPreview');
    if (preview) preview.textContent = fmt(amount / installments);
  }

  async function savePurchase(cardId) {
    const label        = document.getElementById('pLabel').value.trim();
    const amount       = parseFloat(document.getElementById('pAmount').value);
    const installments = parseInt(document.getElementById('pInstallments').value);
    const purchase_date = document.getElementById('pDate').value;
    const category     = document.getElementById('pCategory').value;

    if (!label || isNaN(amount) || amount <= 0 || !purchase_date) {
      App.toast('Preencha todos os campos corretamente', 'error'); return;
    }
    try {
      await api('POST', '/credit/purchases', { card_id: cardId, label, amount, installments, installments_paid: 0, purchase_date, category });
      App.toast('Compra adicionada!', 'success');
      App.closeModal();
      await load();
      Dashboard.load();
    } catch (e) { App.toast(e.message, 'error'); }
  }

  async function payInstallment(id) {
    const purchase = purchases.find(p => p.id === id);
    if (!purchase) return;
    try {
      await api('PUT', `/credit/purchases/${id}`, { installments_paid: purchase.installments_paid + 1 });
      App.toast('Parcela marcada como paga!', 'success');
      await load();
      Dashboard.load();
    } catch (e) { App.toast(e.message, 'error'); }
  }

  async function removePurchase(id) {
    if (!confirm('Excluir esta compra?')) return;
    try {
      await api('DELETE', `/credit/purchases/${id}`);
      App.toast('Compra excluída', 'success');
      await load();
      Dashboard.load();
    } catch (e) { App.toast(e.message, 'error'); }
  }

  return { load, openCardForm, saveCard, removeCard, openPurchaseForm, updateParcela, savePurchase, payInstallment, removePurchase };
})();
