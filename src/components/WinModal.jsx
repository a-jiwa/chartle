import { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import Modal from "./Modal";
import { loadHistory } from "../utils/storage";

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
}) {
    const [copied, setCopied] = useState(false);
    const [emojiString, setEmojiString] = useState("");
    const chartRef = useRef(null);

    const shareText = [
        `📈 Chartle — ${title}`,
        `${guesses.length}/${maxGuesses} ✅`,
        emojiString,
        "chartle.cc",
    ].join("\n");

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(shareText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Copy failed:", err);
        }
    };

    const computeTriesPerGame = () => {
        const history = loadHistory();
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, Lost: 0 };

        Object.values(history).forEach((entry) => {
            if (!Array.isArray(entry.guesses)) return;
            const target = entry.target?.toLowerCase();
            const index = entry.guesses.findIndex(g => g?.toLowerCase() === target);
            if (index >= 0 && index < 5) {
                counts[index + 1]++;
            } else {
                counts["Lost"]++;
            }
        });

        return Object.entries(counts).map(([tries, count]) => ({
            tries,
            count
        }));
    };

    useEffect(() => {
        if (!open) return;

        const data = computeTriesPerGame();
        const svg = d3.select(chartRef.current);
        svg.selectAll("*").remove();

        const margin = { top: 10, right: 20, bottom: 20, left: 20 };
        const labelPadding = 30;
        const width = 300 - margin.left - margin.right;
        const height = data.length * 30;

        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const textColor = prefersDark ? "#e5e7eb" : "#111827";
        const barColor = "#3b9e9e";

        const chart = svg
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`)
            .style("font-family", "Open Sans");

        const x = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.count) || 1])
            .range([0, width - labelPadding]);

        const y = d3.scaleBand()
            .domain(data.map(d => d.tries))
            .range([0, height])
            .padding(0.2);

        chart.selectAll(".bar")
            .data(data)
            .enter()
            .append("rect")
            .attr("x", labelPadding)
            .attr("y", d => y(d.tries))
            .attr("width", d => x(d.count))
            .attr("height", y.bandwidth())
            .attr("fill", barColor);

        chart.selectAll(".label")
            .data(data)
            .enter()
            .append("text")
            .attr("x", d => labelPadding + x(d.count) - 5)
            .attr("y", d => y(d.tries) + y.bandwidth() / 2 + 4)
            .attr("text-anchor", "end")
            .attr("fill", "#ffffff") // white label text inside teal bars
            .style("font-size", "14px")
            .text(d => d.count);

        chart.append("g")
            .call(d3.axisLeft(y).tickSize(0))
            .selectAll("text")
            .style("font-size", "14px")
            .attr("fill", textColor)
            .attr("text-anchor", "start")
            .attr("x", -5);

        chart.selectAll(".domain").remove();

    }, [open]);

    return (
    <Modal
        title="Congratulations!"
        open={open}
        onClose={onClose}
        // footer removed
    >
        <div className="px-5 text-left">
            <div className="mb-3 space-y-2">
                {infoDescription.split("\n").map((line, i) => (
                    <p key={i}>{line}</p>
                ))}
            </div>

            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                Data source: {source}
            </p>

            <p className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2 mt-6">
                Your track record
            </p>

            <svg ref={chartRef} className="w-full h-auto mb-4" />

            {/* Button row */}
            <div className="mt-4 flex items-center justify-between gap-4">
                <button
                    onClick={handleCopy}
                    className="rounded-lg [background-color:#4f7cac] px-4 py-2 text-sm text-white hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300"
                >
                    {copied ? "Copied!" : "Share result"}
                </button>
                <button
                    onClick={onClose}
                    className="rounded-lg [background-color:#d17968] px-4 py-2 text-sm text-white hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-300"
                >
                    Close
                </button>
            </div>
        </div>
    </Modal>
);
}
