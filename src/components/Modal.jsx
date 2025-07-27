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
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[var(--modal-overlay)] p-4"
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-sm md:max-w-lg lg:max-w-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative rounded-lg bg-[var(--modal-bg-color)] shadow-sm ">
                    {/* header */}
                    {title && (
                        <div className="flex items-center justify-between rounded-t border-b border-gray-200 p-4 md:p-5 dark:border-gray-600">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                {title}
                            </h3>
                            <button
                                aria-label="Close modal"
                                onClick={onClose}
                                className="ms-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white"
                            >
                                <X className="h-3.5 w-3.5" strokeWidth={2} />
                            </button>
                        </div>
                    )}

                    {/* body */}
                    <div className="text-left leading-relaxed text-gray-500 dark:text-gray-300 p-4 md:p-5">
                        {children}
                    </div>

                    {/* footer */}
                    {footer && (
                        <div className="flex items-center rounded-b border-t border-gray-200 p-4 md:p-5 dark:border-gray-600">
                            {footer}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
