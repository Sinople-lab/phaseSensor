const API_URL = "https://shelly-266-eu.shelly.cloud/device/status?id=e08cfe95a9a4&auth_key=NDJmYjMydWlkD5C6AC6E4C50C1153470845BCD7D7E5FBAE70EAE657208AC7F06B4C5BC175F7687138EDFB0B8DC33";

const $ = (id) => document.getElementById(id);

const fmt = (val, decimals = 1) => {
  if (val === null || val === undefined) return "—";
  return Number(val).toFixed(decimals);
};

const showToast = (msg, type = "") => {
  const toast = $("toast");
  toast.textContent = msg;
  toast.className = "toast show " + type;
  setTimeout(() => toast.classList.remove("show"), 60000);
};

const setStatus = (online) => {
  const pill = $("statusPill");
  const label = pill.querySelector(".status-label");
  const alarm = $("alarm");
  const alarmLabel = $("alarmLabel");
  if (online) {
    pill.className = "status-pill online";
    label.textContent = "Online";
    alarm.className = "alarm online";
    alarmLabel.textContent = "ONLINE";
  } else {
    pill.className = "status-pill offline";
    label.textContent = "Offline";
    alarm.className = "alarm offline";
    alarmLabel.textContent = "OFFLINE";
  }
};

const renderHero = (em, emdata) => {
  $("totalPower").textContent = fmt(em.total_act_power/1000, 2);
  $("totalCurrent").textContent = `${fmt(em.total_current, 3)} A corriente total`;
  $("totalAprt").textContent = fmt(em.total_aprt_power/1000, 2);
  $("totalEnergy").textContent = fmt(emdata.total_act/1000, 2);
  $("totalReturned").textContent = fmt(emdata.total_act_ret, 0);
};

const renderPhase = (phase, label, color) => {
  const card = document.createElement("div");
  card.className = "phase-card";
  card.dataset.phase = phase;
  card.innerHTML = `
    <div class="phase-header">
      <span class="phase-name">Fase ${label}</span>
      <span><span class="phase-power">${fmt(em[`${phase}_act_power`], 2)}</span><span class="phase-power-unit"> W</span></span>
    </div>
    <div class="phase-metrics">
      <div class="metric">
        <span class="metric-label">Voltaje</span>
        <span class="metric-value">${fmt(em[`${phase}_voltage`], 1)} V</span>
      </div>
      <div class="metric">
        <span class="metric-label">Corriente</span>
        <span class="metric-value">${fmt(em[`${phase}_current`], 3)} A</span>
      </div>
      <div class="metric">
        <span class="metric-label">Factor de potencia</span>
        <span class="metric-value">${fmt(em[`${phase}_pf`], 2)}</span>
      </div>
      <div class="metric">
        <span class="metric-label">Frecuencia</span>
        <span class="metric-value">${fmt(em[`${phase}_freq`], 0)} Hz</span>
      </div>
      <div class="metric">
        <span class="metric-label">Aparente</span>
        <span class="metric-value">${fmt(em[`${phase}_aprt_power`]/1000, 2)} kVA</span>
      </div>
      <div class="metric">
        <span class="metric-label">Consumo</span>
        <span class="metric-value">${fmt(emdata[`${phase}_total_act_energy`]/1000, 2)} kWh</span>
      </div>
    </div>
  `;
  return card;
};

let em, emdata;

const renderPhases = (emData, emdataData) => {
  em = emData;
  emdata = emdataData;
  const grid = $("phaseGrid");
  grid.innerHTML = "";
  grid.appendChild(renderPhase("a", "A"));
  grid.appendChild(renderPhase("b", "B"));
  grid.appendChild(renderPhase("c", "C/Fuente pro 3em"));
};

const renderInfo = (data) => {
  const ds = data.device_status;

  const deviceRows = [
    ["Device ID", ds.id, ""],
    ["Model", ds.code, ""],
    ["MAC", ds.sys.mac, ""],
    ["Serial", ds.serial, ""],
    ["Temperature", `${fmt(ds["temperature:0"].tC, 1)} °C`, "warn"],
    ["Uptime", `${ds.sys.uptime} s`, ""],
  ];

  const netRows = [
    ["WiFi Status", ds.wifi.status, "good"],
    ["SSID", ds.wifi.ssid, ""],
    ["IP Address", ds.wifi.sta_ip, ""],
    ["Signal (RSSI)", `${ds.wifi.rssi} dBm`, ds.wifi.rssi > -60 ? "good" : "warn"],
    ["Ethernet", ds.eth.ip, ""],
    ["MQTT", ds.mqtt.connected ? "Connected" : "Disconnected", ds.mqtt.connected ? "good" : "muted"],
  ];

  const sysRows = [
    ["Firmware", ds.sys.available_updates.stable.version, ""],
    ["Beta Available", ds.sys.available_updates.beta.version, "muted"],
    ["Time", ds.sys.time, ""],
    ["Config Rev", ds.sys.cfg_rev, ""],
    ["RAM Free", `${(ds.sys.ram_free / 1024).toFixed(0)} KB`, ""],
    ["FS Free", `${(ds.sys.fs_free / 1024).toFixed(0)} KB`, ""],
  ];

  const buildList = (rows, container) => {
    container.innerHTML = rows.map(([k, v, cls]) => `
      <div class="info-row">
        <span class="info-key">${k}</span>
        <span class="info-val ${cls}">${v ?? "—"}</span>
      </div>
    `).join("");
  };

  buildList(deviceRows, $("deviceInfo"));
  buildList(netRows, $("networkInfo"));
  buildList(sysRows, $("systemInfo"));
};

const fetchData = async () => {
  const btn = $("refreshBtn");
  btn.classList.add("spinning");
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.isok || !json.data) throw new Error("API returned error");

    const data = json.data;
    setStatus(data.online);

    const ds = data.device_status;
    renderHero(ds["em:0"], ds["emdata:0"]);
    renderPhases(ds["em:0"], ds["emdata:0"]);
    renderInfo(data);

    showToast("Actualizado", "success");
  } catch (err) {
    setStatus(false);
    showToast(`Error de carga: ${err.message}`, "error");
  } finally {
    setTimeout(() => btn.classList.remove("spinning"), 800);
  }
};

$("refreshBtn").addEventListener("click", fetchData);

fetchData();
setInterval(fetchData, 60000);
