import clsx from "clsx";

export default function Spinner({ size = "md", className }) {
  const s = { sm: "w-4 h-4", md: "w-6 h-6", lg: "w-10 h-10" }[size];
  return (
    <div
      className={clsx(
        "rounded-full border-2 border-surface-500 border-t-brand-500 animate-spin",
        s, className
      )}
    />
  );
}

export function PageSpinner() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[400px]">
      <Spinner size="lg" />
    </div>
  );
}
