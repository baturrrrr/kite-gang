import { HizmetTabs } from "./hizmet-tabs";

export default function HizmetlerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Hizmetler</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Sunduğunuz hizmet türleri ve varsayılan fiyatları. Müşteriye atamak için müşteri profilini kullanın.
        </p>
      </div>
      <HizmetTabs />
      {children}
    </div>
  );
}
