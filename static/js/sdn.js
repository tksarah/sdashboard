async function loadSDN() {
    const res = await fetch("/api/sdn_balance");
    const data = await res.json();

    if (data.sdn_balance != null) {
        const bal = Number(data.sdn_balance.toFixed(4)).toLocaleString();
        const usd = data.sdn_value_usd != null ? Number(data.sdn_value_usd.toFixed(2)).toLocaleString() : "-";
        const jpy = data.sdn_value_jpy != null ? Number(data.sdn_value_jpy.toFixed(0)).toLocaleString() : "-";

        document.getElementById("sdnBalance").innerText =
            `${bal} SDN / $${usd} / ${jpy} 円`;
    }
}

