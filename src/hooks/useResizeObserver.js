import { useEffect, useState } from "react";

/**
 * Returns { width, height } of the observed element,
 * updating automatically on resize.
 */
export default function useResizeObserver(ref) {
    const [size, setSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const ro = new ResizeObserver(([entry]) =>
            setSize(entry.contentRect)
        );
        ro.observe(el);
        return () => ro.disconnect();
    }, [ref]);

    return size;
}
