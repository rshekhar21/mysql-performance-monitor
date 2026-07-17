export function RouteFallback() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-32 animate-pulse rounded border border-slate-200 bg-slate-100"
        />
      ))}
    </div>
  );
}
