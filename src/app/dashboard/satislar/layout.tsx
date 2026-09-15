import { SatisTabs } from "./satis-tabs";

export default function SatislarLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-4xl leading-[0.95] font-extrabold lg:text-[56px]">Satışlar</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Paket, üyelik ve ürün satışlarının tamamı burada listelenir.
        </p>
      </div>
      <SatisTabs />
      {children}
    </div>
  );
}
