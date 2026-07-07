const KEY = "chunk-reload-attempted";

const isChunkError = (msg: string | undefined | null) => {
  if (!msg) return false;
  return (
    /ChunkLoadError/i.test(msg) ||
    /Loading chunk [\w-]+ failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg)
  );
};

const tryReload = () => {
  try {
    if (sessionStorage.getItem(KEY) === "1") return;
    sessionStorage.setItem(KEY, "1");
  } catch {
    /* ignore storage errors */
  }
  window.location.reload();
};

export function installChunkReload() {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    const msg = event?.message || (event?.error && String(event.error));
    if (isChunkError(msg)) tryReload();
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event?.reason;
    const msg =
      typeof reason === "string" ? reason : reason?.message || String(reason);
    if (isChunkError(msg)) tryReload();
  });

  // Clear the guard once a fresh session actually loaded.
  window.addEventListener("load", () => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  });
}