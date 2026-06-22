"use client";

import { useRouter } from "next/navigation";
import { X, Plug, Mail, Calendar } from "lucide-react";

type IntegrationType = "gmail" | "calendar";

const CONFIGS: Record<IntegrationType, {
  icon: React.ElementType;
  title: string;
  description: string;
  buttonLabel: string;
}> = {
  gmail: {
    icon: Mail,
    title: "Connect your Gmail",
    description: "You need to connect a Gmail account before you can compose or send emails.",
    buttonLabel: "Connect Gmail",
  },
  calendar: {
    icon: Calendar,
    title: "Connect Google Calendar",
    description: "You need to connect Google Calendar before you can schedule meetings or events.",
    buttonLabel: "Connect Calendar",
  },
};

export function ConnectIntegrationModal({
  onClose,
  integration = "gmail",
}: {
  onClose: () => void;
  integration?: IntegrationType;
}) {
  const router = useRouter();
  const config = CONFIGS[integration];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm mx-4 bg-black border border-zinc-800 rounded-2xl shadow-2xl p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
        >
          <X size={15} />
        </button>

        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-4">
          <Icon size={22} className="text-blue-400" />
        </div>

        <h2 className="text-base font-semibold text-white mb-1">{config.title}</h2>
        <p className="text-sm text-zinc-400 mb-5">{config.description}</p>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => router.push("/dashboard/integrations")}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-black bg-white hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <Plug size={13} />
            {config.buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
