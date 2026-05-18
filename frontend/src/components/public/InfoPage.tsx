import { AppShell } from "@/components/common/AppShell";
import { Panel } from "@/components/common/Cards";
import { publicRoutes } from "@/lib/routes";

export function InfoPage({ items, title }: { title: string; items: Array<[string, string]> }) {
  return (
    <AppShell nav={publicRoutes} subtitle="Thông tin sản phẩm" title="Kindy-Mate">
      <div className="max-w-3xl">
        <h1 className="text-4xl font-black sm:text-5xl">{title}</h1>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {items.map(([heading, body]) => (
          <Panel key={heading}>
            <h2 className="text-xl font-black">{heading}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#52677a]">{body}</p>
          </Panel>
        ))}
      </div>
    </AppShell>
  );
}
