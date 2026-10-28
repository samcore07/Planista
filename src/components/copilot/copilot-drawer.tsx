"use client";

import * as React from "react";
import {
  Sparkles,
  X,
  Send,
  Check,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { CopilotMessage, CopilotActionProposal } from "@/lib/dal/copilot.dal";
import { sendCopilotMessageAction, applyCopilotProposalAction } from "@/app/events/[eventId]/copilot/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CopilotDrawerProps {
  eventId: string;
  initialHistory: CopilotMessage[];
}

export function CopilotDrawer({ eventId, initialHistory }: CopilotDrawerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<CopilotMessage[]>(initialHistory);
  const [inputValue, setInputValue] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [applyingId, setApplyingId] = React.useState<string | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  // Global keyboard shortcuts: Cmd+K / Ctrl+K to toggle, Escape to close
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setInputValue("");
    setIsSending(true);

    // Optimistic user message
    const tempUserMsg: CopilotMessage = {
      id: `temp_${messages.length + 1}`,
      sender: "user",
      content: trimmed,
      createdAt: "",
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    const res = await sendCopilotMessageAction(eventId, trimmed);
    if (res.success && res.history) {
      setMessages(res.history);
    }
    setIsSending(false);
  };

  const handleApply = async (messageId: string, proposal: CopilotActionProposal) => {
    setApplyingId(messageId);
    const res = await applyCopilotProposalAction(eventId, messageId, proposal);
    if (res.success) {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isApplied: true } : m))
      );
    }
    setApplyingId(null);
  };

  const quickPrompts = [
    "Reduce floral & decor budget by ₹15,000",
    "Add inclement weather backup plan",
    "Reschedule delayed milestone by 5 days",
    "Check category overspend warnings",
  ];

  return (
    <>
      {/* Floating Trigger Pill */}
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={isOpen ? "Close Planning Copilot" : "Open Planning Copilot (Press ⌘K or Ctrl+K)"}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-primary/30 bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        <span>Planning Copilot</span>
        <span className="hidden sm:inline-flex rounded border border-primary-foreground/30 px-1 py-0.5 text-[9px] font-mono opacity-80">
          ⌘K
        </span>
        {messages.some((m) => m.proposal && !m.isApplied) && (
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" aria-label="Pending proposal requires review" />
        )}
      </button>

      {/* Slide-over Drawer */}
      {isOpen && (
        <div
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
          className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in-50"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="copilot-drawer-title"
            className="relative flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl animate-in slide-in-from-right duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border p-4 bg-secondary/30">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center text-primary" aria-hidden="true">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 id="copilot-drawer-title" className="font-serif text-sm font-semibold text-foreground">
                    Planning Copilot
                  </h3>
                  <span className="text-[10px] text-muted-foreground block">
                    Controlled Action Pipeline • Zod Validated
                  </span>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close Planning Copilot"
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Guard Banner */}
            <div className="border-b border-border bg-primary/[0.03] p-3 text-[11px] text-muted-foreground flex items-center gap-2" role="note">
              <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" aria-hidden="true" />
              <span>
                Suggestions require your approval before applying. No raw SQL or unauthorized mutations executed.
              </span>
            </div>

            {/* Conversation Stream */}
            <div
              role="log"
              aria-live="polite"
              aria-atomic="false"
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {messages.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <div className="mx-auto h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-medium text-xs text-foreground">
                      How can I assist your celebration?
                    </h4>
                    <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                      Ask to reallocate budgets, simulate guest increases, or draft contingency plans.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-col gap-1.5 max-w-xs mx-auto text-left">
                    {quickPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSend(prompt)}
                        className="rounded border border-border/80 bg-secondary/40 p-2 text-[11px] text-foreground hover:bg-secondary hover:border-primary/40 transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg p-3 text-xs leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-primary text-primary-foreground font-medium"
                          : "bg-secondary/60 border border-border/70 text-foreground"
                      }`}
                    >
                      {msg.content}
                    </div>

                    {/* Proposal Action Card */}
                    {msg.proposal && (
                      <div className="mt-2 w-[92%] rounded-lg border border-primary/30 bg-primary/[0.04] p-3.5 space-y-2.5 text-xs shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className="text-[9px] uppercase tracking-wider">
                            {msg.proposal.actionType.replace("_", " ")}
                          </Badge>
                          {msg.isApplied ? (
                            <Badge variant="success" className="text-[10px] gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Applied
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="text-[10px]">
                              Pending Approval
                            </Badge>
                          )}
                        </div>

                        <p className="font-semibold text-foreground text-xs">
                          {msg.proposal.summary}
                        </p>

                        {msg.proposal.tradeOffs.length > 0 && (
                          <div className="space-y-1 pt-1 border-t border-border/60">
                            <span className="text-[10px] font-medium text-foreground block">
                              Trade-offs:
                            </span>
                            <ul className="text-[10px] text-muted-foreground space-y-0.5 list-disc list-inside">
                              {msg.proposal.tradeOffs.map((t, idx) => (
                                <li key={idx}>{t}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {!msg.isApplied && (
                          <div className="pt-2 flex justify-end">
                            <Button
                              size="sm"
                              onClick={() => handleApply(msg.id, msg.proposal!)}
                              disabled={applyingId === msg.id}
                              className="gap-1.5 text-[11px] h-7"
                            >
                              {applyingId === msg.id ? (
                                <>
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                  Applying Change...
                                </>
                              ) : (
                                <>
                                  <Check className="h-3 w-3" />
                                  Approve & Apply
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="border-t border-border p-3 bg-card space-y-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend(inputValue);
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  aria-label="Message Planning Copilot"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask copilot to adjust budgets, add tasks..."
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  disabled={isSending}
                />
                <Button
                  size="sm"
                  type="submit"
                  aria-label="Send message to Planning Copilot"
                  disabled={!inputValue.trim() || isSending}
                  className="h-8 px-3"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
