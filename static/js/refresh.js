let refreshTimer = null;

function applyRefreshInterval() {
    const interval = Number(document.getElementById("refreshInterval").value);

    localStorage.setItem("refreshInterval", interval);

    if (refreshTimer) clearInterval(refreshTimer);

    refreshTimer = setInterval(loadStatus, interval);
}

const savedInterval = localStorage.getItem("refreshInterval");
if (savedInterval) {
    document.getElementById("refreshInterval").value = savedInterval;
}

