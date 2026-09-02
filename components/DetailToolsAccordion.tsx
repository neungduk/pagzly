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

export default function DetailToolsAccordion({
  items,
  defaultOpen = "edit",
}: DetailToolsAccordionProps) {
  const [open, setOpen] = useState<DetailToolTab | null>(defaultOpen);

  return (
    <div className="space-y-2" data-testid="desktop-tools-accordion">
      {items.map((item) => {
        const expanded = open === item.id;
        return (
          <div key={item.id} className="overflow-hidden rounded-xl border border-line bg-paper">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-semibold text-ink hover:bg-line/20"
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? null : item.id)}
            >
              {item.label}
              <span className="text-ink/40">{expanded ? "−" : "+"}</span>
            </button>
            {expanded ? <div className="border-t border-line px-3 py-3">{item.children}</div> : null}
          </div>
        );
      })}
    </div>
  );
}
