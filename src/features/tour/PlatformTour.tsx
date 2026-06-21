"use client";

import { useEffect, useCallback } from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

const TOUR_KEY = "yugati_tour_done";

function buildSteps(userName?: string): DriveStep[] {
  return [
    // ── Welcome ──────────────────────────────────────────────────
    {
      popover: {
        title: userName ? `Welcome, ${userName} 👋` : "Welcome to Yugati 👋",
        description:
          "Your AI-powered Gmail + Google Calendar workspace. This tour walks you through every part of the platform.",
        nextBtnText: "Start Tour",
      },
    },

    // ── Compose ──────────────────────────────────────────────────
    {
      element: '[data-tour="compose-btn"]',
      popover: {
        title: "Compose",
        description:
          "Click here to write a new email. In Agentic mode you can also just ask the AI to draft one for you.",
        side: "right",
        align: "start",
      },
    },

    // ── Mail folders ─────────────────────────────────────────────
    {
      element: '[data-tour="nav-inbox"]',
      popover: {
        title: "Inbox",
        description:
          "Your main inbox. The badge shows your unread count, updated in real-time. Category tabs (All Mail, Primary, Promotions…) live at the top.",
        side: "right",
        align: "center",
      },
    },
    {
      element: '[data-tour="nav-starred"]',
      popover: {
        title: "Starred",
        description:
          "Emails you've starred in Gmail. Star any email from the detail panel to pin it here.",
        side: "right",
        align: "center",
      },
    },
    {
      element: '[data-tour="nav-sent"]',
      popover: {
        title: "Sent",
        description:
          "All emails you've sent — both manually composed and those sent by the AI agent on your behalf.",
        side: "right",
        align: "center",
      },
    },
    {
      element: '[data-tour="nav-drafts"]',
      popover: {
        title: "Drafts",
        description:
          "Emails saved as drafts in Gmail. Pick up where you left off — or ask the AI to finish a draft for you.",
        side: "right",
        align: "center",
      },
    },
    {
      element: '[data-tour="nav-spam"]',
      popover: {
        title: "Spam",
        description:
          "Gmail's spam folder. Review flagged emails and mark legitimate ones as Not Spam directly from here.",
        side: "right",
        align: "center",
      },
    },
    {
      element: '[data-tour="nav-trash"]',
      popover: {
        title: "Trash",
        description:
          "Deleted emails land here. Gmail auto-purges trash after 30 days. You can restore or permanently delete from this view.",
        side: "right",
        align: "center",
      },
    },
    {
      element: '[data-tour="nav-subscriptions"]',
      popover: {
        title: "Manage Subscriptions",
        description:
          "Scan all mailing lists and newsletters you're signed up to. Unsubscribe in bulk or with one click — no manual email hunting.",
        side: "right",
        align: "center",
      },
    },

    // ── Mode toggle + inbox features ─────────────────────────────
    {
      element: '[data-tour="mode-toggle"]',
      popover: {
        title: "Manual vs Agentic",
        description:
          "<b>Manual</b> — classic email client, full control.<br><br><b>Agentic</b> — chat with your AI to search, draft, send emails, and schedule calendar events hands-free.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="category-tabs"]',
      popover: {
        title: "Category Tabs",
        description:
          "Switch between Primary, Promotions, Social, and Updates instantly — filtered client-side from your cached inbox with zero API latency.",
        side: "bottom",
        align: "start",
      },
    },
    {
      element: '[data-tour="search-bar"]',
      popover: {
        title: "Search",
        description:
          'Full Gmail query syntax: <code>from:amazon</code>, <code>subject:invoice</code>, <code>has:attachment</code>, <code>is:unread</code>. Press <kbd>⌘K</kbd> for the command palette.',
        side: "bottom",
        align: "end",
      },
    },

    // ── Secondary nav ─────────────────────────────────────────────
    {
      element: '[data-tour="nav-overview"]',
      popover: {
        title: "Overview",
        description:
          "AI-generated inbox analytics — top senders, email volume trends, response time insights, and a weekly digest of what matters.",
        side: "right",
        align: "center",
      },
    },
    {
      element: '[data-tour="nav-calendar"]',
      popover: {
        title: "Calendar",
        description:
          "Your Google Calendar, fully integrated. View, create, and update events — or switch to Agentic mode and schedule meetings by just typing.",
        side: "right",
        align: "center",
      },
    },
    {
      element: '[data-tour="nav-integrations"]',
      popover: {
        title: "Integrations",
        description:
          "Connect and manage your Gmail and Google Calendar accounts. This is also where you re-authenticate if your session expires.",
        side: "right",
        align: "center",
      },
    },
    {
      element: '[data-tour="nav-agentic"]',
      popover: {
        title: "Agentic (Standalone)",
        description:
          "A dedicated full-screen AI chat for power users. Same AI, same tools — without the email list alongside. Great for longer task sessions.",
        side: "right",
        align: "center",
      },
    },
    {
      element: '[data-tour="nav-billing"]',
      popover: {
        title: "Billing",
        description:
          "Manage your subscription plan, view usage, and update payment details. Your current plan and token usage are shown here.",
        side: "right",
        align: "center",
      },
    },
    {
      element: '[data-tour="nav-docs"]',
      popover: {
        title: "Docs",
        description:
          "Platform documentation — agent architecture, email caching tiers, Gmail query syntax, API details, and more. Good for curious power users.",
        side: "right",
        align: "center",
      },
    },
    {
      element: '[data-tour="nav-settings"]',
      popover: {
        title: "Settings",
        description:
          "Customize your Yugati experience — default agent mode, notification preferences, display settings, and account management.",
        side: "right",
        align: "center",
      },
    },

    // ── Done ─────────────────────────────────────────────────────
    {
      popover: {
        title: "You're all set 🚀",
        description:
          'Switch to <b>Agentic mode</b> and try: <i>"Summarize my unread emails"</i> or <i>"Schedule a meeting with Priya tomorrow at 3 PM"</i>.<br><br>You can replay this tour anytime from <b>Take Tour</b> in the sidebar.',
        nextBtnText: "Done",
      },
    },
  ];
}

function createDriver(steps: DriveStep[], onDone?: () => void) {
  // Ref object lets the skip-button closure capture the instance
  // without triggering the "prefer-const" lint rule on a let variable.
  const ref: { instance?: ReturnType<typeof driver> } = {};

  const stepsWithSkip: DriveStep[] = steps.map((step, i) => ({
    ...step,
    popover: {
      ...step.popover,
      onPopoverRender: (popover: { previousButton: HTMLElement; footerButtons: HTMLElement }) => {
        // Hide disabled Previous button on first step
        if (i === 0) popover.previousButton.style.display = "none";

        const skip = document.createElement("button");
        skip.textContent = "Skip tour";
        skip.className = "yugati-tour-skip-btn";
        skip.addEventListener("click", () => ref.instance?.destroy());
        popover.footerButtons.prepend(skip);
      },
    },
  }));

  ref.instance = driver({
    showProgress: true,
    smoothScroll: true,
    popoverClass: "yugati-tour-popover",
    steps: stepsWithSkip,
    onDestroyed: () => {
      onDone?.();
    },
  });

  return ref.instance;
}

export function useTour() {
  const startTour = useCallback(() => {
    createDriver(buildSteps(), () => {
      try { localStorage.setItem(TOUR_KEY, "1"); } catch {}
    })?.drive();
  }, []);

  return { startTour };
}

export function PlatformTour({ userName }: { userName?: string }) {
  useEffect(() => {
    try {
      if (localStorage.getItem(TOUR_KEY)) return;
    } catch {
      return;
    }

    const timer = setTimeout(() => {
      createDriver(buildSteps(userName), () => {
        try { localStorage.setItem(TOUR_KEY, "1"); } catch {}
      })?.drive();
    }, 1000);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
