declare module "react-big-calendar" {
  import type { ComponentType } from "react";
  export interface Event {
    title?: string;
    start?: Date;
    end?: Date;
    resource?: unknown;
    id?: string;
    baseTitle?: string;
    coachName?: string;
  }
  export interface DateLocalizer {
    format(value: Date | string, format: string, culture?: string): string;
  }
  export function dateFnsLocalizer(locale: unknown): DateLocalizer;
  export const Calendar: ComponentType<{
    localizer?: DateLocalizer;
    events?: Event[];
    startAccessor?: string;
    endAccessor?: string;
    titleAccessor?: string;
    defaultView?: string;
    views?: string[];
    popup?: boolean;
    selectable?: boolean;
    onSelectSlot?: (slotInfo: { start: Date; end: Date }) => void;
    onSelectEvent?: (event: Event) => void;
    dayPropGetter?: (date: Date) => { className?: string; style?: React.CSSProperties };
    dayLayoutAlgorithm?: string;
    components?: { event?: ComponentType<{ event: Event }> };
    style?: React.CSSProperties;
  }>;
}

declare module "qrcode" {
  export function toDataURL(
    text: string,
    options?: { errorCorrectionLevel?: string; margin?: number; width?: number }
  ): Promise<string>;
}
