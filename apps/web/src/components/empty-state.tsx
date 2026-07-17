export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded border border-dashed border-slate-300 bg-white p-8 text-center">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted">{body}</p>
    </div>
  );
}
