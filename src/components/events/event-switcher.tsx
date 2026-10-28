"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, LayoutGrid, Check } from "lucide-react";
import { EventRow } from "@/lib/dal/events.dal";
import { Badge } from "@/components/ui/badge";

interface EventSwitcherProps {
  currentEvent: EventRow;
  allEvents: EventRow[];
}

export function EventSwitcher({ currentEvent, allEvents }: EventSwitcherProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const router = useRouter();
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Switch active event workspace"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-secondary/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
      >
        <span className="max-w-[160px] sm:max-w-[200px] truncate font-semibold">
          {currentEvent.title}
        </span>
        <Badge variant="secondary" className="hidden sm:inline-flex text-[10px] py-0 px-1.5 capitalize">
          {currentEvent.event_type}
        </Badge>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Available event workspaces"
          className="absolute left-0 mt-2 w-72 origin-top-left rounded-lg border border-border bg-card p-1 shadow-lg ring-1 ring-black ring-opacity-5 z-50 animate-in fade-in-50 zoom-in-95"
        >
          <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Switch Event Workspace
          </div>

          <div className="max-h-60 overflow-y-auto space-y-0.5 py-1">
            {allEvents.map((evt) => {
              const isSelected = evt.id === currentEvent.id;
              return (
                <button
                  key={evt.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setIsOpen(false);
                    router.push(`/events/${evt.id}`);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 text-xs rounded-md text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isSelected
                      ? "bg-secondary font-medium text-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  }`}
                >
                  <div className="truncate">
                    <div className="truncate font-medium text-foreground">{evt.title}</div>
                    <div className="text-[10px] text-muted-foreground capitalize">
                      {evt.event_type} • {evt.status}
                    </div>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="border-t border-border mt-1 pt-1 space-y-0.5">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              All Events Dashboard
            </Link>
            <Link
              href="/events/new"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md text-primary font-medium hover:bg-secondary/60 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Create New Event
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
