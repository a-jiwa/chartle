import { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import Modal from './Modal';
import {
    loadHistoryLocal,
    loadHistory,
} from '../utils/historyStore.js';
import { guessColours } from "../data/colors.js"; // Add this import

export default function WinModal({
    open,
    onClose,
    guesses,
    target,
    infoDescription,
    source,
    csvUrl,
    title,
    maxGuesses,
    subtitle,
    yearStart,
    yearEnd,
    gameDate, // <-- add this
    unitSuffix // <-- add this
}) {
    const [copied, setCopied]   = useState(false);
    const chartRef              = useRef(null);

    const getEmojiString = () => {
        if (!guesses || !target) return '';
        const correctIndex = guesses.findIndex(g => g === target);
        if (correctIndex === -1) {
            // Not guessed, all red squares, no grey
            return '🟥'.repeat(guesses.length) + '⬜️'.repeat(maxGuesses - guesses.length);
        }
        // Red squares for wrong guesses, green for correct, grey for unused
        return (
            '🟥'.repeat(correctIndex) +
            '✅' +
            '⬜️'.repeat(maxGuesses - (correctIndex + 1))
        );
    };

    const emojiString = getEmojiString();

    const shareText = [
        `📈 Chartle`,
        ``,
        `Guessed in ${guesses.length} ${guesses.length === 1 ? "try" : "tries"}`,
        `${emojiString}`,
        ``,
        'https://chartle.cc',
    ].join('\n');

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    };

    // --- PNG Export Function ---
    async function exportChartAsPNG() {

        const exportWidth = 1080;
        const exportHeight = 1080;
        const titleFontSize = 45;
        const subtitleFontSize = 30;
        const axisFontSize = 32;
        const titleMargin = 60;
        const subtitleMargin = 120;
        const m = { top: 180, right: 60, bottom: 110, left: 110 }; // 20px below subtitle
        const innerW = exportWidth - m.left - m.right;
        const innerH = exportHeight - m.top - m.bottom;

        // Fetch and process CSV data
        const rows = await d3.csv(csvUrl, d3.autoType);
        const columnNames = Object.keys(rows[0]);
        const yearColumns = columnNames.filter(col => /^\d{4}$/.test(col));
        const isWideFormat = yearColumns.length > 3;
        let standardized;

        if (isWideFormat) {
            const [colCountry, colISO] = columnNames;
            standardized = rows.flatMap(row =>
                yearColumns
                    .filter(year =>
                        row[colISO] &&
                        typeof row[colISO] === "string" &&
                        row[colISO].trim() !== "" &&
                        !row[colISO].startsWith("OWID") &&
                        (yearStart == null || +year >= yearStart) &&
                        (yearEnd == null || +year <= yearEnd)
                    )
                    .map(year => ({
                        Country: row[colCountry],
                        ISO: row[colISO],
                        Year: +year,
                        Production: row[year]
                    }))
            );
        } else {
            const [colCountry, colISO, colYear] = columnNames;
            const colProduction = columnNames.find((col, i) =>
                i > 2 && typeof rows[0][col] === "number"
            );
            standardized = rows.filter(row =>
                row[colISO] &&
                typeof row[colISO] === "string" &&
                row[colISO].trim() !== "" &&
                !row[colISO].startsWith("OWID") &&
                (yearStart == null || row[colYear] >= yearStart) &&
                (yearEnd == null || row[colYear] <= yearEnd)
            ).map(row => ({
                Country: row[colCountry],
                ISO: row[colISO],
                Year: row[colYear],
                Production: row[colProduction],
            }));
        }

        // --- FILTERING LOGIC ---
        const minYear = !isNaN(Number(yearStart)) ? Number(yearStart) : d3.min(standardized, d => d.Year);
        const maxYear = !isNaN(Number(yearEnd)) ? Number(yearEnd) : d3.max(standardized, d => d.Year);
        const yearRange = maxYear - minYear + 1;

        // Filter to year range
        const filteredByYear = standardized.filter(d => d.Year >= minYear && d.Year <= maxYear);

        // Group by ISO code (or country name)
        const countryGroups = d3.group(filteredByYear, d => d.ISO);

        // Coverage filter only
        const filteredCountries = Array.from(countryGroups.entries())
            .filter(([iso, data]) => {
                // Coverage: at least 60% of years have non-null Production
                const coverage = data.filter(d => d.Production != null && d.Production !== "").length / yearRange;
                return coverage >= 0.6;
            })
            .map(([iso]) => iso);

        // Filter data to only include filtered countries
        const filteredData = standardized.filter(d => d.Year >= minYear && d.Year <= maxYear);

        // Group data for chart drawing (by country name for display)
        const grouped = d3.group(filteredData, d => d.Country);

        // Get CSS variables for colors
        const styles = getComputedStyle(document.documentElement);
        const axisColor = styles.getPropertyValue('--axis-text-color').trim() || "#222";
        const gridColor = styles.getPropertyValue('--grid-line').trim() || "#eee";
        const targetColor = styles.getPropertyValue('--target-red').trim() || "#e33434";
        const otherLineColor = styles.getPropertyValue('--other-lines').trim() || "#888";

        // Scales
        const x = d3.scaleLinear()
            .domain([minYear, maxYear])
            .range([0, innerW]);

        const yMax = d3.max(standardized, d => d.Production);
        const y = d3.scaleLinear()
            .domain([0, yMax])
            .range([innerH, 0]);

        const lineGen = d3.line()
            .defined(d => typeof d.Production === "number" && !isNaN(d.Production))
            .curve(d3.curveMonotoneX)
            .x(d => x(d.Year))
            .y(d => y(d.Production));

        // Create SVG
        const svg = d3.create("svg")
            .attr("xmlns", "http://www.w3.org/2000/svg")
            .attr("width", exportWidth)
            .attr("height", exportHeight)
            .attr("viewBox", [0, 0, exportWidth, exportHeight])
            .style("background", "#f9f9f9");

        // Title (left aligned)
        svg.append("text")
            .attr("x", 30)
            .attr("y", 70) // <-- increase this value
            .attr("text-anchor", "start")
            .attr("font-size", titleFontSize)
            .attr("font-weight", "semibold")
            .attr("font-family", "Open Sans, sans-serif")
            .attr("fill", "#222")
            .text(title || "Chart Title");

        // Subtitle (left aligned)
        svg.append("text")
            .attr("x", 30)
            .attr("y", 130) // <-- increase this value
            .attr("text-anchor", "start")
            .attr("font-size", subtitleFontSize)
            .attr("font-family", "Open Sans, sans-serif")
            .attr("fill", "#444")
            .text(subtitle || "");

        // Main group
        const g = svg.append("g")
            .attr("transform", `translate(${m.left},${m.top})`);

        // Draw grid lines (horizontal) - before any lines
        g.append("g")
            .attr("class", "grid")
            .selectAll("line")
            .data(y.ticks(4))
            .join("line")
            .attr("x1", 0)
            .attr("x2", innerW)
            .attr("y1", d => y(d))
            .attr("y2", d => y(d))
            .attr("stroke", gridColor)
            .attr("stroke-width", 1)
            .attr("opacity", 0.5); // <-- 50% opacity

        // Axes
        g.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${innerH})`)
            .call(
                d3.axisBottom(x)
                    .ticks(4)
                    .tickFormat(d => String(d))
                    .tickSize(6)  // Add tick size to match Chart.jsx
            )
            .selectAll("text")
            .attr("font-size", axisFontSize)
            .attr("font-weight", 400)
            .attr("fill", axisColor)
            .attr("dy", "0.95em")
            .style("font-family", "Open Sans, sans-serif");

        g.select(".x-axis .domain")
            .attr("stroke", axisColor)
            .attr("stroke-width", 1);

        g.selectAll(".x-axis .tick line")
            .attr("stroke", axisColor)
            .attr("stroke-width", 1);

        g.append("g")
            .attr("class", "y-axis")
            .call(
                d3.axisLeft(y)
                    .ticks(4)
                    .tickFormat(formatNumber)
                    .tickSize(0)
            )
            .selectAll("text")
            .attr("font-size", axisFontSize)
            .attr("font-weight", 400)
            .attr("fill", axisColor)
            .style("font-family", "Open Sans, sans-serif");

        // Remove only y-axis domain and tick lines
        g.select(".y-axis .domain").attr("stroke", "none");
        g.selectAll(".y-axis .tick line").attr("stroke", "none");

        // Draw other lines (grey)
        const allCountries = Array.from(grouped.keys());
        const guessSet = new Set(guesses.concat([target]));
        allCountries.forEach(country => {
            if (!guessSet.has(country)) {
                const rows = grouped.get(country) ?? [];
                g.append("path")
                    .attr("fill", "none")
                    .attr("stroke", otherLineColor)
                    .attr("stroke-width", 2)
                    .attr("opacity", 0.4)
                    .attr("d", lineGen(rows));
            }
        });

        // Draw guess lines (colored, with #f9f9f9 outline)
        // Track label positions to avoid overlap
        let labelPositions = [];

        guesses.forEach((c, i) => {
            const rows = grouped.get(c) ?? [];
            // Outline
            g.append("path")
                .attr("fill", "none")
                .attr("stroke", "#f9f9f9")
                .attr("stroke-width", 12)
                .attr("opacity", 1)
                .attr("d", lineGen(rows));
            // Main colored line
            g.append("path")
                .attr("fill", "none")
                .attr("stroke", guessColours[i % guessColours.length])
                .attr("stroke-width", 6)
                .attr("opacity", 1)
                .attr("d", lineGen(rows));

            // Add guess number label at the end of the line
            const lastRow = rows[rows.length - 1];
            if (lastRow) {
                const isTarget = c === target;
                let labelX = x(lastRow.Year) + 10;
                let labelY = y(lastRow.Production);

                // Check for overlap with previous labels
                const labelRadius = 18; // half font size + padding
                labelPositions.forEach(pos => {
                    if (Math.abs(labelX - pos.x) < labelRadius * 2 &&
                        Math.abs(labelY - pos.y) < labelRadius * 2) {
                        // Offset vertically to avoid overlap
                        labelY += labelRadius * 2;
                    }
                });
                labelPositions.push({ x: labelX, y: labelY });

                // Draw label with stroke for contrast
                g.append("text")
                    .attr("x", labelX)
                    .attr("y", labelY)
                    .attr("font-size", 32)
                    .attr("font-family", "Open Sans, sans-serif")
                    .attr("font-weight", "bold")
                    .attr("fill", isTarget ? targetColor : guessColours[i % guessColours.length])
                    .attr("stroke", "#f9f9f9") // stroke matches background
                    .attr("stroke-width", 6)
                    .attr("paint-order", "stroke")
                    .attr("alignment-baseline", "middle")
                    .text(String(i + 1));
            }
        });

        // Draw target line (red, with #f9f9f9 outline)
        const targetRows = grouped.get(target) ?? [];
        // Outline
        g.append("path")
            .attr("fill", "none")
            .attr("stroke", "#f9f9f9")
            .attr("stroke-width", 14) // thicker outline for target
            .attr("opacity", 1)
            .attr("d", lineGen(targetRows));
        // Main red line
        g.append("path")
            .attr("fill", "none")
            .attr("stroke", targetColor)
            .attr("stroke-width", 8) // main line thickness
            .attr("opacity", 1)
            .attr("d", lineGen(targetRows));

        // Footer left: chartle.cc
        svg.append("text")
            .attr("x", m.left)
            .attr("y", exportHeight - 20)
            .attr("text-anchor", "start")
            .attr("font-size", 30)
            .attr("font-family", "Open Sans, sans-serif")
            .attr("font-weight", "bold")
            .attr("fill", "#222")
            .text("📈 chartle.cc");

        // Footer right: game date
        svg.append("text")
            .attr("x", exportWidth - m.right)
            .attr("y", exportHeight - 20)
            .attr("text-anchor", "end")
            .attr("font-size", 30)
            .attr("font-family", "Open Sans, sans-serif")
            .attr("font-weight", "bold")
            .attr("fill", "#222")
            .text(gameDate || "");

        // Convert SVG to PNG
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svg.node());
        const img = new window.Image();
        img.width = exportWidth;
        img.height = exportHeight;
        const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);

        return new Promise((resolve, reject) => {
            img.onload = function () {
                const canvas = document.createElement("canvas");
                canvas.width = exportWidth;
                canvas.height = exportHeight;
                const ctx = canvas.getContext("2d");
                ctx.fillStyle = "#f9f9f9";
                ctx.fillRect(0, 0, exportWidth, exportHeight);
                ctx.drawImage(img, 0, 0, exportWidth, exportHeight);

                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error("PNG export failed"));
                }, "image/png");
                URL.revokeObjectURL(url);
            };
            img.onerror = reject;
            img.src = url;
        });
    }

    /* ------ helper to convert history → bar‑chart data ------ */
    function chartData(history) {
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, Lost: 0 };

        Object.values(history).forEach((entry) => {
            if (!Array.isArray(entry.guesses)) return;
            const tgt = entry.target?.toLowerCase();
            const idx = entry.guesses.findIndex((g) => g?.toLowerCase() === tgt);
            if (idx >= 0 && idx < 5) counts[idx + 1]++;
            else counts.Lost++;
        });

        return Object.entries(counts).map(([tries, count]) => ({ tries, count }));
    }

    /* ------ draw / redraw the bar chart ------ */
    function drawChart(data) {
        const svg = d3.select(chartRef.current);
        svg.selectAll('*').remove();

        const margin = { top: 10, right: 20, bottom: 20, left: 20 };
        const labelPadding = 30;
        const width  = 300 - margin.left - margin.right;
        const height = data.length * 30;

        const styles = getComputedStyle(document.documentElement);
        const textColor = styles.getPropertyValue('--text-color').trim();
        const barColor  = styles.getPropertyValue('--first-guess').trim();

        const chart = svg
            .attr('width',  width  + margin.left + margin.right)
            .attr('height', height + margin.top  + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`)
            .style('font-family', 'Open Sans');

        const x = d3.scaleLinear()
            .domain([0, d3.max(data, (d) => d.count) || 1])
            .range([0, width - labelPadding]);

        const y = d3.scaleBand()
            .domain(data.map((d) => d.tries))
            .range([0, height])
            .padding(0.2);

        chart.selectAll('.bar')
            .data(data)
            .enter()
            .append('rect')
            .attr('x', labelPadding)
            .attr('y', (d) => y(d.tries))
            .attr('width',  (d) => x(d.count))
            .attr('height', y.bandwidth())
            .attr('fill', barColor);

        chart.selectAll('.label')
            .data(data.filter(d => d.count > 0))  // only data points with count > 0
            .enter()
            .append('text')
            .attr('x', (d) => labelPadding + x(d.count) - 5)
            .attr('y', (d) => y(d.tries) + y.bandwidth() / 2 + 4)
            .attr('text-anchor', 'end')
            .attr('fill', '#ffffff')
            .style('font-family', "'Open Sans', sans-serif")
            .style('font-size', '14px')
            .text((d) => d.count);

        chart.append('g')
            .call(d3.axisLeft(y).tickSize(0))
            .selectAll('text')
            .style('font-family', "'Open Sans', sans-serif")
            .style('font-size', '14px')
            .attr('fill', textColor)
            .attr('text-anchor', 'start')
            .attr('x', -5);

        chart.selectAll('.domain').remove();
    }

    /* ------ effect: draw chart when modal opens ------ */
    useEffect(() => {
        if (!open) return;

        drawChart(chartData(loadHistoryLocal()));

        loadHistory().then((hist) => {
            drawChart(chartData(hist));
        });
    }, [open]);

    const formatNumber = (d) => {
        if (typeof d !== "number" || isNaN(d)) return "";

        const abs = Math.abs(d);
        let formatted;

        if (abs >= 1e9) {
            formatted = (d / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
        } else if (abs >= 1e6) {
            formatted = (d / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
        } else if (abs >= 1e3) {
            formatted = (d / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
        } else {
            formatted = d.toString();
        }

        return unitSuffix ? `${formatted}${unitSuffix}` : formatted;
    };

    return (
        <Modal open={open} onClose={onClose} >
            <div className="px-5 text-center">
                {/* Custom title */}
                <h2 className="text-2xl font-bold mb-4 [color:var(--text-color)]">You guessed it!</h2>

                {/* description */}
                <div className="mb-4 space-y-3 [color:var(--text-color)] text-left">
                    {infoDescription.split('\n').map((line, i) => (
                        <p key={i}>{line}</p>
                    ))}
                </div>

                {/* source */}
                <p className="text-sm [color:var(--text-color)] mb-8 text-left">
                    Data source: {source}
                </p>

                {/* record + chart */}
                <p className="text-lg font-semibold [color:var(--text-color)] mb-2 mt-6 text-left">
                    Your track record
                </p>
                <svg ref={chartRef} className="w-full h-auto mb-4" />

                {/* buttons */}
                <div className="mt-4 flex items-center justify-between gap-4">
                    <button
                        onClick={async () => {
                            try {
                                // Export chart as PNG and get the blob
                                const blob = await exportChartAsPNG();
                                const file = new File([blob], "chartle.png", { type: "image/png" });

                                // Prepare share data
                                const shareData = {
                                    title: "Chartle Result",
                                    text: shareText,
                                    files: [file],
                                };

                                // Check if Web Share API is available and can share files
                                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                                    await navigator.share(shareData);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                } else {
                                    // Fallback: just copy text to clipboard
                                    await navigator.clipboard.writeText(shareText);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                    alert("Sharing with image is not supported on this device/browser. Share text copied to clipboard.");
                                }
                            } catch (err) {
                                console.error("Share failed:", err);
                            }
                        }}
                        className="rounded-lg [background-color:var(--second-guess)] px-4 py-2 text-sm text-white hover:[background-color:var(--second-guess-dark)] focus:outline-none focus:ring-4 focus:ring-blue-300"
                    >
                        {copied ? 'Copied!' : 'Share result'}
                    </button>
                    <button
                        onClick={onClose}
                        className="
                            rounded-lg 
                            bg-black 
                            px-4 py-2 
                            text-sm 
                            text-white 
                            focus:outline-none 
                            focus:ring-4 
                            focus:ring-emerald-300
                            "
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
}
