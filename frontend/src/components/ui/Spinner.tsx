export default function Spinner({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-spin rounded-full border-2 border-gray-200 border-t-green-600 h-6 w-6 ${className}`} />
  );
}
