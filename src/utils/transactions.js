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
      const currentBookings = (hostSnap.data().bookingsCount || 0) + 1;
      let calendarText = "Available";
      if (currentBookings >= 20) calendarText = "Limited availability";
      else if (currentBookings >= 10) calendarText = "Few slots left";
      else if (currentBookings >= 5) calendarText = "Booking fast";
      
      tx.update(hostListingRef, {
        bookingsCount: increment(1),
        lastBooked: serverTimestamp(),
        calendar: calendarText
      });
    } else {
      const listingRef = doc(db, "listings", bookingInput.listingId);
      const listSnap = await tx.get(listingRef);
      if (listSnap.exists()) {
        const currentBookings = (listSnap.data().bookingsCount || 0) + 1;
        let calendarText = "Available";
        if (currentBookings >= 20) calendarText = "Limited availability";
        else if (currentBookings >= 10) calendarText = "Few slots left";
        else if (currentBookings >= 5) calendarText = "Booking fast";
        
        tx.update(listingRef, {
          bookingsCount: increment(1),
          lastBooked: serverTimestamp(),
          calendar: calendarText
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
      const currentBookings = (hostSnap.data().bookingsCount || 0) + 1;
      let calendarText = "Available";
      if (currentBookings >= 20) calendarText = "Limited availability";
      else if (currentBookings >= 10) calendarText = "Few slots left";
      else if (currentBookings >= 5) calendarText = "Booking fast";
      
      tx.update(hostListingRef, {
        bookingsCount: increment(1),
        lastBooked: serverTimestamp(),
        calendar: calendarText
      });
    } else if (publicSnap && publicSnap.exists()) {
      const currentBookings = (publicSnap.data().bookingsCount || 0) + 1;
      let calendarText = "Available";
      if (currentBookings >= 20) calendarText = "Limited availability";
      else if (currentBookings >= 10) calendarText = "Few slots left";
      else if (currentBookings >= 5) calendarText = "Booking fast";
      
      tx.update(publicRef, {
        bookingsCount: increment(1),
        lastBooked: serverTimestamp(),
        calendar: calendarText
      });
    }

    return { ...booking, status: "Upcoming" };
  });

  // Outside the tx: credit host earnings (dashboard metrics) with 5% admin commission
  try {
    const snap = await getDoc(doc(db, "bookings", bookingId));
    const booking = snap.data();
    if (booking?.hostId && booking?.total) {
      const totalAmount = booking.total;
      const adminCommission = totalAmount * 0.05; // 5% for admin
      const hostEarnings = totalAmount * 0.95; // 95% for host
      
      // Update host earnings (95%)
      await incrementDashboardMetrics(booking.hostId, "totalEarnings", hostEarnings);
      await incrementDashboardMetrics(booking.hostId, "monthlyRevenue", hostEarnings);
      await incrementDashboardMetrics(booking.hostId, "totalBookings", 1);
      
      // Update admin wallet (5%)
      const adminWalletRef = doc(db, "adminWallet", "earnings");
      const adminWalletSnap = await getDoc(adminWalletRef);
      
      if (adminWalletSnap.exists()) {
        const currentBalance = adminWalletSnap.data().balance || 0;
        const currentTotalEarnings = adminWalletSnap.data().totalEarnings || 0;
        await runTransaction(db, async (tx) => {
          tx.update(adminWalletRef, {
            balance: currentBalance + adminCommission,
            totalEarnings: currentTotalEarnings + adminCommission,
            lastUpdated: serverTimestamp()
          });
        });
      } else {
        await runTransaction(db, async (tx) => {
          tx.set(adminWalletRef, {
            balance: adminCommission,
            totalEarnings: adminCommission,
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp()
          });
        });
      }
      
      // Add transaction record for admin
      const adminTransactionRef = doc(collection(db, "adminTransactions"));
      await runTransaction(db, async (tx) => {
        tx.set(adminTransactionRef, {
          type: 'commission',
          amount: adminCommission,
          bookingId: bookingId,
          hostId: booking.hostId,
          description: `5% commission from booking: ${booking.title || 'Booking'}`,
          date: serverTimestamp(),
          status: 'completed'
        });
      });
    }
  } catch (e) {
    console.error("Error crediting earnings:", e);
    // best effort; avoid failing approval when metrics crediting fails
  }

  return result;
}


