import { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import Modal from './Modal';
import {
    loadHistoryLocal,
    loadHistory,
} from '../utils/historyStore.js';

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
        <Modal open={open} onClose={onClose}>
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
                        onClick={handleCopy}
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
