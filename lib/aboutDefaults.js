// Starter content for the About page. CommonJS on purpose so both
// prisma/seed.js (plain Node) and the Next.js API route can use it.
//
// Anything Ralf has to decide for himself is written as "[RALF: ...]" and
// those FAQs start HIDDEN, so nothing half-finished shows to customers until
// he has filled it in and switched it on.

const ABOUT = {
  heading: "About Ralf",
  intro:
    "Ralf's Chops brings the barbershop to you. Instead of a waiting room, you get one chair, one client and time set aside just for you — set up in your kitchen, garage or backyard.\n\n" +
    "Every visit is a full barbershop experience: clean, sharpened tools, precise clipper and scissor work, and a finish that sends you off looking your best. Ralf visits Thornhill, Clanton and South, and can often work around other addresses too.",
};

const STEPS = [
  {
    title: "Choose your area, day and services",
    description:
      "Pick where you are, a day Ralf is working, and the services you'd like. Booking for the whole family? Add several services to one visit — group visits take less time per cut.",
  },
  {
    title: "Pick a time and send your request",
    description:
      "Choose a start time that suits you and enter your details. Your request goes straight to Ralf — nothing is charged when you book.",
  },
  {
    title: "Ralf confirms",
    description:
      "Ralf reviews your request and confirms it. You'll get an email the moment it's confirmed (or if he needs to suggest another time), plus a reminder on the day.",
  },
  {
    title: "Ralf comes to you",
    description:
      "He arrives at your door with everything needed. All you need is a chair, a bit of space and a spot to sweep up afterwards.",
  },
  {
    title: "Invoice and payment",
    description:
      "After your visit you'll receive an invoice by email. [RALF: add the payment methods you accept, e.g. e-transfer / cash.]",
  },
];

const FAQS = [
  {
    question: "What do I need to have ready?",
    answer:
      "A sturdy chair, a little open space (kitchen, garage, porch or backyard all work) and an electrical outlet nearby. Ralf brings the rest.",
    active: true,
  },
  {
    question: "How long does a visit take?",
    answer:
      "It depends on the services you choose — each one shows its time when you book. When several haircuts are booked together, the total time is shorter than doing them one by one.",
    active: true,
  },
  {
    question: "Can I book for my kids or the whole family?",
    answer:
      "Yes. Add as many services as you need to a single visit and Ralf will take care of everyone in one go.",
    active: true,
  },
  {
    question: "How will I know my booking is confirmed?",
    answer:
      "You'll get an email as soon as Ralf confirms, and another reminder on the morning of your visit. You can also check the status any time under My Bookings.",
    active: true,
  },
  {
    question: "What areas do you visit?",
    answer:
      "Thornhill, Clanton and South, plus other addresses when Ralf's schedule allows — choose \"Others\" when booking and he'll let you know. [RALF: list the exact neighbourhoods / any travel limits.]",
    active: false,
  },
  {
    question: "How do I pay?",
    answer: "[RALF: describe the payment methods you accept and when payment is due.]",
    active: false,
  },
  {
    question: "What is your cancellation or reschedule policy?",
    answer:
      "[RALF: explain how much notice you need to cancel or change a booking, and any fees that apply.]",
    active: false,
  },
];

const ANNOUNCEMENT = {
  title: "Welcome to the new Ralf's Chops site",
  body: "You can now book your house-call haircut online in a few taps. Pick your area, day and time — Ralf will confirm by email.",
  pinned: false,
  published: false, // a sample for Ralf to look at; he decides when to publish
};

function todayStr() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(new Date());
}

// Inserts starter content ONLY into things that are still empty, so running
// it again (or running the seed on a live site) never overwrites or
// duplicates Ralf's own edits.
async function seedAboutIfEmpty(prisma) {
  const out = { about: false, steps: 0, faqs: 0, announcements: 0 };

  const about = await prisma.aboutContent.findUnique({ where: { id: "main" } });
  if (!about) {
    await prisma.aboutContent.create({ data: { id: "main", ...ABOUT } });
    out.about = true;
  }
  if ((await prisma.processStep.count()) === 0) {
    for (let i = 0; i < STEPS.length; i++) {
      await prisma.processStep.create({ data: { ...STEPS[i], order: i + 1 } });
      out.steps++;
    }
  }
  if ((await prisma.faq.count()) === 0) {
    for (let i = 0; i < FAQS.length; i++) {
      await prisma.faq.create({ data: { ...FAQS[i], order: i + 1 } });
      out.faqs++;
    }
  }
  if ((await prisma.announcement.count()) === 0) {
    await prisma.announcement.create({ data: { ...ANNOUNCEMENT, postedOn: todayStr() } });
    out.announcements++;
  }
  return out;
}

module.exports = { ABOUT, STEPS, FAQS, ANNOUNCEMENT, seedAboutIfEmpty };
