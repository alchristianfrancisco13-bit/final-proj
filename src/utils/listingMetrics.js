import { db } from "../firebase";
import { doc, updateDoc, increment, getDoc } from "firebase/firestore";

export const updateListingMetrics = async (listingId, metrics) => {
  try {
    const hostListingRef = doc(db, "hostListings", listingId);
    
    // Get current metrics
    const snapshot = await getDoc(hostListingRef);
    if (snapshot.exists()) {
      const updateData = {};
      
      if (metrics.views !== undefined) {
        updateData.views = increment(1);
      }
      
      if (metrics.bookings !== undefined) {
        updateData.bookings = increment(1);
      }
      
      if (metrics.revenue !== undefined) {
        updateData.revenue = increment(metrics.revenue);
      }

      await updateDoc(hostListingRef, updateData);
      
      // Also update the public listing if it exists
      if (snapshot.data().publicListingId) {
        const publicListingRef = doc(db, "listings", snapshot.data().publicListingId);
        await updateDoc(publicListingRef, updateData);
      }
    }
  } catch (error) {
    console.error("Error updating listing metrics:", error);
    throw error;
  }
};