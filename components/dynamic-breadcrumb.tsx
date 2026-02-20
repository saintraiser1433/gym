"use client";

import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

function segmentToLabel(segment: string): string {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

type DynamicBreadcrumbProps = {
  basePath: string;
  rootLabel: string;
};

export function DynamicBreadcrumb({ basePath, rootLabel }: DynamicBreadcrumbProps) {
  const pathname = usePathname();
  const baseSegments = basePath.split("/").filter(Boolean);
  const pathSegments = pathname
    .split("/")
    .filter(Boolean)
    .slice(baseSegments.length);

  const segments = pathSegments.map((segment, i) => ({
    href: `${basePath}/${pathSegments.slice(0, i + 1).join("/")}`,
    label: segment === "dashboard" ? "Dashboard" : segmentToLabel(segment),
    isLast: i === pathSegments.length - 1,
  }));

  const showRoot = pathname !== basePath && pathname !== `${basePath}/`;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbLink href={basePath}>{rootLabel}</BreadcrumbLink>
        </BreadcrumbItem>
        {segments.length > 0 && (
          <>
            <BreadcrumbSeparator className="hidden md:block" />
            {segments.flatMap((seg, i) => [
              <BreadcrumbItem key={seg.href}>
                {seg.isLast ? (
                  <BreadcrumbPage>{seg.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={seg.href}>{seg.label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>,
              i < segments.length - 1 ? (
                <BreadcrumbSeparator
                  key={`sep-${seg.href}`}
                  className="hidden md:block"
                />
              ) : null,
            ])}
          </>
        )}
        {!showRoot && segments.length === 0 && (
          <>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
