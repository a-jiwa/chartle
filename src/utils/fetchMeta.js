const SHEET_ID = "1g0IsY1ReO2nyVJhZS90rkbOFueMqHO4iOpW8mtM79LI";
const SHEET_NAME = "sheet2";

export async function fetchMeta() {
    const today = new Date().toISOString().slice(0, 10);

    // Opensheet turns any Google Sheet into JSON
    const url   = `https://opensheet.elk.sh/${SHEET_ID}/${SHEET_NAME}`;
    const rows  = await fetch(url).then(r => r.json());

    const row   = rows.find(r => r.date === today);
    if (!row) throw new Error(`No row found for ${today}`);

    return {
        title:          row.title,
        subtitle:       row.subtitle,
        source:         row.source,
        scale:          Number(row.scale || 1),
        target:         row.target,
        unitSuffix:     row.unitSuffix || "",
        yearStart:      row.yearStart  || undefined,
        csvUrl:         row.OWID_datalink,
        others:         [],
        infoDescription: row.infoDescription || "",
    };
}
