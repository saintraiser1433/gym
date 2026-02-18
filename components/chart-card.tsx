import { ReactNode } from "react";

type ChartCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function ChartCard({ title, description, children }: ChartCardProps) {
  return (
    <div className="space-y-2 rounded-md border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="h-40">{children}</div>
    </div>
  );
}

