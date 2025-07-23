import { X } from "lucide-react";
import { useEffect } from "react";

/**
 * Re-usable dialog
 *
 * Props
 * ──────────────────────────────────────────────────────────
 * title   string   – top-bar heading
 * open    boolean  – show / hide
 * onClose () => void
 * children ReactNode – body content
 * footer  ReactNode – optional footer content
 */
export default function Modal({ title, open, onClose, children, footer = null }) {
    /* close on Esc */
    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-700/60 p-4"
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-2xl"
                onClick={(e) => e.stopPropagation()} /* keep inner clicks alive */
            >
                <div className="relative rounded-lg bg-white shadow-sm">
                    {/* header */}
                    <div className="flex items-center justify-between rounded-t border-b border-gray-200 p-4 md:p-5">
                        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
                        <button
                            aria-label="Close modal"
                            onClick={onClose}
                            className="ms-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-900"
                        >
                            <X className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                    </div>

                    {/* body */}
                    <div className="text-base leading-relaxed text-gray-500">
                        {children}
                    </div>

                    {/* footer */}
                    {footer && (
                        <div className="flex items-center rounded-b border-t border-gray-200 p-4 md:p-5">
                            {footer}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
