/* ------------------------- Chart.jsx -------------------------
   Responsive time‑series chart with:
   • target line (red), guess lines (blue), other lines (grey)
   • smooth Catmull‑Rom curves and animated y‑axis rescaling
   • labels, grid, heading and source note
---------------------------------------------------------------- */

import { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import useResizeObserver from "../hooks/useResizeObserver";

const csvUrl =
    "https://raw.githubusercontent.com/a-jiwa/chartle-data/main/data/cleaned_banana_production.csv";
const metaUrl =
    "https://raw.githubusercontent.com/a-jiwa/chartle-data/refs/heads/main/config/test.json";

export default function Chart({
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
    const [meta, setMeta] = useState(null);
    const prevMaxRef = useRef(null); // last y-axis max

    /* --- load data --- */
    useEffect(() => {
        Promise.all([d3.csv(csvUrl, d3.autoType), d3.json(metaUrl)]).then(
            ([wideRows, json]) => {
                const longRows = wideRows.flatMap((row) =>
                    Object.entries(row)
                        .filter(([k, v]) => k !== "Year" && v !== "" && v != null)
                        .map(([country, value]) => ({
                            Country: country,
                            Year: +row.Year,
                            Production: +value,
                        }))
                );
                setData(longRows);
                setMeta(json);
            }
        );
    }, []);

    // pick the 8 biggest producers in the most recent year, ignoring the target
    const autoOthers = (rows) => {
        const latestYear = d3.max(rows, (d) => d.Year);
        return rows
            .filter((d) => d.Year === latestYear)
            .sort((a, b) => d3.descending(a.Production, b.Production))
            .map((d) => d.Country)
            .filter((c) => c !== target) // don’t duplicate the red line
            .slice(0, 8); // keep the top 8
    };

    /* --- redraw on changes --- */
    useEffect(() => {
        if (!data || !meta || !target || width === 0 || height === 0) return;

        /* ----- country sets & groups ----- */
        const latestOthers = others.length ? others : autoOthers(data);
        const wanted = new Set([target, ...latestOthers, ...guesses]);
        const grouped = d3.group(
            data.filter((d) => wanted.has(d.Country)),
            (d) => d.Country
        );

        /* ----- layout ----- */
        const m = { top: 90, right: 30, bottom: 50, left: 30 };
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
            .curve(d3.curveCatmullRom.alpha(0.5))
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

        const guessLines = guesses.map((c, i) => ({
            id: `${c}-guess`,
            country: c,
            rows: grouped.get(c) ?? [],
            stroke: guessColours[i] ?? "#2A74B3",
            width: 3,
            opacity: 1,
        }));

        const lineData = [...baseLines, ...targetLine, ...guessLines];

        /* ----- SVG root & main group ----- */
        const svg = d3
            .select(svgRef.current)
            .attr("viewBox", [0, 0, width, height])
            .attr("preserveAspectRatio", "xMidYMid meet");

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
            .attr("font-size", 18)
            .attr("font-weight", 500)
            .attr("fill", "#111827")
            .attr("dy", "0.8em"); // increased vertical padding for x-axis labels

        const yAxis = (sel) => {
            sel.call(
                d3
                    .axisLeft(y)
                    .ticks(4)
                    .tickSize(-innerW)
                    .tickSizeOuter(0)
                    .tickFormat((d) => d)
            );
            sel.selectAll(".tick text")
                .attr("font-size", 18)
                .attr("font-weight", 500)
                .attr("fill", "#111827");
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

        /* ----- layers for lines ----- */
        let gBase = g.select("g.base-lines");
        let gGuess = g.select("g.guess-lines");

        if (gBase.empty()) {
            gBase = g.append("g").attr("class", "base-lines");
            gGuess = g.append("g").attr("class", "guess-lines");
        }

        /* ----- draw / update BACKGROUND (grey + target) ----- */
        const bgData = lineData.filter(
            (d) => d.id.endsWith("-base") || d.id.endsWith("-target")
        );

        const bgPaths = gBase.selectAll("path").data(bgData, (d) => d.id);

        bgPaths
            .enter()
            .append("path")
            .attr("fill", "none")
            .attr("stroke", (d) => d.stroke)
            .attr("stroke-width", (d) => d.width)
            .attr("opacity", (d) => d.opacity)
            .attr("d", (d) => lineGen(d.rows))
            .merge(bgPaths)
            .attr("stroke", (d) => d.stroke)
            .attr("stroke-width", (d) => d.width)
            .attr("opacity", (d) => d.opacity)
            .attr("d", (d) => lineGen(d.rows));

        bgPaths.exit().remove();

        /* ----- draw / update GUESSES (animated) ----- */
        const guessData = lineData.filter((d) => d.id.endsWith("-guess"));

        const guessPaths = gGuess.selectAll("path").data(guessData, (d) => d.id);

        const guessEnter = guessPaths
            .enter()
            .append("path")
            .attr("fill", "none")
            .attr("stroke", (d) => d.stroke)
            .attr("stroke-width", (d) => d.width)
            .attr("opacity", (d) => d.opacity)
            .attr("d", (d) => lineGen(d.rows));

        // animated reveal for *new* guesses
        guessEnter.each(function () {
            const length = this.getTotalLength();
            d3.select(this)
                .attr("stroke-dasharray", `${length} ${length}`)
                .attr("stroke-dashoffset", length)
                .transition()
                .duration(2000)
                .attr("stroke-dashoffset", 0);
        });

        guessEnter
            .merge(guessPaths)
            .attr("stroke", (d) => d.stroke)
            .attr("stroke-width", (d) => d.width)
            .attr("opacity", (d) => d.opacity)
            .attr("d", (d) => lineGen(d.rows));

        guessPaths.exit().remove();

        /* ----- heading & subtitle ----- */
        const heading = svg.selectAll("g.chart-heading").data([null]);

        const hEnter = heading
            .enter()
            .append("g")
            .attr("class", "chart-heading")
            .attr("transform", `translate(${m.left - 20},24)`);

        hEnter
            .append("text")
            .attr("class", "title")
            .attr("text-anchor", "start")
            .attr("font-size", 24)
            .attr("font-weight", 700)
            .attr("fill", "#111827")
            .text(meta.title);

        hEnter
            .append("text")
            .attr("class", "subtitle")
            .attr("y", 26)
            .attr("font-size", 16)
            .attr("fill", "#374151")
            .attr("text-anchor", "start")
            .text(meta.subtitle);

        /* ----- source note ----- */
        const source = svg.selectAll("text.chart-source").data([null]);

        source
            .enter()
            .append("text")
            .attr("class", "chart-source")
            .attr("text-anchor", "start")
            .attr("font-size", 14)
            .attr("fill", "#6b7280") // gray-500
            .merge(source)
            .attr("x", m.left)
            .attr("y", height - 6)
            .text(meta.source);
    }, [data, meta, width, height, target, others, guesses, guessColours]);

    return (
        <div ref={wrapperRef} className="w-full h-full p-4">
            <svg ref={svgRef} className="w-full h-full" />
        </div>
    );
}
