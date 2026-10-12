import { useEffect, useRef, useState } from "react";

export function useLazyModelViewer() {
  const ref = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let active = true;
    const loadViewer = async () => {
      try {
        await import("@google/model-viewer");
        if (active) setIsLoaded(true);
      } catch (error) {
        console.error("Erreur de chargement du visualiseur 3D:", error);
        if (active) setHasError(true);
      }
    };

    if (typeof IntersectionObserver === "undefined") {
      void loadViewer();
      return () => {
        active = false;
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          void loadViewer();
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(element);

    return () => {
      active = false;
      observer.disconnect();
    };
  }, []);

  return { ref, isLoaded, hasError, setHasError };
}
