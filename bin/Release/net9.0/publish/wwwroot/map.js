// Globale Variable für alle Landkreis-Layer
window.landkreisLayers = [];
let selectedLayer = null;
let populationData = {};
window.populationData = populationData;
let co2ScoreFilter = null;
let nettoScoreFilter = null;
let useNettoColorScale = false;
let solarFilterEnabled = false;
let solarFilterValue = null;
let windFilterEnabled = false;
let windFilterValue = null;

fetch('/data/landkreise.csv')
  .then(response => response.text())
  .then(text => {
    const lines = text.split('\n');
    const header = lines[0].split('\t');
    const nameIndex = header.findIndex(h => h.trim() === "Landkreisname");
    const scoreIndex = header.findIndex(h => h.trim() === "C02 price score");

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split('\t');
      const name = cols[nameIndex]?.trim();
      const score = parseFloat(cols[scoreIndex]?.trim());
      if (name) {
        const co2Price = cols[header.findIndex(h => h.trim() === "CO2 Price")]?.trim();
        const nettoCO2 = cols[header.findIndex(h => h.trim() === "Netto CO2")]?.trim();
        const bundesland = cols[header.findIndex(h => h.trim() === "Bundesland")]?.trim();

        populationData[name] = {
          "CO2 Price": co2Price ? `${co2Price} €/t CO₂` : "—",
          "C02 price score": isNaN(score) ? null : score,
          "Netto CO2": nettoCO2 ? `${nettoCO2} kg` : "—",
          "Netto C02 Score": cols[header.findIndex(h => h.trim() === "Netto C02 Score")]?.trim(),
          "PV yes/no": cols[header.findIndex(h => h.trim() === "PV yes/no")]?.trim(),
          "Solar yes/no": cols[header.findIndex(h => h.trim() === "Solar yes/no")]?.trim(),
          "Bundesland": bundesland,
        };
      }
    }
    console.log("CSV geladen (C02 score):", populationData);
    // Diagramm-Aufruf nach vollständigem Laden von populationData, vor Kartendarstellung
    setTimeout(() => {
      if (typeof renderScoreChartFiltered === "function") {
        renderScoreChartFiltered(populationData, "ALL");
      } else {
        console.warn("renderScoreChartFiltered is not defined.");
      }
    }, 500);
  });

function getColorForScore(score) {
  return score > 9 ? '#041f4a' :
         score > 8 ? '#08306b' :
         score > 7 ? '#0b3a8a' :
         score > 6 ? '#1259b0' :
         score > 5 ? '#2171b5' :
         score > 4 ? '#3182bd' :
         score > 3 ? '#4292c6' :
         score > 2 ? '#6baed6' :
         score > 1 ? '#9ecae1' :
                     '#f7fbff';
}

function getColorForNettoScore(score) {
  return score > 9 ? '#00441b' :
         score > 8 ? '#006d2c' :
         score > 7 ? '#238b45' :
         score > 6 ? '#41ab5d' :
         score > 5 ? '#66c27c' :
         score > 4 ? '#8fd89f' :
         score > 3 ? '#b2e2b7' :
         score > 2 ? '#cdeed0' :
         score > 1 ? '#e5f5e0' :
                     '#ffffff';
}

window.loadMap = function () {
  var map = L.map('map').setView([51.1657, 10.4515], 6);

  // Kein Hintergrund-Layer → weiße Karte
  // (OSM entfernt)

  fetch('/data/deutschland.json')
    .then(response => response.json())
    .then(data => {
      L.geoJSON(data, {
        style: feature => {
          const name = feature.properties.NAME_3 || feature.properties.NAME_2 || feature.properties.NAME_1 || "Unbekannt";
          const value = useNettoColorScale
            ? parseFloat(populationData[name]?.["Netto C02 Score"]) || 0
            : parseFloat(populationData[name]?.["C02 price score"]) || 0;
          const color = useNettoColorScale
            ? getColorForNettoScore(value)
            : getColorForScore(value);
          return {
            color: "#555",
            weight: 1,
            fillColor: color,
            fillOpacity: 0.6
          };
        },
        onEachFeature: function (feature, layer) {
          const name = feature.properties.NAME_3 || feature.properties.NAME_2 || feature.properties.NAME_1 || "Unbekannt";

          const value = useNettoColorScale
            ? parseFloat(populationData[name]?.["Netto C02 Score"]) || 0
            : parseFloat(populationData[name]?.["C02 price score"]) || 0;
          const color = useNettoColorScale
            ? getColorForNettoScore(value)
            : getColorForScore(value);
          // 🧠 Speichere aktuelle Farbe im Layer selbst!
          layer._currentColor = color;

          // Bundesland-Name am Layer speichern
          layer._bundesland = feature.properties.NAME_1 || "Unbekannt";
          // Layer in globale Liste eintragen
          window.landkreisLayers.push(layer);


          layer.on('mouseover', function () {
            layer.setStyle({ fillOpacity: 0.9 });
          });

          layer.on('mouseout', function () {
            layer.setStyle({ fillOpacity: 0.6 });
          });

          layer.on('click', function () {
            const data = populationData[name] || {};
            document.getElementById("panel-title").textContent = name;
            document.getElementById("info-panel").style.display = "block";

            let infoText = "";

            const renderBar = (label, value, colorFunc) => {
              const score = parseFloat(value);
              if (isNaN(score)) return "";
              const percent = Math.max(0, Math.min(100, (score / 10) * 100));
              let gradient = '';
              for (let i = 0; i <= 10; i++) {
                gradient += `${colorFunc(i)} ${(i * 10)}%${i < 10 ? ',' : ''}`;
              }
              return `
                <div style="margin-bottom: 8px;">
                  <strong>${label}:</strong><br>
                  <div style="position: relative; height: 12px; background: linear-gradient(to right, ${gradient}); border-radius: 6px;">
                    <div style="position: absolute; top: -4px; left: ${percent}%; transform: translateX(-50%); width: 2px; height: 20px; background: black;"></div>
                  </div>
                  <div style="font-size: 12px;">Score: ${score.toFixed(1)}</div>
                </div>
              `;
            };

            for (const [key, val] of Object.entries(data)) {
              if (key === "C02 price score") {
                infoText += renderBar("CO₂ Price Score", val, getColorForScore);
              } else if (key === "Netto C02 Score") {
                infoText += renderBar("Netto CO₂ Score", val, getColorForNettoScore);
              } else if (key === "PV yes/no") {
                const label = val?.toUpperCase() === "Y" ?
                  `<span style="color: green;">Available</span>` :
                  `<span style="color: red;">Not Available</span>`;
                infoText += `<strong>Wind:</strong> ${label}<br>`;
              } else if (key === "Solar yes/no") {
                const label = val?.toUpperCase() === "Y" ?
                  `<span style="color: green;">Available</span>` :
                  `<span style="color: red;">Not Available</span>`;
                infoText += `<strong>Solar:</strong> ${label}<br>`;
              } else {
                infoText += `<strong>${key}:</strong> ${val ?? "—"}<br>`;
              }
            }

            const panel = document.getElementById("panel-population");
            if (panel) {
              panel.innerHTML = infoText;
            }

            // HERVORHEBUNG: Layer-Style setzen und vorige Auswahl zurücksetzen
            if (selectedLayer && selectedLayer !== layer) {
              selectedLayer.setStyle({ weight: 1, color: "#555" }); // zurücksetzen
            }
            layer.setStyle({ weight: 3, color: "#000" }); // aktueller Klick hervorgehoben
            selectedLayer = layer;
          });
        }
      }).addTo(map);

      const cityMarkers = [
        { name: "München", coords: [48.1351, 11.5820] },
        { name: "Berlin", coords: [52.5200, 13.4050] },
        { name: "Leipzig", coords: [51.3397, 12.3731] },
        { name: "Düsseldorf", coords: [51.2277, 6.7735] }
      ];
      window.cityMarkerLayer = L.layerGroup(
        cityMarkers.map(city =>
          L.marker(city.coords, {
            icon: L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
              iconSize: [18.75, 30.75],
              iconAnchor: [9.375, 30.75],
              popupAnchor: [0.75, -25.5],
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
              shadowSize: [30.75, 30.75]
            })
          })
          .bindTooltip(city.name, { permanent: false, direction: 'top' })
          .on('click', function () {
            document.getElementById("panel-title").textContent = city.name;
            document.getElementById("info-panel").style.display = "block";

            let infoText = "";
            const cityData = populationData[city.name] || {};
            for (const [key, val] of Object.entries(cityData)) {
              infoText += `<strong>${key}:</strong> ${val ?? "—"}<br>`;
            }

            const panel = document.getElementById("panel-population");
            if (panel) {
              panel.innerHTML = infoText;
            }
          })
        )
      );
      // Nicht addTo(map), damit sie im Startzustand nicht sichtbar sind

      let cityMarkersVisible = false;
      window.toggleCityMarkers = function() {
        if (!cityMarkersVisible) {
          window.cityMarkerLayer.addTo(map);
        } else {
          window.cityMarkerLayer.removeFrom(map);
        }
        cityMarkersVisible = !cityMarkersVisible;
      };

    });

  // // Farbe setzen + speichern (entfernt)

  const legendTarget = document.getElementById('map-legend');
  if (legendTarget) {
    legendTarget.innerHTML = `
      <strong style="font-family: Arial, sans-serif; font-size: 13px;">Color-coding of CO₂ prices per ton</strong><br>
      <i style="background:#041f4a; width: 20px; height: 12px; display: inline-block;"></i> > 9<br>
      <i style="background:#08306b; width: 20px; height: 12px; display: inline-block;"></i> 8.1 - 9<br>
      <i style="background:#0b3a8a; width: 20px; height: 12px; display: inline-block;"></i> 7.1 - 8<br>
      <i style="background:#1259b0; width: 20px; height: 12px; display: inline-block;"></i> 6.1 - 7<br>
      <i style="background:#2171b5; width: 20px; height: 12px; display: inline-block;"></i> 5.1 - 6<br>
      <i style="background:#3182bd; width: 20px; height: 12px; display: inline-block;"></i> 4.1 - 5<br>
      <i style="background:#4292c6; width: 20px; height: 12px; display: inline-block;"></i> 3.1 - 4<br>
      <i style="background:#6baed6; width: 20px; height: 12px; display: inline-block;"></i> 2.1 - 3<br>
      <i style="background:#9ecae1; width: 20px; height: 12px; display: inline-block;"></i> 1.1 - 2<br>
      <i style="background:#f7fbff; width: 20px; height: 12px; display: inline-block;"></i> ≤ 1
    `;
  }

  // Check if co2ScoreSlider exists in the DOM
  if (!document.getElementById("co2ScoreSlider")) {
    console.warn('Element with id "co2ScoreSlider" not found. Please ensure <input type="range" id="co2ScoreSlider" min="1" max="10" value="10"> is present in the HTML.');
  }
  // Check if nettoScoreSlider exists in the DOM
  if (!document.getElementById("nettoScoreSlider")) {
    console.warn('Element with id "nettoScoreSlider" not found. Please ensure <input type="range" id="nettoScoreSlider" min="1" max="10" value="10"> is present in the HTML.');
  }
};

// Panel schließen
function closePanel() {
  document.getElementById("info-panel").style.display = "none";
  if (selectedLayer) {
    selectedLayer.setStyle({ weight: 1, color: "#555" });
    selectedLayer = null;
  }
}

// Bundesland-Filter anwenden
function applyStateFilter() {
  const selected = Array.from(document.getElementById("stateFilter").selectedOptions).map(opt => opt.value);

  const scoreSlider = document.getElementById("co2ScoreSlider");
  const maxScore = parseFloat(scoreSlider?.value);
  co2ScoreFilter = isNaN(maxScore) ? null : maxScore;

  const nettoSlider = document.getElementById("nettoScoreSlider");
  const nettoMax = parseFloat(nettoSlider?.value);
  nettoScoreFilter = isNaN(nettoMax) ? null : nettoMax;

  const solarCheckbox = document.getElementById("solarFilterCheckbox");
  const windCheckbox = document.getElementById("windFilterCheckbox");
  const solarToggle = document.getElementById("solarToggle");
  const windToggle = document.getElementById("windToggle");

  solarFilterEnabled = solarCheckbox?.checked;
  windFilterEnabled = windCheckbox?.checked;
  solarFilterValue = solarToggle?.dataset.value;
  windFilterValue = windToggle?.dataset.value;

  for (const layer of window.landkreisLayers) {
    const name = layer.feature.properties.NAME_3 || layer.feature.properties.NAME_2 || layer.feature.properties.NAME_1 || "Unbekannt";
    const data = populationData[name] || {};

    const co2 = parseFloat(data["C02 price score"]);
    const netto = parseFloat(data["Netto C02 Score"]);

    const passesScore = !co2ScoreFilter || (!isNaN(co2) && co2 >= co2ScoreFilter);
    const passesNetto = !nettoScoreFilter || (!isNaN(netto) && netto >= nettoScoreFilter);
    const passesState = selected.length === 0 || selected.includes(layer._bundesland);

    const solar = data["Solar yes/no"];
    const wind = data["PV yes/no"]; // oder "Wind yes/no", falls es so heißt

    const passesSolar = !solarFilterEnabled || (solarFilterValue && solar?.toUpperCase() === solarFilterValue);
    const passesWind = !windFilterEnabled || (windFilterValue && wind?.toUpperCase() === windFilterValue);

    const value = useNettoColorScale
      ? parseFloat(data["Netto C02 Score"]) || 0
      : parseFloat(data["C02 price score"]) || 0;

    const color = useNettoColorScale
      ? getColorForNettoScore(value)
      : getColorForScore(value);

    layer._currentColor = color;

    if (passesState && passesScore && passesNetto && passesSolar && passesWind) {
      layer.setStyle({ fillColor: color, fillOpacity: 0.6 });
    } else {
      layer.setStyle({ fillColor: "#ffffff", fillOpacity: 0.3 });
    }
  }

  // Aktualisiere die Legende abhängig vom Modus
  const legendTarget = document.getElementById('map-legend');
  if (legendTarget) {
    legendTarget.innerHTML = useNettoColorScale
      ? `
        <strong style="font-family: Arial, sans-serif; font-size: 13px;">Color-coding of Netto CO₂ Score</strong><br>
        <i style="background:#00441b; width: 20px; height: 12px; display: inline-block;"></i> > 9<br>
        <i style="background:#006d2c; width: 20px; height: 12px; display: inline-block;"></i> 8.1 - 9<br>
        <i style="background:#238b45; width: 20px; height: 12px; display: inline-block;"></i> 7.1 - 8<br>
        <i style="background:#41ab5d; width: 20px; height: 12px; display: inline-block;"></i> 6.1 - 7<br>
        <i style="background:#66c27c; width: 20px; height: 12px; display: inline-block;"></i> 5.1 - 6<br>
        <i style="background:#8fd89f; width: 20px; height: 12px; display: inline-block;"></i> 4.1 - 5<br>
        <i style="background:#b2e2b7; width: 20px; height: 12px; display: inline-block;"></i> 3.1 - 4<br>
        <i style="background:#cdeed0; width: 20px; height: 12px; display: inline-block;"></i> 2.1 - 3<br>
        <i style="background:#e5f5e0; width: 20px; height: 12px; display: inline-block;"></i> 1.1 - 2<br>
        <i style="background:#ffffff; width: 20px; height: 12px; display: inline-block;"></i> ≤ 1
        `
      : `
        <strong style="font-family: Arial, sans-serif; font-size: 13px;">Color-coding of CO₂ prices per ton</strong><br>
        <i style="background:#041f4a; width: 20px; height: 12px; display: inline-block;"></i> > 9<br>
        <i style="background:#08306b; width: 20px; height: 12px; display: inline-block;"></i> 8.1 - 9<br>
        <i style="background:#0b3a8a; width: 20px; height: 12px; display: inline-block;"></i> 7.1 - 8<br>
        <i style="background:#1259b0; width: 20px; height: 12px; display: inline-block;"></i> 6.1 - 7<br>
        <i style="background:#2171b5; width: 20px; height: 12px; display: inline-block;"></i> 5.1 - 6<br>
        <i style="background:#3182bd; width: 20px; height: 12px; display: inline-block;"></i> 4.1 - 5<br>
        <i style="background:#4292c6; width: 20px; height: 12px; display: inline-block;"></i> 3.1 - 4<br>
        <i style="background:#6baed6; width: 20px; height: 12px; display: inline-block;"></i> 2.1 - 3<br>
        <i style="background:#9ecae1; width: 20px; height: 12px; display: inline-block;"></i> 1.1 - 2<br>
        <i style="background:#f7fbff; width: 20px; height: 12px; display: inline-block;"></i> ≤ 1
        `;
  }
}

// Filter zurücksetzen
function resetStateFilter() {
  co2ScoreFilter = null;
  nettoScoreFilter = null;
  for (const layer of window.landkreisLayers) {
    layer.setStyle({ fillColor: layer._currentColor || "#e0e0e0", fillOpacity: 0.6 });
  }
  document.getElementById("stateFilter").selectedIndex = -1;
}

window.toggleColorScale = function () {
  useNettoColorScale = !useNettoColorScale;
  applyStateFilter(); // Wendet neue Farbskala an
}