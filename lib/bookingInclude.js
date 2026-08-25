export const bookingInclude = {
  location: true,
  scheduleDay: true,
  items: { include: { service: true } },
};
