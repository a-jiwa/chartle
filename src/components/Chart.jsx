/* ------------------------- Chart.jsx -------------------------
   Responsive time‑series chart with:
   • target line (red), guess lines (blue), other lines (grey)
   • smooth Catmull‑Rom curves and animated y‑axis rescaling
   • labels, grid, heading and source note
---------------------------------------------------------------- */

import { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import useResizeObserver from "../hooks/useResizeObserver";

export default function Chart({
                                  csvUrl,
                                  meta,
                                  target,
                                  others = [],
                                  guesses = [],
                                  guessColours = [],
                              }) {
    /* ----- refs & state ----- */
    const wrapperRef = useRef(null);
    const svgRef = useRef(null);
    const { width, height } = useResizeObserver(wrapperRef);
    const [data, setData] = useState(null);
    const prevMaxRef = useRef(null); // last y-axis max

    /* --- load data --- */
    useEffect(() => {
        if (!csvUrl) return;

        d3.csv(csvUrl, d3.autoType).then((rows) => {
            if (!rows.length) return;

            const columnNames = Object.keys(rows[0]);

            // Detect wide format: many numeric year-named columns
            const yearColumns = columnNames.filter(col => /^\d{4}$/.test(col));
            const isWideFormat = yearColumns.length > 3;

            let standardized;

            if (isWideFormat) {
                // Assume first column is Country, second is ISO
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
                // Assume first three columns: Country, ISO, Year
                const [colCountry, colISO, colYear] = columnNames;

                const colProduction = columnNames.find((col, i) =>
                    i > 2 && typeof rows[0][col] === "number"
                );

                standardized = rows.filter(row =>
                    row[colISO] &&
                    typeof row[colISO] === "string" &&
                    row[colISO].trim() !== "" &&
                    !row[colISO].startsWith("OWID") &&
                    (meta.yearStart == null || row[colYear] >= meta.yearStart)
                ).map(row => ({
                    Country: row[colCountry],
                    ISO: row[colISO],
                    Year: row[colYear],
                    Production: row[colProduction],
                }));
            }

            console.log("Standardized data:", standardized);
            setData(standardized);
        });
    }, [csvUrl]);




    // pick the 10 biggest producers based on each country's max value, ignoring the target
    const autoOthers = (rows) => {
        // Create a map to store each country's maximum production value
        const maxByCountry = d3.rollup(
            rows.filter(d => d.Country !== target && typeof d.Production === "number" && !isNaN(d.Production)),
            v => d3.max(v, d => d.Production),
            d => d.Country
        );

        // Convert the map to an array and sort by max production descending
        const topCountries = Array.from(maxByCountry.entries())
            .sort((a, b) => d3.descending(a[1], b[1]))
            .map(([country]) => country)
            .filter((c, i, arr) => arr.indexOf(c) === i) // just in case
            .filter((c) => c !== target)
            .slice(0, 10); // keep the top 10

        return topCountries;
    };


    /* --- redraw on changes --- */
    useEffect(() => {
        if (!data || !meta || !target || width === 0 || height === 0) return;

        const unitSuffix = meta.unitSuffix;

        /* ----- country sets & groups ----- */
        const latestOthers = others.length ? others : autoOthers(data);
        const wanted = new Set([target, ...latestOthers, ...guesses]);
        const grouped = d3.group(
            data.filter((d) => wanted.has(d.Country)),
            (d) => d.Country
        );

        /* ----- layout ----- */
        const m = { top: 90, right: 50, bottom: 60, left: 50 };
        const innerW = width - m.left - m.right;
        const innerH = height - m.top - m.bottom;

        /* ----- scales ----- */
        const x = d3
            .scaleLinear()
            .domain(d3.extent(data, (d) => d.Year))
            .range([0, innerW]);

        const yMax = d3.max(grouped, ([, rows]) =>
            d3.max(rows, (d) => d.Production / meta.scale)
        );

        const y = d3
            .scaleLinear()
            .domain([0, yMax]) //.nice()
            .range([innerH, 0]);

        const domainChanged =
            prevMaxRef.current === null || yMax > prevMaxRef.current;
        if (domainChanged) prevMaxRef.current = yMax;

        /* ----- line generator ----- */
        const lineGen = d3
            .line()
            .defined(d => typeof d.Production === "number" && !isNaN(d.Production))
            .curve(d3.curveMonotoneX)
            .x((d) => x(d.Year))
            .y((d) => y(d.Production / meta.scale));

        /* ----- build line data ----- */
        const baseLines = latestOthers.map((c) => ({
            id: `${c}-base`,
            country: c,
            rows: grouped.get(c) ?? [],
            stroke: "#757575",
            width: 2.5,
            opacity: 0.4,
        }));

        const targetLine = [
            {
                id: `${target}-target`,
                country: target,
                rows: grouped.get(target) ?? [],
                stroke: "#c43333",
                width: 4,
                opacity: 1,
            },
        ];

        const guessLines = guesses.map((c, i) => {
            const rows = grouped.get(c) ?? [];
            const iso  = rows[0]?.ISO ?? c;

            return {
                id: `${c}-guess`,
                country: c,
                iso,
                rows,
                stroke: guessColours[i] ?? "#2A74B3",
                width: 3,
                opacity: 1,
            };
        });

        const lineData = [...baseLines, ...targetLine, ...guessLines];

        /* ----- SVG root & main group ----- */
        const svg = d3
            .select(svgRef.current)
            .attr("viewBox", [0, 0, width, height])
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("overflow", "visible");
        let g = svg.select("g.chart-root");
        if (g.empty()) {
            g = svg
                .append("g")
                .attr("class", "chart-root")
                .attr("transform", `translate(${m.left},${m.top})`)
                .call((sel) => {
                    sel.append("g").attr("class", "x-axis");
                    sel.append("g").attr("class", "y-axis");
                });
        }

        /* ----- axes ----- */
        g.select(".x-axis")
            .attr("transform", `translate(0,${innerH})`)
            .call(d3.axisBottom(x).ticks(5).tickFormat((d) => String(d)))
            .selectAll(".tick text")
            .attr("font-size", 16)
            .attr("font-weight", 500)
            .attr("fill", "#6b7280")
            .attr("dy", "0.95em") // increased vertical padding for x-axis labels
            .style("font-family", "Open Sans, sans-serif");

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

        const yAxis = (sel) => {
            sel.call(
                d3.axisLeft(y)
                    .ticks(4)
                    .tickSize(-innerW)
                    .tickSizeOuter(0)
                    .tickFormat(formatNumber)
            );

            sel.selectAll(".tick text")
                .attr("font-size", 16)
                .attr("font-weight", 500)
                .attr("fill", "#6b7280")
                .style("font-family", "Open Sans, sans-serif");
            sel.selectAll(".domain").attr("stroke-opacity", 0);
            sel.selectAll(".tick line")
                .attr("stroke", "#d1d5db")
                .attr("stroke-opacity", 0.6)
                .attr("stroke-width", 1);
        };


        if (domainChanged) {
            g.select(".y-axis").transition().duration(1500).call(yAxis);
        } else {
            g.select(".y-axis").call(yAxis);
        }

        // Get maximum tick label width
        const maxTickLabelWidth = Math.max(
            ...g.select(".y-axis").selectAll("text").nodes().map(node =>
                node.getBBox().width
            )
        );

        // Compute new left offset for title/subtitle alignment
        const titleOffsetX = m.left - maxTickLabelWidth - 4; // 8px padding from tick label


        // Assuming these are declared earlier in your scope:
        // let g, baseLines, guessLines, targetLine, guesses, lineGen

        // Select or create base lines group
        let gBase = g.select("g.base-lines");
        if (gBase.empty()) gBase = g.append("g").attr("class", "base-lines");

        // Select or create guess lines group
        let gGuess = g.select("g.guess-lines");
        if (gGuess.empty()) gGuess = g.append("g").attr("class", "guess-lines");

        // === Base (grey) lines ===
        const baseGroups = gBase.selectAll("g.base-line").data(baseLines, d => d.id);
        const baseEnter = baseGroups.enter().append("g").attr("class", "base-line");

        baseEnter.append("path")
            .attr("fill", "none")
            .attr("stroke", d => d.stroke)
            .attr("stroke-width", d => d.width)
            .attr("opacity", d => d.opacity)
            .attr("d", d => lineGen(d.rows));

        baseGroups.select("path")
            .attr("stroke", d => d.stroke)
            .attr("stroke-width", d => d.width)
            .attr("opacity", d => d.opacity)
            .attr("d", d => lineGen(d.rows));

        baseGroups.exit().remove();

        // === Guess lines (animated) ===
        const guessGroups = gGuess.selectAll("g.guess-line").data(guessLines, d => d.id);
        const guessEnter = guessGroups.enter().append("g").attr("class", "guess-line");

        guessEnter.append("path")
            .attr("fill", "none")
            .attr("stroke", "#f9f9f9")
            .attr("stroke-width", d => d.width + 2.5)
            .attr("opacity", 1)
            .attr("d", d => lineGen(d.rows));

        guessEnter.append("path")
            .attr("fill", "none")
            .attr("stroke", d => d.stroke)
            .attr("stroke-width", d => d.width)
            .attr("opacity", d => d.opacity)
            .attr("d", d => lineGen(d.rows));

        guessEnter.selectAll("path").each(function () {
            const length = this.getTotalLength();
            d3.select(this)
                .attr("stroke-dasharray", `${length} ${length}`)
                .attr("stroke-dashoffset", length)
                .transition()
                .duration(2000)
                .attr("stroke-dashoffset", 0);
        });

        guessGroups.select("path:nth-child(1)")
            .attr("stroke-width", d => d.width + 1.5)
            .attr("d", d => lineGen(d.rows));

        guessGroups.select("path:nth-child(2)")
            .attr("stroke", d => d.stroke)
            .attr("stroke-width", d => d.width)
            .attr("opacity", d => d.opacity)
            .attr("d", d => lineGen(d.rows));

        guessGroups.exit().remove();

        /* ────── right-hand labels for each guess line ────── */
        const labelXOffset = 4;
        const labelYOffset = 4;

        const guessLabels = g.selectAll("text.guess-label")
            .data(guessLines, d => d.id);

        const guessLabelsMerged = guessLabels.enter()
            .append("text")
            .attr("class", "guess-label")
            .attr("font-size", 14)
            .attr("text-anchor", "start")
            .merge(guessLabels);

        guessLabelsMerged
            .attr("font-weight", "bold")
            .attr("font-family", "Open Sans, sans-serif")
            .attr("fill", d => d.stroke)
            .each(function (d) {
                const rows = d.rows.filter(r => typeof r.Production === "number");
                const last = rows[rows.length - 1];
                if (!last) return;

                const xPos = x(last.Year) + labelXOffset;
                const yPos = y(last.Production / meta.scale) + labelYOffset;

                d3.select(this)
                    .attr("x", xPos)
                    .attr("y", yPos)
                    .text(d.iso);
            });

        guessLabels.exit().remove();

        // === Red target line (static base) and overlay animation ===
        const red = targetLine[0];

        let gTarget = g.select("g.target-line");
        if (gTarget.empty()) {
            gTarget = g.append("g").attr("class", "target-line");

            const redPathData = lineGen(red.rows);

        // White outline path
        const outline = gTarget
            .append("path")
            .attr("fill", "none")
            .attr("stroke", "#f9f9f9")
            .attr("stroke-width", red.width + 2.5)
            .attr("opacity", 1)
            .attr("d", redPathData);

        // Red main path
        const main = gTarget
            .append("path")
            .attr("fill", "none")
            .attr("stroke", red.stroke)
            .attr("stroke-width", red.width)
            .attr("opacity", red.opacity)
            .attr("d", redPathData);

        // Animate both paths
        [outline, main].forEach((path) => {
            const length = path.node().getTotalLength();
            path
            .attr("stroke-dasharray", `${length} ${length}`)
            .attr("stroke-dashoffset", length)
            .transition()
            .duration(2000)
            .attr("stroke-dashoffset", 0);
        });
        } else {
        // On resize or updates, just update paths without animation
        const redPathData = lineGen(red.rows);
        gTarget.selectAll("path").data([0, 1]).join("path")
            .attr("fill", "none")
            .attr("stroke", (_, i) => (i === 0 ? "#f9f9f9" : red.stroke))
            .attr("stroke-width", (_, i) => (i === 0 ? red.width + 2.5 : red.width))
            .attr("opacity", red.opacity)
            .attr("d", redPathData);
        }

        /* ───── two-size title helper ───── */
        function pickFontSize(text, maxWidth) {
            const normal = 24;   // default desktop size
            const small  = 18;   // fallback if title would overflow
            const rough  = text.length * normal * 0.6;   // crude width estimate
            return rough <= maxWidth ? normal : small;
        }


        /* ----- heading & subtitle ----- */
        const headingOffset = 40;                       // top padding

        const heading = svg.selectAll("g.chart-heading").data([null]);
        const hEnter  = heading.enter().append("g").attr("class", "chart-heading");

        heading.attr("transform", `translate(${titleOffsetX},${headingOffset})`);

        /* title */
        const titleSel = hEnter
            .append("text")
            .attr("class", "title")
            .attr("text-anchor", "start")
            .attr("font-weight", 700)
            .attr("fill", "#111827")
            .merge(heading.select("text.title"));

        const fontSize = pickFontSize(meta.title, width - m.left - m.right);
        titleSel
            .attr("font-size", fontSize)
            .text(meta.title);

        /* subtitle (always 16 px) */
        const subtitleSel = hEnter
            .append("text")
            .attr("class", "subtitle")
            .attr("y", 26)
            .attr("text-anchor", "start")
            .attr("fill", "#374151")
            .merge(heading.select("text.subtitle"));

        subtitleSel
            .attr("font-size", 16)
            .text(meta.subtitle);

        /* ----- source note ----- */
        const source = svg.selectAll("text.chart-source").data([null]);

        source
            .enter()
            .append("text")
            .attr("class", "chart-source")
            .attr("text-anchor", "start")
            .attr("font-size", 14)
            .attr("fill", "#6b7280")     // gray-500
            .merge(source)
            .attr("x", m.left)           // align with left margin
            .attr("y", height - 6)
            .text("Source: " + meta.source);


    }, [data, meta, width, height, target, others, guesses, guessColours]);

    return (
        <div ref={wrapperRef} className="w-full h-full">
            <svg ref={svgRef} className="w-full h-full"/>
        </div>
    );
}
