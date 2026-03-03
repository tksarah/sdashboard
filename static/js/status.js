async function loadStatus() {
    const res = await fetch("/api/status");
    const data = await res.json();

    const statusEl = document.getElementById("collatorStatus");
    if (data.collator_alive) {
        statusEl.innerText = "正常";
        statusEl.className = "card-value status-ok";
    } else {
        statusEl.innerText = "停止";
        statusEl.className = "card-value status-ng";
    }

    cpuChart.data.labels.push("");
    cpuChart.data.datasets[0].data.push(data.cpu_total);
    if (cpuChart.data.labels.length > 20) {
        cpuChart.data.labels.shift();
        cpuChart.data.datasets[0].data.shift();
    }
    cpuChart.update();

    memChart.data.datasets[0].data = [
        data.memory.used,
        data.memory.total - data.memory.used
    ];
    memChart.update();

    diskChart.data.datasets[0].data = [
        data.disk.used,
        data.disk.total - data.disk.used
    ];
    diskChart.update();

    netChart.data.labels.push("");
    netChart.data.datasets[0].data.push(data.network.bytes_recv);
    if (netChart.data.labels.length > 20) {
        netChart.data.labels.shift();
        netChart.data.datasets[0].data.shift();
    }
    netChart.update();

    document.getElementById("blockInfo").innerText =
        `Best: ${data.best_block.toLocaleString()} / Finalized: ${data.finalized_block.toLocaleString()}`;

    document.getElementById("logs").innerText =
        data.logs.slice(-20).join("\n");
}

