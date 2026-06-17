"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"
import { useTheme } from "@/components/theme-toggle"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()
  const dark = theme === "dark"

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      duration={2500}
      visibleToasts={5}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info:    <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error:   <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        style: dark
          ? { background: "rgba(20,20,20,0.6)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", color: "#fff", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px" }
          : { background: "rgba(255,255,255,0.6)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", color: "#18181b", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "10px" },
      }}
      {...props}
    />
  )
}

export { Toaster }
