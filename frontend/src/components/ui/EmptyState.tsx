export default function EmptyState({ icon, title, body, action }: {
  icon?: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {icon && <div className="text-5xl mb-4">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-300 mb-1">{title}</h3>
      {body && <p className="text-gray-500 text-sm mb-4">{body}</p>}
      {action}
    </div>
  );
}
