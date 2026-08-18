import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";

export function smartDate(date) {
  const d = new Date(date);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

export function timeAgo(date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatFullDate(date) {
  return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
}

export function truncate(str, maxLength = 60) {
  if (!str) return "";
  return str.length > maxLength ? str.slice(0, maxLength) + "…" : str;
}

export function randomColor() {
  const colors = ["#6366f1","#8b5cf6","#ec4899","#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#3b82f6"];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function getInitials(name = "") {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

export const PRIORITY_WEIGHT = { urgent: 5, high: 4, medium: 3, low: 2, none: 1 };

export function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function pluralize(count, word, plural) {
  return count === 1 ? `${count} ${word}` : `${count} ${plural || word + "s"}`;
}

export const STATUS_LABELS = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  cancelled: "Cancelled",
};

export const PRIORITY_LABELS = {
  none: "None", low: "Low", medium: "Medium", high: "High", urgent: "Urgent",
};
