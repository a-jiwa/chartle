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
export default function Modal({ title, subtitle, open, onClose, children, footer = null }) {
    /* close on Esc */
    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[var(--modal-overlay)] p-2 sm:p-4"
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-sm md:max-w-lg lg:max-w-xl max-h-[85vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative rounded-lg bg-[var(--modal-bg-color)] shadow-sm flex flex-col max-h-full">
                    {/* header */}
                    {(title || subtitle) && (
                        <div className="flex flex-col gap-1 rounded-t border-b border-gray-200 p-4 md:p-5 dark:border-gray-600 flex-shrink-0">
                            {title && (
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                    {title}
                                </h3>
                            )}
                            {subtitle && (
                                <div className="text-base text-gray-600 dark:text-gray-300">
                                    {subtitle}
                                </div>
                            )}
                            <button
                                aria-label="Close modal"
                                onClick={onClose}
                                className="absolute top-4 right-4 ms-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white"
                            >
                                <X className="h-3.5 w-3.5" strokeWidth={2} />
                            </button>
                        </div>
                    )}

                    {/* body */}
                    <div className="text-left leading-relaxed text-gray-500 dark:text-gray-300 p-4 md:p-5 flex-1 overflow-y-auto min-h-0">
                        {children}
                    </div>

                    {/* footer */}
                    {footer && (
                        <div className="flex items-center rounded-b border-t border-gray-200 p-4 md:p-5 dark:border-gray-600 flex-shrink-0">
                            {footer}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
