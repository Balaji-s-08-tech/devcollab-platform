export default function EmptyState({ icon = "📭", title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      {description && <p className="text-slate-500 text-sm mb-5 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}
