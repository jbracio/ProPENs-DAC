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
// Neue Funktion: renderCO2PriceLineChart
window.renderCO2PriceLineChart = function () {
  let data = Object.values(window.populationData || {});
  if (!data || !Array.isArray(data)) {
    data = window.populationData; // fallback
  }
  if (!data || !Array.isArray(data)) {
    console.warn("renderCO2PriceLineChart: invalid data");
    return;
  }
  console.log("Beispieldatensatz:", data[0]);
  const canvas = document.getElementById("renderCO2PriceLinieChart");
  if (!canvas) {
    console.warn("Canvas with id 'renderCO2PriceLinieChart' not found.");
    return;
  }
  canvas.height = 800;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.warn("Context for 'renderCO2PriceLinieChart' is not available.");
    return;
  }

  // CO2-Werte extrahieren und sortieren
  const co2Values = data
    .map(d => {
      const val = d["CO2 Price"];
      return val ? parseFloat(val) : null;
    })
    .filter(val => !isNaN(val))
    .sort((a, b) => a - b);

  console.log("CO₂ values (sorted):", co2Values);
  if (co2Values.length === 0) {
    console.warn("renderCO2PriceLineChart: co2Values is empty – check data extraction.");
  }

  // X-Achse mit leeren Labels und vertikalen Strichen bei jedem 50. Punkt
  const labels = co2Values.map((_, i) => ((i + 1) % 50 === 0 ? '|' : ''));

  if (window.additionalChartInstance) {
    window.additionalChartInstance.destroy();
  }

  window.additionalChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Sorted CO₂ Price per District",
        data: co2Values,
        borderColor: "#003C78",
        borderWidth: 2,
        pointRadius: 0,
        fill: true,
        tension: 0.5,
        backgroundColor: function(context) {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, "rgba(0, 63, 120, 0)");    // heller oben
          gradient.addColorStop(1, "rgba(0, 63, 120, 0.6)");  // kräftiger dunkelblau unten
          return gradient;
        }
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
        x: {
          ticks: {
            callback: function (val, index) {
              return ((index + 1) % 50 === 0) ? (index + 1).toString() : "";
            },
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0
          },
          title: {
            display: true,
            text: "Districts (Sorted by CO₂ Price)"
          },
          grid: {
            display: true,
            drawTicks: true,
            color: function(context) {
              return ((context.tick.value + 1) % 50 === 0) ? "rgba(0, 0, 0, 0.1)" : "transparent";
            }
          }
        },
        y: {
          min: 120,
          max: 180,
          grid: {
            display: false
          },
          title: {
            display: true,
            text: "CO₂ Price (€)"
          }
        }
      }
    }
  });
};
// Neue Funktion: renderNetCO2LineChart
window.renderNetCO2LineChart = function () {
  let data = Object.values(window.populationData || {});
  if (!data || !Array.isArray(data)) {
    console.warn("renderNetCO2LineChart: invalid data");
    return;
  }

  const canvas = document.getElementById("renderNetCO2LineChart");
  if (!canvas) {
    console.warn("Canvas with id 'renderNetCO2LineChart' not found.");
    return;
  }
  canvas.height = 800;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.warn("Context for 'renderNetCO2LineChart' is not available.");
    return;
  }

  // Netto-CO2-Werte extrahieren und absteigend sortieren
  const netValues = data
    .map(d => {
      const val = d["Netto CO2"];
      return val ? parseFloat(val) : null;
    })
    .filter(val => !isNaN(val))
    .sort((a, b) => b - a); // absteigend

  console.log("Net CO₂ values (sorted):", netValues);
  if (netValues.length === 0) {
    console.warn("renderNetCO2LineChart: netValues is empty – check data extraction.");
  }

  // X-Achse mit Markierungen bei jedem 50. Punkt
  const labels = netValues.map((_, i) => ((i + 1) % 50 === 0 ? '|' : ''));

  if (window.netCO2LineChartInstance) {
    window.netCO2LineChartInstance.destroy();
  }

  window.netCO2LineChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Sorted Net CO₂ Emission per District",
        data: netValues,
        borderColor: "#1b5e20",
        borderWidth: 2,
        pointRadius: 0,
        fill: true,
        tension: 0.5,
        backgroundColor: function(context) {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, "rgba(27, 94, 32, 0)");
          gradient.addColorStop(1, "rgba(27, 94, 32, 0.6)");
          return gradient;
        }
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
        x: {
          ticks: {
            callback: function (val, index) {
              return ((index + 1) % 50 === 0) ? (index + 1).toString() : "";
            },
            autoSkip: false,
            maxRotation: 0,
            minRotation: 0
          },
          title: {
            display: true,
            text: "Districts (Sorted by Net CO₂ Emission)"
          },
          grid: {
            display: true,
            drawTicks: true,
            color: function(context) {
              return ((context.tick.value + 1) % 50 === 0) ? "rgba(0, 0, 0, 0.1)" : "transparent";
            }
          }
        },
        y: {
          grid: {
            display: false
          },
          title: {
            display: true,
            text: "Net CO₂ Emissions (kg)"
          }
        }
      }
    }
  });
};