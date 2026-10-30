"use client";

import { useEffect, useState, useRef } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  name: string;
  href: string;
  id: string;
}

const navItems: NavItem[] = [
  { name: "Features", href: "#features", id: "features" },
  { name: "Architecture", href: "#architecture", id: "architecture" },
  { name: "Workflow", href: "#workflow", id: "workflow" },
  { name: "Tutorial", href: "#tutorial", id: "tutorial" },
];

export function ShowcaseNav() {
  const [activeSection, setActiveSection] = useState<string>("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    let observer: IntersectionObserver | null = null;
    let idleId: number | NodeJS.Timeout;

    const setupObserver = () => {
      const sectionIds = navItems.map((item) => item.id);
      const sections = sectionIds
        .map((id) => document.getElementById(id))
        .filter((el): el is HTMLElement => el !== null);

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              setActiveSection(entry.target.id);
            }
          }
        },
        {
          rootMargin: "-20% 0px -70% 0px",
          threshold: 0,
        }
      );

      sections.forEach((section) => observer?.observe(section));
    };

    if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(setupObserver);
    } else {
      idleId = setTimeout(setupObserver, 200);
    }

    return () => {
      if (typeof window !== "undefined" && typeof window.cancelIdleCallback === "function" && typeof idleId === "number") {
        window.cancelIdleCallback(idleId);
      } else {
        clearTimeout(idleId);
      }
      observer?.disconnect();
    };
  }, []);

  // Close mobile menu on click outside or Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    }
    function handleClickOutside(event: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    }

    if (isMobileMenuOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    const targetElement = document.getElementById(targetId);

    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.pushState(null, "", `#${targetId}`);
      setActiveSection(targetId);
    }
  };

  return (
    <nav aria-label="Landing page sections">
      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-1 text-sm font-medium">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <a
              key={item.id}
              href={item.href}
              aria-current={isActive ? "location" : undefined}
              onClick={(e) => handleSmoothScroll(e, item.id)}
              className={cn(
                "px-3 py-1.5 rounded-full transition-all duration-300 text-xs tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                isActive
                  ? "bg-secondary text-primary font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              {item.name}
            </a>
          );
        })}
      </div>

      {/* Mobile Navigation Dropdown */}
      <div className="md:hidden relative" ref={mobileMenuRef}>
        <button
          type="button"
          aria-expanded={isMobileMenuOpen}
          aria-label="Toggle section navigation menu"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {isMobileMenuOpen ? (
            <X className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Menu className="h-4 w-4" aria-hidden="true" />
          )}
        </button>

        {isMobileMenuOpen && (
          <div
            role="menu"
            aria-label="Landing page sections"
            className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-card p-1 shadow-lg ring-1 ring-black ring-opacity-5 z-50 animate-in fade-in-50 zoom-in-95"
          >
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  role="menuitem"
                  aria-current={isActive ? "location" : undefined}
                  onClick={(e) => handleSmoothScroll(e, item.id)}
                  className={cn(
                    "block px-3 py-2 rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    isActive
                      ? "bg-secondary text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  {item.name}
                </a>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
