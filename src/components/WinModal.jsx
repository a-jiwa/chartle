import { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import Modal from './Modal';
import {
    loadHistoryLocal,
    loadHistory,
} from '../utils/historyStore.js';
import { guessColours } from "../data/colors.js"; // Add this import
import { COUNTRIES } from "../data/countriesWithPopulation.js"; // Add this import at the top

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
    const [emojiString]         = useState('');       // unchanged
    const chartRef              = useRef(null);

    const shareText = [
        `📈 Chartle — ${title}`,
        `${guesses.length}/${maxGuesses} ✅`,
        emojiString,
        'chartle.cc',
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
        const exportHeight = 1280;
        const titleFontSize = 54;
        const subtitleFontSize = 36;
        const axisFontSize = 32;
        const titleMargin = 60;
        const subtitleMargin = 120;
        const m = { top: 220 + 20, right: 60, bottom: 130, left: 110 }; // 20px below subtitle
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
                yearColumns.map(year => ({
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
            standardized = rows.map(row => ({
                Country: row[colCountry],
                ISO: row[colISO],
                Year: row[colYear],
                Production: row[colProduction],
            }));
        }

        // --- FILTERING LOGIC ---
        const minYear = typeof yearStart === "number" ? yearStart : d3.min(standardized, d => d.Year);
        const maxYear = typeof yearEnd === "number" ? yearEnd : d3.max(standardized, d => d.Year);
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
        const filteredData = filteredByYear.filter(d => filteredCountries.includes(d.ISO));

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
            .domain([
                d3.min(standardized, d => d.Year),
                d3.max(standardized, d => d.Year)
            ])
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

        // Header rectangle (top bar)
        svg.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", exportWidth)
            .attr("height", 80)
            .attr("fill", targetColor);

        // Header text (centered, white, bold)
        svg.append("text")
            .attr("x", exportWidth / 2)
            .attr("y", 55) // vertically centered in the bar
            .attr("text-anchor", "middle")
            .attr("font-size", 48)
            .attr("font-family", "Open Sans, sans-serif")
            .attr("font-weight", "bold")
            .attr("fill", "#fff")
            .text(`Guessed in ${guesses.length} ${guesses.length === 1 ? "try" : "tries"}`);

        // Title (left aligned)
        svg.append("text")
            .attr("x", m.left)
            .attr("y", 160) // <-- increase this value
            .attr("text-anchor", "start")
            .attr("font-size", titleFontSize)
            .attr("font-weight", "bold")
            .attr("font-family", "Open Sans, sans-serif")
            .attr("fill", "#222")
            .text(title || "Chart Title");

        // Subtitle (left aligned)
        svg.append("text")
            .attr("x", m.left)
            .attr("y", 220) // <-- increase this value
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
            )
            .selectAll("text")
            .attr("font-size", axisFontSize)
            .attr("font-weight", 400)
            .attr("fill", axisColor)
            .attr("dy", "0.95em")
            .style("font-family", "Open Sans, sans-serif");

        g.append("g")
            .attr("class", "y-axis")
            .call(
                d3.axisLeft(y)
                    .ticks(4)
                    .tickFormat(d => unitSuffix ? `${d}${unitSuffix}` : d)
                    .tickSize(0) // no tick lines
            )
            .selectAll("text")
            .attr("font-size", axisFontSize)
            .attr("font-weight", 400)
            .attr("fill", axisColor)
            //.attr("dx", "-0.5em")
            .style("font-family", "Open Sans, sans-serif");

        // Remove axis domain lines for a cleaner look
        g.selectAll(".domain").attr("stroke", "none");
        g.selectAll(".tick line").attr("stroke", "none");

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
        guesses.forEach((c, i) => {
            const rows = grouped.get(c) ?? [];
            // Outline
            g.append("path")
                .attr("fill", "none")
                .attr("stroke", "#f9f9f9")
                .attr("stroke-width", 12) // outline thickness
                .attr("opacity", 1)
                .attr("d", lineGen(rows));
            // Main colored line
            g.append("path")
                .attr("fill", "none")
                .attr("stroke", guessColours[i % guessColours.length])
                .attr("stroke-width", 6) // main line thickness
                .attr("opacity", 1)
                .attr("d", lineGen(rows));
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

        // Add label "?" at the last point of the target line
        const lastTargetRow = targetRows[targetRows.length - 1];
        if (lastTargetRow) {
            g.append("text")
                .attr("x", x(lastTargetRow.Year) + 10) // nudge right
                .attr("y", y(lastTargetRow.Production))
                .attr("font-size", 40)
                .attr("font-family", "Open Sans, sans-serif")
                .attr("font-weight", "bold")
                .attr("fill", targetColor)
                .attr("alignment-baseline", "middle")
                .text("?");
        }

        // Footer left: chartle.cc
        svg.append("text")
            .attr("x", m.left)
            .attr("y", exportHeight - 30)
            .attr("text-anchor", "start")
            .attr("font-size", 30)
            .attr("font-family", "Open Sans, sans-serif")
            .attr("font-weight", "bold")
            .attr("fill", "#222")
            .text("📈 chartle.cc");

        // Footer right: game date
        svg.append("text")
            .attr("x", exportWidth - m.right)
            .attr("y", exportHeight - 30)
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

        img.onload = function () {
            const canvas = document.createElement("canvas");
            canvas.width = exportWidth;
            canvas.height = exportHeight;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#f9f9f9"; // <-- set your desired background color
            ctx.fillRect(0, 0, exportWidth, exportHeight);
            ctx.drawImage(img, 0, 0, exportWidth, exportHeight);

            canvas.toBlob((blob) => {
                // Download PNG
                const pngUrl = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = pngUrl;
                a.download = "chartle_export.png";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(pngUrl);
            }, "image/png");

            URL.revokeObjectURL(url);
        };
        img.src = url;
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
                        onClick={() => {
                            handleCopy();
                            exportChartAsPNG();
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
