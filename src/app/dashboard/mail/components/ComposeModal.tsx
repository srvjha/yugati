"use client";

import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import {
  Send,
  X,
  Trash2,
  Minimize2,
  Maximize2,
  List,
  ListOrdered,
  Link2,
  Loader2 as Loader2Icon,
  Sparkles,
  Wand2,
  RefreshCcw,
  Bot,
  ChevronLeft,
} from "lucide-react";
import type { Sender } from "../types";

const AI_ACTIONS = [
  {
    id: "polish",
    label: "Polish",
    description: "Fix grammar and smooth the flow",
    icon: Sparkles,
    prompt: (body: string) =>
      `Polish this email draft — fix grammar, spelling, and sentence flow. Keep the same content and tone. Return ONLY the improved email body, no explanations:\n\n${body}`,
  },
  {
    id: "improve",
    label: "Improve",
    description: "Make it stronger and more compelling",
    icon: Wand2,
    prompt: (body: string) =>
      `Rewrite this email to be more clear, persuasive, and professional while keeping the core message intact. Return ONLY the rewritten email body, no explanations:\n\n${body}`,
  },
  {
    id: "generate",
    label: "Generate",
    description: "Write from scratch or expand your notes",
    icon: RefreshCcw,
    prompt: (body: string, subject: string, to: string) =>
      `Write a professional email body for the following context.\nTo: ${to || "the recipient"}\nSubject: ${subject || "(no subject)"}${body ? `\nNotes: ${body}` : ""}\n\nReturn ONLY the email body text. No subject line, no greeting label, just the body starting from the greeting.`,
  },
] as const;
type AiActionId = (typeof AI_ACTIONS)[number]["id"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const TLD_TYPOS: Record<string, string> = {
  copm: "com",
  cmo: "com",
  ocm: "com",
  con: "com",
  comn: "com",
  coom: "com",
  conm: "com",
  cpm: "com",
  nete: "net",
  nett: "net",
  nte: "net",
  ogr: "org",
  orgg: "org",
  eud: "edu",
  eud2: "edu",
};

function checkEmailTypos(raw: string): string | null {
  const emails = raw
    .split(/[,;]/)
    .map((e) => e.trim())
    .filter(Boolean);
  for (const email of emails) {
    if (!EMAIL_RE.test(email))
      return `"${email}" doesn't look like a valid email address`;
    const tld = email.split(".").pop()?.toLowerCase() ?? "";
    const fix = TLD_TYPOS[tld];
    if (fix)
      return `Possible typo — did you mean ${email.replace(/\.[^.]+$/, `.${fix}`)}?`;
  }
  return null;
}

const composeSchema = z.object({
  to: z
    .string()
    .min(1, "At least one recipient is required")
    .superRefine((v, ctx) => {
      const err = checkEmailTypos(v);
      if (err) ctx.addIssue({ code: z.ZodIssueCode.custom, message: err });
    }),
  cc: z
    .string()
    .optional()
    .superRefine((v, ctx) => {
      if (!v) return;
      const err = checkEmailTypos(v);
      if (err) ctx.addIssue({ code: z.ZodIssueCode.custom, message: err });
    }),
  subject: z.string().optional(),
});
type ComposeFields = z.infer<typeof composeSchema>;

function ComposeFormatBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-md transition-colors"
    >
      {children}
    </button>
  );
}

function RecipientInput({
  pills,
  onChange,
  suggestions,
  placeholder = "Recipients",
  error,
}: {
  pills: string[];
  onChange: (pills: string[]) => void;
  suggestions: Sender[];
  placeholder?: string;
  error?: string;
}) {
  const [inputVal, setInputVal] = useState("");
  const [showSug, setShowSug] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = inputVal.trim()
    ? suggestions
        .filter(
          (s) =>
            !pills.includes(s.email) &&
            (s.email.toLowerCase().includes(inputVal.toLowerCase()) ||
              s.name.toLowerCase().includes(inputVal.toLowerCase())),
        )
        .slice(0, 6)
    : [];

  function commit(raw: string) {
    const val = raw.trim().replace(/,+$/, "");
    if (!val || pills.includes(val)) {
      setInputVal("");
      return;
    }
    onChange([...pills, val]);
    setInputVal("");
  }

  function removeLast() {
    if (pills.length > 0) onChange(pills.slice(0, -1));
  }

  return (
    <div ref={wrapRef} className="relative flex-1">
      <div
        className={`flex flex-wrap items-center gap-1.5 min-h-[38px] py-1.5 cursor-text`}
        onClick={() => inputRef.current?.focus()}
      >
        {pills.map((p) => (
          <span
            key={p}
            className="inline-flex items-center gap-1 bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded-full px-2.5 py-0.5 leading-none"
          >
            {p}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(pills.filter((x) => x !== p));
              }}
              className="text-zinc-500 hover:text-zinc-200 transition-colors ml-0.5"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={inputVal}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={pills.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none"
          onChange={(e) => {
            setInputVal(e.target.value);
            setShowSug(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Tab" || e.key === ",") {
              e.preventDefault();
              commit(inputVal);
            }
            if (e.key === "Backspace" && !inputVal) removeLast();
          }}
          onBlur={() => {
            setTimeout(() => setShowSug(false), 150);
            if (inputVal.trim()) commit(inputVal);
          }}
          onFocus={() => setShowSug(true)}
        />
      </div>
      {error && <p className="text-[10px] text-red-400 pb-1">{error}</p>}

      {/* Suggestion dropdown */}
      {showSug && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
          {filtered.map((s) => (
            <button
              key={s.email}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                commit(s.email);
                setShowSug(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-800 transition-colors text-left"
            >
              <div className="w-6 h-6 rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center text-[10px] font-bold text-zinc-300 shrink-0 uppercase">
                {s.name[0] ?? "?"}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-zinc-200 font-medium truncate">
                  {s.name}
                </p>
                <p className="text-[10px] text-zinc-500 truncate">{s.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ComposeModal({
  onClose,
  onSwitchToAI,
  senders = [],
}: {
  onClose: () => void;
  onSwitchToAI?: () => void;
  senders?: Sender[];
}) {
  const trpc = useTRPC();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ComposeFields>({
    resolver: zodResolver(composeSchema),
    defaultValues: { to: "", cc: "", subject: "" },
  });

  const [toPills, setToPills] = useState<string[]>([]);
  const [ccPills, setCcPills] = useState<string[]>([]);

  function syncTo(pills: string[]) {
    setToPills(pills);
    setValue("to", pills.join(", "), { shouldValidate: pills.length > 0 });
  }
  function syncCc(pills: string[]) {
    setCcPills(pills);
    setValue("cc", pills.join(", "), { shouldValidate: false });
  }

  const subjectValue = watch("subject") ?? "";

  const [showCc, setShowCc] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [aiStep, setAiStep] = useState<"menu" | "generate">("menu");
  const [aiIntent, setAiIntent] = useState("");
  const [aiLoading, setAiLoading] = useState<AiActionId | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const aiMenuRef = useRef<HTMLDivElement>(null);
  const intentRef = useRef<HTMLTextAreaElement>(null);

  // Close AI menu on click outside; reset step when closed
  useEffect(() => {
    if (!aiMenuOpen) {
      setAiStep("menu");
      return;
    }
    if (aiStep === "generate") setTimeout(() => intentRef.current?.focus(), 50);
    function handler(e: MouseEvent) {
      if (aiMenuRef.current && !aiMenuRef.current.contains(e.target as Node))
        setAiMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [aiMenuOpen, aiStep]);

  const sendMutation = useMutation(
    trpc.gmail.sendMessage.mutationOptions({
      onSuccess: () => {
        toast.success("Email sent");
        onClose();
      },
      onError: () => toast.error("Failed to send — please try again."),
    }),
  );

  function execFormat(cmd: string, value?: string) {
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    document.execCommand(cmd, false, value ?? "");
    editorRef.current?.focus();
  }

  function openAIAction(actionId: AiActionId) {
    if (actionId === "generate") {
      setAiStep("generate");
      return;
    }
    const current = editorRef.current?.innerText?.trim() ?? "";
    if (!current) {
      toast.error("Write something first — then AI can improve it.");
      return;
    }
    void runAI(actionId, current);
  }

  async function runAI(
    actionId: AiActionId,
    bodyText: string,
    intent?: string,
  ) {
    setAiMenuOpen(false);
    setAiStep("menu");
    setAiLoading(actionId);
    const action = AI_ACTIONS.find((a) => a.id === actionId)!;
    try {
      let prompt: string;
      if (action.id === "generate") {
        prompt = [
          `Write a professional email body for the following context.`,
          `To: ${toPills.join(", ") || "the recipient"}`,
          `Subject: ${subjectValue || "(no subject)"}`,
          `Intent: ${intent ?? aiIntent}`,
          bodyText ? `Additional notes: ${bodyText}` : "",
          ``,
          `Return ONLY the email body text. Start from the greeting. No explanations.`,
        ]
          .filter(Boolean)
          .join("\n");
      } else {
        prompt = (action.prompt as (b: string) => string)(bodyText);
      }

      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        toast.error(err.error ?? "AI failed — please try again.");
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "",
        output = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6)) as {
              type: string;
              text?: string;
            };
            if (data.type === "delta" && data.text) output += data.text;
          } catch {
            /* partial */
          }
        }
      }

      if (output && editorRef.current) {
        editorRef.current.innerText = output;
        toast.success(`${action.label} applied`);
      } else {
        toast.error("AI returned an empty response — try again.");
      }
    } catch {
      toast.error("AI failed to process — please try again.");
    } finally {
      setAiLoading(null);
      setAiIntent("");
    }
  }

  const onSubmit = async (fields: ComposeFields) => {
    const htmlBody = editorRef.current?.innerHTML ?? "";
    const body = editorRef.current?.innerText ?? "";
    await sendMutation.mutateAsync({
      to: toPills,
      cc: showCc && ccPills.length ? ccPills : undefined,
      subject: fields.subject || "(no subject)",
      body,
      htmlBody,
    });
  };

  // Minimized pill
  if (minimized) {
    return (
      <div className="fixed bottom-0 right-6 z-50">
        <div className="w-64 bg-zinc-900 border border-zinc-700 border-b-0 rounded-t-xl shadow-2xl flex items-center justify-between px-4 py-2.5">
          <span className="text-xs font-medium text-zinc-300 truncate">
            {subjectValue || "New message"}
          </span>
          <div className="flex items-center gap-0.5 shrink-0 ml-2">
            <button
              onClick={() => setMinimized(false)}
              className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
            >
              <Maximize2 size={12} />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed bottom-0 right-6 z-50 flex flex-col bg-zinc-950 border border-zinc-800/80 border-b-0 shadow-[0_-8px_40px_rgba(0,0,0,0.6)] rounded-t-2xl overflow-visible transition-all duration-200
      ${maximized ? "w-[680px] h-[580px]" : "w-[540px] h-[500px]"}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-zinc-900/80 border-b border-zinc-800/60 shrink-0 rounded-t-2xl">
        <span className="text-xs font-semibold text-zinc-200 tracking-wide">
          New message
        </span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setMinimized(true)}
            className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
            title="Minimise"
          >
            <Minimize2 size={12} />
          </button>
          <button
            type="button"
            onClick={() => setMaximized((m) => !m)}
            className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
            title="Expand"
          >
            <Maximize2 size={12} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
            title="Close"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Address fields */}
      <div className="shrink-0 border-b border-zinc-800/60">
        {/* To */}
        <div
          className={`flex items-start gap-3 px-4 border-b ${errors.to ? "border-red-800/60" : "border-zinc-800/40"}`}
        >
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest shrink-0 pt-3">
            To
          </span>
          <RecipientInput
            pills={toPills}
            onChange={syncTo}
            suggestions={senders}
            error={errors.to?.message}
          />
          {!showCc && (
            <button
              type="button"
              onClick={() => setShowCc(true)}
              className="text-[10px] font-semibold text-zinc-600 hover:text-zinc-300 px-2 py-1 rounded-md hover:bg-zinc-800 transition-colors shrink-0 mt-2"
            >
              Cc
            </button>
          )}
        </div>
        {/* Cc */}
        {showCc && (
          <div
            className={`flex items-start gap-3 px-4 border-b ${errors.cc ? "border-red-800/60" : "border-zinc-800/40"}`}
          >
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest shrink-0 pt-3">
              Cc
            </span>
            <RecipientInput
              pills={ccPills}
              onChange={syncCc}
              suggestions={senders}
              error={errors.cc?.message}
            />
            <button
              type="button"
              onClick={() => {
                setShowCc(false);
                syncCc([]);
              }}
              className="p-1 text-zinc-600 hover:text-zinc-300 rounded transition-colors shrink-0 mt-2.5"
            >
              <X size={11} />
            </button>
          </div>
        )}
        {/* Subject */}
        <div className="flex items-center gap-3 px-4">
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest shrink-0">
            Sub
          </span>
          <input
            {...register("subject")}
            placeholder="Subject"
            autoComplete="off"
            className="flex-1 bg-transparent py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto relative">
        {aiLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-zinc-950/80 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <Sparkles size={14} className="text-blue-400 animate-pulse" />
            </div>
            <p className="text-xs text-zinc-400">
              {AI_ACTIONS.find((a) => a.id === aiLoading)?.label}ing your email…
            </p>
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable={!aiLoading}
          suppressContentEditableWarning
          data-placeholder="Write your message…"
          onKeyDown={(e) => {
            if (e.key === "b" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              execFormat("bold");
            }
            if (e.key === "i" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              execFormat("italic");
            }
            if (e.key === "u" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              execFormat("underline");
            }
          }}
          className={`min-h-full px-5 py-4 text-sm text-zinc-200 focus:outline-none leading-relaxed transition-opacity
            empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-600 empty:before:pointer-events-none
            ${aiLoading ? "opacity-30" : "opacity-100"}`}
          style={{ wordBreak: "break-word" }}
        />
      </div>

      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2.5 border-t border-zinc-800 bg-zinc-900/90">
        <div className="flex items-center gap-0.5">
          <ComposeFormatBtn
            onClick={() => execFormat("bold")}
            title="Bold (⌘B)"
          >
            <span className="font-bold text-xs leading-none">B</span>
          </ComposeFormatBtn>
          <ComposeFormatBtn
            onClick={() => execFormat("italic")}
            title="Italic (⌘I)"
          >
            <span className="italic text-xs leading-none">I</span>
          </ComposeFormatBtn>
          <ComposeFormatBtn
            onClick={() => execFormat("underline")}
            title="Underline (⌘U)"
          >
            <span className="underline text-xs leading-none">U</span>
          </ComposeFormatBtn>
          <div className="w-px h-4 bg-zinc-800 mx-1.5 shrink-0" />
          <ComposeFormatBtn
            onClick={() => execFormat("insertUnorderedList")}
            title="Bullet list"
          >
            <List size={13} />
          </ComposeFormatBtn>
          <ComposeFormatBtn
            onClick={() => execFormat("insertOrderedList")}
            title="Numbered list"
          >
            <ListOrdered size={13} />
          </ComposeFormatBtn>
          <div className="w-px h-4 bg-zinc-800 mx-1.5 shrink-0" />
          <ComposeFormatBtn
            onClick={() => {
              const url = prompt("Enter link URL:");
              if (url) execFormat("createLink", url);
            }}
            title="Insert link"
          >
            <Link2 size={13} />
          </ComposeFormatBtn>

          {/* AI button */}
          <div className="w-px h-4 bg-zinc-800 mx-1.5 shrink-0" />
          <div ref={aiMenuRef} className="relative">
            <button
              onClick={() => setAiMenuOpen((o) => !o)}
              disabled={!!aiLoading}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all
                ${
                  aiMenuOpen
                    ? "bg-blue-500/20 border border-blue-500/40 text-blue-300"
                    : "bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                }
                disabled:opacity-40`}
            >
              {aiLoading ? (
                <Loader2Icon size={12} className="animate-spin text-blue-400" />
              ) : (
                <Sparkles size={12} className="text-blue-400" />
              )}
              AI
            </button>

            {/* AI action menu — pops upward */}
            {aiMenuOpen && (
              <div className="absolute bottom-full mb-2 left-0 z-50 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden min-w-[248px]">
                {aiStep === "menu" ? (
                  <>
                    <div className="px-3 pt-2.5 pb-1.5 border-b border-zinc-800">
                      <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                        AI actions
                      </p>
                    </div>
                    {AI_ACTIONS.map(
                      ({ id, label, description, icon: Icon }) => (
                        <button
                          key={id}
                          onClick={() => openAIAction(id)}
                          className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-zinc-800 transition-colors text-left group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-zinc-800 group-hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center shrink-0 mt-0.5 transition-colors">
                            <Icon size={13} className="text-blue-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-zinc-200">
                              {label}
                            </p>
                            <p className="text-[11px] text-zinc-500 leading-tight">
                              {description}
                            </p>
                          </div>
                        </button>
                      ),
                    )}
                    {/* Switch-to-AI CTA */}
                    {onSwitchToAI && (
                      <div className="border-t border-zinc-800 px-3 py-2.5">
                        <button
                          onClick={() => {
                            setAiMenuOpen(false);
                            onSwitchToAI();
                          }}
                          className="flex items-center gap-2 text-[11px] text-zinc-500 hover:text-blue-400 transition-colors w-full group"
                        >
                          <Bot
                            size={12}
                            className="text-zinc-600 group-hover:text-blue-400 transition-colors shrink-0"
                          />
                          <span>
                            Switch to AI mode for a smoother experience →
                          </span>
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  /* Generate intent step */
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        onClick={() => setAiStep("menu")}
                        className="p-1 text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
                      >
                        <ChevronLeft size={13} />
                      </button>
                      <div>
                        <p className="text-xs font-semibold text-zinc-200">
                          Generate email
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          Describe what you want to write
                        </p>
                      </div>
                    </div>
                    <textarea
                      ref={intentRef}
                      value={aiIntent}
                      onChange={(e) => setAiIntent(e.target.value)}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          (e.metaKey || e.ctrlKey) &&
                          aiIntent.trim()
                        ) {
                          e.preventDefault();
                          void runAI(
                            "generate",
                            editorRef.current?.innerText?.trim() ?? "",
                            aiIntent,
                          );
                        }
                      }}
                      placeholder="e.g. Follow up on a proposal sent last week, keep it professional and ask for a call"
                      rows={3}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none leading-relaxed"
                    />
                    <button
                      onClick={() =>
                        void runAI(
                          "generate",
                          editorRef.current?.innerText?.trim() ?? "",
                          aiIntent,
                        )
                      }
                      disabled={!aiIntent.trim()}
                      className="mt-2 w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      <Sparkles size={12} />
                      Generate
                    </button>
                    <p className="text-center text-[10px] text-zinc-700 mt-1.5">
                      ⌘↵ to generate
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            title="Discard"
            className="p-2 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => void handleSubmit(onSubmit)()}
            disabled={
              toPills.length === 0 || sendMutation.isPending || !!aiLoading
            }
            className="btn-cal-new flex items-center gap-2 px-4 py-2 bg-white text-black text-xs font-bold rounded-lg hover:bg-zinc-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sendMutation.isPending ? (
              <>
                <Loader2Icon size={12} className="animate-spin" /> Sending…
              </>
            ) : (
              <>
                <Send size={12} /> Send
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
