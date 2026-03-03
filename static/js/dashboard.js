// common storage keys
const STORAGE_KEYS = {
    order: 'dashboardOrder',
    collapse: 'collapseStates',
    refresh: 'refreshInterval'
};

const grid = document.getElementById('dashboardGrid');

function toggleCard(btn) {
    const c = btn.parentElement;
    c.classList.toggle('collapsed');
    btn.textContent = c.classList.contains('collapsed') ? '＋' : '−';
    saveState();
}

function saveState() {
    const order = [...grid.children].map(c => c.dataset.id);
    const collapse = {};
    grid.querySelectorAll('.card').forEach(c => collapse[c.dataset.id] = c.classList.contains('collapsed'));
    localStorage.setItem(STORAGE_KEYS.order, JSON.stringify(order));
    localStorage.setItem(STORAGE_KEYS.collapse, JSON.stringify(collapse));
}

function loadState() {
    const order = JSON.parse(localStorage.getItem(STORAGE_KEYS.order) || '[]');
    const collapse = JSON.parse(localStorage.getItem(STORAGE_KEYS.collapse) || '{}');

    order.forEach(id => {
        const c = [...grid.children].find(x => x.dataset.id === id);
        if (c) grid.appendChild(c);
    });

    Object.entries(collapse).forEach(([id, closed]) => {
        const c = grid.querySelector(`.card[data-id="${id}"]`);
        if (c && closed) {
            c.classList.add('collapsed');
            c.querySelector('.collapse-btn').textContent = '＋';
        }
    });
}

new Sortable(grid, { animation: 150, ghostClass: 'sortable-ghost', onEnd: saveState });

let refreshInterval;

function startAutoRefresh(sec) {
    clearInterval(refreshInterval);
    refreshInterval = setInterval(loadStatus, sec * 1000);
}

document.getElementById('refreshSelect').addEventListener('change', e => {
    const sec = Number(e.target.value);
    localStorage.setItem(STORAGE_KEYS.refresh, sec);
    startAutoRefresh(sec);
});

window.onload = () => {
    const interval = Number(localStorage.getItem(STORAGE_KEYS.refresh)) || 10;
    document.getElementById('refreshSelect').value = interval;
    startAutoRefresh(interval);
    loadSDN();
};

async function fetchJSON(path) {
    return (await fetch(path)).json();
}

async function loadSDN() {
    const d = await fetchJSON('/api/sdn_balance');
    if (d.sdn_balance != null) {
        document.getElementById('sdnAmount').innerText = `${Number(d.sdn_balance.toFixed(2)).toLocaleString()} SDN`;
        document.getElementById('sdnUsd').innerText = `$${(d.sdn_value_usd != null ? Number(d.sdn_value_usd.toFixed(2)).toLocaleString() : '-')}`;
        document.getElementById('sdnJpy').innerText = `${(d.sdn_value_jpy != null ? Number(d.sdn_value_jpy.toFixed(0)).toLocaleString() : '-')} 円`;
    } else {
        document.getElementById('sdnBalance').innerText = '取得失敗';
    }
}

let cpuHistory = [], netSent = [], netRecv = [], lastNet;

async function loadStatus() {
    const d = await fetchJSON('/api/status');

    document.getElementById('collatorStatusText').innerHTML =
        `Collator 状態: <span class="${d.collator_alive ? 'green' : 'red'}">${d.collator_alive ? '正常' : '停止'}</span>`;

    document.getElementById('cpuTotalText').innerText = `CPU 使用率: ${d.cpu_total}%`;
    cpuHistory.push(d.cpu_total);
    if (cpuHistory.length > 20) cpuHistory.shift();
    updateChart(cpuLineChart, cpuHistory);

    cpuCoreChart.data.labels = d.cpu_per_core.map((_, i) => `Core ${i}`);
    cpuCoreChart.data.datasets[0].data = d.cpu_per_core;
    cpuCoreChart.update();

    const memUsed = (d.memory.used / 1024 / 1024 / 1024).toFixed(2);
    const memTotal = (d.memory.total / 1024 / 1024 / 1024).toFixed(2);
    document.getElementById('memoryText').innerText = `${memUsed} GB / ${memTotal} GB`;
    updateChart(memChart, [memUsed, memTotal - memUsed]);

    const diskUsed = (d.disk.used / 1024 / 1024 / 1024).toFixed(2);
    const diskTotal = (d.disk.total / 1024 / 1024 / 1024).toFixed(2);
    document.getElementById('diskText').innerText = `${diskUsed} GB / ${diskTotal} GB`;
    updateChart(diskChart, [diskUsed, diskTotal - diskUsed]);

    if (lastNet) {
        const s = (d.network.bytes_sent - lastNet.bytes_sent) / 1024;
        const r = (d.network.bytes_recv - lastNet.bytes_recv) / 1024;
        netSent.push(s);
        if (netSent.length > 20) netSent.shift();
        netRecv.push(r);
        if (netRecv.length > 20) netRecv.shift();
        netChart.data.datasets[0].data = netSent;
        netChart.data.datasets[1].data = netRecv;
        netChart.update();
    }
    lastNet = d.network;

    document.getElementById('bestBlock').innerText = d.best_block;
    document.getElementById('finalizedBlock').innerText = d.finalized_block;

    const diff = d.sync_diff;
    document.getElementById('sync').innerHTML =
        `遅延: <span class="${diff <= 2 ? 'green' : 'red'}">${diff}</span> blocks<br>同期率: ${d.sync_rate}%`;

    document.getElementById('logs').innerText = d.logs.join('\n');
}

function updateChart(c, d) {
    c.data.datasets[0].data = d;
    c.update();
}

function makeChart(el, conf) {
    return new Chart(document.getElementById(el), conf);
}

const cpuLineChart = makeChart('cpuLineChart', {
    type: 'line',
    data: { labels: Array(20).fill(''), datasets: [{ label: 'CPU %', data: [], borderColor: '#4bc0c0', fill: false, tension: 0.2 }] }
});
const cpuCoreChart = makeChart('cpuCoreChart', {
    type: 'bar',
    data: { labels: [], datasets: [{ label: 'CPU %', data: [], backgroundColor: 'rgba(75,192,192,0.6)' }] },
    options: { indexAxis: 'y', scales: { x: { min: 0, max: 100 } } }
});
const memChart = makeChart('memChart', { type: 'doughnut', data: { labels: ['使用中 (GB)', '空き (GB)'], datasets: [{ data: [0, 0], backgroundColor: ['#ff6384', '#36a2eb'] }] } });
const diskChart = makeChart('diskChart', { type: 'doughnut', data: { labels: ['使用中 (GB)', '空き (GB)'], datasets: [{ data: [0, 0], backgroundColor: ['#ff6384', '#36a2eb'] }] } });
const netChart = makeChart('netChart', { type: 'line', data: { labels: Array(20).fill(''), datasets: [{ label: '送信 KB/s', data: [], borderColor: '#ff6384', fill: false }, { label: '受信 KB/s', data: [], borderColor: '#36a2eb', fill: false }] } });

loadStatus();
