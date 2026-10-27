"use client";

import { useEffect, useState } from "react";
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
];

export function ShowcaseNav() {
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    const sectionIds = navItems.map((item) => item.id);
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
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

    sections.forEach((section) => observer.observe(section));

    return () => {
      sections.forEach((section) => observer.unobserve(section));
    };
  }, []);

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const targetElement = document.getElementById(targetId);

    if (targetElement) {
      const headerOffset = 80;
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });

      // Update URL hash smoothly without instant page jump
      window.history.pushState(null, "", `#${targetId}`);
      setActiveSection(targetId);
    }
  };

  return (
    <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
      {navItems.map((item) => {
        const isActive = activeSection === item.id;
        return (
          <a
            key={item.id}
            href={item.href}
            onClick={(e) => handleSmoothScroll(e, item.id)}
            className={cn(
              "px-3 py-1.5 rounded-full transition-all duration-300 text-xs tracking-wide",
              isActive
                ? "bg-secondary text-primary font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            {item.name}
          </a>
        );
      })}
    </nav>
  );
}
