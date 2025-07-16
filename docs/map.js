// Globale Variablen für RES Map
window.resData = {};
window.resLayers = [];

// Globale Variable für Land Use Score Range
window.landUseScoreRange = { min: Infinity, max: -Infinity };

// Achtung: Wird ausschließlich für Secondary Map verwendet. Keine Überschneidung mit totalScoreLayers.
// Globale Variable für die Layer der zweiten Karte (Secondary Map)
window.secondaryMapLayers = [];
// Globale Variable für die Layer der IWH Map (eigene Instanz analog totalscore-map)
window.iwhLayers = [];
// Globale Variablen für Transport Map
window.transportData = {};
window.transportLayers = [];
// Neue Transport-Farbskala: analog zum Electricity-Color-Logic, niedrigere Distanz = besser (grün)
function getTransportColor(distance, min, max) {
  if (isNaN(distance)) return "#eeeeee";

  const values = Object.values(window.transportData)
    .map(entry => parseFloat(entry["Distance to Nearest CO2 Pipeline (km)"]))
    .filter(v => !isNaN(v))
    .sort((a, b) => a - b);

  if (values.length < 2) return "#eeeeee";

  const lower20Index = Math.floor(values.length * 0.2);
  const upper90Index = Math.floor(values.length * 0.9);

  const lower20 = values[lower20Index];
  const upper90 = values[upper90Index];
  const minVal = values[0];
  const maxVal = values[values.length - 1];

  if (distance <= lower20) {
    const ratio = (distance - minVal) / (lower20 - minVal);
    return interpolateColor("#5ca82e", "#c0e788", ratio); // Grün → Hellgrün
  } else if (distance <= upper90) {
    const ratio = (distance - lower20) / (upper90 - lower20);
    return interpolateColor("#f5ff99", "#ff7043", ratio); // Gelb → Hellrot
  } else {
    const ratio = (distance - upper90) / (maxVal - upper90);
    return interpolateColor("#ff7043", "#800026", ratio); // Hellrot → Dunkelrot
  }
}

// KPI-Update Funktion für Electricity Map
function updateElectricityKPIs() {
    const container = document.getElementById("electricity-kpi-container");
    if (!container) return;

    const dataMap = window.electricityDataMap?.[window.currentElectricityKey];
    if (!dataMap) return;

    const values = Object.values(dataMap);

    const avg = (arr, key) => {
        const nums = arr.map(e => {
            // Schlüssel-Mapping für verschiedene CSVs
            if (key === "Cost") {
                return parseFloat(e["Total Costs [€/tCO2]"]);
            }
            if (key === "Captured CO2") {
                // Versuche beide Varianten
                return parseFloat(e["CO2 captured [t/a]"]) || parseFloat(e["Captured CO2 [t/a]"]);
            }
            if (key === "Location Score") {
                // Versuche beide Varianten
                return parseFloat(e["Score_technology"]) || parseFloat(e["Location Score"]);
            }
            if (key === "Operating Hours") {
                return parseFloat(e["Operating Hours [h/a]"]);
            }
            return parseFloat(e[key]);
        }).filter(v => !isNaN(v));
        const sum = nums.reduce((a, b) => a + b, 0);
        return nums.length > 0 ? (sum / nums.length) : 0;
    };

    const avgCost = avg(values, "Cost");
    const avgCO2 = avg(values, "Captured CO2");
    const avgLocationScore = avg(values, "Location Score");
    const avgHours = avg(values, "Operating Hours");

    container.innerHTML = `
        <div class="mini-kpi">
            <div class="mini-kpi-icon">💶</div>
            <div class="mini-kpi-label">Average Cost</div>
            <div class="mini-kpi-value">${avgCost.toFixed(0)} €/tCO₂</div>
        </div>
        <div class="mini-kpi">
            <div class="mini-kpi-icon">📦</div>
            <div class="mini-kpi-label">Average CO₂ Captured</div>
            <div class="mini-kpi-value">${avgCO2.toFixed(0)} tCO₂</div>
        </div>
        <div class="mini-kpi">
            <div class="mini-kpi-icon">📍</div>
            <div class="mini-kpi-label">Avg. Technology Score</div>
            <div class="mini-kpi-value">${avgLocationScore.toFixed(1)}</div>
        </div>
        <div class="mini-kpi">
            <div class="mini-kpi-icon">⏱️</div>
            <div class="mini-kpi-label">Avg. Op. Hours</div>
            <div class="mini-kpi-value">${avgHours.toFixed(0)} h</div>
        </div>
    `;
}
// Labels für Electricity-Felder (inklusive Einheiten, wie für Info-Panel)
const electricityFieldLabels = {
  "Total Costs [€/tCO2]": "Total Cost (€/tCO₂)",
  "Cost of Electricity [€/tCO2]": "Cost of Electricity (€/tCO₂)",
  "Cost of Heat - CAPEX [€/tCO2]": "Capex Heat (€/tCO₂)",
  "Additional Costs [€/tCO2]": "Additional Costs (€/tCO₂)",
  "CAPEX DAC [€/tCO2]": "Capex DAC (€/tCO₂)",
  "Score_technology": "Score Technology",
  "Operating Hours [h/a]": "Operating Hours (h/a)",
  // Erweiterte Felder
  "CO2 captured [t/a]": "CO₂ captured (t/a)",
  "PV share [%]": "PV share (%)",
  "Power Installed [kw]": "Power Installed (kW)",
  "Capacity Battery [kwh]": "Capacity Battery (kWh)",
  "Score_total": "Total Score",
  "Score_location": "Location Score"
};

// Funktion zum Anzeigen des InfoPanels für Electricity Map beim Klick auf ein Landkreis-Feature
function onEachFeatureElectricity(feature, layer) {
    layer.on('click', function () {
        const nutsId = feature.properties.NUTS_ID;
        // window.electricityDataMap kann auch ein Objekt mit mehreren Datasets sein, daher aktuelle Dataset wählen:
        const dataMap = window.electricityDataMap?.[window.currentElectricityKey];
        const data = dataMap?.[nutsId];

        const panel = document.getElementById('electricity-info-panel');
        if (!panel || !data) return;

        // Toggle schließen, wenn bereits geöffnet für diesen Landkreis
        if (panel.dataset.current === nutsId) {
            panel.style.display = 'none';
            panel.dataset.current = '';
            return;
        }

        // HTML-String für das Panel inkl. Schließen-Button am Anfang
        let infoHtml = `
        <button onclick="closePanel()" style="position: absolute; top: 10px; right: 10px; background: transparent; border: none; color: #003C78; font-size: 16px; font-weight: bold; cursor: pointer;">✖</button>
        <b style="font-size: 1.02rem; display: block; margin-bottom: 10px;">${data.Verweis || data.County || "Unbekannter Landkreis"}</b>
        <p style="margin: 0;"><strong>Total Cost:</strong> ${data["Total Costs [€/tCO2]"] ?? "-"} €/tCO₂</p>
        <p style="margin: 0;"><strong>Cost of Electricity:</strong> ${data["Cost of Electricity [€/tCO2]"] ?? "-"} €/tCO₂</p>
        <p style="margin: 0;"><strong>CAPEX Heat:</strong> ${data["Cost of Heat - CAPEX [€/tCO2]"] ?? "-"} €/tCO₂</p>
        <p style="margin: 0;"><strong>Additional Costs:</strong> ${data["Additional Costs [€/tCO2]"] ?? "-"} €/tCO₂</p>
        <p style="margin: 0;"><strong>CAPEX DAC:</strong> ${data["CAPEX DAC [€/tCO2]"] ?? "-"} €/tCO₂</p>
        <p style="margin: 0;"><strong>Score Technology:</strong> ${data.Score_technology ?? "-"}</p>
        <p style="margin: 0;"><strong>Operating Hours:</strong> ${data["Operating Hours [h/a]"] ?? "-"} h</p>
        <p style="margin: 0;"><strong>CO₂ captured:</strong> ${data["CO2 captured [t/a]"] ?? "-"} t/a</p>
        <p style="margin: 0;"><strong>PV Share:</strong> ${data["PV share [%]"] ?? "-"} %</p>
        <p style="margin: 0;"><strong>Power Installed:</strong> ${data["Power Installed [kw]"] ?? "-"} kW</p>
        <p style="margin: 0;"><strong>Battery Capacity:</strong> ${data["Capacity Battery [kwh]"] ?? "-"} kWh</p>
        <p style="margin: 0;"><strong>Score Total:</strong> ${data.Score_total ?? "-"}</p>
        <p style="margin: 0;"><strong>Score Location:</strong> ${data.Score_location ?? "-"}</p>
      `;
        panel.innerHTML = infoHtml;
        panel.style.display = 'block';
        panel.dataset.current = nutsId;
        // Setze den Panel-Titel und Schriftgröße
        document.getElementById("electricity-panel-title").textContent = data?.Verweis || "Unbenannt";
        document.getElementById("electricity-panel-title").style.fontSize = "1.02rem";
    });
}

// Globale Funktion zum Schließen des Electricity-Info-Panels
window.closePanel = function () {
  const panel = document.getElementById('electricity-info-panel');
  if (panel) {
    panel.style.display = 'none';
    panel.dataset.current = '';
  }
};
// Globale Variablen für Electricity Map CSV-Datensätze

window.selectedStates = []; // Bundesland Filter
window.electricityDataMap = {};
window.electricityCountyMapping = {}; // optional, falls später benötigt
window.currentElectricityKey = "ESS";
window.electricityLayers = [];
// Initiale Anzeige der KPI-Kacheln beim ersten Laden
if (window.electricityDataMap && window.currentElectricityKey && window.electricityDataMap[window.currentElectricityKey]) {
  renderElectricityKpiCards(window.electricityDataMap[window.currentElectricityKey]);
}
// Electricity Thresholds (Schwellenwerte für Filter)
window.electricityThresholds = {
  "Score_technology": 0,
  "Total Costs [€/tCO2]": 0,
  "Cost of Electricity [€/tCO2]": 0,
  "Cost of Heat - CAPEX [€/tCO2]": 0,
  "Additional Costs [€/tCO2]": 0,
  "CAPEX DAC [€/tCO2]": 0
};
// Add at the top of the file
// Globale Schwellenwerte für Total Score Filter
window.currentTotalScoreThresholds = {
  "IWH_Score": 0,
  "E_Score": 0,
  "RES_Score": 0,
  "TP_Score": 0,
  "LU_Score": 0
};
// Zentrale Filterfunktion für Total Score Map
// Sichtbarkeit wird jetzt ausschließlich über layer.feature.properties.visible verwaltet
window.applyTotalScoreFilters = function () {
  // Logging wie gewünscht am Anfang der Funktion
  console.log("DEBUG: applyTotalScoreFilters gestartet");
  console.log("DEBUG: Anzahl window.totalScoreLayers:", window.totalScoreLayers?.length);
  if (!window.totalScoreData || !window.totalScoreLayers) return;
  // Debug-Ausgaben direkt nach Funktionsstart
  console.log("applyTotalScoreFilters: totalScoreLayers Länge:", window.totalScoreLayers?.length);
  console.log("Layer-Einträge vor Filterung:", window.totalScoreLayers?.map(l => l.feature?.properties?.NUTS_ID));
  console.log("applyTotalScoreFilters gestartet. Anzahl Layer:", window.totalScoreLayers?.length);

  window.totalScoreLayers.forEach(layer => {
    const id = layer.feature?.properties?.NUTS_ID?.trim();
    const entry = window.totalScoreData[id];
    if (!entry) return;

    // Bundesland-Filterlogik: prüfe Sichtbarkeit, ggf. Layer "ausgrauen"
    const featureState = layer.feature?.properties?.visibleState;
    if (featureState === false) {
      layer.setStyle({ fillOpacity: 0.2, fillColor: "#dddddd" });
      layer.feature.properties.visible = false;
      return;
    }

    let visible = true;
    layer.feature.properties.visible = true;
    for (const [key, threshold] of Object.entries(window.currentTotalScoreThresholds)) {
      const raw = entry[key];
      const val = parseFloat(raw?.replace(",", "."));
      if (isNaN(val)) {
        console.warn(`NaN detected for ${key} in ${id}:`, raw);
        visible = false;
        layer.feature.properties.visible = false;
        break;
      }
      if (val < threshold) {
        visible = false;
        layer.feature.properties.visible = false;
        break;
      }
    }

    const score = parseFloat(entry?.["Total_Score"]);
    const fillColor = visible ? getFillColor(score) : "#dddddd";

    layer.setStyle({
      fillColor: fillColor,
      fillOpacity: visible ? 0.7 : 0.2
    });
  });
  updateTotalScoreTableByVisibleLayers();
  // Debug-Ausgabe nach der Schleife
  console.log("Visible Layers nach Filterung:", window.totalScoreLayers?.filter(l => l.feature.properties.visible).length);


  // --- KPI UPDATE BEGIN ---
  const filteredEntries = window.totalScoreLayers
    .filter(layer => layer.feature?.properties?.visible)
    .map(layer => window.totalScoreData[layer.feature?.properties?.NUTS_ID]);

  const totalVisible = filteredEntries.length;
  const averageScore = totalVisible > 0
    ? (filteredEntries.reduce((sum, entry) => sum + parseFloat(entry["Total_Score"] || 0), 0) / totalVisible).toFixed(2)
    : "–";

  const countElem = document.getElementById("total-score-kpi-count");
  if (countElem) countElem.textContent = totalVisible;
  const avgElem = document.getElementById("total-score-kpi-average");
  if (avgElem) avgElem.textContent = averageScore;
  // --- KPI UPDATE END ---
};
// Setter für Bundesland-Auswahl und Anwendung der TotalScore-Filter
window.setSelectedStatesAndApplyTotalScoreFilter = function (states) {
  window.selectedStates = states;
  window.applyTotalScoreFilters();
};
// Setter-Methode für Total Score Schwellenwerte und Anwendung des Filters
window.setTotalScoreThresholdsAndApply = function (thresholds) {
  window.currentTotalScoreThresholds = { ...thresholds };
  window.applyTotalScoreFilters();
};

// Funktion zum Auslesen der Sliderwerte für Total Score Map und Anwenden des Filters
window.collectTotalScoreThresholdsAndApply = function () {
  const thresholds = {};
  const keys = ["Total_Score", "IWH_Score", "E_Score", "RES_Score", "TP_Score", "LU_Score"];
  keys.forEach((key, index) => {
    const slider = document.getElementById(`score${index + 1}-slider`);
    if (slider) {
      thresholds[key] = parseFloat(slider.value);
    }
  });
  window.setTotalScoreThresholdsAndApply(thresholds);
};

// Funktion zum Zurücksetzen aller Filter-Slider für Total Score Map
window.resetTotalScoreFilters = function () {
  const keys = ["IWH_Score", "E_Score", "RES_Score", "TP_Score", "LU_Score"];
  const thresholds = {};
  keys.forEach((key, index) => {
    const slider = document.getElementById(`score${index + 1}-slider`);
    if (slider) {
      // Setze den Sliderwert auf 0 und aktualisiere das Label
      slider.value = 0;
      const label = document.getElementById(`score${index + 1}-value`);
      if (label) label.textContent = "0";
    }
    thresholds[key] = 0;
  });

  // Aktualisiere die globalen Schwellenwerte korrekt
  window.currentTotalScoreThresholds = { ...thresholds };

  // Setze die Styles aller Layer zurück
  if (window.totalScoreLayers && window.totalScoreData) {
    window.totalScoreLayers.forEach(layer => {
      const id = layer.feature?.properties?.NUTS_ID?.trim();
      const entry = window.totalScoreData[id];
      const score = parseFloat(entry?.["Total_Score"]);
      const fillColor = getFillColor(score);

      layer.setStyle({
        fillColor: fillColor,
        fillOpacity: 0.7
      });
      // Sichtbarkeit explizit setzen
      layer.feature.properties.visible = true;
    });
    window.setTotalScoreThresholdsAndApply(thresholds);
  }
  updateTotalScoreTableByVisibleLayers();

  // Tabelle vollständig neu aufbauen mit allen Einträgen
  const table = document.getElementById("totalscore-table");
  if (table) {
    const tbody = table.querySelector("tbody");
    if (tbody) {
      tbody.innerHTML = "";
      const data = window.totalScoreData;
      Object.values(data).forEach(entry => {
        const row = document.createElement("tr");
        const keys = ["County", "Total_Score", "IWH_Score", "E_Score", "RES_Score", "TP_Score", "LU_Score"];
        keys.forEach(key => {
          const cell = document.createElement("td");
          cell.textContent = entry[key] ?? "—";
          row.appendChild(cell);
        });
        tbody.appendChild(row);
      });
    }
  }

  // --- KPI UPDATE BEGIN ---
  const filteredEntries = window.totalScoreLayers
    .filter(layer => layer.feature?.properties?.visible)
    .map(layer => window.totalScoreData[layer.feature?.properties?.NUTS_ID]);

  const totalVisible = filteredEntries.length;
  const averageScore = totalVisible > 0
    ? (filteredEntries.reduce((sum, entry) => sum + parseFloat(entry["Total_Score"] || 0), 0) / totalVisible).toFixed(2)
    : "–";

  const countElem = document.getElementById("total-score-kpi-count");
  if (countElem) countElem.textContent = totalVisible;
  const avgElem = document.getElementById("total-score-kpi-average");
  if (avgElem) avgElem.textContent = averageScore;
  // --- KPI UPDATE END ---
};

let lastOpenedTotalScoreCountyId = null;
// Close function for Total Score panel
window.closeTotalScorePanel = function () {
  const panel = document.getElementById("totalscore-info-panel");
  if (panel) panel.style.display = "none";
};


// Globale Schwellenwerte für Filter
window.currentWeightedThreshold = 0;
window.currentBestThreshold = 0;
window.currentDirectThreshold = 0;
window.currentTotalWasteHeatThreshold = 0;

// Funktion zum Laden der IWH-Daten aus der CSV-Datei
function loadIwhData() {
  return fetch('data/IWH_data.csv')
    .then(response => response.text())
    .then(text => {
      const lines = text.split('\n').filter(line => line.trim() !== "");
      const header = lines[0].split(';');
      const idIndex = header.findIndex(h => h.trim() === "NUTS_ID");

      const data = {};
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(';');
        const id = cols[idIndex]?.trim();
        if (!id) continue;

        data[id] = {};
        for (let j = 0; j < header.length; j++) {
          data[id][header[j].trim()] = cols[j]?.trim();
        }
      }
      console.log("CSV geladen, Vorschau:", Object.keys(data).slice(0, 10));
      window.allIwhKeys = Object.keys(data);
      console.log("Alle NUTS_IDs in CSV:", window.allIwhKeys);
      return data;
    });
}

// Neue globale Variable für Kostenbereich
window.costRange = { min: Infinity, max: -Infinity };

// Neue Farbskala für Total Score Map (10%- und 90%-Quantile, kontinuierlich)
function getFillColor(score) {
  if (isNaN(score)) return "#eeeeee";

  const values = Object.values(window.totalScoreData || {})
    .map(entry => parseFloat(entry["Total_Score"]))
    .filter(v => !isNaN(v))
    .sort((a, b) => a - b);

  if (values.length < 2) return "#eeeeee";

  const lower20Index = Math.floor(values.length * 0.2);
  const upper90Index = Math.floor(values.length * 0.9);

  const lower20 = values[lower20Index];
  const upper90 = values[upper90Index];
  const min = values[0];
  const max = values[values.length - 1];

  if (score <= lower20) {
    const ratio = (score - min) / (lower20 - min);
    return interpolateColor("#08519c", "#3182bd", ratio); // Dunkelblau → Mittelblau
  } else if (score <= upper90) {
    const ratio = (score - lower20) / (upper90 - lower20);
    return interpolateColor("#3182bd", "#9ecae1", ratio); // Mittelblau → Hellblau
  } else {
    const ratio = (score - upper90) / (max - upper90);
    return interpolateColor("#9ecae1", "#deebf7", ratio); // Hellblau → Sehr hellblau
  }
}

// Hilfsfunktion für lineare Farbinterpolation zwischen zwei Hex-Farben
function interpolateColor(color1, color2, factor) {
  const c1 = parseInt(color1.slice(1), 16);
  const c2 = parseInt(color2.slice(1), 16);

  const r1 = (c1 >> 16) & 0xff;
  const g1 = (c1 >> 8) & 0xff;
  const b1 = c1 & 0xff;

  const r2 = (c2 >> 16) & 0xff;
  const g2 = (c2 >> 8) & 0xff;
  const b2 = c2 & 0xff;

  const r = Math.round(r1 + factor * (r2 - r1));
  const g = Math.round(g1 + factor * (g2 - g1));
  const b = Math.round(b1 + factor * (b2 - b1));

  return `rgb(${r},${g},${b})`;
}

function getCostBasedFillColor(cost) {
  if (
    isNaN(cost) ||
    !window.electricityDataMap ||
    !window.currentElectricityKey
  ) return "#eeeeee";

  const values = Object.values(window.electricityDataMap[window.currentElectricityKey] || {})
    .map(d => parseFloat(d["Total Costs [€/tCO2]"]))
    .filter(v => !isNaN(v))
    .sort((a, b) => a - b);
  if (values.length < 2) return "#eeeeee";

  const lower20Index = Math.floor(values.length * 0.2);
  const upper90Index = Math.floor(values.length * 0.9);

  const min = values[0];
  const lower20 = values[lower20Index];
  const upper90 = values[upper90Index];
  const max = values[values.length - 1];

  if (cost <= lower20) {
    const ratio = (cost - min) / (lower20 - min);
    return interpolateColor("#5ca82e", "#c0e788", ratio); // Grün → Hellgrün
  } else if (cost <= upper90) {
    const ratio = (cost - lower20) / (upper90 - lower20);
    return interpolateColor("#f5ff99", "#ff7043", ratio); // Gelb → Hellrot
  } else {
    const ratio = (cost - upper90) / (max - upper90);
    return interpolateColor("#ff7043", "#800026", ratio); // Hellrot → Dunkelrot
  }
}

// Ladefunktion für alle Electricity CSV-Dateien mit Min/Max-Bestimmung für Kosten
function loadElectricityDataFiles() {
  // Reset cost range bevor geladen wird
  window.costRange = { min: Infinity, max: -Infinity };
  const files = ["ESS", "ESM", "ESBHP", "ELS", "ELM", "ELB"];
  const promises = files.map(key =>
    fetch(`data/${key}.csv`)
      .then(response => response.text())
      .then(text => {
        const lines = text.split('\n').filter(line => line.trim() !== "");
        const header = lines[0].split(';');
        const idIndex = header.findIndex(h => h.trim() === "NUTS_ID");

        const data = {};
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(';');
          const id = cols[idIndex]?.trim();
          if (!id) continue;

          data[id] = {};
          for (let j = 0; j < header.length; j++) {
            const keyName = header[j].trim();
            const val = cols[j]?.trim();
            data[id][keyName] = val;

            if (keyName === "Total Costs [€/tCO2]") {
              const num = parseFloat(val);
              if (!isNaN(num)) {
                if (num < window.costRange.min) window.costRange.min = num;
                if (num > window.costRange.max) window.costRange.max = num;
              }
            }
          }
        }

        window.electricityDataMap[key] = data;
      })
  );

  // Nach allen Datensätzen: Mapping laden und County-Namen ergänzen
  return Promise.all(promises).then(() => {
    return fetch("data/mapping.csv")
      .then(r => r.text())
      .then(text => {
        const lines = text.split("\n").filter(line => line.trim() !== "");
        const header = lines[0].split(";");
        const idIndex = header.findIndex(h => h.trim() === "NUTS_ID");
        const nameIndex = header.findIndex(h => h.trim().toLowerCase() === "verweis");

        const nutsIdToName = {};
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(";");
          const id = cols[idIndex]?.trim();
          const name = cols[nameIndex]?.trim();
          if (id && name) {
            nutsIdToName[id] = name;
          }
        }

        // Optional: global speichern
        window.electricityCountyMapping = nutsIdToName;

        // Füge zu jedem Datensatz den County-Namen hinzu
        Object.values(window.electricityDataMap).forEach(dataset => {
          Object.entries(dataset).forEach(([id, entry]) => {
            entry.County = nutsIdToName[id] || "—";
          });
        });

        // Update KPI tiles after data is loaded
        updateElectricityKPIs();
      });
  });
}

// Helper function to get color for electricity map (can be customized as needed)
function getElectricityColor(cost) {
    // Example: interpolate between yellow and red, similar to getCostBasedFillColor
    if (
        isNaN(cost) ||
        !window.costRange ||
        isNaN(window.costRange.min) ||
        isNaN(window.costRange.max) ||
        window.costRange.max === window.costRange.min
    ) return "#eeeeee";

    const { min, max } = window.costRange;
    const clamped = Math.max(min, Math.min(cost, max));
    const ratio = (clamped - min) / (max - min);
    return interpolateColor("#ffffcc", "#800026", ratio);
}

// Electricity Threshold Filterfunktion
window.applyElectricityThresholdFilters = function () {
  const data = window.electricityDataMap[window.currentElectricityKey];
  if (!data || !window.electricityLayers) return;

  const filteredEntries = [];

  window.electricityLayers.forEach(layer => {
    const id = layer.feature?.properties?.NUTS_ID?.trim();
    const entry = data[id];
    if (!entry) return;

    let visible = true;
    for (const [key, threshold] of Object.entries(window.electricityThresholds)) {
      const raw = entry[key];
      const val = parseFloat(raw?.replace(",", "."));
      if (isNaN(val)) {
        visible = false;
        break;
      }
      if (key === "Score_technology") {
        if (val < threshold) {
          visible = false;
          break;
        }
      } else {
        if (val > threshold) {
          visible = false;
          break;
        }
      }
    }

    const fillColor = visible ? getCostBasedFillColor(parseFloat(entry["Total Costs [€/tCO2]"])) : "#dddddd";
    layer.setStyle({
      fillColor: fillColor,
      fillOpacity: visible ? 0.7 : 0.2
    });

    if (visible) filteredEntries.push(entry);
  });

  // Tabelle aktualisieren
  const table = document.getElementById("electricity-table");
  if (table) {
    const tbody = table.querySelector("tbody");
    if (tbody) {
      tbody.innerHTML = "";
      filteredEntries.forEach(entry => {
        const row = document.createElement("tr");
        const keys = [
          "County",
          "Total Costs [€/tCO2]",
          "Cost of Electricity [€/tCO2]",
          "Cost of Heat - CAPEX [€/tCO2]",
          "Additional Costs [€/tCO2]",
          "CAPEX DAC [€/tCO2]",
          "Score_technology"
        ];
        keys.forEach(key => {
          const cell = document.createElement("td");
          cell.textContent = entry[key] ?? "—";
          row.appendChild(cell);
        });
        tbody.appendChild(row);
      });
    }
  }
};


// Umschaltfunktion für Electricity Dataset
window.switchElectricityDataset = function (key) {
  console.log("Switching dataset to:", key);

  if (!window.electricityDataMap[key]) {
    console.warn("Dataset not found for key:", key);
    return;
  }

  window.currentElectricityKey = key;
  console.log("Current electricity key set to:", window.currentElectricityKey);

  // Update KPI tiles
  console.log("Updating KPI tiles...");
  updateElectricityKPIs();

  // Update map layers
  if (window.electricityLayers && window.electricityDataMap[key]) {
    console.log("Updating map layers...");
    window.electricityLayers.forEach(layer => {
      const id = layer.feature?.properties?.NUTS_ID;
      const data = window.electricityDataMap[key][id];
      if (data) {
        const cost = parseFloat(data["Total Costs [€/tCO2]"]);
        layer.setStyle({
          fillOpacity: 0.7,
          fillColor: getCostBasedFillColor(cost)
        });
        console.log(`Layer updated for NUTS_ID ${id}:`, data);
      } else {
        layer.setStyle({
          fillOpacity: 0.2,
          fillColor: "#dddddd"
        });
        console.warn(`No data found for NUTS_ID ${id}`);
      }
    });
  } else {
    console.warn("No layers or data available for the selected dataset.");
  }

  // Update table
  console.log("Updating electricity table...");
  updateElectricityTable(window.electricityDataMap[key]);

  // Remove focus from the dropdown
  document.activeElement.blur();
  console.log("Dropdown focus removed.");

  // Ensure Leaflet dragging works after dropdown interaction
  setTimeout(() => {
    if (typeof map !== "undefined" && map && map.dragging) {
      map.dragging.enable();
      console.log("Leaflet dragging re-enabled.");
    }
  }, 100);
};

// Table update function for electricity, supports filtered data as argument
function updateElectricityTable(data) {
    const table = document.getElementById("electricity-table");
    if (table) {
        const thead = table.querySelector("thead");
        const tbody = table.querySelector("tbody");
        if (thead && tbody) {
            const headers = [
                "County",
                "Total Costs [€/tCO2]",
                "Cost of Electricity [€/tCO2]",
                "Cost of Heat - CAPEX [€/tCO2]",
                "Additional Costs [€/tCO2]",
                "CAPEX DAC [€/tCO2]",
                "Score_technology"
            ];

            // Build headers with sorting
            thead.innerHTML = "";
            const headerRow = document.createElement("tr");
            headers.forEach(header => {
                const th = document.createElement("th");
                th.textContent = header;
                th.style.cursor = "pointer";
                th.dataset.sortOrder = "";
                th.onclick = () => {
                    const rows = Array.from(tbody.querySelectorAll("tr"));
                    const colIndex = headers.indexOf(header);
                    const currentOrder = th.dataset.sortOrder;
                    const newOrder = currentOrder === "asc" ? "desc" : "asc";
                    table.querySelectorAll("th").forEach(h => {
                        h.dataset.sortOrder = "";
                        h.textContent = h.textContent.replace(" ▲", "").replace(" ▼", "");
                    });
                    th.dataset.sortOrder = newOrder;
                    th.textContent = `${header} ${newOrder === "asc" ? "▲" : "▼"}`;
                    const sorted = rows.sort((a, b) => {
                        const valA = a.children[colIndex].textContent.trim();
                        const valB = b.children[colIndex].textContent.trim();
                        const aVal = parseFloat(valA.replace(",", ".")) || valA;
                        const bVal = parseFloat(valB.replace(",", ".")) || valB;
                        if (aVal < bVal) return newOrder === "asc" ? -1 : 1;
                        if (aVal > bVal) return newOrder === "asc" ? 1 : -1;
                        return 0;
                    });
                    tbody.innerHTML = "";
                    sorted.forEach(row => tbody.appendChild(row));
                };
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);

            // Insert data rows
            tbody.innerHTML = "";
            const rows = Array.isArray(data)
                ? data
                : Object.values(window.electricityDataMap[window.currentElectricityKey]);
            rows.forEach(entry => {
                const row = document.createElement("tr");
                headers.forEach(key => {
                    const cell = document.createElement("td");
                    cell.textContent = entry[key] ?? "—";
                    row.appendChild(cell);
                });
                tbody.appendChild(row);
            });
        }
    }
}

// Hauptladefunktion für die Electricity Map (initiale Farbe kostenbasiert)
window.loadElectricityMap = function () {
  loadElectricityDataFiles().then(() => {
    const map = L.map('electricity-map', {
      scrollWheelZoom: false,
      touchZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      zoomSnap: 0.1,
      zoomDelta: 0.5,
      zoomControl: false
    }).setView([51.1657, 10.4515], 6.5);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    fetch('data/map.geojson')
      .then(response => response.json())
      .then(geo => {
        L.geoJSON(geo, {
          style: function (feature) {
            const id = feature.properties?.NUTS_ID?.trim();
            const entry = window.electricityDataMap[window.currentElectricityKey]?.[id];
            const cost = parseFloat(entry?.["Total Costs [€/tCO2]"]);
            return {
              color: "#333",
              weight: 1,
              fillColor: getCostBasedFillColor(cost),
              fillOpacity: 0.7
            };
          },
          // Verwende die neue InfoPanel-Funktion für Electricity Map
          onEachFeature: onEachFeatureElectricity
        }).addTo(map);

        // Layer-Referenzen sammeln, damit Filter funktionieren
        // (Leaflet speichert die Layer-Objekte intern, daher hier explizit sammeln)
        window.electricityLayers = [];
        map.eachLayer(function(layer) {
          // Prüfe, ob es sich um einen GeoJSON-Layer handelt (Polygon)
          if (layer.feature && layer.feature.properties && layer.feature.properties.NUTS_ID) {
            window.electricityLayers.push(layer);
          }
        });


        // Tabelle initial befüllen
        const table = document.getElementById("electricity-table");
        if (table) {
          const tbody = table.querySelector("tbody");
          if (tbody) {
            tbody.innerHTML = "";
            const data = window.electricityDataMap[window.currentElectricityKey];
            Object.values(data).forEach(entry => {
              const row = document.createElement("tr");
              const keys = [
                "County",
                "Total Costs [€/tCO2]",
                "Cost of Electricity [€/tCO2]",
                "Cost of Heat - CAPEX [€/tCO2]",
                "Additional Costs [€/tCO2]",
                "CAPEX DAC [€/tCO2]",
                "Score_technology"
              ];
              keys.forEach(key => {
                const cell = document.createElement("td");
                cell.textContent = entry[key] ?? "—";
                row.appendChild(cell);
              });
              tbody.appendChild(row);
            });
          }
        }

        // Set min/max legend values after map and filters have been applied
        const minElem = document.getElementById("electricity-cost-min");
        const maxElem = document.getElementById("electricity-cost-max");
        if (minElem && maxElem && window.costRange) {
          minElem.textContent = window.costRange.min.toFixed(2);
          maxElem.textContent = window.costRange.max.toFixed(2);
        }
      });
      updateElectricityTable();

    // --- Dropdown Dragging Handling hinzufügen (Initialisierungsteil) ---
    const selector = document.getElementById("electricityDatasetSelector");
    if (selector) {
      selector.addEventListener("mousedown", (e) => {
        if (map && map.dragging) {
          map.dragging.disable();
        }
      });
      selector.addEventListener("mouseup", (e) => {
        if (map && map.dragging) {
          setTimeout(() => map.dragging.enable(), 100);
        }
      });
    }
  });
};


// Zentrale Filterfunktion, die alle Schwellenwerte kombiniert prüft
window.applyCombinedFilters = function () {
  const kpiContainer = document.getElementById("kpi-container");
  if (kpiContainer) {
    kpiContainer.innerHTML = ""; // Vorherige Kacheln löschen
  }
  const filteredEntries = [];

  if (!window.secondaryMapLayers || !window.iwhData) return;

  // Berechne scoreValues für die Farbskala wie in loadSecondaryMap
  const scoreValues = Object.values(window.iwhData)
    .map(entry => parseFloat(entry["Weighted Score"]))
    .filter(v => !isNaN(v));

  window.secondaryMapLayers.forEach(layer => {
      const nutsId = layer.feature?.properties?.NUTS_ID?.trim();
      const iwh = window.iwhData?.[nutsId];

      if (!iwh) return;

      const weighted = parseFloat(iwh["Weighted Score"]);
      const best = parseFloat(iwh["Best Score"]);
      const direct = parseInt(iwh["Direct Connections"]);
      const wasteHeat = parseFloat(iwh["Total Waste Heat"]) / 1000000; // Convert to MWh

      const passesWeighted = !isNaN(weighted) && weighted >= window.currentWeightedThreshold;
      const passesBest = !isNaN(best) && best >= window.currentBestThreshold;
      const passesDirect = !isNaN(direct) && direct >= window.currentDirectThreshold;
      const passesWasteHeat = !isNaN(wasteHeat) && wasteHeat >= window.currentTotalWasteHeatThreshold;

      const visible = passesWeighted && passesBest && passesDirect && passesWasteHeat;

      if (visible) {
          let score = parseFloat(iwh?.["Weighted Score"]);
          const fill = getIwhColor(score, scoreValues);

          layer.setStyle({
              fillColor: fill,
              fillOpacity: 0.7,
              color: "#333",
              weight: 1
          });

          filteredEntries.push(iwh);
      } else {
          // Ausgegrauter Stil
          layer.setStyle({
              fillColor: "#ccc",
              fillOpacity: 0.3,
              color: "#999",
              weight: 0.5
          });
      }
  });

  const scores = filteredEntries
    .map(entry => parseFloat(entry["Weighted Score"]))
    .filter(score => !isNaN(score) && score > 0);

  const averageWeightedScore = scores.length
    ? (scores.reduce((sum, val) => sum + val, 0) / scores.length).toFixed(2)
    : "—";

  const sumSources = filteredEntries
    .map(entry => parseInt(entry["Number of Sources"]))
    .filter(val => !isNaN(val))
    .reduce((acc, val) => acc + val, 0);

  const sumDirectConnections = filteredEntries
    .map(entry => parseInt(entry["Direct Connections"]))
    .filter(val => !isNaN(val))
    .reduce((acc, val) => acc + val, 0);

  if (kpiContainer) {
    kpiContainer.innerHTML += `
      <div class="mini-kpi">
        <div class="mini-kpi-icon">⚖️</div>
        <div class="mini-kpi-label">Avg. Weighted Score</div>
        <div class="mini-kpi-value">${averageWeightedScore}</div>
      </div>
      <div class="mini-kpi">
        <div class="mini-kpi-icon">🛠️</div>
        <div class="mini-kpi-label">Total Sources</div>
        <div class="mini-kpi-value">${sumSources}</div>
      </div>
      <div class="mini-kpi">
        <div class="mini-kpi-icon">🔗</div>
        <div class="mini-kpi-label">Direct Connections</div>
        <div class="mini-kpi-value">${sumDirectConnections}</div>
      </div>
    `;
    const visibleBox = document.createElement("div");
    visibleBox.className = "mini-kpi";
    visibleBox.id = "visible-counties-kpi";
    visibleBox.innerHTML = `
      <div class="mini-kpi-icon">📍</div>
      <div class="mini-kpi-label">Visible Counties</div>
      <div class="mini-kpi-value">${filteredEntries.length}</div>
    `;
    kpiContainer.appendChild(visibleBox);
  }

  const table = document.getElementById("iwh-table");
  if (table) {
    const tbody = table.querySelector("tbody");
    if (tbody) {
      tbody.innerHTML = ""; // clear existing rows
      filteredEntries.forEach(entry => {
        const row = document.createElement("tr");
        const keys = ["County", "Weighted Score", "Best Score", "Direct Connections", "Total Waste Heat"];
        keys.forEach(key => {
          const cell = document.createElement("td");
          let value = entry[key];
          if (key === "Total Waste Heat") {
            const val = parseFloat(value);
            value = isNaN(val) ? "—" : Math.round(val / 1000000); // Convert to TWh
          }
          cell.textContent = value;
          row.appendChild(cell);
        });
        tbody.appendChild(row);
      });
    }
  }

  const visibleCounties = filteredEntries
    .map(entry => entry["County"])
    .filter(name => typeof name === "string");

  const visibleBox = document.getElementById("visible-counties-kpi");
  if (visibleBox) {
    const valueElem = visibleBox.querySelector(".mini-kpi-value");
    if (valueElem) {
      valueElem.textContent = filteredEntries.length;
    }
  }

  return visibleCounties;
};

// Setter für Schwellenwerte und Anwendung der Filter
window.setThresholdsAndApplyFilters = function(weighted, best, direct, wasteHeat) {
  window.currentWeightedThreshold = weighted;
  window.currentBestThreshold = best;
  window.currentDirectThreshold = direct;
  window.currentTotalWasteHeatThreshold = wasteHeat;

  return window.applyCombinedFilters();
};

window.resetSliderValues = function () {
  // Setze alle relevanten Slider für die Secondary Map zurück auf 0
  const secondarySliders = [
      'weighted-score-slider-hover',
      'best-score-slider-hover',
      'total-heat-hover',
      'direct-connections-hover'
  ];

  secondarySliders.forEach(id => {
      const slider = document.getElementById(id);
      if (slider) {
          slider.value = 0;
      }
  });

  // Optional: Filter nach dem Reset neu anwenden
  if (typeof applySecondaryFilters === 'function') {
      applySecondaryFilters();
  }
};

// Farbskala für IWH Weighted Score: sehr hellgrün → mittelgrün → dunkelgrün, mit 20%- und 90%-Quantil
function getIwhColor(weightedScore, values) {
  if (isNaN(weightedScore)) return "#eeeeee";

  const sortedValues = [...values].sort((a, b) => a - b);
  const lower20 = sortedValues[Math.floor(sortedValues.length * 0.2)];
  const upper90 = sortedValues[Math.floor(sortedValues.length * 0.9)];
  const min = sortedValues[0];
  const max = sortedValues[sortedValues.length - 1];

  if (weightedScore <= lower20) {
    const ratio = (weightedScore - min) / (lower20 - min);
    return interpolateColor("#fff9c4", "#f0e68c", ratio); // very light yellow → light yellow
  } else if (weightedScore <= upper90) {
    const ratio = (weightedScore - lower20) / (upper90 - lower20);
    return interpolateColor("#f0e68c", "#66bb6a", ratio); // light yellow → medium green
  } else {
    const ratio = (weightedScore - upper90) / (max - upper90);
    return interpolateColor("#66bb6a", "#1b5e20", ratio); // mittelgrün → dunkelgrün
  }
}

// Hauptfunktion zum Laden der Karte mit GeoJSON-Daten und CSV-Verknüpfung
window.loadSecondaryMap = function () {
  console.log("DEBUG: loadSecondaryMap wurde gestartet");
  loadIwhData().then(iwhData => {
    window.iwhData = iwhData;
    console.log("DEBUG: iwhData geladen", Object.keys(window.iwhData || {}).length);
    // Durchschnittlicher Weighted Score berechnen (ohne 0-Werte)
    const scores = Object.values(iwhData)
      .map(entry => parseFloat(entry["Weighted Score"]))
      .filter(score => !isNaN(score) && score > 0);

    const averageWeightedScore = scores.length
      ? (scores.reduce((sum, val) => sum + val, 0) / scores.length).toFixed(2)
      : "—";

    // Calculate sumSources after averageWeightedScore
    const sumSources = Object.values(iwhData)
      .map(entry => parseInt(entry["Number of Sources"]))
      .filter(val => !isNaN(val))
      .reduce((acc, val) => acc + val, 0);

    window.averageWeightedScore = averageWeightedScore;
    // Dynamisch KPI-Kachel einfügen
    const kpiContainer = document.getElementById("kpi-container");
    if (kpiContainer) {
      const kpiBox = document.createElement("div");
      kpiBox.className = "mini-kpi";
      kpiBox.innerHTML = `
        <div class="mini-kpi-icon">⚖️</div>
        <div class="mini-kpi-label">Avg. Weighted Score</div>
        <div class="mini-kpi-value">${averageWeightedScore}</div>
      `;
      kpiContainer.appendChild(kpiBox);

      // Add KPI box for sumSources
      const sourcesBox = document.createElement("div");
      sourcesBox.className = "mini-kpi";
      sourcesBox.innerHTML = `
        <div class="mini-kpi-icon">🛠️</div>
        <div class="mini-kpi-label">Total Sources</div>
        <div class="mini-kpi-value">${sumSources}</div>
      `;
      kpiContainer.appendChild(sourcesBox);

      // Add KPI box for sumDirectConnections
      const sumDirectConnections = Object.values(iwhData)
        .map(entry => parseInt(entry["Direct Connections"]))
        .filter(val => !isNaN(val))
        .reduce((acc, val) => acc + val, 0);

      const connectionsBox = document.createElement("div");
      connectionsBox.className = "mini-kpi";
      connectionsBox.innerHTML = `
        <div class="mini-kpi-icon">🔗</div>
        <div class="mini-kpi-label">Direct Connections</div>
        <div class="mini-kpi-value">${sumDirectConnections}</div>
      `;
      kpiContainer.appendChild(connectionsBox);

      // Anzahl der Gesamtlandkreise (initiale Sichtbarkeit)
      const totalCounties = Object.keys(window.iwhData || {}).length;

      const visibleBox = document.createElement("div");
      visibleBox.className = "mini-kpi";
      visibleBox.id = "visible-counties-kpi";
      visibleBox.innerHTML = `
        <div class="mini-kpi-icon">📍</div>
        <div class="mini-kpi-label">Visible Counties</div>
        <div class="mini-kpi-value">${totalCounties}</div>
      `;
      kpiContainer.appendChild(visibleBox);
    } else {
      console.warn("KPI container not found.");
    }

    const secondaryMap = L.map('secondary-map', {
      scrollWheelZoom: false,
      touchZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      zoomSnap: 0.1,
      zoomDelta: 0.5,
      zoomControl: false
    }).setView([51.1657, 10.4515], 6.5);

    L.control.zoom({ position: 'bottomright' }).addTo(secondaryMap);

    fetch('data/map.geojson')
      .then(response => response.json())
      .then(data => {
        const geoNutsIds = data.features.map(f => f.properties?.NUTS_ID?.trim());
        console.log("Alle NUTS_IDs in GeoJSON:", geoNutsIds);

        // --- Neuer kontinuierlicher Farbverlauf für Weighted Score ---
        const scoreValues = Object.values(iwhData)
          .map(entry => parseFloat(entry["Weighted Score"]))
          .filter(v => !isNaN(v));

        L.geoJSON(data, {
          style: function (feature) {
            const nutsId = feature.properties?.NUTS_ID?.trim();
            const iwh = window.iwhData?.[nutsId];
            const score = parseFloat(iwh?.["Weighted Score"]);
            const fill = getIwhColor(score, scoreValues);
            return {
              color: "#333",
              weight: 1,
              fillColor: fill,
              fillOpacity: 0.7
            };
          },
          onEachFeature: function (feature, layer) {
            const nutsId = feature.properties?.NUTS_ID?.trim();
            const iwh = window.iwhData?.[nutsId];
            const fallbackName = feature.properties?.name || "Unnamed Feature";

            layer.on('click', () => {
              const panel = document.getElementById("info-panel");
              if (!panel) return;

              if (panel.style.display === "block" && document.getElementById("panel-title").textContent === (iwh?.County || fallbackName)) {
                panel.style.display = "none";
                return;
              }

              console.log("Klick auf:", nutsId, "→ Score:", iwh?.["Weighted Score"]);

              document.getElementById("panel-title").textContent = iwh?.County || fallbackName;
              panel.style.display = "block";

              const closeButton = panel.querySelector("button[onclick='closePanel()']");
              if (closeButton && !closeButton.dataset.bound) {
                closeButton.addEventListener("click", () => {
                  panel.style.display = "none";
                });
                closeButton.dataset.bound = "true";
              }

              let infoText = "";
              if (iwh) {
                const hiddenKeys = ["NUTS_ID", "County_Code", "County"];
                const displayOrder = [
                  "Weighted Score",
                  "Direct Connections",
                  "Number of Sources",
                  "Total Waste Heat",
                  "Best Score",
                  "Amount Waste Heat Best Score"
                ];

                for (const key of displayOrder) {
                  if (hiddenKeys.includes(key)) continue;
                  let val = iwh[key];
                  let displayVal = val;

                  if (key === "Total Waste Heat" || key === "Amount Waste Heat Best Score") {
                    const parsedVal = parseFloat(val);
                    displayVal = isNaN(parsedVal) ? "—" : (parsedVal / 1_000_000).toFixed(3) + " TWh";
                  }

                  infoText += `<strong>${key}:</strong> ${displayVal ?? "—"}<br>`;
                }
              } else {
                infoText = `<em>Keine IWH-Daten für ${nutsId || "unbekannt"} gefunden</em>`;
              }

              const panelContent = document.getElementById("panel-population");
              if (panelContent) {
                panelContent.innerHTML = infoText;
              }
            });

            layer.on('mouseover', () => layer.setStyle({ fillOpacity: 1 }));
            layer.on('mouseout', () => layer.setStyle({ fillOpacity: 0.7 }));

            window.secondaryMapLayers.push(layer);
          }
        }).addTo(secondaryMap);
      });
  });
};

// Total Score Map Ladefunktion
window.loadTotalScoreMap = function () {
  fetch('data/totalscore.csv')
    .then(response => response.text())
    .then(text => {
      const lines = text.split('\n').filter(l => l.trim() !== "");
      const header = lines[0].split(';');
      const idIndex = header.findIndex(h => h.trim() === "NUTS_ID");

      const data = {};
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(';');
        const id = cols[idIndex]?.trim();
        if (!id) continue;

        data[id] = {};
        for (let j = 0; j < header.length; j++) {
          data[id][header[j].trim()] = cols[j]?.trim();
        }
      }

      // Nach dem Parsen der CSV-Datei:
      window.totalScoreData = data;
      window.totalScoreLayers = [];

      const map = L.map('totalscore-map', {
        scrollWheelZoom: false,
        touchZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        zoomSnap: 0.1,
        zoomDelta: 0.5,
        zoomControl: false,
        preferCanvas: true,
        renderer: L.canvas({ padding: 0.5 }),
        backgroundColor: "#ffffff"
      }).setView([51.1657, 10.4515], 6.5);
      // Set background color directly in case option does not work
      document.getElementById("totalscore-map").style.backgroundColor = "#ffffff";
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      fetch('data/map.geojson')
        .then(response => response.json())
        .then(geo => {
          L.geoJSON(geo, {
            style: function (feature) {
              const id = feature.properties?.NUTS_ID?.trim();
              const entry = data[id];
              const score = parseFloat(entry?.["Total_Score"]);
              return {
                color: "#444",
                weight: 1,
                fillColor: getFillColor(score),
                fillOpacity: 0.7
              };
            },
            onEachFeature: function (feature, layer) {
              const id = feature.properties?.NUTS_ID?.trim();
              const entry = data[id];

              // Bundesland-Filter: Setze visibleState Property im Feature.
              const bundesland = feature.properties?.state?.trim() || ""; // fallback
              feature.properties.visibleState = window.selectedStates.length === 0 || window.selectedStates.includes(bundesland);

              // Beim Anlegen der GeoJSON-Features:
              window.totalScoreLayers.push(layer);

              layer.on('click', () => {
                const panel = document.getElementById("totalscore-info-panel");
                if (!panel) return;

                const currentId = feature.properties?.NUTS_ID?.trim();
                if (lastOpenedTotalScoreCountyId === currentId) {
                  panel.style.display = "none";
                  lastOpenedTotalScoreCountyId = null;
                  return;
                }

                lastOpenedTotalScoreCountyId = currentId;
                document.getElementById("totalscore-panel-title").textContent = entry?.County || "Unknown";

                let content = "";
                if (entry) {
                  const displayKeys = [
                    { key: "Total_Score", label: "Total Score" },
                    { key: "IWH_Score", label: "Waste Heat Score" },
                    { key: "E_Score", label: "Electricity Score" },
                    { key: "RES_Score", label: "Renewable Energy Systems Score" },
                    { key: "TP_Score", label: "CO2 Transport Score" },
                    { key: "LU_Score", label: "Land Usage Score" }
                  ];
                  displayKeys.forEach(({ key, label }) => {
                    const value = entry[key];
                    content += `<strong>${label}:</strong> ${value ?? "—"}<br>`;
                  });
                }
                const info = document.getElementById("totalscore-panel-content");
                if (info) info.innerHTML = content;

                panel.style.display = "block";
              });

              layer.on('mouseover', () => layer.setStyle({ fillOpacity: 1 }));
              layer.on('mouseout', () => layer.setStyle({ fillOpacity: 0.7 }));
            }
          }).addTo(map);

          // Wende initial die Filter an, falls vorhanden
          window.applyTotalScoreFilters();
        });

      // Initiales Anwenden der Filter basierend auf den aktuellen Slidern
      window.collectTotalScoreThresholdsAndApply();
    });
};

// Neue Funktion: IWH Map analog zu loadTotalScoreMap
window.loadIwhMap = function () {
  fetch('data/IWH_data.csv')
    .then(response => response.text())
    .then(text => {
      const lines = text.split('\n').filter(l => l.trim() !== "");
      const header = lines[0].split(';');
      const idIndex = header.findIndex(h => h.trim() === "NUTS_ID");

      const data = {};
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(';');
        const id = cols[idIndex]?.trim();
        if (!id) continue;

        data[id] = {};
        for (let j = 0; j < header.length; j++) {
          data[id][header[j].trim()] = cols[j]?.trim();
        }
      }

      // Nach dem Parsen der CSV-Datei:
      window.iwhData = data;
      window.iwhLayers = [];

      // KPI-Container initialisieren
      const kpiContainer = document.getElementById("iwh-kpi-container");
      if (kpiContainer) {
        kpiContainer.innerHTML = ""; // Vorherige Kacheln löschen

        const entries = Object.values(window.iwhData);

        const scores = entries
          .map(entry => parseFloat(entry["Weighted Score"]))
          .filter(score => !isNaN(score) && score > 0);

        const averageWeightedScore = scores.length
          ? (scores.reduce((sum, val) => sum + val, 0) / scores.length).toFixed(2)
          : "–";

        const sumSources = entries
          .map(entry => parseInt(entry["Number of Sources"]))
          .filter(val => !isNaN(val))
          .reduce((acc, val) => acc + val, 0);

        const sumDirectConnections = entries
          .filter(entry => entry && typeof entry["Direct Connections"] !== "undefined")
          .map(entry => parseInt(entry["Direct Connections"]))
          .filter(val => !isNaN(val))
          .reduce((acc, val) => acc + val, 0);

        kpiContainer.innerHTML += `
          <div class="mini-kpi">
            <div class="mini-kpi-icon">⚖️</div>
            <div class="mini-kpi-label">Avg. Weighted Score</div>
            <div class="mini-kpi-value">${averageWeightedScore}</div>
          </div>
          <div class="mini-kpi">
            <div class="mini-kpi-icon">🛠️</div>
            <div class="mini-kpi-label">Total Sources</div>
            <div class="mini-kpi-value">${sumSources}</div>
          </div>
          <div class="mini-kpi">
            <div class="mini-kpi-icon">🔗</div>
            <div class="mini-kpi-label">Direct Connections</div>
            <div class="mini-kpi-value">${sumDirectConnections}</div>
          </div>
        `;

        const totalCounties = entries.length;
        const visibleBox = document.createElement("div");
        visibleBox.className = "mini-kpi";
        visibleBox.id = "visible-counties-kpi-iwh";
        visibleBox.innerHTML = `
          <div class="mini-kpi-icon">📍</div>
          <div class="mini-kpi-label">Visible Counties</div>
          <div class="mini-kpi-value">${totalCounties}</div>
        `;
        kpiContainer.appendChild(visibleBox);
      }

      const map = L.map('iwh-map', {
        scrollWheelZoom: false,
        touchZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        zoomSnap: 0.1,
        zoomDelta: 0.5,
        zoomControl: false,
        preferCanvas: true,
        renderer: L.canvas({ padding: 0.5 }),
        backgroundColor: "#ffffff"
      }).setView([51.1657, 10.4515], 6.5);
      // Set background color directly in case option does not work
      document.getElementById("iwh-map").style.backgroundColor = "#ffffff";
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      fetch('data/map.geojson')
        .then(response => response.json())
        .then(geo => {
          // Farbskala vorbereiten
          const scoreValues = Object.values(data)
            .map(entry => parseFloat(entry["Weighted Score"]))
            .filter(v => !isNaN(v));
          L.geoJSON(geo, {
            style: function (feature) {
              const id = feature.properties?.NUTS_ID?.trim();
              const entry = data[id];
              const score = parseFloat(entry?.["Weighted Score"]);
              // Farbskala wie getIwhColor
              if (isNaN(score) || scoreValues.length < 2) {
                return {
                  color: "#444",
                  weight: 1,
                  fillColor: "#eeeeee",
                  fillOpacity: 0.7
                };
              }
              // getIwhColor
              const sortedValues = [...scoreValues].sort((a, b) => a - b);
              const lower20 = sortedValues[Math.floor(sortedValues.length * 0.2)];
              const upper90 = sortedValues[Math.floor(sortedValues.length * 0.9)];
              const min = sortedValues[0];
              const max = sortedValues[sortedValues.length - 1];
              let fill;
              if (score <= lower20) {
                const ratio = (score - min) / (lower20 - min);
                fill = interpolateColor("#fff9c4", "#f0e68c", ratio);
              } else if (score <= upper90) {
                const ratio = (score - lower20) / (upper90 - lower20);
                fill = interpolateColor("#f0e68c", "#66bb6a", ratio);
              } else {
                const ratio = (score - upper90) / (max - upper90);
                fill = interpolateColor("#66bb6a", "#1b5e20", ratio);
              }
              return {
                color: "#444",
                weight: 1,
                fillColor: fill,
                fillOpacity: 0.7
              };
            },
            onEachFeature: function (feature, layer) {
              const id = feature.properties?.NUTS_ID?.trim();
              const entry = data[id];

              // Sichtbarkeit: immer sichtbar initial
              feature.properties.visible = true;

              // Beim Anlegen der GeoJSON-Features:
              window.iwhLayers.push(layer);

              layer.on('click', () => {
                const panel = document.getElementById("iwh-info-panel");
                if (!panel) return;

                // Toggle schließen wie bei TotalScore
                if (panel.style.display === "block" && document.getElementById("iwh-panel-title").textContent === (entry?.County || "Unknown")) {
                  panel.style.display = "none";
                  return;
                }
                document.getElementById("iwh-panel-title").textContent = entry?.County || "Unknown";

                let content = "";
                if (entry) {
                  // Tabelle: "County", "Weighted Score", "Best Score", "Direct Connections", "Total Waste Heat", "Number of Sources", "Amount Waste Heat Best Score"
                  const displayKeys = [
                    { key: "Weighted Score", label: "Weighted Score" },
                    { key: "Best Score", label: "Best Score" },
                    { key: "Direct Connections", label: "Direct Connections" },
                    { key: "Total Waste Heat", label: "Total Waste Heat" },
                    { key: "Number of Sources", label: "Number of Sources" },
                    { key: "Amount Waste Heat Best Score", label: "Amount Waste Heat Best Score" }
                  ];
                  displayKeys.forEach(({ key, label }) => {
                    let value = entry[key];
                    if (key === "Total Waste Heat" || key === "Amount Waste Heat Best Score") {
                      const val = parseFloat(value);
                      value = isNaN(val) ? "—" : (val / 1_000_000).toFixed(3) + " TWh";
                    }
                    content += `<strong>${label}:</strong> ${value ?? "—"}<br>`;
                  });
                }
                const info = document.getElementById("iwh-panel-content");
                if (info) info.innerHTML = content;

                panel.style.display = "block";
              });

              layer.on('mouseover', () => layer.setStyle({ fillOpacity: 1 }));
              layer.on('mouseout', () => layer.setStyle({ fillOpacity: 0.7 }));
            }
          }).addTo(map);

          // Nach Map-Render: Tabelle initial befüllen
          updateIwhTableByVisibleLayers();

          // Initiale KPI-Kacheln berechnen (nur Weighted Score)
          const filteredEntries = window.iwhLayers
            .filter(layer => layer.feature?.properties?.visible)
            .map(layer => window.iwhData[layer.feature?.properties?.NUTS_ID]);
          const totalVisible = filteredEntries.length;
          const scores = filteredEntries
            .map(entry => parseFloat(entry["Weighted Score"]))
            .filter(score => !isNaN(score) && score > 0);
          const averageWeightedScore = scores.length
            ? (scores.reduce((sum, val) => sum + val, 0) / scores.length).toFixed(2)
            : "–";
          const kpiCountElem = document.getElementById("iwh-kpi-count");
          if (kpiCountElem) kpiCountElem.textContent = totalVisible;
          const kpiAvgElem = document.getElementById("iwh-kpi-average");
          if (kpiAvgElem) kpiAvgElem.textContent = averageWeightedScore;
        });
    });
};

// Tabelle für IWH Map: analog updateTotalScoreTableByVisibleLayers, aber für iwh-data-table und window.iwhLayers
function updateIwhTableByVisibleLayers() {
  if (!window.iwhLayers || window.iwhLayers.length === 0) {
    console.warn("WARNUNG: Keine iwhLayers verfügbar!");
    return;
  }

  const table = document.getElementById("iwh-data-table");
  if (!table || !window.iwhLayers || !window.iwhData) return;
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");
  if (!thead || !tbody) return;

  const headers = ["County", "Weighted Score", "Best Score", "Direct Connections", "Total Waste Heat", "Number of Sources", "Amount Waste Heat Best Score"];

  // Tabellenkopf mit Sortierfunktionalität erstellen
  thead.innerHTML = "";
  const headerRow = document.createElement("tr");
  headers.forEach(header => {
    const th = document.createElement("th");
    th.textContent = header;
    th.style.cursor = "pointer";
    th.dataset.sortOrder = "";
    th.onclick = () => {
      const rows = Array.from(tbody.querySelectorAll("tr"));
      const colIndex = headers.indexOf(header);
      const currentOrder = th.dataset.sortOrder;
      const newOrder = currentOrder === "asc" ? "desc" : "asc";

      table.querySelectorAll("th").forEach(h => {
        h.dataset.sortOrder = "";
        h.textContent = h.textContent.replace(" ▲", "").replace(" ▼", "");
      });

      th.dataset.sortOrder = newOrder;
      th.textContent = `${header} ${newOrder === "asc" ? "▲" : "▼"}`;

      const sorted = rows.sort((a, b) => {
        const valA = a.children[colIndex].textContent.trim();
        const valB = b.children[colIndex].textContent.trim();
        const aVal = parseFloat(valA.replace(",", ".")) || valA;
        const bVal = parseFloat(valB.replace(",", ".")) || valB;
        if (aVal < bVal) return newOrder === "asc" ? -1 : 1;
        if (aVal > bVal) return newOrder === "asc" ? 1 : -1;
        return 0;
      });

      tbody.innerHTML = "";
      sorted.forEach(row => tbody.appendChild(row));
    };
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  tbody.innerHTML = "";

  const rows = window.iwhLayers
    .filter(layer => layer.feature?.properties?.visible)
    .map(layer => {
      const id = layer.feature?.properties?.NUTS_ID?.trim();
      const entry = window.iwhData[id];
      if (!entry) return null;
      const row = document.createElement("tr");
      headers.forEach(key => {
        const cell = document.createElement("td");
        let value = entry[key];
        if (key === "Total Waste Heat" || key === "Amount Waste Heat Best Score") {
          const val = parseFloat(value);
          value = isNaN(val) ? "—" : Math.round(val / 1_000_000);
        }
        cell.textContent = value ?? "—";
        row.appendChild(cell);
      });
      return row;
    }).filter(r => r !== null);

  // Initial auf County aufsteigend sortieren
  rows.sort((a, b) => {
    const valA = a.children[0].textContent.trim();
    const valB = b.children[0].textContent.trim();
    return valA.localeCompare(valB);
  });
  tbody.innerHTML = "";
  rows.forEach(row => tbody.appendChild(row));

  // Setze Initial County Header auf aufsteigend und Dreieck
  const initialTh = thead.querySelector("th");
  if (initialTh) {
    initialTh.dataset.sortOrder = "asc";
    initialTh.textContent = `${headers[0]} ▲`;
  }
}
// Ladefunktion für Land Usage Map (analog zu Secondary Map)
window.loadLandUseMap = function () {
  fetch('data/LandUse_Scoring.csv')
    .then(response => response.text())
    .then(text => {
      const lines = text.split('\n').filter(line => line.trim() !== "");
      const header = lines[0].split(';');
      const idIndex = header.findIndex(h => h.trim() === "NUTS_ID");

      const data = {};
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(';');
        const id = cols[idIndex]?.trim();
        if (!id) continue;

        data[id] = {};
        for (let j = 0; j < header.length; j++) {
          data[id][header[j].trim()] = cols[j]?.trim();
        }
      }

      // Min/Max für "Final Score" bestimmen
      const scoreValues = Object.values(data)
        .map(entry => parseFloat(entry["Final Score"]))
        .filter(v => !isNaN(v));

      const min = Math.min(...scoreValues);
      const max = Math.max(...scoreValues);

      window.landUseScoreRange = { min, max };

      // County-Namen aus mapping.csv ergänzen
      fetch("data/mapping.csv")
        .then(r => r.text())
        .then(mappingText => {
          const lines = mappingText.split("\n").filter(line => line.trim() !== "");
          const header = lines[0].split(";");
          const idIndex = header.findIndex(h => h.trim() === "NUTS_ID");
          const nameIndex = header.findIndex(h => h.trim().toLowerCase() === "verweis");

          const nutsIdToName = {};
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(";");
            const id = cols[idIndex]?.trim();
            const name = cols[nameIndex]?.trim();
            if (id && name) {
              nutsIdToName[id] = name;
            }
          }

          Object.entries(data).forEach(([id, entry]) => {
            entry.County = nutsIdToName[id] || "—";
          });

      // Karte laden
      const map = L.map('landuse-map', {
        scrollWheelZoom: false,
        touchZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        zoomSnap: 0.1,
        zoomDelta: 0.5,
        zoomControl: false
      }).setView([51.1657, 10.4515], 6.5);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      fetch('data/map.geojson')
        .then(response => response.json())
        .then(geo => {
          L.geoJSON(geo, {
            style: function (feature) {
              const id = feature.properties?.NUTS_ID?.trim();
              const entry = data[id];
              const score = parseFloat(entry?.["Final Score"]);

              const values = Object.values(data)
                .map(e => parseFloat(e["Final Score"]))
                .filter(v => !isNaN(v))
                .sort((a, b) => a - b);

              if (values.length < 2) return {
                color: "#333",
                weight: 1,
                fillColor: "#eeeeee",
                fillOpacity: 0.7
              };

              const lower20Index = Math.floor(values.length * 0.2);
              const upper90Index = Math.floor(values.length * 0.9);

              const lower20 = values[lower20Index];
              const upper90 = values[upper90Index];
              const min = values[0];
              const max = values[values.length - 1];

              let fillColor;
              if (score <= lower20) {
                const ratio = (score - min) / (lower20 - min);
                fillColor = interpolateColor("#800026", "#ff7043", ratio); // Dunkelrot → Hellrot
              } else if (score <= upper90) {
                const ratio = (score - lower20) / (upper90 - lower20);
                fillColor = interpolateColor("#ff7043", "#f5ff99", ratio); // Hellrot → Gelb
              } else {
                const ratio = (score - upper90) / (max - upper90);
                fillColor = interpolateColor("#c5e1a5", "#1b5e20", ratio); // Hellgrün → Grün
              }

              return {
                color: "#333",
                weight: 1,
                fillColor: fillColor,
                fillOpacity: 0.7
              };
            },
            onEachFeature: function (feature, layer) {
              const id = feature.properties?.NUTS_ID?.trim();
              const entry = data[id];
              const fallbackName = feature.properties?.name || "Unnamed Feature";

              layer.on('click', () => {
                const panel = document.getElementById("landuse-info-panel");
                if (!panel) return;

                if (panel.style.display === "block" && document.getElementById("landuse-panel-title").textContent === (entry?.County || fallbackName)) {
                  panel.style.display = "none";
                  return;
                }

                document.getElementById("landuse-panel-title").textContent = entry?.County || fallbackName;

                let infoText = "";
                if (entry) {
                  for (const [key, value] of Object.entries(entry)) {
                    if (key === "NUTS_ID" || key === "County") continue;
                    infoText += `<strong>${key}:</strong> ${value ?? "—"}<br>`;
                  }
                } else {
                  infoText = `<em>Keine Landnutzungsdaten für ${id || "unbekannt"} gefunden</em>`;
                }

                const contentElem = document.getElementById("landuse-panel-content");
                if (contentElem) contentElem.innerHTML = infoText;

                panel.style.display = "block";
              });

              layer.on('mouseover', () => layer.setStyle({ fillOpacity: 1 }));
              layer.on('mouseout', () => layer.setStyle({ fillOpacity: 0.7 }));
            }
          }).addTo(map);
        });
        });
    });
};
// Ladefunktion für Transport Map
window.loadTransportMap = function () {
  fetch('data/transport.csv')
    .then(response => response.text())
    .then(text => {
      const lines = text.split('\n').filter(line => line.trim() !== "");
      const header = lines[0].split(';');
      const idIndex = header.findIndex(h => h.trim() === "NUTS_ID");

      const data = {};
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(';');
        const id = cols[idIndex]?.trim();
        if (!id) continue;

        data[id] = {};
        for (let j = 0; j < header.length; j++) {
          data[id][header[j].trim()] = cols[j]?.trim();
        }
      }

      window.transportData = data;

      const distanceValues = Object.values(data)
        .map(entry => parseFloat(entry["Distance to Nearest CO2 Pipeline (km)"]))
        .filter(v => !isNaN(v));
      const min = Math.min(...distanceValues);
      const max = Math.max(...distanceValues);

      const map = L.map('transport-map', {
        scrollWheelZoom: false,
        touchZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        zoomSnap: 0.1,
        zoomDelta: 0.5,
        zoomControl: false
      }).setView([51.1657, 10.4515], 6.5);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      fetch('data/map.geojson')
        .then(response => response.json())
        .then(geo => {
          L.geoJSON(geo, {
            style: function (feature) {
              const id = feature.properties?.NUTS_ID?.trim();
              const entry = data[id];
              const distance = parseFloat(entry?.["Distance to Nearest CO2 Pipeline (km)"]);
              const fill = getTransportColor(distance, min, max);
              return {
                color: "#333",
                weight: 1,
                fillColor: fill,
                fillOpacity: 0.7
              };
            },
           onEachFeature: function (feature, layer) {
              const id = feature.properties?.NUTS_ID?.trim();
              const entry = data[id];
              const fallbackName = feature.properties?.name || "Unnamed Feature";

              layer.on('click', () => {
                  const panel = document.getElementById("transport-info-panel");
                  if (!panel) return;

                  if (panel.style.display === "block" && document.getElementById("transport-panel-title").textContent === (entry?.County || fallbackName)) {
                      panel.style.display = "none";
                      return;
                  }

                  document.getElementById("transport-panel-title").textContent = entry?.County || fallbackName;

                  let infoText = "";
                  if (entry) {
                      for (const [key, value] of Object.entries(entry)) {
                        if (key === "NUTS_ID" || key === "County") continue;
                          infoText += `<strong>${key}:</strong> ${value ?? "—"}<br>`;
                      }
                  } else {
                      infoText = `<em>Keine Transportdaten für ${id || "unbekannt"} gefunden</em>`;
                  }

                  const contentElem = document.getElementById("transport-panel-content");
                  if (contentElem) contentElem.innerHTML = infoText;

                  panel.style.display = "block";
              });

              layer.on('mouseover', () => layer.setStyle({ fillOpacity: 1 }));
              layer.on('mouseout', () => layer.setStyle({ fillOpacity: 0.7 }));

              window.transportLayers.push(layer);
            }
          }).addTo(map);
        });
    });
};
// Ladefunktion für RES Map
window.loadResMap = function () {
  fetch('data/RES.csv')
    .then(response => response.text())
    .then(text => {
      const lines = text.split('\n').filter(line => line.trim() !== "");
      const header = lines[0].split(';');
      const idIndex = header.findIndex(h => h.trim() === "NUTS_ID");

      const data = {};
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(';');
        const id = cols[idIndex]?.trim();
        if (!id) continue;

        data[id] = {};
        for (let j = 0; j < header.length; j++) {
          data[id][header[j].trim()] = cols[j]?.trim();
        }
      }

      window.resData = data;

      const scoreValues = Object.values(data)
        .map(entry => parseFloat(entry["RES Score"]))
        .filter(v => !isNaN(v));
      const min = Math.min(...scoreValues);
      const max = Math.max(...scoreValues);

      const map = L.map('res-map', {
        scrollWheelZoom: false,
        touchZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        zoomSnap: 0.1,
        zoomDelta: 0.5,
        zoomControl: false
      }).setView([51.1657, 10.4515], 6.5);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      fetch('data/map.geojson')
        .then(response => response.json())
        .then(geo => {
          L.geoJSON(geo, {
            style: function (feature) {
              const id = feature.properties?.NUTS_ID?.trim();
              const entry = data[id];
              const score = parseFloat(entry?.["RES Score"]);

              const values = Object.values(window.resData || {})
                .map(entry => parseFloat(entry["RES Score"]))
                .filter(v => !isNaN(v))
                .sort((a, b) => a - b);

              if (values.length < 2) {
                return {
                  color: "#333",
                  weight: 1,
                  fillColor: "#eeeeee",
                  fillOpacity: 0.7
                };
              }

              const lower20Index = Math.floor(values.length * 0.2);
              const upper90Index = Math.floor(values.length * 0.9);

              const lower20 = values[lower20Index];
              const upper90 = values[upper90Index];

              let fillColor;
              if (score <= lower20) {
                const ratio = (score - values[0]) / (lower20 - values[0]);
                fillColor = interpolateColor("#800026", "#ff7043", ratio);
              } else if (score <= upper90) {
                const ratio = (score - lower20) / (upper90 - lower20);
                fillColor = interpolateColor("#ff7043", "#f5ff99", ratio);
              } else {
                const ratio = (score - upper90) / (values[values.length - 1] - upper90);
                fillColor = interpolateColor("#f5ff99", "#5ca82e", ratio);
              }

              return {
                color: "#333",
                weight: 1,
                fillColor: fillColor,
                fillOpacity: 0.7
              };
            },
            onEachFeature: function (feature, layer) {
              const id = feature.properties?.NUTS_ID?.trim();
              const entry = data[id];
              const fallbackName = feature.properties?.name || "Unnamed Feature";

              layer.on('click', () => {
                const panel = document.getElementById("res-info-panel");
                if (!panel) return;

                if (panel.style.display === "block" && document.getElementById("res-panel-title").textContent === (entry?.County || fallbackName)) {
                  panel.style.display = "none";
                  return;
                }

                document.getElementById("res-panel-title").textContent = entry?.County || fallbackName;

                let infoText = "";
                if (entry) {
                  for (const [key, value] of Object.entries(entry)) {
                    if (key === "NUTS_ID" || key === "County") continue;
                    infoText += `<strong>${key}:</strong> ${value ?? "—"}<br>`;
                  }
                } else {
                  infoText = `<em>Keine RES-Daten für ${id || "unbekannt"} gefunden</em>`;
                }

                const contentElem = document.getElementById("res-panel-content");
                if (contentElem) contentElem.innerHTML = infoText;

                panel.style.display = "block";
              });

              layer.on('mouseover', () => layer.setStyle({ fillOpacity: 1 }));
              layer.on('mouseout', () => layer.setStyle({ fillOpacity: 0.7 }));

              window.resLayers.push(layer);
            }
          }).addTo(map);
        });
    });
};
// Hilfsfunktion zum Aktualisieren der Total Score Tabelle basierend auf den sichtbaren Layern
function updateTotalScoreTableByVisibleLayers() {
  if (!window.totalScoreLayers || window.totalScoreLayers.length === 0) {
    console.warn("WARNUNG: Keine totalScoreLayers verfügbar!");
    return;
  }

  const table = document.getElementById("totalscore-table");
  if (!table || !window.totalScoreLayers || !window.totalScoreData) return;

  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");
  if (!thead || !tbody) return;

  // Tabellenkopf mit <span> und Sortierpfeilen
  const headers = ["County", "Total_Score", "IWH_Score", "E_Score", "RES_Score", "TP_Score", "LU_Score"];
  thead.innerHTML = "";
  const headerRow = document.createElement("tr");
  headers.forEach(header => {
    const th = document.createElement("th");
    const span = document.createElement("span");
    span.textContent = header;
    th.appendChild(span);
    th.style.cursor = "pointer";
    th.dataset.sortOrder = "";
    th.onclick = () => {
      const rows = Array.from(tbody.querySelectorAll("tr"));
      const colIndex = headers.indexOf(header);
      const currentOrder = th.dataset.sortOrder;
      const newOrder = currentOrder === "asc" ? "desc" : "asc";
      // Reset all headers, remove arrows
      table.querySelectorAll("th").forEach(h => {
        h.dataset.sortOrder = "";
        const s = h.querySelector("span");
        if (s) s.textContent = s.textContent.replace(" ▲", "").replace(" ▼", "");
      });
      th.dataset.sortOrder = newOrder;
      if (span) {
        span.textContent = `${header} ${newOrder === "asc" ? "▲" : "▼"}`;
      }
      const sorted = rows.sort((a, b) => {
        const valA = a.children[colIndex].textContent.trim();
        const valB = b.children[colIndex].textContent.trim();
        const aVal = parseFloat(valA.replace(",", ".")) || valA;
        const bVal = parseFloat(valB.replace(",", ".")) || valB;
        if (aVal < bVal) return newOrder === "asc" ? -1 : 1;
        if (aVal > bVal) return newOrder === "asc" ? 1 : -1;
        return 0;
      });
      tbody.innerHTML = "";
      sorted.forEach(row => tbody.appendChild(row));
    };
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  // Tabelle leeren und neu befüllen
  tbody.innerHTML = "";
  window.totalScoreLayers.forEach(layer => {
    if (layer.feature?.properties?.visible) {
      const id = layer.feature?.properties?.NUTS_ID?.trim();
      const entry = window.totalScoreData[id];
      if (!entry) return;
      const row = document.createElement("tr");
      headers.forEach(key => {
        const cell = document.createElement("td");
        cell.textContent = entry[key] ?? "—";
        row.appendChild(cell);
      });
      tbody.appendChild(row);
    }
  });
  // Initial sortieren: County aufsteigend und Pfeil setzen
  const initialTh = thead.querySelector("th");
  if (initialTh) {
    initialTh.dataset.sortOrder = "asc";
    const initialSpan = initialTh.querySelector("span");
    if (initialSpan) initialSpan.textContent = `${headers[0]} ▲`;
  }
}


// Achtung: Wird ausschließlich für Total Score Map verwendet. Keine Überschneidung mit secondaryMapLayers.
// Globale Variable für die Layer der Total Score Map
window.totalScoreLayers = [];

// Logge sofort nach Initialisierung die beiden Layer-Arrays, um zu prüfen, ob sie separat existieren
console.log("Globale Layer-Arrays initialisiert:", {
  secondaryMapLayers: window.secondaryMapLayers,
  totalScoreLayers: window.totalScoreLayers
});
