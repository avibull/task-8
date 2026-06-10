import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "tt_install_dismissed";

export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(display-mode: standalone)").matches) return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const onInstalled = () => setVisible(false);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible || !evt) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const install = async () => {
    try {
      await evt.prompt();
      await evt.userChoice;
    } catch {
      // ignore
    } finally {
      setVisible(false);
    }
  };

  return (
    <div
      className="fixed inset-x-0 z-50 mx-auto flex max-w-md items-center gap-2 border border-border bg-panel px-3 py-2 shadow-lg"
      style={{
        bottom: "calc(env(safe-area-inset-bottom) + 8px)",
        borderRadius: 4,
      }}
    >
      <div className="mono flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] border border-border bg-panel-2 text-[11px] font-bold">
        t<span className="text-accent-lime">·</span>t
      </div>
      <div className="mono flex-1 text-[11px] text-foreground">
        Install TurboTask as an app
      </div>
      <button
        onClick={install}
        className="mono inline-flex h-8 shrink-0 items-center gap-1 rounded-[3px] bg-accent-lime px-2.5 text-[11px] font-bold text-background active:scale-95"
      >
        <Download size={12} /> INSTALL
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] border border-border text-dim hover:text-foreground"
      >
        <X size={14} />
      </button>
    </div>
  );
}
