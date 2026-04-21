import { lazy, type ComponentType } from "react";

const RELOAD_FLAG = "__chunk_reload_attempted__";

/**
 * Wrapper around React.lazy that automatically reloads the page once when a
 * dynamic import fails. This handles the "stale tab after deploy" problem:
 * when a user has an old index.html in memory whose hashed chunk URLs no
 * longer exist on the server, the import will 404. Rather than show an
 * Error Boundary, we force one fresh reload to pick up the new index.html.
 *
 * The session-storage flag prevents an infinite reload loop if the failure
 * is caused by something other than a stale chunk (e.g. real network outage).
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): ReturnType<typeof lazy<T>> {
  return lazy(async () => {
    try {
      const mod = await factory();
      // Successful load — clear the flag so future failures can trigger a reload again.
      try {
        window.sessionStorage.removeItem(RELOAD_FLAG);
      } catch {}
      return mod;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isChunkLoadError =
        /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk \d+ failed/i.test(
          message
        );

      let alreadyReloaded = false;
      try {
        alreadyReloaded = window.sessionStorage.getItem(RELOAD_FLAG) === "1";
      } catch {}

      if (isChunkLoadError && !alreadyReloaded) {
        try {
          window.sessionStorage.setItem(RELOAD_FLAG, "1");
        } catch {}
        // Force a fresh fetch of index.html and all assets.
        window.location.reload();
        // Return a never-resolving promise so React doesn't fall through to
        // the Error Boundary while the reload is in flight.
        return new Promise<{ default: T }>(() => {});
      }

      throw err;
    }
  });
}
