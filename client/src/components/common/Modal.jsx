import { useEffect } from "react";
import { X } from "lucide-react";
import clsx from "clsx";

export default function Modal({ title, onClose, children, size = "md", className }) {
  const sizeMap = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={clsx("modal w-full", sizeMap[size], className)}>
        {}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-600">
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <button onClick={onClose} className="btn-icon">
              <X size={16} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
