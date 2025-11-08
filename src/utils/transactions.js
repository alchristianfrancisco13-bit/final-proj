import { 
  runTransaction, 
  doc, 
  collection, 
  serverTimestamp, 
  increment, 
  writeBatch,
  getDoc
} from "firebase/firestore";
import { incrementDashboardMetrics } from "./dashboardMetrics";

// Atomically create a booking and update associated listing metrics
export async function createBookingTransaction(db, bookingInput) {
  const bookingsCol = collection(db, "bookings");
  const newBookingRef = doc(bookingsCol); // pre-generate ID for transaction.set

  return await runTransaction(db, async (tx) => {
    // Write booking
    const bookingData = {
      ...bookingInput,
      id: newBookingRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      bookingDate: serverTimestamp()
    };
    tx.set(newBookingRef, bookingData);

    // Try update hostListings first; if not found, fall back to listings
    const hostListingRef = doc(db, "hostListings", bookingInput.listingId);
    const hostSnap = await tx.get(hostListingRef);
    if (hostSnap.exists()) {
      tx.update(hostListingRef, {
        bookingsCount: increment(1),
        lastBooked: serverTimestamp(),
        calendar: "Few slots"
      });
    } else {
      const listingRef = doc(db, "listings", bookingInput.listingId);
      const listSnap = await tx.get(listingRef);
      if (listSnap.exists()) {
        tx.update(listingRef, {
          bookingsCount: increment(1),
          lastBooked: serverTimestamp(),
          calendar: "Few slots"
        });
      }
    }

    return bookingData;
  });
}

// Create a listing in both hostListings and listings in a single batch
export async function createListingInBothCollections(db, listing) {
  const batch = writeBatch(db);

  const hostRef = doc(collection(db, "hostListings"));
  const publicRef = doc(collection(db, "listings"));

  const now = new Date().toISOString();
  const base = {
    ...listing,
    createdAt: now,
    lastUpdated: now
  };

  batch.set(hostRef, base);
  batch.set(publicRef, { ...base, hostListingId: hostRef.id });

  await batch.commit();

  return { hostId: hostRef.id, publicId: publicRef.id };
}

// Approve a pending booking: confirm status, mark payment completed, update listing + host earnings
export async function approveBookingTransaction(db, bookingId) {
  const bookingRef = doc(db, "bookings", bookingId);

  const result = await runTransaction(db, async (tx) => {
    // READS FIRST
    const bookingSnap = await tx.get(bookingRef);
    if (!bookingSnap.exists()) throw new Error("Booking not found");
    const booking = bookingSnap.data();
    if (booking.status !== "PendingApproval") return booking;

    const listingId = booking.listingId;
    const hostListingRef = doc(db, "hostListings", listingId);
    const publicRef = doc(db, "listings", listingId);
    const hostSnap = await tx.get(hostListingRef);
    const publicSnap = hostSnap.exists() ? null : await tx.get(publicRef);

    // WRITES AFTER ALL READS
    tx.update(bookingRef, {
      status: "Upcoming",
      paymentStatus: "completed",
      updatedAt: serverTimestamp()
    });

    if (hostSnap.exists()) {
      tx.update(hostListingRef, {
        bookingsCount: increment(1),
        lastBooked: serverTimestamp(),
        calendar: "Few slots"
      });
    } else if (publicSnap && publicSnap.exists()) {
      tx.update(publicRef, {
        bookingsCount: increment(1),
        lastBooked: serverTimestamp(),
        calendar: "Few slots"
      });
    }

    return { ...booking, status: "Upcoming" };
  });

  // Outside the tx: credit host earnings (dashboard metrics)
  try {
    const snap = await getDoc(doc(db, "bookings", bookingId));
    const booking = snap.data();
    if (booking?.hostId && booking?.total) {
      await incrementDashboardMetrics(booking.hostId, "totalEarnings", booking.total);
      await incrementDashboardMetrics(booking.hostId, "monthlyRevenue", booking.total);
    }
  } catch (e) {
    // best effort; avoid failing approval when metrics crediting fails
  }

  return result;
}


