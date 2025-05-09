// Neue Variable für Chart-Instanzen
window.co2ChartInstance = null;
window.nettoChartInstance = null;

// Neue Funktion: renderCO2PriceChart
window.renderCO2PriceChart = function (populationData) {
  const data = Object.values(populationData);
  if (!data || !Array.isArray(data)) {
    data = window.populationdata; // fallback
  }
  if (!data || !Array.isArray(data)) {
    console.warn("renderCO2PriceChart: invalid data");
    return;
  }

  const canvas = document.getElementById("scoreChart");
  if (!canvas) {
    console.warn("Canvas with id 'scoreChart' not found.");
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.warn("Context for 'scoreChart' is not available.");
    return;
  }

  // Scoreverteilung berechnen
  const bins = new Array(10).fill(0);
  data.forEach(d => {
    const raw = d["C02 price score"];
    const score = parseInt(typeof raw === "string" ? raw.replace(/[^\d]/g, "") : raw);
    if (!isNaN(score) && score >= 1 && score <= 10) {
      bins[score - 1]++;
    }
  });

  const backgroundColors = [
    "#cce5ff",
    "#99ccff",
    "#66b3ff",
    "#3399ff",
    "#007fff",
    "#0066cc",
    "#004c99",
    "#003366",
    "#001a33",
    "#000d1a"
  ];

  if (window.co2ChartInstance) {
    window.co2ChartInstance.destroy();
  }

  window.co2ChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Array.from({ length: 10 }, (_, i) => (i + 1).toString()),
      datasets: [{
        label: "CO₂ Price Score (District Count)",
        data: bins,
        backgroundColor: backgroundColors
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { top: 15, bottom: 25, left: 10, right: 10 }
      },
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { display: false },
          title: {
            display: true,
            text: "Number of Districts"
          }
        },
        x: {
          grid: { display: false },
          title: {
            display: false,
            text: "CO₂ Price Score"
          }
        }
      }
    }
  });
};

// Neue Funktion: renderNettoCO2ScoreChart
window.renderNettoCO2ScoreChart = function (populationData) {
  const data = Object.values(populationData);
  if (!data || !Array.isArray(data)) {
    data = window.populationData; // fallback
  }
  if (!data || !Array.isArray(data)) {
    console.warn("renderNettoCO2ScoreChart: invalid data");
    return;
  }

  const canvas = document.getElementById("nettoScoreChart");
  if (!canvas) {
    console.warn("Canvas with id 'nettoScoreChart' not found.");
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.warn("Context for 'nettoScoreChart' is not available.");
    return;
  }

  // Scoreverteilung berechnen
  const bins = new Array(10).fill(0);
  data.forEach(d => {
    const raw = d["Netto C02 Score"];
    const score = parseInt(typeof raw === "string" ? raw.replace(/[^\d]/g, "") : raw);
    if (!isNaN(score) && score >= 1 && score <= 10) {
      bins[score - 1]++;
    }
  });

  const backgroundColors = [
    "#e0f7e9",
    "#c2efd4",
    "#a4e7be",
    "#86dfa9",
    "#68d793",
    "#4acf7e",
    "#34a76a",
    "#1e7f56",
    "#085842",
    "#00302e"
  ];

  if (window.nettoChartInstance) {
    window.nettoChartInstance.destroy();
  }

  window.nettoChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Array.from({ length: 10 }, (_, i) => (i + 1).toString()),
      datasets: [{
        label: "Net CO₂ Score (District Count)",
        data: bins,
        backgroundColor: backgroundColors
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { top: 15, bottom: 40, left: 10, right: 10 }
      },
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { display: false },
          title: {
            display: true,
            text: "Number of Districts"
          }
        },
        x: {
          grid: { display: false },
          title: {
            display: false,
            text: "Net CO₂ Score"
          }
        }
      }
    }
  });
};