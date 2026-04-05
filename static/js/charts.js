// ── Chart.js wrapper ─────────────────────────────────────────────────────

const Charts = (() => {
  const instances = {};

  function destroy(id) {
    if (instances[id]) { instances[id].destroy(); delete instances[id]; }
  }

  function expensePie(canvasId, categories) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || !categories.length) return;

    const colors = ['#ff4d6d','#f5a623','#4f8ef7','#00d4aa','#a78bfa','#fb923c','#34d399','#60a5fa'];
    instances[canvasId] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: categories.map(c => c.label),
        datasets: [{
          data: categories.map(c => c.value),
          backgroundColor: colors.slice(0, categories.length),
          borderColor: '#1a1d27',
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#8b92a9', font: { size: 11 }, padding: 12 } },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(ctx.raw)}`
            }
          }
        },
        cutout: '65%',
      }
    });
  }

  function investment(canvasId, chartData) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || !chartData.length) return;

    const fmtBRL = v => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
    const labels = chartData.map(p => `Ano ${p.month / 12}`);

    instances[canvasId] = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Valor Total',
            data: chartData.map(p => p.total),
            borderColor: '#4f8ef7',
            backgroundColor: '#4f8ef720',
            fill: true,
            tension: 0.4,
            pointRadius: 3,
          },
          {
            label: 'Valor Investido',
            data: chartData.map(p => p.invested),
            borderColor: '#00d4aa',
            borderDash: [5, 5],
            fill: false,
            tension: 0.4,
            pointRadius: 2,
          },
        ]
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { labels: { color: '#8b92a9', font: { size: 11 } } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmtBRL(ctx.raw)}` } }
        },
        scales: {
          x: { ticks: { color: '#555d7a', font:{size:10} }, grid: { color: '#2e3248' } },
          y: {
            ticks: { color: '#555d7a', font:{size:10}, callback: v => fmtBRL(v) },
            grid: { color: '#2e3248' }
          }
        }
      }
    });
  }

  function goalTimeline(canvasId, chartData, targetAmount) {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || !chartData.length) return;

    const fmtBRL = v => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
    // Downsample if many points
    let data = chartData;
    if (chartData.length > 24) {
      data = chartData.filter((_, i) => i % Math.ceil(chartData.length / 24) === 0 || i === chartData.length - 1);
    }

    instances[canvasId] = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.map(p => p.label),
        datasets: [
          {
            label: 'Poupado',
            data: data.map(p => p.saved),
            borderColor: '#a78bfa',
            backgroundColor: '#a78bfa20',
            fill: true,
            tension: 0.3,
            pointRadius: 2,
          },
          {
            label: 'Meta',
            data: data.map(() => targetAmount),
            borderColor: '#f5a62366',
            borderDash: [6, 4],
            fill: false,
            pointRadius: 0,
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: '#8b92a9', font:{size:11} } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmtBRL(ctx.raw)}` } }
        },
        scales: {
          x: { ticks: { color: '#555d7a', font:{size:9}, maxRotation: 45 }, grid: { color: '#2e3248' } },
          y: { ticks: { color: '#555d7a', font:{size:10}, callback: v => fmtBRL(v) }, grid: { color: '#2e3248' } }
        }
      }
    });
  }

  return { expensePie, investment, goalTimeline, destroy };
})();
