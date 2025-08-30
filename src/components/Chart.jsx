/* ------------------------- Chart.jsx -------------------------
   Responsive time‑series chart with:
   • target line (red), guess lines (blue), other lines (grey)
   • smooth Catmull‑Rom curves and animated y‑axis rescaling
   • labels and grid
---------------------------------------------------------------- */

import { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import useResizeObserver from "../hooks/useResizeObserver";
import { guessColours } from "../data/colors.js";
import { COUNTRIES } from "../data/countriesWithPopulation.js"; //
import { easeLinear } from 'd3-ease'   // comes with D3 bundle


export default function Chart({
                                  csvUrl,
                                  meta,
                                  target,
                                  others = [],
                                  guesses = [],
                                  setAvailableCountries,
                              }) {
    // Detect mobile/touch devices
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     ('ontouchstart' in window) || 
                     (navigator.maxTouchPoints > 0);
    /* ----- refs & state ----- */
    const wrapperRef = useRef(null);
    const svgRef = useRef(null);
    const { width, height } = useResizeObserver(wrapperRef);
    const [data, setData] = useState(null);               // ← for full data
    const [filteredData, setFilteredData] = useState(null); // ← for initial chart render
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
                    (meta.yearStart == null || row[colYear] >= meta.yearStart) &&
                    (meta.yearEnd == null || row[colYear] <= meta.yearEnd)
                ).map(row => ({
                    Country: row[colCountry],
                    ISO: row[colISO],
                    Year: row[colYear],
                    Production: row[colProduction],
                }));
            }

            console.log("Standardized data:", standardized);
            
            // Determine time range
            const years = standardized.map(d => d.Year);
            const minYear = meta.yearStart ?? d3.min(years);
            const maxYear = meta.yearEnd ?? d3.max(years);
            const yearRange = maxYear - minYear + 1;

            // Filter: keep only countries with >60% data coverage
            const rowsByCountry = d3.group(
            standardized.filter(d => d.Year >= minYear && d.Year <= maxYear),
            d => d.Country
            );

            const coverageThreshold = 0.6;
            const qualifyingCountries = Array.from(rowsByCountry.entries())
            .filter(([country, rows]) => {
                // Always include the target country regardless of data coverage
                if (country === target) return true;
                
                const uniqueYears = new Set(rows.map(d => d.Year));
                return uniqueYears.size / yearRange >= coverageThreshold;
            })
            .map(([country]) => country);

            // Apply population threshold
            const populationThreshold = 300_000;

            // Build a quick lookup: country name → population
            const popByCountry = new Map(
            Object.entries(COUNTRIES)
                .map(([iso, data]) => [data.name || iso, data.population])
            );

            // Filter to keep only countries with sufficient population, BUT always include target
            const populationFilteredCountries = qualifyingCountries.filter(country => {
                // Always include the target country regardless of population
                if (country === target) return true;
                
                const pop = popByCountry.get(country);
                return typeof pop === "number" && pop >= populationThreshold;
            });

            // Filter the dataset, ensuring target is always included
            const filteredData = standardized.filter(d =>
                populationFilteredCountries.includes(d.Country)
            );

            setData(standardized);         // full data (used to draw guessed lines later)
            setFilteredData(filteredData); // just high-coverage for initial lines

            const allCountries = Array.from(
                new Set(standardized.map(d => d.Country))
            );
            
            // Ensure target is always available for guessing, even if it doesn't meet filters
            const availableForGuessing = [...populationFilteredCountries];
            if (target && !availableForGuessing.includes(target)) {
                availableForGuessing.push(target);
            }
            
            setAvailableCountries(availableForGuessing);
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
            //.slice(0, 10); // keep the top 10

        return topCountries;
    };


    /* --- redraw on changes --- */
    useEffect(() => {
        if (!data || !filteredData || !meta || !target || width === 0 || height === 0) return;
        
        const rafId = requestAnimationFrame(() => {
            
        const unitSuffix = meta.unitSuffix;

        const outlineColor = getComputedStyle(document.documentElement)
            .getPropertyValue('--stroke-outline')
            .trim();

        /* ----- country sets & groups ----- */
        const latestOthers = others.length ? others : autoOthers(filteredData);
        const wanted = new Set([target, ...latestOthers, ...guesses]);
        const grouped = d3.group(
            data.filter((d) => wanted.has(d.Country)),
            (d) => d.Country
        );

        /* ----- layout ----- */
        const m = { top: 30, right: 50, bottom: 60, left: 50 };
        const innerW = width - m.left - m.right;
        const innerH = height - m.top - m.bottom;

            /* ----- scales ----- */
        const x = d3
            .scaleLinear()
            .domain([
                meta.yearStart ?? d3.min(data, d => d.Year),
                meta.yearEnd ?? d3.max(data, d => d.Year)
            ])
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

        console.log('x-domain:', x.domain());
        console.log('sample target years:', grouped.get(target).map(d => d.Year));


        /* ----- build line data ----- */
        const baseLines = latestOthers.map((c) => ({
            id: `${c}-base`,
            country: c,
            rows: grouped.get(c) ?? [],
            stroke: getComputedStyle(document.documentElement).getPropertyValue('--other-lines').trim(),
            width: 1.5,
            opacity: 0.4,
        }));

        const targetLine = [
            {
                id: `${target}-target`,
                country: target,
                rows: grouped.get(target) ?? [],
                stroke: getComputedStyle(document.documentElement).getPropertyValue('--target-red').trim(),
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
                stroke: guessColours[i],
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
                .style("overflow", "visible")

            let g = svg.select("g.chart-root")
            if (g.empty()) {
                g = svg
                    .append("g")
                    .attr("class", "chart-root")
                    .attr("transform", `translate(${m.left},${m.top})`)
                    .call(sel => {
                        sel.append("g").attr("class", "x-axis")
                        sel.append("g").attr("class", "y-axis")
                    })
            }

            /* ───────── hover layer: guide, dots, red labels with background ─────── */
            let hoverLayer = g.select('g.hover-layer')
            if (hoverLayer.empty()) {
                hoverLayer = g.append('g').attr('class', 'hover-layer')

                /* vertical guide */
                hoverLayer.append('line')
                    .attr('class', 'hover-line')
                    .attr('stroke', '#6b7280')
                    .attr('stroke-width', 1)
                    .attr('stroke-dasharray', '4 4')
                    .attr('y1', 0)
                    .style('opacity', 0)

                /* target dot */
                hoverLayer.append('circle')
                    .attr('class', 'hover-dot-target')
                    .attr('r', 4)
                    .attr('fill', '#c43333')
                    .attr('stroke', '#ffffff')
                    .attr('stroke-width', 1.5)
                    .style('opacity', 0)
                    .attr('pointer-events', 'none')

                /* travelling year label */
                hoverLayer.append('text')
                    .attr('class', 'hover-year-label')
                    .attr('text-anchor', 'middle')
                    .attr('font-size', 16)
                    .attr('font-weight', 500)
                    .attr('fill', getComputedStyle(document.documentElement).getPropertyValue('--axis-text-color').trim())
                    .attr('font-family', 'Open Sans, sans-serif')
                    .attr('dy', '1.5em')
                    .style('opacity', 0)
                    .attr('pointer-events', 'none')

                /* value label background */
                hoverLayer.append('rect')
                    .attr('class', 'hover-value-bg')
                    .attr('fill', '#ffffff')
                    .attr('rx', 3)
                    .attr('ry', 3)
                    .style('opacity', 0)
                    .attr('pointer-events', 'none')

                /* value label text */
                hoverLayer.append('text')
                    .attr('class', 'hover-value-label')
                    .attr('text-anchor', 'start')
                    .attr('font-size', 14)
                    .attr('font-weight', 600)
                    .attr('fill', '#c43333')
                    .attr('font-family', 'Open Sans, sans-serif')
                    .style('opacity', 0)
                    .attr('pointer-events', 'none')

                /* invisible hit‑area */
                hoverLayer.append('rect')
                    .attr('class', 'hover-capture')
                    .attr('fill', 'transparent')
                    .attr('pointer-events', 'all')
                    .style('touch-action', 'none')
                    .style('user-select', 'none')
                    .style('-webkit-user-select', 'none')
                    .style('-moz-user-select', 'none')
                    .style('-ms-user-select', 'none')
            }

            /* resize‑sensitive elements */
            hoverLayer.select('.hover-line').attr('y2', innerH)
            hoverLayer.select('.hover-capture')
                .attr('width', innerW)
                .attr('height', innerH)
            hoverLayer.select('.hover-year-label').attr('y', innerH)

            /* dots for guess lines (enter / exit) */
            const guessDots = hoverLayer.selectAll('circle.guess-dot')
                .data(guessLines, d => d.id)

            guessDots.enter()
                .append('circle')
                .attr('class', 'guess-dot')
                .attr('r', 4)
                .attr('fill', d => d.stroke)
                .attr('stroke', '#ffffff')
                .attr('stroke-width', 1.5)
                .style('opacity', 0)
                .attr('pointer-events', 'none')

            guessDots.exit().remove()

            const guessPills = hoverLayer
                .selectAll('g.guess-pill')
                .data(guessLines, d => d.id)

            const gpEnter = guessPills
                .enter()
                .append('g')
                .attr('class', 'guess-pill')
                .style('pointer-events', 'none')
                .style('opacity', 0)

            gpEnter
                .append('rect')
                .attr('rx', 3)
                .attr('ry', 3)
                .attr('fill', '#ffffff')

            gpEnter
                .append('text')
                .attr('font-size', 14)
                .attr('font-weight', 600)
                .attr('font-family', 'OpenSans,sans-serif')

            guessPills.exit().remove()

            hoverLayer.raise()   /* keep overlay on top */

            /* helpers */
            const bisectYear = d3.bisector(d => d.Year).left
            const targetRows = grouped.get(target) ?? []

            const interp = (rows, yr) => {
                if (!rows.length) return null
                const i = bisectYear(rows, yr)
                if (i <= 0) return rows[0].Production / meta.scale
                if (i >= rows.length) return rows[rows.length - 1].Production / meta.scale
                const a = rows[i - 1], b = rows[i]
                const t = (yr - a.Year) / (b.Year - a.Year)
                return a.Production / meta.scale + t * ((b.Production / meta.scale) - (a.Production / meta.scale))
            }

            /* one‑decimal formatter */
            const formatValue = d => {
                if (d == null) return ''
                const abs   = Math.abs(d)
                let value   = d
                let suffix  = ''
                if (abs >= 1e9) { value = d / 1e9 ; suffix = 'B' }
                else if (abs >= 1e6) { value = d / 1e6 ; suffix = 'M' }
                else if (abs >= 1e3) { value = d / 1e3 ; suffix = 'k' }
                return value.toFixed(1) + suffix + (meta.unitSuffix || '')
            }

            /* pointer handlers */
            const pointerMove = ev => {
                // Prevent default to avoid text selection on mobile
                ev.preventDefault();
                
                /* raw pointer position in plot coordinates */
                const [mxRaw, myRaw] = d3.pointer(ev, hoverLayer.node())

                /* limit it to the drawable area */
                const mx = Math.min(innerW, Math.max(0, mxRaw))
                const my = Math.min(innerH, Math.max(0, myRaw))

                // Increase proximity threshold on mobile for easier interaction
                const PROX = isMobile ? 60 : 40

                /* fade grey lines to 0.15 over 300ms */
                gBase.selectAll('path')
                    .interrupt()
                    .transition().duration(isMobile ? 150 : 300).ease(easeLinear)
                    .attr('opacity', 0.15)

                /* guide line */
                hoverLayer.select('.hover-line')
                    .attr('x1', mx)
                    .attr('x2', mx)
                    .style('opacity', 1)

                /* year label */
                const yr = x.invert(mx)
                hoverLayer.select('.hover-year-label')
                    .attr('x', mx)
                    .text(Math.round(yr))
                    .style('opacity', 1)

                /* hide default x‑axis labels */
                g.select('.x-axis').selectAll('.tick text').style('opacity', 0)

                /* target dot + value label */
                const yVal = interp(targetRows, yr)
                if (yVal != null) {
                    const cy = y(yVal)

                    hoverLayer.select('.hover-dot-target')
                        .attr('cx', mx)
                        .attr('cy', cy)
                        .style('opacity', 1)

                    const txtSel = hoverLayer.select('.hover-value-label')
                        .attr('x', mx + 8)
                        .attr('y', cy - 6)
                        .text(formatValue(yVal))
                        .style('opacity', 1)

                    /* background sized to text bbox */
                    const box = txtSel.node().getBBox()
                    hoverLayer.select('.hover-value-bg')
                        .attr('x', box.x - 4)
                        .attr('y', box.y - 2)
                        .attr('width', box.width + 8)
                        .attr('height', box.height + 4)
                        .style('opacity', 0.85)
                }

                hoverLayer
                    .selectAll('g.guess-pill')
                    .each(function (d) {
                        const val = interp(d.rows, yr)
                        if (val == null) { d3.select(this).style('opacity', 0) ; return }

                        const cy = y(val)
                        const closeEnough = Math.abs(cy - my) <= PROX

                        if (!closeEnough) { d3.select(this).style('opacity', 0) ; return }

                        const txt = d3
                            .select(this)
                            .style('opacity', 1)
                            .select('text')
                            .attr('fill', d.stroke)
                            .attr('x', mx + 8)
                            .attr('y', cy - 6)
                            .text(formatValue(val))

                        const box = txt.node().getBBox()

                        d3.select(this)
                            .select('rect')
                            .attr('x', box.x - 4)
                            .attr('y', box.y - 2)
                            .attr('width', box.width + 8)
                            .attr('height', box.height + 4)
                            .style('opacity', 0.85)
                    })

                /* guess dots */
                hoverLayer.selectAll('circle.guess-dot')
                    .each(function (d) {
                        const yGuess = interp(d.rows, yr)
                        d3.select(this)
                            .style('opacity', yGuess == null ? 0 : 1)
                            .attr('cx', mx)
                            .attr('cy', y(yGuess))
                    })
            }


            const pointerEnd = () => {
                hoverLayer.select('.hover-line').style('opacity', 0)
                hoverLayer.select('.hover-dot-target').style('opacity', 0)
                hoverLayer.select('.hover-year-label').style('opacity', 0)
                hoverLayer.select('.hover-value-label').style('opacity', 0)
                hoverLayer.select('.hover-value-bg').style('opacity', 0)
                hoverLayer.selectAll('g.guess-pill').style('opacity', 0)
                hoverLayer.selectAll('circle.guess-dot').style('opacity', 0)
                g.select('.x-axis').selectAll('.tick text').style('opacity', 1)

                /* fade grey lines back to 0.4 over 300ms */
                gBase.selectAll('path')
                    .interrupt()                     // stop any running dim‑transition
                    .transition().duration(isMobile ? 150 : 300).ease(easeLinear)
                    .attr('opacity', 0.4)
            }

            /* bind events */
            hoverLayer.select('.hover-capture')
                .on('pointerenter pointerdown pointermove', pointerMove)
                .on('pointerup pointercancel', pointerEnd)
                // Don't use pointerout on mobile - it can fire when crossing over lines
                .on('pointerleave', (ev) => {
                    // Only end hover if we're actually leaving the chart area
                    const rect = ev.currentTarget.getBoundingClientRect();
                    const x = ev.clientX;
                    const y = ev.clientY;
                    
                    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                        pointerEnd();
                    }
                })

            /* ----- axes ----- */
        g.select(".x-axis")
            .attr("transform", `translate(0,${innerH})`)
            .call(
            d3.axisBottom(x)
                .ticks(Math.min(5, Math.floor(innerW / 100))) // adaptive + max of 5
                .tickFormat(d => String(d))
            )
            .selectAll(".tick text")
            .attr("font-size", 16)
            .attr("font-weight", 500)
            .attr("fill", getComputedStyle(document.documentElement).getPropertyValue('--axis-text-color').trim())
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
                .attr("fill", getComputedStyle(document.documentElement).getPropertyValue('--axis-text-color').trim())
                .style("font-family", "Open Sans, sans-serif");
            sel.selectAll(".domain").attr("stroke-opacity", 0);
            sel.selectAll(".tick line")
                .attr("stroke", getComputedStyle(document.documentElement).getPropertyValue('--axis-lines-color').trim())
                .attr("stroke-opacity", 0.6)
                .attr("stroke-width", 1);
        };


        g.select(".y-axis").call(yAxis);


        // Get maximum tick label width
        const maxTickLabelWidth = Math.max(
            ...g.select(".y-axis").selectAll("text").nodes().map(node =>
                node.getBBox().width
            )
        );

        // Compute new left offset for title/subtitle alignment
        const titleOffsetX = m.left - maxTickLabelWidth - 4; // 4px padding from tick label


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
            .attr("stroke", outlineColor)
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
                .duration(2500)
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

        function avoidLabelOverlap(labels, minSpacing = 12) {
            // Get label nodes with their original y-positions
            const nodes = labels.nodes().map((el) => {
                const sel = d3.select(el);
                return {
                    node: sel,
                    y: parseFloat(sel.attr("y")),
                    x: parseFloat(sel.attr("x")),
                };
            });

            // Sort labels from top to bottom (ascending y)
            nodes.sort((a, b) => a.y - b.y);

            const placed = [];

            for (let i = 0; i < nodes.length; i++) {
                const curr = nodes[i];
                let bestY = curr.y;
                let offset = 0;
                let direction = -1; // start by trying to move up

                while (true) {
                    const conflict = placed.some((p) => Math.abs(p.y - bestY) < minSpacing);

                    if (!conflict) break;

                    // Alternate between up and down, increasing distance each loop
                    direction *= -1;
                    offset += minSpacing;
                    bestY = curr.y + direction * offset;

                    // Safety stop
                    if (offset > 100) break;
                }

                curr.node.attr("y", bestY);
                placed.push({ y: bestY });
            }
        }


        // Append labels after line animations
        guessEnter.selectAll("path:last-child").each(function (d, i) {
            const path = d3.select(this);
            const length = this.getTotalLength();

            const rows = d.rows.filter(r => typeof r.Production === "number");
            const last = rows[rows.length - 1];
            if (!last) return;

            const xPos = x(last.Year) + labelXOffset;
            const yPos = y(last.Production / meta.scale) + labelYOffset;

            const drawLabel = () => {
                g.append("text")
                    .attr("class", d.country === target ? "target-label" : "guess-label")
                    .attr("font-size", 16)
                    .attr("font-weight", "bold")
                    .attr("text-anchor", "start")
                    .attr("font-family", "Open Sans, sans-serif")
                    .attr("fill", d.country === target ? getComputedStyle(document.documentElement).getPropertyValue('--target-red').trim() : d.stroke)
                    .attr("stroke", outlineColor)        
                    .attr("stroke-width", 2.5)          
                    .attr("paint-order", "stroke")        
                    .attr("x", xPos)
                    .attr("y", yPos)
                    .text(d.iso);

                // Slight timeout to let DOM update before resolving overlaps
                setTimeout(() => {
                    avoidLabelOverlap(g.selectAll("text.guess-label, text.target-label"));
                }, 0);
            };

            if (d.country === target) {
                drawLabel(); // No animation delay
            } else {
                path.transition()
                    .duration(2500)
                    .attr("stroke-dashoffset", 0)
                    .on("end", drawLabel); // Wait until line animation finishes
            }
        });




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
            .attr("stroke", outlineColor)
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
            .duration(2500)
            .attr("stroke-dashoffset", 0);
        });
        } else {
        // On resize or updates, just update paths without animation
        const redPathData = lineGen(red.rows);
        gTarget.selectAll("path").data([0, 1]).join("path")
            .attr("fill", "none")
            .attr("stroke", (_, i) => (i === 0 ? strokeOutline : red.stroke))
            .attr("stroke-width", (_, i) => (i === 0 ? red.width + 2.5 : red.width))
            .attr("opacity", red.opacity)
            .attr("d", redPathData);
        }

// Remove any existing target label
g.selectAll("text.target-unknown-label, text.target-label").remove();

// Get target data
const targetData = grouped.get(target) ?? [];
const validRows = targetData.filter(r => typeof r.Production === "number");
const last = validRows[validRows.length - 1];

if (last) {
    const xPos = x(last.Year) + 4;
    const yPos = y(last.Production / meta.scale) + 4;
    const targetISO = targetData[0]?.ISO ?? target;

    const drawTargetLabel = () => {
        g.append("text")
            .attr("class", "target-label")
            .attr("font-size", 16)
            .attr("font-weight", "bold")
            .attr("text-anchor", "start")
            .attr("font-family", "Open Sans, sans-serif")
            .attr("fill", getComputedStyle(document.documentElement).getPropertyValue('--target-red').trim())
            .attr("stroke", outlineColor)
            .attr("stroke-width", 2.5)
            .attr("paint-order", "stroke")
            .attr("x", xPos)
            .attr("y", yPos)
            .text(targetISO);
    };

    const drawUnknownLabel = () => {
        g.append("text")
            .attr("class", "target-unknown-label")
            .attr("font-size", 16)
            .attr("font-weight", "bold")
            .attr("text-anchor", "start")
            .attr("font-family", "Open Sans, sans-serif")
            .attr("fill", getComputedStyle(document.documentElement).getPropertyValue('--target-red').trim())
            .attr("stroke", outlineColor)
            .attr("stroke-width", 2.5)
            .attr("paint-order", "stroke")
            .attr("x", xPos)
            .attr("y", yPos)
            .text("xxx");
    };

    if (guesses.includes(target)) {
        drawTargetLabel(); // show correct label
    } else {
        const redPath = gTarget.select("path:nth-child(2)");
        const delay = 2500;

        const timeoutId = setTimeout(() => {
            if (!guesses.includes(target)) {
                drawUnknownLabel();
            }
        }, delay);

        // Cleanup function to remove "???" if target is guessed later
        const observer = new MutationObserver(() => {
            if (guesses.includes(target)) {
                clearTimeout(timeoutId); // cancel delayed label if needed
                g.selectAll("text.target-unknown-label").remove();
                drawTargetLabel(); // draw actual ISO label
                observer.disconnect();
            }
        });

        // Watch for changes to the <svg> to respond to new guesses
        observer.observe(svgRef.current, { childList: true, subtree: true });

        // Just in case: cleanup observer when component unmounts
        return () => observer.disconnect();
    }
}



            /* keep the hover layer above everything that was just added */
            hoverLayer.raise()

        });
    
    return () => cancelAnimationFrame(rafId); // cleanup
    }, [data, meta, width, height, target, others, guesses, guessColours]);

    return (
        <div 
            ref={wrapperRef} 
            className="w-full h-full"
            style={{
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none'
            }}
        >
            {width > 0 && height > 0 && (
            <svg ref={svgRef} className="w-full h-full" />
            )}
        </div>
        );
}