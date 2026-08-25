import { prisma } from "./prisma";
import {
  emailCustomerConfirmed,
  emailCustomerDeclined,
  emailCustomerCancelled,
  emailAdminRequested,
  emailAdminCancelled,
} from "./email";

// Business rules (per BookRalf spec):
// - Customer gets notified (in-app + email) when their booking is
//   CONFIRMED, DECLINED, or CANCELLED (by admin, or because the
//   scheduled day it was on got deleted).
// - Admin gets notified (in-app + email) when a booking is REQUESTED,
//   or when a customer CANCELS their own booking.
// A customer cancelling their own booking does not notify themselves.
// Admin cancelling a booking (or deleting a schedule day) does not
// notify themselves.

export async function notifyBookingRequested(booking) {
  await prisma.notification.create({
    data: {
      bookingId: booking.id,
      audience: "admin",
      type: "requested",
      title: "New booking request",
      message: `${booking.customerName} requested ${booking.date} at ${booking.startTime} in ${booking.location.name}.`,
    },
  });
  await emailAdminRequested(booking);
}

export async function notifyBookingConfirmed(booking) {
  await prisma.notification.create({
    data: {
      bookingId: booking.id,
      audience: "customer",
      type: "confirmed",
      title: "Booking Confirmed",
      message: `Your booking on ${booking.date} at ${booking.startTime} in ${booking.location.name} has been confirmed. See you there!`,
    },
  });
  await emailCustomerConfirmed(booking);
}

export async function notifyBookingDeclined(booking) {
  await prisma.notification.create({
    data: {
      bookingId: booking.id,
      audience: "customer",
      type: "declined",
      title: "Booking Declined",
      message: `Unfortunately your booking request on ${booking.date} at ${booking.startTime} could not be accommodated. Please try a different time.`,
    },
  });
  await emailCustomerDeclined(booking);
}

// Admin (or the system, via a deleted schedule day) cancelled a booking.
export async function notifyCustomerCancelled(booking, reason) {
  await prisma.notification.create({
    data: {
      bookingId: booking.id,
      audience: "customer",
      type: "cancelled",
      title: "Booking Cancelled",
      message: `Your booking on ${booking.date} at ${booking.startTime} in ${booking.location.name} has been cancelled${reason ? ` (${reason})` : ""}. Please book a new time.`,
    },
  });
  await emailCustomerCancelled(booking, reason);
}

// Customer cancelled their own booking — admin needs to know.
export async function notifyAdminCancelled(booking) {
  await prisma.notification.create({
    data: {
      bookingId: booking.id,
      audience: "admin",
      type: "cancelled",
      title: "Booking Cancelled by Customer",
      message: `${booking.customerName} cancelled their booking on ${booking.date} at ${booking.startTime} in ${booking.location.name}.`,
    },
  });
  await emailAdminCancelled(booking);
}
