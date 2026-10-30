import { describe, it, expect } from "vitest";
import {
  getFormString,
  getOptionalFormString,
  getFormNumber,
  getOptionalFormNumber,
} from "../form-utils";

describe("form-utils", () => {
  it("extracts and trims required form strings", () => {
    const fd = new FormData();
    fd.append("title", "  Grand Wedding Reception  ");

    expect(getFormString(fd, "title")).toBe("Grand Wedding Reception");
    expect(getFormString(fd, "missing")).toBe("");
  });

  it("extracts optional form strings returning null for whitespace or absent", () => {
    const fd = new FormData();
    fd.append("notes", "  Special catering requirements  ");
    fd.append("emptyNotes", "   ");

    expect(getOptionalFormString(fd, "notes")).toBe("Special catering requirements");
    expect(getOptionalFormString(fd, "emptyNotes")).toBeNull();
    expect(getOptionalFormString(fd, "absent")).toBeNull();
  });

  it("extracts form numbers with fallback", () => {
    const fd = new FormData();
    fd.append("budget", "50000");
    fd.append("invalid", "not-a-number");

    expect(getFormNumber(fd, "budget", 0)).toBe(50000);
    expect(getFormNumber(fd, "invalid", 100)).toBe(100);
    expect(getFormNumber(fd, "absent", 0)).toBe(0);
  });

  it("extracts optional form numbers returning null for non-finite values", () => {
    const fd = new FormData();
    fd.append("duration", "4.5");
    fd.append("badNum", "abc");

    expect(getOptionalFormNumber(fd, "duration")).toBe(4.5);
    expect(getOptionalFormNumber(fd, "badNum")).toBeNull();
    expect(getOptionalFormNumber(fd, "absent")).toBeNull();
  });
});
