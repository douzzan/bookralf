// Fetches JSON and only calls onSuccess if the response was OK and the
// shape matches what's expected (array vs object). On failure, retries
// silently a couple of times before giving up — the first query after
// the database has been idle (e.g. Supabase's free-tier pooler waking
// up) can be genuinely slow or fail outright, and that's not worth
// alarming the person over if a retry a moment later succeeds. Only
// calls onError once every attempt has been exhausted.
export async function safeFetchJson(
  url,
  { onSuccess, onError, expectArray = false, retries = 2, retryDelayMs = 900 } = {}
) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      let data = null;
      try {
        data = await res.json();
      } catch {
        // no JSON body at all
      }
      const ok = res.ok && data !== null && (!expectArray || Array.isArray(data));
      if (ok) {
        // Clear out any previously-shown error now that a request succeeded.
        if (onError) onError("");
        onSuccess(data);
        return;
      }
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, retryDelayMs));
        continue;
      }
      const message = (data && data.error) || `Request to ${url} failed.`;
      console.error(message);
      if (onError) onError(message);
      return;
    } catch (err) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, retryDelayMs));
        continue;
      }
      console.error(`Could not reach ${url}:`, err);
      if (onError) onError("Could not reach the server. Check your connection.");
      return;
    }
  }
}
