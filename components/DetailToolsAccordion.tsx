"use client";

import { useState, type ReactNode } from "react";
import type { DetailToolTab } from "@/components/DetailActionBar";

type AccordionItem = {
  id: DetailToolTab;
  label: string;
  children: ReactNode;
};

type DetailToolsAccordionProps = {
  items: AccordionItem[];
  defaultOpen?: DetailToolTab;
};

function UploadIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 12.5a.75.75 0 0 0 .75-.75V4.56l2.22 2.22a.75.75 0 1 0 1.06-1.06l-3.5-3.5a.75.75 0 0 0-1.06 0l-3.5 3.5a.75.75 0 0 0 1.06 1.06L9.25 4.56V11.75c0 .41.34.75.75.75Z" />
      <path d="M3.5 13.5a.75.75 0 0 1 .75.75v1.5h11.5v-1.5a.75.75 0 0 1 1.5 0v2.25a.75.75 0 0 1-.75.75H3.5a.75.75 0 0 1-.75-.75V14.25a.75.75 0 0 1 .75-.75Z" />
    </svg>
  );
}

function SparkleIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 1.5 11.6 7.4 17.5 9 11.6 10.6 10 16.5 8.4 10.6 2.5 9l5.9-1.6L10 1.5Z" />
    </svg>
  );
}

function ChevronDownIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

const TOOL_VISUAL: Record<
  string,
  { badge: string; headerOpen: string; Icon: (p: { className?: string }) => ReactNode }
> = {
  upload: {
    badge: "bg-mustard/15 text-mustard",
    headerOpen: "bg-mustard/10",
    Icon: UploadIcon,
  },
  ai: {
    badge: "bg-slate-blue/10 text-slate-blue",
    headerOpen: "bg-slate-blue/10",
    Icon: SparkleIcon,
  },
};

const FALLBACK_VISUAL = {
  badge: "bg-line/20 text-ink/60",
  headerOpen: "bg-line/10",
  Icon: SparkleIcon,
};

export default function DetailToolsAccordion({
  items,
  defaultOpen = "edit",
}: DetailToolsAccordionProps) {
  const [open, setOpen] = useState<DetailToolTab | null>(defaultOpen);

  return (
    <div className="space-y-2" data-testid="desktop-tools-accordion">
      {items.map((item) => {
        const expanded = open === item.id;
        const visual = TOOL_VISUAL[item.id] ?? FALLBACK_VISUAL;
        const Icon = visual.Icon;
        return (
          <div key={item.id} className="overflow-hidden rounded-xl border border-line bg-paper">
            <button
              type="button"
              className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-xs font-semibold text-ink transition-colors hover:bg-line/20 ${
                expanded ? visual.headerOpen : ""
              }`}
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? null : item.id)}
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <span
                  className={`inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full ${visual.badge}`}
                >
                  <Icon />
                </span>
                <span className="truncate">{item.label}</span>
              </span>
              <ChevronDownIcon
                className={`h-4 w-4 shrink-0 text-ink/40 transition-transform duration-200 ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </button>
            {expanded ? <div className="border-t border-line px-3 py-3">{item.children}</div> : null}
          </div>
        );
      })}
    </div>
  );
}
