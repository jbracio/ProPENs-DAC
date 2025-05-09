// Chart 1: CO₂ Price Score Chart
window.renderCO2ScoreChart = function (populationData, selectedState = "ALL") {
  if (!window.location.pathname.includes("karte")) {
    return;
  }
  requestAnimationFrame(() => {
    if (!populationData || typeof populationData !== "object") {
      console.warn("renderCO2ScoreChart: populationData is missing or invalid.");
      return;
    }

    const canvas = document.getElementById("co2ScoreChart");
    if (!canvas) {
      console.warn("Canvas with id 'co2ScoreChart' not found in DOM.");
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.warn("Canvas context for 'co2ScoreChart' is not available.");
      return;
    }

    const bins = Array(10).fill(0);
    for (const [name, entry] of Object.entries(populationData)) {
      const state = entry["Bundesland"];
      if (selectedState !== "ALL" && state?.trim() !== selectedState) continue;
      const score = parseFloat(entry["C02 price score"]);
      if (!isNaN(score)) {
        const index = Math.max(0, Math.min(9, Math.floor(score)));
        bins[index]++;
      }
    }

    if (window.co2ChartInstance) {
      window.co2ChartInstance.destroy();
    }

    window.co2ChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
        datasets: [{
          label: selectedState === "ALL"
            ? "Districts per CO₂ Price Score"
            : `CO₂ Price Score in ${selectedState}`,
          data: bins,
          backgroundColor: [
            "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6",
            "#2171b5", "#08519c", "#08306b", "#061f42", "#041124"
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: selectedState === "ALL"
              ? "CO₂ Price Score Distribution (1–10)"
              : `CO₂ Price Score Distribution in ${selectedState}`
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Number of Districts" },
            grid: { display: false }
          },
          x: {
            title: { display: true, text: "CO₂ Price Score" },
            grid: { display: false }
          }
        }
      }
    });
  });
};

// Chart 2: Netto CO₂ Score Chart
window.renderNettoCO2ScoreChart = function (populationData, selectedState = "ALL") {
  if (!window.location.pathname.includes("karte")) {
    return;
  }
  requestAnimationFrame(() => {
    if (!populationData || typeof populationData !== "object") {
      console.warn("renderNettoCO2ScoreChart: populationData is missing or invalid.");
      return;
    }

    const canvas = document.getElementById("nettoScoreChart");
    if (!canvas) {
      console.warn("Canvas with id 'nettoScoreChart' not found in DOM.");
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.warn("Canvas context for 'nettoScoreChart' is not available.");
      return;
    }

    const bins = Array(10).fill(0);
    for (const [name, entry] of Object.entries(populationData)) {
      const state = entry["Bundesland"];
      if (selectedState !== "ALL" && state?.trim() !== selectedState) continue;
      const score = parseFloat(entry["Netto C02 Score"]);
      if (!isNaN(score)) {
        const index = Math.max(0, Math.min(9, Math.floor(score)));
        bins[index]++;
      }
    }

    if (window.nettoChartInstance) {
      window.nettoChartInstance.destroy();
    }

    window.nettoChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
        datasets: [{
          label: selectedState === "ALL"
            ? "Districts per Netto CO₂ Score"
            : `Netto CO₂ Score in ${selectedState}`,
          data: bins,
          backgroundColor: [
            "#d9f0d3", "#bce5b3", "#a0da93", "#84ce74", "#68c354",
            "#4cad34", "#388c2a", "#2a6c21", "#1c4c17", "#0e2c0e"
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: selectedState === "ALL"
              ? "Netto CO₂ Score Distribution (1–10)"
              : `Netto CO₂ Score Distribution in ${selectedState}`
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Number of Districts" },
            grid: { display: false }
          },
          x: {
            title: { display: true, text: "Netto CO₂ Score" },
            grid: { display: false }
          }
        }
      }
    });
  });
};