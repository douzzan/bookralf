import { prisma } from "@/lib/prisma";
import { getTorontoNow } from "@/lib/torontoTime";

// Announcements customers may see: published, and not past their "show until" date.
export function visibleAnnouncementsWhere() {
  const today = getTorontoNow().date;
  return {
    published: true,
    OR: [{ showUntil: null }, { showUntil: "" }, { showUntil: { gte: today } }],
  };
}

const ANNOUNCEMENT_ORDER = [{ pinned: "desc" }, { postedOn: "desc" }, { createdAt: "desc" }];

export async function getVisibleAnnouncements() {
  return prisma.announcement.findMany({
    where: visibleAnnouncementsWhere(),
    orderBy: ANNOUNCEMENT_ORDER,
  });
}

// The banner shows the newest PINNED + published (and not expired) announcement.
export async function getBannerAnnouncement() {
  return prisma.announcement.findFirst({
    where: { ...visibleAnnouncementsWhere(), pinned: true },
    orderBy: [{ postedOn: "desc" }, { createdAt: "desc" }],
  });
}

export async function getAboutPublic() {
  const [about, steps, faqs, announcements] = await Promise.all([
    prisma.aboutContent.findUnique({
      where: { id: "main" },
      select: { heading: true, intro: true, photoMime: true, updatedAt: true },
    }),
    prisma.processStep.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    prisma.faq.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    getVisibleAnnouncements(),
  ]);
  return { about, steps, faqs, announcements };
}

export async function hasPhoto() {
  const row = await prisma.aboutContent.findUnique({ where: { id: "main" }, select: { photoMime: true, updatedAt: true } });
  return row?.photoMime ? { version: row.updatedAt.getTime() } : null;
}
