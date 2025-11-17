import { doc, updateDoc, setDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export const initializeDashboardMetrics = async (hostId) => {
  const metricsRef = doc(db, "dashboardMetrics", hostId);
  
  try {
    const metricsDoc = await getDoc(metricsRef);
    
    if (!metricsDoc.exists()) {
      await setDoc(metricsRef, {
        totalEarnings: 0,
        monthlyRevenue: 0,
        todayBookings: 0,
        upcomingBookings: 0,
        totalBookings: 0,
        hostRating: 0,
        averageRating: 0,
        occupancyRate: 0,
        responseRate: 0,
        responseTime: "<1hr",
        cancellationRate: 0,
        points: 0,
        totalPointsEarned: 0,
        pointsRedeemed: 0,
        lastUpdated: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error initializing dashboard metrics:", error);
  }
};

export const updateDashboardMetrics = async (hostId, updates) => {
  const metricsRef = doc(db, "dashboardMetrics", hostId);

  try {
    await updateDoc(metricsRef, {
      ...updates,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error updating dashboard metrics:", error);
  }
};

export const incrementDashboardMetrics = async (hostId, field, amount) => {
  const metricsRef = doc(db, "dashboardMetrics", hostId);

  try {
    await updateDoc(metricsRef, {
      [field]: increment(amount),
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error incrementing dashboard metrics:", error);
  }
};