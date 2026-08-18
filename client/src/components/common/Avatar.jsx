import clsx from "clsx";

const COLORS = [
  "bg-violet-600", "bg-blue-600", "bg-green-600",
  "bg-orange-600", "bg-pink-600", "bg-cyan-600",
];

export default function Avatar({ user, size = "md", className }) {
  const sizeMap = { xs: "w-5 h-5 text-xs", sm: "w-7 h-7 text-xs", md: "w-8 h-8 text-sm", lg: "w-10 h-10 text-base", xl: "w-14 h-14 text-xl" };
  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
  const colorIdx = (user?.name?.charCodeAt(0) || 0) % COLORS.length;
  const color = COLORS[colorIdx];

  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name}
        className={clsx("rounded-full object-cover flex-shrink-0", sizeMap[size], className)}
      />
    );
  }

  return (
    <div
      className={clsx(
        "rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0",
        sizeMap[size], color, className
      )}
    >
      {initials}
    </div>
  );
}
