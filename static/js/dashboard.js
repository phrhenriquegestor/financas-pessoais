// ── Dashboard ────────────────────────────────────────────────────────────

const Dashboard = (() => {
  let prev = {};

  async function load() {
    try {
      const d = await api('GET', '/dashboard/');
      render(d);
    } catch (e) {
      App.toast('Erro ao carregar dashboard', 'error');
    }
  }

  function render(d) {
    const income   = d.income.total_monthly;
    const expenses = d.summary.total_expenses;
    const net      = d.summary.net_monthly;
    const credit   = d.credit.total_used;
    const invested = d.investments.total_principal;
    const score    = d.health.score;

    animateValue(document.getElementById('dashIncome'),   prev.income   ?? income,   income);
    animateValue(document.getElementById('dashExpenses'), prev.expenses ?? expenses, expenses);
    animateValue(document.getElementById('dashNet'),      prev.net      ?? net,      net);
    animateValue(document.getElementById('dashCredit'),   prev.credit   ?? credit,   credit);
    animateValue(document.getElementById('dashInvested'), prev.invested ?? invested, invested);

    prev = { income, expenses, net, credit, invested };

    // Net color
    const netEl = document.getElementById('dashNet');
    if (netEl) netEl.style.color = net >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';

    // Health score
    const scoreEl = document.getElementById('dashScore');
    if (scoreEl) scoreEl.textContent = `${score}/100`;
    const scoreLabelEl = document.getElementById('dashScoreLabel');
    if (scoreLabelEl) {
      scoreLabelEl.textContent = d.health.label;
      scoreLabelEl.style.color = `var(--accent-${d.health.color})`;
    }

    // Gauge
    const gaugeScore = document.getElementById('gaugeScore');
    if (gaugeScore) gaugeScore.textContent = score;
    const gaugeFill = document.getElementById('gaugeFill');
    if (gaugeFill) gaugeFill.style.width = `${score}%`;
    const healthBD = document.getElementById('healthBreakdown');
    if (healthBD) {
      const colorMap = { green: '#00d4aa', red: '#ff4d6d', yellow: '#f5a623', blue: '#4f8ef7' };
      healthBD.innerHTML = `
        <div>Receita mensal: <strong>${fmt(income)}</strong></div>
        <div>Total de gastos: <strong>${fmt(expenses)}</strong></div>
        <div>Saldo livre: <strong style="color:${net>=0?'var(--accent-green)':'var(--accent-red)'};">${fmt(net)}</strong></div>
        <div>Score: <strong style="color:${colorMap[d.health.color]}">${d.health.label} (${score}/100)</strong></div>
      `;
    }

    // Expense pie chart
    Charts.expensePie('chartExpensePie', d.chart.categories);

    // Recent activity
    const recent = document.getElementById('recentActivity');
    if (recent) {
      if (!d.recent.length) {
        recent.innerHTML = '<div class="empty-state">Nenhuma atividade ainda.</div>';
      } else {
        recent.innerHTML = d.recent.map(r => `
          <div class="recent-row">
            <div>
              <div class="recent-label">${r.label}</div>
              <div class="recent-type">${r.type === 'income' ? 'Receita' : r.type === 'debt' ? 'Dívida Fixa' : 'Cartão'}</div>
            </div>
            <div class="recent-amount ${r.sign === '+' ? 'sign-plus' : 'sign-minus'}">
              ${r.sign}${fmt(r.amount)}
            </div>
          </div>
        `).join('');
      }
    }
  }

  return { load };
})();
