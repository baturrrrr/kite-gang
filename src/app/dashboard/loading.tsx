// Sayfa verisi gelirken gösterilen iskelet; boş ekran yerine yerleşimi önceden gösterir
export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Yükleniyor">
      <div className="space-y-3">
        <div className="h-3 w-32 animate-pulse rounded bg-muted" />
        <div className="h-10 w-64 animate-pulse rounded-lg bg-muted lg:h-14 lg:w-96" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-3.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-xl border border-border bg-card lg:h-32" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-xl border border-border bg-card" />
    </div>
  );
}
