import { initializeMetaPixel, META_PIXEL_ID } from "@/services/metaPixel";

type QueuedPixel = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: (...args: unknown[]) => void;
  loaded: boolean;
  version: string;
};

type ThirdPartyWindow = Window & {
  fbq?: QueuedPixel;
  _fbq?: QueuedPixel;
  dataLayer?: Array<Record<string, unknown>>;
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const GTM_ID = import.meta.env.VITE_GTM_ID || "GTM-P2NFQQ97";
let scheduled = false;
let loaded = false;
let idleHandle: number | undefined;
let timeoutHandle: number | undefined;

function initializeQueues(target: ThirdPartyWindow) {
  target.dataLayer = target.dataLayer || [];

  if (!target.fbq) {
    const fbq = ((...args: unknown[]) => {
      if (fbq.callMethod) {
        fbq.callMethod(...args);
      } else {
        fbq.queue.push(args);
      }
    }) as QueuedPixel;

    fbq.queue = [];
    fbq.push = fbq;
    fbq.loaded = false;
    fbq.version = "2.0";
    target.fbq = target._fbq = fbq;
  }

  initializeMetaPixel();
}

function loadScripts(target: ThirdPartyWindow) {
  if (loaded) return;
  loaded = true;

  if (!document.querySelector('script[data-third-party="gtm"]')) {
    target.dataLayer?.unshift({ "gtm.start": Date.now(), event: "gtm.js" });
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

  const target = window as ThirdPartyWindow;
  initializeQueues(target);

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
    if (idleHandle !== undefined) target.cancelIdleCallback?.(idleHandle);
    if (timeoutHandle !== undefined) window.clearTimeout(timeoutHandle);
  };
  const onInteraction = () => {
    cleanup();
    loadScripts(target);
  };
  const onLoad = () => {
    if (target.requestIdleCallback) {
      idleHandle = target.requestIdleCallback(() => {
        cleanup();
        loadScripts(target);
      }, { timeout: 3000 });
    } else {
      timeoutHandle = window.setTimeout(() => {
        cleanup();
        loadScripts(target);
      }, 3000);
    }
  };

  interactionEvents.forEach((event) =>
    window.addEventListener(event, onInteraction, { once: true, passive: true })
  );

  if (document.readyState === "complete") onLoad();
  else window.addEventListener("load", onLoad, { once: true });
}