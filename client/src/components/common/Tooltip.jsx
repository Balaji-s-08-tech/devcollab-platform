import { useState } from "react";
import clsx from "clsx";

export default function Tooltip({ children, text, position = "top" }) {
  const [show, setShow] = useState(false);
  const posMap = {
    top:    "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left:   "right-full top-1/2 -translate-y-1/2 mr-2",
    right:  "left-full top-1/2 -translate-y-1/2 ml-2",
  };
  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && text && (
        <div className={clsx(
          "absolute z-50 px-2 py-1 text-xs text-white bg-surface-600 border border-surface-400",
          "rounded-lg whitespace-nowrap pointer-events-none shadow-lg animate-fade-in",
          posMap[position]
        )}>
          {text}
        </div>
      )}
    </div>
  );
}
