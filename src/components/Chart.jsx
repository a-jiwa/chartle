/* ------------------------- Chart.jsx -------------------------
   Responsive time‑series chart with:
   • target line (red), guess lines (blue), other lines (grey)
   • smooth Catmull‑Rom curves and animated y‑axis rescaling
   • labels, grid, heading and source note
---------------------------------------------------------------- */

import { useRef, useEffect, useState } from "react";
import * as d3 from "d3";
import useResizeObserver from "../hooks/useResizeObserver";

const csvUrl  = "https://raw.githubusercontent.com/a-jiwa/chartle-data/main/data/cleaned_banana_production.csv";
const metaUrl = "https://raw.githubusercontent.com/a-jiwa/chartle-data/refs/heads/main/config/test.json";

export default function Chart({ target, others = [], guesses = [], guessColours = [] }) {
    /* ----- refs & state ----- */
    const wrapperRef = useRef(null);
    const svgRef     = useRef(null);
    const { width, height } = useResizeObserver(wrapperRef);
    const [data, setData]   = useState(null);
    const [meta, setMeta]   = useState(null)
    const prevMaxRef        = useRef(null);   // last y‑axis max

    /*
     Pivots each year-row into {Country, Year, Production} objects, then draws as before. Nothing else in the
     rendering logic changes.

     This should be simplified.
    */

    useEffect(() => {
        Promise.all([d3.csv(csvUrl, d3.autoType), d3.json(metaUrl)]).then(
            ([wideRows, json]) => {
                const longRows = wideRows.flatMap(row =>
                    Object.entries(row)
                        .filter(([k, v]) => k !== "Year" && v !== "" && v != null)
                        .map(([country, value]) => ({
                            Country:     country,
                            Year:        +row.Year,
                            Production:  +value
                        }))
                );
                setData(longRows);
                setMeta(json);
            }
        );
    }, []);

    // pick the 8 biggest producers in the most recent year, ignoring the target
    const autoOthers = (rows) => {
        const latestYear = d3.max(rows, d => d.Year);
        return rows
            .filter(d => d.Year === latestYear)
            .sort((a, b) => d3.descending(a.Production, b.Production))
            .map(d => d.Country)
            .filter(c => c !== target)      // don’t duplicate the red line
            .slice(0, 8);                   // keep the top 8
    };

    /* redraw on data / size / props change */
    useEffect(() => {
        if (!data || !meta || !target || width === 0 || height === 0) return;

        /* ----- filter & group required countries ----- */
        const baseOthers = others.length ? others : autoOthers(data);
        const wanted     = [target, ...baseOthers, ...guesses];
        const grouped  = d3.group(data.filter(d => wanted.includes(d.Country)), d => d.Country);

        /* ----- layout ----- */
        const m = { top: 120, right: 60, bottom: 40, left: 30 };
        const innerW = width  - m.left - m.right;
        const innerH = height - m.top  - m.bottom;

        /* ----- scales ----- */
        const x = d3.scaleLinear()
            .domain(d3.extent(data, d => d.Year))
            .range([0, innerW]);

        const yMax = d3.max(grouped, ([, rows]) => d3.max(rows, d => d.Production / meta.scale));
        const y    = d3.scaleLinear()
            .domain([0, yMax]).nice()
            .range([innerH, 0]);

        const domainChanged = prevMaxRef.current === null || yMax > prevMaxRef.current;
        if (domainChanged) prevMaxRef.current = yMax;

        /* ----- line generator ----- */
        const lineGen = d3.line()
            .curve(d3.curveCatmullRom.alpha(0.5))
            .x(d => x(d.Year))
            .y(d => y(d.Production / meta.scale));

        /* ----- SVG root & main group ----- */
        const svg = d3.select(svgRef.current)
            .attr("viewBox", [0, 0, width, height])
            .attr("preserveAspectRatio", "xMidYMid meet");

        let g = svg.select("g.chart-root");
        if (g.empty()) {
            g = svg.append("g")
                .attr("class", "chart-root")
                .attr("transform", `translate(${m.left},${m.top})`)
                .call(sel => {
                    sel.append("g").attr("class", "x-axis");
                    sel.append("g").attr("class", "y-axis");
                });
        }

        /* ----- axes ----- */
        g.select(".x-axis")
            .attr("transform", `translate(0,${innerH})`)
            .call(
                d3.axisBottom(x)
                    .ticks(5)
                    .tickFormat(d => String(d).slice(-2))
            )
            .selectAll(".tick text")
            .attr("font-size", 18)
            .attr("font-weight", 500)
            .attr("fill", "#111827");


        const yAxis = sel => {
            sel.call(
                d3.axisLeft(y)
                    .ticks(4)
                    .tickSize(-innerW)
                    .tickSizeOuter(0)
                    .tickFormat(d => d)   // already in millions
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

        /* ----- styling helpers ----- */
        const colourOf = country => {
            if (country === target) return "#b8261a";      // red target
            const idx = guesses.indexOf(country);          // 0,1,2,…
            if (idx !== -1) return guessColours[idx] ?? "#2A74B3";
            return "#757575";                              // background grey
        };

        const widthOf  = c =>
            c === target          ? 4 :
                guesses.includes(c)   ? 3 :
                    2.5;

        /* ----- draw / update lines ----- */
        const paths = g.selectAll("path.country-line")
            .data(Array.from(grouped), d => d[0]);

        paths.exit().remove();

        paths
            .attr("stroke", ([c]) => colourOf(c))
            .attr("stroke-width", ([c]) => widthOf(c))
            .transition().duration(domainChanged ? 1500 : 0)
            .attr("d", ([, rows]) => lineGen(rows));

        const entered = paths.enter()
            .append("path")
            .attr("class", "country-line")
            .attr("fill", "none")
            .attr("stroke", ([c]) => colourOf(c))
            .attr("stroke-width", ([c]) => widthOf(c))
            .attr("opacity", ([c]) => (c === target ? 1 : 0.7))
            .attr("d", ([, rows]) => lineGen(rows));

        // animated reveal for fresh guesses
        entered.each(function ([c]) {
            if (!guesses.includes(c)) return;
            const length = this.getTotalLength();
            d3.select(this)
                .attr("stroke-dasharray", `${length} ${length}`)
                .attr("stroke-dashoffset", length)
                .transition().duration(1500)
                .attr("stroke-dashoffset", 0);
        });

        /* ----- labels & leader ticks for guesses ----- */
        const labelPad = 6;
        const guessRows = guesses
            .map(c => [c, grouped.get(c)])
            .filter(([, v]) => v)
            .sort(([, a], [, b]) => d3.ascending(a.at(-1).Production, b.at(-1).Production));

        const labels = g.selectAll("text.guess-label").data(guessRows, d => d[0]);

        labels.exit().remove();

        labels
            .attr("x", innerW + labelPad)
            .attr("y", ([, r]) => y(r.at(-1).Production / meta.scale))
            .text(([c]) => c);

        labels.enter()
            .append("text")
            .attr("class", "guess-label")
            .attr("fill", ([c]) => colourOf(c))
            .attr("font-size", 14)
            .attr("font-weight", 700)
            .attr("text-anchor", "start")
            .attr("x", innerW + labelPad)
            .attr("y", ([, r]) => y(r.at(-1).Production / meta.scale))
            .attr("dy", "0.32em")
            .attr("opacity", 0)
            .text(([c]) => c)
            .transition().duration(1500)
            .attr("opacity", 1);

        const ticks = g.selectAll("line.leader-tick").data(guessRows, d => d[0]);

        ticks.exit().remove();

        ticks
            .attr("x1", ([, r]) => x(r.at(-1).Year))
            .attr("x2", innerW + labelPad - 2)
            .attr("y1", ([, r]) => y(r.at(-1).Production / meta.scale))
            .attr("y2", ([, r]) => y(r.at(-1).Production / meta.scale));

        ticks.enter()
            .append("line")
            .attr("class", "leader-tick")
            .attr("stroke", "#2E74BA")
            .attr("stroke-width", 1)
            .attr("x1", ([, r]) => x(r.at(-1).Year))
            .attr("x2", ([, r]) => x(r.at(-1).Year))
            .attr("y1", ([, r]) => y(r.at(-1).Production / meta.scale))
            .attr("y2", ([, r]) => y(r.at(-1).Production / meta.scale))
            .transition().duration(1500)
            .attr("x2", innerW + labelPad - 2);

        /* ----- heading & subtitle ----- */
        const heading = svg.selectAll("g.chart-heading").data([null]);

        const hEnter = heading.enter()
            .append("g")
            .attr("class", "chart-heading")
            .attr("transform", `translate(${m.left - 20},24)`);

        hEnter.append("text")
            .attr("class", "title")
            .attr("text-anchor", "start")
            .attr("font-size", 24)
            .attr("font-weight", 700)
            .attr("fill", "#111827")
            .text(meta.title);

        hEnter.append("text")
            .attr("class", "subtitle")
            .attr("y", 26)
            .attr("font-size", 16)
            .attr("fill", "#374151")
            .attr("text-anchor", "start")
            .text(meta.subtitle);

        /* ----- source note ----- */
        const source = svg.selectAll("text.chart-source").data([null]);

        source.enter()
            .append("text")
            .attr("class", "chart-source")
            .attr("text-anchor", "start")
            .attr("font-size", 12)
            .attr("fill", "#6b7280")               // gray-500
            .merge(source)
            .attr("x", m.left)
            .attr("y", height - 6)
            .text(meta.source);
    }, [data, meta, width, height, target, others, guesses]);

    return (
        <div ref={wrapperRef} className="w-full h-full p-4">
            <svg ref={svgRef} className="w-full h-full" />
        </div>
    );
}
