/* Final script.js (Soft Warm Theme)
   - localStorage for observations
   - Leaflet map with embedded demo polygons
   - Charts: Temperature, AQI, Greenery %
   - CSV export, reset
*/

/* ---------- Local storage helpers ---------- */
const STORAGE_KEY = "csp_vijayawada_softwarm_v1";

function loadObservations(){
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [
    // demo default entries
    { area:"St. Francis School (Mangalagiri)", lat:16.426194, lon:80.566196, temp:34.5, highTemp:"Yes", aqi:118, green:22, ndvi_now:0.39, ndvi_past:0.62, note:"Playground exposed"},
    { area:"Vijeta High School", lat:16.413359, lon:80.604022, temp:33.8, highTemp:"No", aqi:125, green:28, ndvi_now:0.41, ndvi_past:0.58, note:"Near main road"},
    { area:"Market Road - Vijayawada", lat:16.506174, lon:80.648015, temp:36.2, highTemp:"Yes", aqi:160, green:8, ndvi_now:0.18, ndvi_past:0.45, note:"Traffic hotspot"},
    { area:"Residential Block A", lat:16.420000, lon:80.580000, temp:32.3, highTemp:"No", aqi:95, green:50, ndvi_now:0.55, ndvi_past:0.68, note:"Shaded street"}
  ];
}

function saveObservations(arr){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

/* ---------- DOM references ---------- */
const quickForm = document.getElementById("quickForm");
const formMsg = document.getElementById("formMsg");
const tmpTableBody = document.querySelector("#surveyTable tbody");
const downloadCsvBtn = document.getElementById("downloadCsv");
const resetBtn = document.getElementById("resetBtn");

/* ---------- Map (Leaflet) ---------- */
// Embedded simplified CITY_GEOJSON for demo; replace with real ward GeoJSON if available
const CITY_GEOJSON = {
  "type":"FeatureCollection",
  "features":[
    {"type":"Feature","properties":{"name":"Mangalagiri North","ndvi_past":0.62,"ndvi_now":0.39,"temp_now":34.5},"geometry":{"type":"Polygon","coordinates":[[[80.565,16.428],[80.575,16.428],[80.575,16.421],[80.565,16.421],[80.565,16.428]]]}},
    {"type":"Feature","properties":{"name":"Mangalagiri South","ndvi_past":0.58,"ndvi_now":0.41,"temp_now":33.8},"geometry":{"type":"Polygon","coordinates":[[[80.565,16.421],[80.575,16.421],[80.575,16.414],[80.565,16.414],[80.565,16.421]]]}},
    {"type":"Feature","properties":{"name":"Vijayawada Central","ndvi_past":0.48,"ndvi_now":0.22,"temp_now":36.2},"geometry":{"type":"Polygon","coordinates":[[[80.642,16.503],[80.652,16.503],[80.652,16.493],[80.642,16.493],[80.642,16.503]]]}},
    {"type":"Feature","properties":{"name":"Market Area","ndvi_past":0.45,"ndvi_now":0.18,"temp_now":36.8},"geometry":{"type":"Polygon","coordinates":[[[80.645,16.510],[80.655,16.510],[80.655,16.500],[80.645,16.500],[80.645,16.510]]]}},
    {"type":"Feature","properties":{"name":"Residential Block A","ndvi_past":0.68,"ndvi_now":0.55,"temp_now":32.3},"geometry":{"type":"Polygon","coordinates":[[[80.580,16.420],[80.590,16.420],[80.590,16.410],[80.580,16.410],[80.580,16.420]]]}},
    {"type":"Feature","properties":{"name":"Park Zone","ndvi_past":0.72,"ndvi_now":0.68,"temp_now":30.8},"geometry":{"type":"Polygon","coordinates":[[[80.600,16.450],[80.610,16.450],[80.610,16.440],[80.600,16.440],[80.600,16.450]]]}}
  ]
};

let map = L.map("map").setView([16.5062,80.6480], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap contributors" }).addTo(map);

let markersLayer = L.layerGroup().addTo(map);
let geoLayer = L.geoJSON(CITY_GEOJSON, {
  style: feature => {
    const p = feature.properties || {};
    const delta = (p.ndvi_past != null && p.ndvi_now != null) ? (p.ndvi_past - p.ndvi_now) : 0;
    return { color: "#8a4b22", weight:1, fillColor: ndviColor(delta), fillOpacity:0.9 };
  },
  onEachFeature: (feature, layer) => {
    const p = feature.properties || {};
    const delta = (p.ndvi_past != null && p.ndvi_now != null) ? (p.ndvi_past - p.ndvi_now).toFixed(2) : "n/a";
    layer.bindPopup(`<strong>${p.name}</strong><br>NDVI Δ: ${delta}<br>Temp (cur): ${p.temp_now || 'n/a'} °C`);
    layer.on("click", ()=> {
      document.getElementById("selArea").textContent = p.name;
      document.getElementById("selTemp").textContent = p.temp_now || 'n/a';
      document.getElementById("selNdvi").textContent = delta;
    });
    layer.on("mouseover", ()=> layer.setStyle({weight:2,color:"#3b2a20"}));
    layer.on("mouseout", ()=> layer.setStyle({weight:1,color:"#8a4b22"}));
  }
}).addTo(map);

/* ndvi color scale (soft) */
function ndviColor(delta){
  if(delta <= 0.05) return "#dff7ee";    // low decline - pale green
  if(delta <= 0.18) return "#ffe8c9";    // mid - pale orange
  return "#ffd6d0";                      // high - pale red
}

/* ---------- Map markers update ---------- */
function updateMapMarkers(){
  markersLayer.clearLayers();
  const arr = loadObservations();
  arr.forEach((r, idx) => {
    const color = r.temp <= 32 ? '#ffdba8' : (r.temp <= 35 ? '#ffb56b' : '#ff8a6a');
    const marker = L.circleMarker([r.lat, r.lon], { radius:8, fillColor: color, color:"#5a3822", weight:1, fillOpacity:0.95 });
    marker.bindPopup(`<strong>${escapeHtml(r.area)}</strong><br>Temp: ${r.temp} °C<br>Higher Temp: ${r.highTemp}<br>AQI: ${r.aqi}<br>Green: ${r.green}%<br>NDVI now: ${r.ndvi_now}<br>Notes: ${escapeHtml(r.note||'')}`);
    marker.on("click", ()=> {
      document.getElementById("selArea").textContent = r.area;
      document.getElementById("selTemp").textContent = r.temp;
      document.getElementById("selNdvi").textContent = (r.ndvi_past ? (r.ndvi_past - r.ndvi_now).toFixed(2) : "n/a");
    });
    markersLayer.addLayer(marker);
  });
}

/* ---------- Table rendering ---------- */
function renderTable(){
  const arr = loadObservations();
  tmpTableBody.innerHTML = "";
  arr.forEach((r,i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${escapeHtml(r.area)}</td>
      <td>${r.lat}</td>
      <td>${r.lon}</td>
      <td>${r.temp}</td>
      <td>${r.highTemp}</td>
      <td>${r.aqi}</td>
      <td>${r.green}</td>
      <td>${r.ndvi_now}</td>
      <td>${r.ndvi_past || ''}</td>
      <td>${escapeHtml(r.note || '')}</td>
      <td><button class="btn ghost" onclick="removeRow(${i})">Remove</button></td>
    `;
    tmpTableBody.appendChild(tr);
  });
}

/* remove */
function removeRow(idx){
  const arr = loadObservations(); arr.splice(idx,1); saveObservations(arr);
  renderTable(); updateCharts(); updateMapMarkers();
}

/* ---------- Form submit ---------- */
quickForm.addEventListener("submit", e=>{
  e.preventDefault();
  const entry = {
    area: document.getElementById("fArea").value.trim(),
    lat: Number(document.getElementById("fLat").value),
    lon: Number(document.getElementById("fLon").value),
    temp: Number(document.getElementById("fTemp").value),
    highTemp: document.getElementById("fHighTemp").value || "No",
    aqi: Number(document.getElementById("fAqi").value),
    green: Number(document.getElementById("fGreen").value),
    ndvi_now: Number(document.getElementById("fNdviNow").value),
    ndvi_past: Number(document.getElementById("fNdviPast").value),
    note: document.getElementById("fNote").value.trim()
  };

  const arr = loadObservations();
  arr.push(entry);
  saveObservations(arr);

  quickForm.reset();
  formMsg.innerText = "Observation added ✓";
  setTimeout(()=> formMsg.innerText = "", 2000);

  renderTable(); updateChartData(); updateMapMarkers();
});

/* ---------- CSV export ---------- */
downloadCsvBtn.addEventListener("click", ()=>{
  const arr = loadObservations();
  let csv = "Area,Lat,Lon,Temp,HighTemp,AQI,Green,NDVI_now,NDVI_past,Note\n";
  arr.forEach(r => {
    csv += `"${r.area}",${r.lat},${r.lon},${r.temp},${r.highTemp},${r.aqi},${r.green},${r.ndvi_now},${r.ndvi_past},"${(r.note||'').replace(/"/g,'""')}"\n`;
  });
  const blob = new Blob([csv], {type:'text/csv'}); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'vijayawada_survey.csv'; a.click(); URL.revokeObjectURL(url);
});

/* ---------- Reset ---------- */
resetBtn.addEventListener("click", ()=>{
  if(!confirm("Reset demo data to defaults?")) return;
  localStorage.removeItem(STORAGE_KEY);
  renderTable(); updateChartData(); updateMapMarkers();
});

/* ---------- Charts ---------- */
const tempChartEl = document.getElementById("tempChart").getContext("2d");
const aqiChartEl = document.getElementById("aqiChart").getContext("2d");
const greenChartEl = document.getElementById("greenChart").getContext("2d");

let tempChart, aqiChart, greenChart;

function createCharts(){
  const arr = loadObservations();
  const labels = arr.map(a=>a.area);
  const temps = arr.map(a=>a.temp);
  const aqis = arr.map(a=>a.aqi);
  const greens = arr.map(a=>a.green);

  tempChart = new Chart(tempChartEl, {
    type:'bar',
    data:{ labels, datasets:[{ label:'Temperature (°C)', data:temps, backgroundColor: temps.map(t=> t<=32? '#ffdba8' : (t<=35? '#ffb56b' : '#ff8a6a')) }]},
    options:{ responsive:true, plugins:{legend:{display:false}}}
  });

  aqiChart = new Chart(aqiChartEl, {
    type:'line',
    data:{ labels, datasets:[{ label:'AQI', data:aqis, borderColor:'#c76f2b', backgroundColor:'rgba(199,111,43,0.12)', tension:0.3, fill:true }]},
    options:{ responsive:true, plugins:{legend:{display:false}}}
  });

  greenChart = new Chart(greenChartEl, {
    type:'bar',
    data:{ labels, datasets:[{ label:'Greenery %', data:greens, backgroundColor:greens.map(g=> g>=50? '#c8f7d9' : (g>=25? '#ffe8c9' : '#ffd6d0')) }]},
    options:{ responsive:true, plugins:{legend:{display:false}}}
  });
}

function updateCharts(){
  if(tempChart) tempChart.destroy();
  if(aqiChart) aqiChart.destroy();
  if(greenChart) greenChart.destroy();
  createCharts();
}
function updateChartData(){ updateCharts(); }

/* ---------- Helpers ---------- */
function escapeHtml(s){ if(!s) return ""; return s.replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]); }

/* ---------- init ---------- */
document.addEventListener("DOMContentLoaded", ()=>{
  renderTable();
  updateMapMarkers();
  createCharts();

  // mode toggle for choropleth
  document.querySelectorAll('input[name="mode"]').forEach(r=>{
    r.addEventListener('change', e=>{
      const mode = e.target.value;
      geoLayer.setStyle(feature => {
        const p = feature.properties || {};
        if(mode === 'ndvi'){
          const delta = (p.ndvi_past != null && p.ndvi_now != null) ? (p.ndvi_past - p.ndvi_now) : 0;
          return { color:"#8a4b22", weight:1, fillColor: ndviColor(delta), fillOpacity:0.9 };
        } else {
          const t = p.temp_now || 0;
          const fill = t <= 32 ? '#ffdba8' : (t <= 35 ? '#ffb56b' : '#ff8a6a');
          return { color:"#8a4b22", weight:1, fillColor: fill, fillOpacity:0.95 };
        }
      });
    });
  });
});
