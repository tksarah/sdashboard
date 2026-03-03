const cpuChart = new Chart(document.getElementById("cpuChart"), {
    type: "line",
    data: { labels: [], datasets: [{ label: "CPU %", data: [], borderColor: "#4caf50" }] },
    options: { responsive: true }
});

const memChart = new Chart(document.getElementById("memChart"), {
    type: "bar",
    data: { labels: ["使用中", "空き"], datasets: [{ data: [0, 0], backgroundColor: ["#ff9800", "#4caf50"] }] },
    options: { responsive: true }
});

const diskChart = new Chart(document.getElementById("diskChart"), {
    type: "doughnut",
    data: { labels: ["使用中", "空き"], datasets: [{ data: [0, 0], backgroundColor: ["#03a9f4", "#607d8b"] }] },
    options: { responsive: true }
});

const netChart = new Chart(document.getElementById("netChart"), {
    type: "line",
    data: { labels: [], datasets: [{ label: "RX Bytes", data: [], borderColor: "#ffeb3b" }] },
    options: { responsive: true }
});

