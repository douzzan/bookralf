import { DATE_RE } from "@/lib/staffGuard";
import { getTorontoNow } from "@/lib/torontoTime";

// Validates/cleans announcement fields from a request body.
// Returns { data } or { error }.
export function cleanAnnouncement(b, { partial = false } = {}) {
  const data = {};
  if (!partial || b.title !== undefined) {
    data.title = String(b.title || "").trim().slice(0, 140);
    if (!data.title) return { error: "A title is required." };
  }
  if (!partial || b.body !== undefined) data.body = String(b.body || "").slice(0, 4000);
  if (b.postedOn !== undefined || !partial) {
    const d = String(b.postedOn || "");
    data.postedOn = DATE_RE.test(d) ? d : getTorontoNow().date;
  }
  if (b.published !== undefined) data.published = !!b.published;
  if (b.pinned !== undefined) data.pinned = !!b.pinned;
  if (b.showUntil !== undefined) {
    const s = String(b.showUntil || "");
    if (s && !DATE_RE.test(s)) return { error: "Show-until date is not valid." };
    data.showUntil = s || null;
  }
  return { data };
}

