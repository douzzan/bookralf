import crypto from "crypto";

export const STAFF_COOKIE = "bookralf_staff";

// The cookie value is a hash of the admin password, not the password
// itself — so even if the cookie were somehow read, it can't be
// reversed back into the real password. httpOnly means client-side JS
// (including any injected via XSS) can't read it either.
function expectedToken() {
  const secret = process.env.ADMIN_PASSWORD || "";
  return crypto.createHash("sha256").update(secret).digest("hex");
}

export function getExpectedToken() {
  return expectedToken();
}

// Timing-safe comparison so response time can't be used to guess the
// correct value one byte at a time.
function safeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Call from any API route that should only work for logged-in staff.
// Returns true/false — the route decides what to do with that.
export function isStaffRequest(request) {
  const cookie = request.cookies.get(STAFF_COOKIE)?.value;
  if (!cookie) return false;
  return safeEqual(cookie, expectedToken());
}
