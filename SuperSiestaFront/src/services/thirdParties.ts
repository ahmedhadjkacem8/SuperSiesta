import { META_PIXEL_ID } from "@/services/metaPixel";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue?: IArguments[];
      push?: (...args: unknown[]) => void;
      loaded?: boolean;
      version?: string;
    };
    _fbq?: Window["fbq"];
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (handle: number) => void;
  }
}

const GTM_ID = import.meta.env.VITE_GTM_ID || "GTM-P2NFQQ97";
let scheduled = false;
let loaded = false;
let idleHandle: number | undefined;
let timeoutHandle: number | undefined;

function initializeQueues() {
  window.dataLayer = window.dataLayer || [];

  if (!window.fbq) {
    const fbq = ((...args: unknown[]) => {
      if (fbq.callMethod) {
        fbq.callMethod(...args);
      } else {
        fbq.queue?.push(arguments);
      }
    }) as NonNullable<Window["fbq"]>;

    fbq.queue = [];
    fbq.push = fbq;
    fbq.loaded = false;
    fbq.version = "2.0";
    window.fbq = window._fbq = fbq;
  }

  window.fbq("init", META_PIXEL_ID);
}

function loadScripts() {
  if (loaded) return;
  loaded = true;

  if (!document.querySelector('script[data-third-party="gtm"]')) {
    window.dataLayer?.unshift({ "gtm.start": Date.now(), event: "gtm.js" });
    const gtm = document.createElement("script");
    gtm.async = true;
    gtm.dataset.thirdParty = "gtm";
    gtm.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`;
    document.head.appendChild(gtm);
  }

  if (!document.querySelector('script[data-third-party="meta-pixel"]')) {
    const pixel = document.createElement("script");
    pixel.async = true;
    pixel.dataset.thirdParty = "meta-pixel";
    pixel.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(pixel);
  }
}

export function loadThirdParties() {
  if (typeof window === "undefined" || scheduled) return;
  scheduled = true;
  initializeQueues();

  const interactionEvents: Array<keyof WindowEventMap> = [
    "scroll",
    "touchstart",
    "click",
    "keydown",
  ];
  const cleanup = () => {
    interactionEvents.forEach((event) =>
      window.removeEventListener(event, onInteraction)
    );
    window.removeEventListener("load", onLoad);
    if (idleHandle !== undefined) window.cancelIdleCallback?.(idleHandle);
    if (timeoutHandle !== undefined) window.clearTimeout(timeoutHandle);
  };
  const onInteraction = () => {
    cleanup();
    loadScripts();
  };
  const onLoad = () => {
    if (window.requestIdleCallback) {
      idleHandle = window.requestIdleCallback(() => {
        cleanup();
        loadScripts();
      }, { timeout: 3000 });
    } else {
      timeoutHandle = window.setTimeout(() => {
        cleanup();
        loadScripts();
      }, 3000);
    }
  };

  interactionEvents.forEach((event) =>
    window.addEventListener(event, onInteraction, { once: true, passive: true })
  );

  if (document.readyState === "complete") {
    onLoad();
  } else {
    window.addEventListener("load", onLoad, { once: true });
  }
}
