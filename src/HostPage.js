import { useState, useEffect } from "react";
import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  setDoc,
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  limit,
  increment
} from "firebase/firestore";
import { initializeDashboardMetrics, updateDashboardMetrics, incrementDashboardMetrics } from './utils/dashboardMetrics';
import { db, auth } from "./firebase";
import { 
  FaHome, FaClipboardList, FaSave, FaImages, FaEnvelope, FaCalendarAlt, FaChartPie, 
  FaWallet, FaUser, FaGift, FaSignOutAlt, FaPlus, FaEdit, FaTrash, FaStar, FaTag, FaBars, 
  FaPhone, FaSms, FaMailBulk, FaCreditCard, FaGavel, FaComments, FaClock, 
  FaMoneyBillWave, FaCog, FaEye, FaToggleOn, FaToggleOff, FaCheckCircle, FaTimes,
  FaChevronRight, FaChevronLeft, FaGlobe, FaHeart, FaShareAlt, FaLocationMarker,
  FaBed, FaBath, FaUsers, FaSwimmingPool, FaWifi, FaCar, FaUtensils, FaTv,
  FaShower, FaLock, FaFire, FaSnowflake, FaUmbrella, FaTree, FaMapMarkerAlt,
  FaSearch, FaFilter, FaSortAmountUp, FaThumbsUp, FaExclamationTriangle,
  FaDownload, FaUpload, FaBell, FaCog as FaSettings, FaChartBar, FaHistory,
  FaCalendarCheck, FaComments as FaMessage, FaCopy, FaCamera, FaTag as FaPriceTag,
  FaPercentage, FaQrcode, FaMobile, FaDesktop, FaTablet, FaInfoCircle
} from "react-icons/fa";
import Messages from "./components/Messages";
import { approveBookingTransaction } from "./utils/transactions";
import ChatList from "./components/ChatList";
import emailjs from '@emailjs/browser';
import { EMAILJS_CONFIG, EMAILJS_BOOKING_CONFIG, EMAILJS_DECLINED_CONFIG, PAYPAL_CONFIG } from "./config";
import { buildBookingConfirmationTemplate, buildBookingDeclinedTemplate } from "./utils/emailTemplates";

// Initialize EmailJS for booking confirmations (new account)
emailjs.init(EMAILJS_BOOKING_CONFIG.PUBLIC_KEY);


function HostPage({ onLogout }) {

useEffect(() => {
  document.title = "Host Dashboard - StayHub";
}, []);

  // Active tab state for navigation
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showMobileMenu, setShowMobileMenu] = useState(false);


  // Enhanced states for functional checklist
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [selectedListingReviews, setSelectedListingReviews] = useState(null);
  
  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const pendingApprovals = bookings.filter(b => b.status === "PendingApproval");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showChatList, setShowChatList] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [recentChats, setRecentChats] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Real-time listings, bookings, and dashboard updates
  useEffect(() => {
    if (!auth.currentUser?.uid) return;

    // Initialize dashboard metrics
    initializeDashboardMetrics(auth.currentUser.uid);

    // Listen to host listings
    const hostListingsRef = collection(db, "hostListings");
    const listingsQuery = query(hostListingsRef, where("hostId", "==", auth.currentUser.uid));

    // Listen to bookings for this host
    const bookingsRef = collection(db, "bookings");
    const bookingsQuery = query(bookingsRef, where("hostId", "==", auth.currentUser.uid));

    let unsubDashboard = () => {}; // Initialize unsubDashboard

    // Subscribe to dashboard metrics
    unsubDashboard = onSnapshot(doc(db, "dashboardMetrics", auth.currentUser.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setDashboard(prev => ({
          ...prev,
          ...data,
          totalEarnings: data.totalEarnings || 0,
          monthlyRevenue: data.monthlyRevenue || 0,
          today: data.todayBookings || 0,
          upcoming: data.upcomingBookings || 0
        }));
        // Sync wallet balance with total earnings
        setWalletBalance(data.totalEarnings || 0);
        
        // Load points from Firestore (source of truth)
        const currentPoints = data.points || 0;
        setHostPoints(currentPoints);
        
        // Determine level based on bookings - level up every 6 bookings
        // Level 1 (Bronze): 0-5 bookings
        // Level 2 (Silver): 6-11 bookings
        // Level 3 (Gold): 12-17 bookings
        // Level 4 (Platinum): 18-23 bookings
        // Level 5 (Diamond): 24-29 bookings
        // Level 6 (Master): 30-35 bookings
        // Level 7 (Elite): 36-41 bookings
        // Level 8 (Legend): 42+ bookings
        const totalBookings = data.totalBookings || 0;
        const levelNumber = Math.floor(totalBookings / 6) + 1;
        let level = 'Bronze Host';
        
        if (levelNumber >= 8) level = 'Legend Host';
        else if (levelNumber >= 7) level = 'Elite Host';
        else if (levelNumber >= 6) level = 'Master Host';
        else if (levelNumber >= 5) level = 'Diamond Host';
        else if (levelNumber >= 4) level = 'Platinum Host';
        else if (levelNumber >= 3) level = 'Gold Host';
        else if (levelNumber >= 2) level = 'Silver Host';
        else level = 'Bronze Host';
        
        setHostLevel(level);
        
        // Calculate host rating from actual average rating in dashboard metrics
        // This will be updated when reviews are calculated
        const currentRating = data.averageRating || data.hostRating || 0;
        setDashboard(prev => ({ ...prev, hostRating: Number(currentRating.toFixed(1)) }));
      }
    });

    // Subscribe to listings updates
    const unsubListings = onSnapshot(listingsQuery, (snapshot) => {
      const updatedListings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        bookings: 0,  // Will be updated from bookings collection
        revenue: 0    // Will be updated from bookings collection
      }));
      setListings(updatedListings);
    });

    // Recalculate totalBookings from actual approved bookings and sync with dashboard metrics
    const recalculateTotalBookings = async () => {
      try {
        const approvedBookingsQuery = query(
          bookingsRef,
          where("hostId", "==", auth.currentUser.uid),
          where("status", "in", ["Upcoming", "Completed"])
        );
        const approvedBookingsSnapshot = await getDocs(approvedBookingsQuery);
        const actualTotalBookings = approvedBookingsSnapshot.size;
        
        // Update dashboard metrics with actual count
        const metricsRef = doc(db, "dashboardMetrics", auth.currentUser.uid);
        const metricsSnap = await getDoc(metricsRef);
        
        if (metricsSnap.exists()) {
          const currentTotal = metricsSnap.data().totalBookings || 0;
          if (actualTotalBookings !== currentTotal) {
            // Update to actual count - this will trigger the dashboardMetrics onSnapshot
            // which will recalculate the level automatically
            await updateDoc(metricsRef, {
              totalBookings: actualTotalBookings,
              lastUpdated: new Date().toISOString()
            });
            console.log(`✅ Updated totalBookings from ${currentTotal} to ${actualTotalBookings}. Level will be recalculated.`);
          }
        } else {
          // Initialize if doesn't exist
          await initializeDashboardMetrics(auth.currentUser.uid);
          await updateDoc(metricsRef, {
            totalBookings: actualTotalBookings,
            lastUpdated: new Date().toISOString()
          });
          console.log(`✅ Initialized totalBookings: ${actualTotalBookings}`);
        }

        // Calculate and award points for all existing approved/completed bookings
        // Points: 50 points per approved booking
        const pointsPerBooking = 50;
        const totalPointsToAward = actualTotalBookings * pointsPerBooking;
        
        if (totalPointsToAward > 0) {
          const currentMetrics = metricsSnap.exists() ? metricsSnap.data() : {};
          const currentPoints = currentMetrics.points || 0;
          const currentTotalPointsEarned = currentMetrics.totalPointsEarned || 0;
          
          // Only update if the calculated points are more than what's currently stored
          // This ensures we don't double-count points
          const expectedPoints = actualTotalBookings * pointsPerBooking;
          
          if (currentTotalPointsEarned < expectedPoints) {
            const pointsToAdd = expectedPoints - currentTotalPointsEarned;
            await updateDoc(metricsRef, {
              points: increment(pointsToAdd),
              totalPointsEarned: expectedPoints,
              lastUpdated: new Date().toISOString()
            });
            console.log(`✅ Awarded ${pointsToAdd} points retroactively for ${actualTotalBookings} existing bookings. Total points: ${expectedPoints}`);
          }
        }
      } catch (error) {
        console.error("Error recalculating totalBookings:", error);
      }
    };

    // Recalculate on mount to fix any discrepancies
    recalculateTotalBookings();

    // Subscribe to bookings updates
    const unsubBookings = onSnapshot(bookingsQuery, async (snapshot) => {
      const bookings = snapshot.docs
        .filter(doc => {
          const data = doc.data();
          // Only include bookings that have both checkIn and checkOut dates
          return data.checkIn && data.checkOut;
        })
        .map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Store bookings in state for calendar
      setBookings(bookings);

      // Create booking transactions from bookings
      const bookingTxns = bookings
        .filter(b => b.status === 'Upcoming' || b.status === 'Completed' || b.status === 'CancelledByGuest' || b.status === 'Declined')
        .map(booking => {
          const bookingDate = booking.createdAt?.toDate ? booking.createdAt.toDate() : 
                             booking.createdAt ? new Date(booking.createdAt) : 
                             booking.bookingDate?.toDate ? booking.bookingDate.toDate() :
                             booking.bookingDate ? new Date(booking.bookingDate) : new Date();
          
          if (booking.status === 'CancelledByGuest') {
            // Cancellation - host receives 25% payout (positive amount)
            const totalAmount = booking.total || booking.price || 0;
            const hostPayout = totalAmount * 0.25; // 25% of original total
            
            return {
              id: `booking-${booking.id}-cancel`,
              type: 'cancellation-payout',
              displayType: 'Cancellation Payout (25%)',
              amount: hostPayout, // Positive - host receives 25%
              description: `25% Cancellation payout: ${booking.title || 'Booking'} - ${booking.guestName || 'Guest'}`,
              bookingId: booking.id,
              guestName: booking.guestName || 'Guest',
              listingTitle: booking.title || '',
              checkIn: booking.checkIn,
              checkOut: booking.checkOut,
              status: 'completed',
              date: booking.cancelledAt || booking.updatedAt || bookingDate,
              createdAt: booking.cancelledAt?.toDate ? booking.cancelledAt.toDate().toISOString() : 
                        booking.cancelledAt ? new Date(booking.cancelledAt).toISOString() :
                        booking.updatedAt?.toDate ? booking.updatedAt.toDate().toISOString() :
                        booking.updatedAt ? new Date(booking.updatedAt).toISOString() : bookingDate.toISOString()
            };
          } else if (booking.status === 'Declined') {
            // Declined booking - no transaction (refund goes to guest, host never received payment)
            return null;
          } else if (booking.status === 'Upcoming' || booking.status === 'Completed') {
            // Approved booking - show earnings (positive)
            const totalAmount = booking.total || booking.price || 0;
            // Get service fee from booking or calculate (default 5%)
            const serviceFeePercent = booking.serviceFeePercent || 5;
            const hostEarnings = totalAmount * (1 - serviceFeePercent / 100);
            
            return {
              id: `booking-${booking.id}`,
              type: 'booking',
              displayType: 'Booking Payment',
              amount: hostEarnings,
              description: `Booking: ${booking.title || 'Booking'} - ${booking.guestName || 'Guest'}`,
              bookingId: booking.id,
              guestName: booking.guestName || 'Guest',
              listingTitle: booking.title || '',
              checkIn: booking.checkIn,
              checkOut: booking.checkOut,
              status: booking.status === 'Completed' ? 'completed' : 'upcoming',
              date: booking.paidAt || booking.createdAt || bookingDate,
              createdAt: booking.paidAt?.toDate ? booking.paidAt.toDate().toISOString() :
                        booking.paidAt ? new Date(booking.paidAt).toISOString() :
                        booking.createdAt?.toDate ? booking.createdAt.toDate().toISOString() :
                        booking.createdAt ? new Date(booking.createdAt).toISOString() : bookingDate.toISOString()
            };
          }
          return null;
        })
        .filter(txn => txn !== null);
      
      setBookingTransactions(bookingTxns);

      // Recalculate totalBookings when bookings change (only count approved bookings)
      const approvedCount = bookings.filter(b => 
        b.status === "Upcoming" || b.status === "Completed"
      ).length;
      
      // Only recalculate if the count might have changed
      // This prevents unnecessary Firestore updates
      recalculateTotalBookings();

      // Update listings with booking counts and revenue
      setListings(currentListings => {
        const updatedListings = [...currentListings];
        
        // Reset all booking counts and revenue
        updatedListings.forEach(listing => {
          listing.bookings = 0;
          listing.revenue = 0;
        });

        // Update with new booking data
        bookings.forEach(booking => {
          const listing = updatedListings.find(l => l.id === booking.listingId);
          if (listing) {
            listing.bookings = (listing.bookings || 0) + 1;
            listing.revenue = (listing.revenue || 0) + booking.total;
          }
        });

        // Calculate metrics
        const totalRevenue = updatedListings.reduce((sum, listing) => sum + (listing.revenue || 0), 0);
        const todayBookings = bookings.filter(b => 
          new Date(b.createdAt).toDateString() === new Date().toDateString()
        ).length;
        const upcomingBookings = bookings.filter(b => 
          new Date(b.createdAt) > new Date()
        ).length;

        // Calculate monthly revenue
        const currentDate = new Date();
        const monthlyRevenue = bookings
          .filter(b => {
            const bookingDate = new Date(b.createdAt);
            return bookingDate.getMonth() === currentDate.getMonth() && 
                   bookingDate.getFullYear() === currentDate.getFullYear();
          })
          .reduce((sum, b) => sum + b.total, 0);

        // Update dashboard metrics in Firestore
        if (auth.currentUser?.uid) {
          updateDashboardMetrics(auth.currentUser.uid, {
            totalEarnings: totalRevenue,
            monthlyRevenue,
            todayBookings,
            upcomingBookings,
            lastUpdated: new Date().toISOString()
          });
        }

        return updatedListings;
      });
    });

    // Subscribe to withdrawal requests for this host
    const withdrawalRequestsQuery = query(
      collection(db, "withdrawalRequests"),
      where("hostId", "==", auth.currentUser?.uid)
    );
    
    const unsubWithdrawalRequests = onSnapshot(withdrawalRequestsQuery, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => {
        // Sort by requestedAt descending (most recent first)
        const dateA = a.requestedAt?.toDate ? a.requestedAt.toDate() : 
                     a.requestedAt ? new Date(a.requestedAt) : 
                     a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.requestedAt?.toDate ? b.requestedAt.toDate() : 
                     b.requestedAt ? new Date(b.requestedAt) : 
                     b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA;
      });
      setWithdrawalRequests(requests);
    }, (error) => {
      console.error('Error loading withdrawal requests:', error);
    });

    // Subscribe to transactions for this host (real-time)
    const transactionsRef = collection(db, "transactions");
    const transactionsQuery = query(
      transactionsRef,
      where("userId", "==", auth.currentUser?.uid)
    );
    
    const unsubTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      const loadedTransactions = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .sort((a, b) => {
          // Sort by date descending (most recent first)
          const dateA = a.date?.toDate ? a.date.toDate() : 
                       a.date ? new Date(a.date) : 
                       a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.date?.toDate ? b.date.toDate() : 
                       b.date ? new Date(b.date) : 
                       b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB - dateA;
        })
        .slice(0, 100); // Limit to 100 most recent
      setTransactions(loadedTransactions);
      console.log('Loaded transactions from Firestore:', loadedTransactions.length);
    }, (error) => {
      console.error('Error loading transactions:', error);
    });

    // Cleanup
    return () => {
      unsubListings();
      unsubBookings();
      unsubDashboard();
      unsubWithdrawalRequests();
      unsubTransactions();
    };
  }, []);
  const [dashboard, setDashboard] = useState({
    today: 0,
    upcoming: 0,
    totalEarnings: 0,
    totalBookings: 0,
    hostRating: 0,
    averageRating: 0,
    occupancyRate: 0,
    responseRate: 0,
    responseTime: "<1hr",
    cancellationRate: 0,
    monthlyRevenue: 0
  });
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem(`hostProfile_${auth.currentUser?.uid}`);
    const savedData = saved ? JSON.parse(saved) : null;

    // Get display name from Firebase auth
    const displayName = auth.currentUser?.displayName || 
                       auth.currentUser?.email?.split('@')[0] || 
                       "Host User";
    
    return {
      name: displayName, // Always use Firebase auth display name
      email: auth.currentUser?.email, // Always use Firebase auth email
      phone: savedData?.phone || "+63 923 456 7890",
      superhost: savedData?.superhost || true,
      avatar: savedData?.avatar || "https://images.unsplash.com/photo-1494790108755-2616b612b786?q=80&w=100&auto=format&fit=crop",
      preferences: savedData?.preferences || { notifications: true, emailUpdates: true, smsUpdates: true }
    };
  });
  const [messages, setMessages] = useState([]);
  const [showAddListing, setShowAddListing] = useState(false);
  const [showEditListing, setShowEditListing] = useState(false);
  const [editingListing, setEditingListing] = useState(null);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [newListing, setNewListing] = useState({
    title: '',
    category: 'Home',
    amenities: [],
    price: '',
    location: '',
    images: [],
    uploadedImages: [],
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 1
  });
  const [hostPoints, setHostPoints] = useState(0);
  const [hostLevel, setHostLevel] = useState('Bronze Host');
  const [coupons, setCoupons] = useState([]);
  const [couponsLoaded, setCouponsLoaded] = useState(false);
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [showAddCouponModal, setShowAddCouponModal] = useState(false);
  const [showRedeemPointsModal, setShowRedeemPointsModal] = useState(false);
  const [redeemPointsAmount, setRedeemPointsAmount] = useState('');
  const [newCoupon, setNewCoupon] = useState({
    name: '',
    discount: '',
    code: '',
    validUntil: '',
    minBookings: 1,
    maxUses: 1,
    description: '',
    active: true
  });
  const [paymentMethods, setPaymentMethods] = useState([
    { id: "P-001", type: "GCash", account: "0923-456-7890", status: "Active" },
    { id: "P-002", type: "PayMaya", account: "host@paymaya.com", status: "Active" },
    { id: "P-003", type: "Bank Transfer", account: "BPI - 1234567890", status: "Active" },
    { id: "P-004", type: "PayPal", account: "host@paypal.com", status: "Active" }
  ]);
  const [showPayPalPayment, setShowPayPalPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);

  // Wallet & Earnings State
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [bookingTransactions, setBookingTransactions] = useState([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);

  // Functional checklist implementations
  

  // 2. Save as draft functionality
  const handleSaveDraft = async (isEdit = false) => {
    // Validate required fields
    if (!newListing.title || !newListing.price || !newListing.location) {
      alert("Please fill in at least title, price, and location to save as draft.");
      return;
    }

    const price = parseFloat(newListing.price);
    if (isNaN(price) || price <= 0) {
      alert("Please enter a valid price greater than 0.");
      return;
    }

    const listing = {
      ...newListing,
      price: parseFloat(newListing.price),
      pricePerNight: parseFloat(newListing.price),
      status: "Draft", // Set to Draft status
      rating: isEdit && editingListing ? editingListing.rating : 0,
      discount: isEdit && editingListing ? editingListing.discount : 0,
      promo: isEdit && editingListing ? editingListing.promo : "None",
      createdAt: isEdit && editingListing ? editingListing.createdAt : new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      views: isEdit && editingListing ? editingListing.views : 0,
      bookings: isEdit && editingListing ? editingListing.bookings : 0,
      revenue: isEdit && editingListing ? editingListing.revenue : 0,
      superhost: profile.superhost || false,
      host: profile.name || "Anonymous Host",
      hostId: auth.currentUser?.uid,
      hostAvatar: profile.avatar,
      img: newListing.uploadedImages[0] || (isEdit && editingListing ? editingListing.img : "https://images.unsplash.com/photo-1505691924083-fb6d2ee58f58?q=80&w=1200&auto=format&fit=crop")
    };

    try {
      if (isEdit && editingListing) {
        // Update existing listing as draft
        const hostListingRef = doc(db, "hostListings", editingListing.id);
        await updateDoc(hostListingRef, {
          ...listing,
          status: "Draft",
          lastUpdated: new Date().toISOString()
        });

        // Also update in public listings if it exists
        if (editingListing.publicListingId) {
          const publicListingRef = doc(db, "listings", editingListing.publicListingId);
          await updateDoc(publicListingRef, {
            ...listing,
            status: "Draft",
            lastUpdated: new Date().toISOString()
          });
        }

        // Update local state
        setListings(listings.map(l => 
          l.id === editingListing.id ? { ...l, ...listing, status: "Draft" } : l
        ));
        setShowEditListing(false);
        alert("Listing saved as draft!");
      } else {
        // Create new listing as draft
        const hostListingRef = await addDoc(collection(db, "hostListings"), {
          ...listing,
          hostId: auth.currentUser?.uid,
          status: "Draft",
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        });

        const addedListing = { 
          id: hostListingRef.id, 
          ...listing,
          status: "Draft"
        };
        
        setListings([addedListing, ...listings]);
        setShowAddListing(false);
        alert("Listing saved as draft! You can publish it later from your listings page.");
      }

      // Reset form
      setNewListing({
        title: '',
        category: 'Home',
        description: '',
        price: '',
        location: '',
        amenities: [],
        images: [],
        uploadedImages: [],
        maxGuests: 4,
        bedrooms: 2,
        bathrooms: 1
      });
      setEditingListing(null);
    } catch (error) {
      console.error("Error saving draft:", error);
      alert("Failed to save draft. Please try again.");
    }
  };

  // 3. Add new listing
  const handleAddNewListing = async () => {
    if (!newListing.title || !newListing.price || !newListing.location) {
      alert("Please fill in all required fields.");
      return;
    }

    const price = parseFloat(newListing.price);
    if (isNaN(price) || price <= 0) {
      alert("Please enter a valid price greater than 0.");
      return;
    }
    
    const listing = {
      ...newListing,
      price: parseFloat(newListing.price), // Convert price to number
      pricePerNight: parseFloat(newListing.price), // Add pricePerNight for guest page compatibility
      status: "Active", // Set to Active so it appears on guest page
      rating: 0,
      discount: 0,
      promo: "None",
      createdAt: new Date().toISOString(),
      views: 0,
      bookings: 0,
      revenue: 0,
      superhost: profile.superhost || false,
      host: profile.name || "Anonymous Host",
      hostId: auth.currentUser?.uid,
      hostAvatar: profile.avatar,
      img: newListing.uploadedImages[0] || "https://images.unsplash.com/photo-1505691924083-fb6d2ee58f58?q=80&w=1200&auto=format&fit=crop"
    };

    try {
      // First add to hostListings collection
      const hostListingRef = await addDoc(collection(db, "hostListings"), {
        ...listing,
        hostId: auth.currentUser?.uid,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });

      // Then add to public listings collection
      const publicListingRef = await addDoc(collection(db, "listings"), {
        ...listing,
        hostListingId: hostListingRef.id,  // Reference to the host listing
        hostId: auth.currentUser?.uid,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      });

      const addedListing = { 
        id: hostListingRef.id, 
        ...listing,
        publicListingId: publicListingRef.id
      };
      
      setListings([addedListing, ...listings]);
      setShowAddListing(false);
      alert("Listing added successfully!");
    } catch (error) {
      console.error("Error adding listing:", error);
      alert("Failed to add listing. Please try again.");
    }
    
    // Reset form
    setNewListing({
      title: '',
      category: 'Home',
      description: '',
      price: '',
      location: '',
      amenities: [],
      images: [],
      uploadedImages: [],
      maxGuests: 4,
      bedrooms: 2,
      bathrooms: 1
    });
    alert("New listing added and published to guest page!");
  };

  // Image upload handler
  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    const imagePromises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises).then(results => {
      setNewListing(prev => ({
        ...prev,
        uploadedImages: [...prev.uploadedImages, ...results]
      }));
    });
  };

  // Remove uploaded image
  const handleRemoveImage = (index) => {
    setNewListing(prev => ({
      ...prev,
      uploadedImages: prev.uploadedImages.filter((_, i) => i !== index)
    }));
  };

  const handleViewReviews = (listing) => {
    setSelectedListingReviews(listing);
    setShowReviewsModal(true);
  };

  // Edit listing functionality
  const handleEditListing = (listing) => {
    setEditingListing(listing);
    setNewListing({
      title: listing.title,
      category: listing.category,
      description: listing.description || '',
      price: parseFloat(listing.price) || 0, // Ensure price is a number
      location: listing.location,
      amenities: listing.amenities || [],
      images: listing.images || [],
      uploadedImages: listing.uploadedImages || [],
      maxGuests: listing.maxGuests || 4,
      bedrooms: listing.bedrooms || 2,
      bathrooms: listing.bathrooms || 1
    });
    setShowEditListing(true);
  };

  // Update listing
  const handleUpdateListing = async () => {
    if (!editingListing || !newListing.title || !newListing.price || !newListing.location) {
      alert("Please fill in all required fields.");
      return;
    }
    
    const updatedListing = {
      ...editingListing,
      ...newListing,
      img: newListing.uploadedImages[0] || editingListing.img,
      updatedAt: new Date().toISOString()
    };
    
    try {
      const updateData = {
        ...updatedListing,
        lastUpdated: new Date().toISOString()
      };

      // Update in hostListings collection
      const hostListingRef = doc(db, "hostListings", editingListing.id);
      await updateDoc(hostListingRef, updateData);

      // Update in public listings collection if it exists
      if (editingListing.publicListingId) {
        const publicListingRef = doc(db, "listings", editingListing.publicListingId);
        await updateDoc(publicListingRef, updateData);
      }

      setListings(listings.map(l => l.id === editingListing.id ? { ...updatedListing, publicListingId: editingListing.publicListingId } : l));
      setShowEditListing(false);
      setEditingListing(null);
      alert("Listing updated successfully!");
    } catch (error) {
      console.error("Error updating listing:", error);
      alert("Failed to update listing. Please try again.");
    }
    
    // Reset form
    setNewListing({
      title: '',
      category: 'Home',
      description: '',
      price: '',
      location: '',
      amenities: [],
      images: [],
      uploadedImages: [],
      maxGuests: 4,
      bedrooms: 2,
      bathrooms: 1
    });
    alert("Listing updated successfully!");
  };

  // Delete listing
  const handleDeleteListing = async (listingId) => {
    if (window.confirm("Are you sure you want to delete this listing?")) {
      try {
        // Find the listing to get its publicListingId
        const listingToDelete = listings.find(l => l.id === listingId);
        
        // Delete from hostListings collection
        await deleteDoc(doc(db, "hostListings", listingId));
        
        // Delete from public listings collection if it exists
        if (listingToDelete?.publicListingId) {
          await deleteDoc(doc(db, "listings", listingToDelete.publicListingId));
        }
        
        setListings(listings.filter(l => l.id !== listingId));
        alert("Listing deleted successfully!");
      } catch (error) {
        console.error("Error deleting listing:", error);
        alert("Failed to delete listing. Please try again.");
      }
    }
  };

  // Toggle listing status (Active/Draft) and update in Firestore
  const handleToggleListingStatus = async (listingId) => {
    try {
      const listing = listings.find(l => l.id === listingId);
      if (!listing) {
        alert("Listing not found.");
        return;
      }

      const newStatus = listing.status === 'Active' ? 'Draft' : 'Active';
      
      // Update in hostListings collection (always exists)
      const hostListingRef = doc(db, "hostListings", listingId);
      await updateDoc(hostListingRef, { 
        status: newStatus,
        lastUpdated: new Date().toISOString()
      });

      // Check if listing exists in public listings collection
      const listingRef = doc(db, "listings", listingId);
      const listingSnap = await getDoc(listingRef);

      if (newStatus === 'Active') {
        // Publishing: Create in listings collection if it doesn't exist
        if (!listingSnap.exists()) {
          // Create the public listing
          const publicListingData = {
            ...listing,
            id: listingId,
            hostListingId: listingId,
            status: 'Active',
            lastUpdated: new Date().toISOString()
          };
          // Remove the id field before adding to Firestore (Firestore will use the document ID)
          const { id, ...listingDataWithoutId } = publicListingData;
          await setDoc(listingRef, listingDataWithoutId);
        } else {
          // Update existing public listing
          await updateDoc(listingRef, { 
            status: 'Active',
            lastUpdated: new Date().toISOString()
          });
        }
      } else {
        // Unpublishing: Only update if it exists in listings collection
        if (listingSnap.exists()) {
          await updateDoc(listingRef, { 
            status: 'Draft',
            lastUpdated: new Date().toISOString()
          });
        }
      }

      // Update local state
      setListings(listings.map(l => 
        l.id === listingId 
          ? { ...l, status: newStatus }
          : l
      ));

      alert(`Listing ${newStatus === 'Active' ? 'published' : 'unpublished'} successfully!`);
    } catch (error) {
      console.error("Error toggling listing status:", error);
      alert(`Failed to update listing status: ${error.message || 'Please try again.'}`);
    }
  };

  // PayPal Integration Functions
  const initializePayPal = () => {
    if (window.paypal) {
      window.paypal.Buttons({
        createOrder: (data, actions) => {
          return actions.order.create({
            purchase_units: [{
              amount: {
                value: paymentAmount.toString(),
                currency_code: 'PHP'
              }
            }]
          });
        },
        onApprove: (data, actions) => {
          return actions.order.capture().then((details) => {
            alert(`Payment completed! Transaction ID: ${details.id}`);
            setShowPayPalPayment(false);
            // Update earnings
            setDashboard(prev => ({
              ...prev,
              totalEarnings: prev.totalEarnings + paymentAmount
            }));
          });
        },
        onError: (err) => {
          console.error('PayPal error:', err);
          alert('Payment failed. Please try again.');
        }
      }).render('#paypal-button-container');
    }
  };

  const handlePayPalPayment = (amount) => {
    setPaymentAmount(amount);
    setShowPayPalPayment(true);
  };

  // Load PayPal SDK
  useEffect(() => {
    if (showPayPalPayment && !window.paypal) {
      const script = document.createElement('script');
      script.src = 'https://www.paypal.com/sdk/js?client-id=YOUR_PAYPAL_CLIENT_ID&currency=PHP';
      script.async = true;
      script.onload = () => {
        setTimeout(initializePayPal, 100);
      };
      document.body.appendChild(script);
    } else if (showPayPalPayment && window.paypal) {
      setTimeout(initializePayPal, 100);
    }
  }, [showPayPalPayment, paymentAmount]);

  // 4. Adding chosen host with ratings, discounts, promos
  const handleHostManagement = (listingId, action, data) => {
    setListings(listings.map(l => {
      if (l.id === listingId) {
        switch(action) {
          case 'rating': return { ...l, rating: data };
          case 'discount': return { ...l, discount: data };
          case 'promo': return { ...l, promo: data };
          default: return l;
        }
      }
      return l;
    }));
  };


  // Calendar functions
  const getBookedDates = () => {
    const bookedDates = new Set();
    bookings.forEach(booking => {
      if (booking.checkIn && booking.checkOut) {
        const checkIn = new Date(booking.checkIn);
        const checkOut = new Date(booking.checkOut);
        const current = new Date(checkIn);
        
        while (current < checkOut) {
          bookedDates.add(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
        }
      }
    });
    return bookedDates;
  };

  const isDateBooked = (date) => {
    const bookedDates = getBookedDates();
    return bookedDates.has(date.toISOString().split('T')[0]);
  };

  const getBookingsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return bookings.filter(booking => 
      booking.checkIn === dateStr || 
      (booking.checkIn <= dateStr && booking.checkOut > dateStr)
    );
  };

  const getCheckInBookings = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return bookings.filter(booking => booking.checkIn === dateStr);
  };

  const getCheckOutBookings = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return bookings.filter(booking => booking.checkOut === dateStr);
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  // Messaging functions
  const handleMessageGuest = (booking) => {
    setSelectedGuest({
      uid: booking.guestId || 'guest_' + booking.id,
      displayName: booking.guestName || booking.guestEmail?.split('@')[0] || 'Guest',
      name: booking.guestName || 'Guest',
      email: booking.guestEmail || 'guest@stayhub.com'
    });
    
    // Find the property information from the booking
    const property = listings.find(listing => listing.id === booking.listingId);
    if (property) {
      setSelectedProperty({
        id: property.id,
        name: property.title || property.name || property.propertyName || 'Property',
        type: property.type || 'accommodation',
        location: property.location || property.address || 'Location not specified'
      });
    }
    
    setShowMessages(true);
  };

  // Handle chat selection from chat list
  const handleSelectChat = (otherUser, propertyInfo = null) => {
    // Ensure displayName is set for Messages component compatibility
    setSelectedGuest({
      ...otherUser,
      displayName: otherUser.displayName || otherUser.name || otherUser.email?.split('@')[0] || 'User'
    });
    setSelectedProperty(propertyInfo);
    setShowChatList(false);
    setShowMessages(true);
  };

  // Open chat list
  const handleOpenChatList = () => {
    setShowChatList(true);
  };

  // Subscribe to chats for persistent message history
  useEffect(() => {
    if (!auth.currentUser?.uid) return;
    try {
      const chatsRef = collection(db, 'chats');
      const qChats = query(
        chatsRef,
        where('participants', 'array-contains', auth.currentUser.uid)
      );
      const unsub = onSnapshot(qChats, (snapshot) => {
        const items = snapshot.docs.map((d) => ({ 
          id: d.id, 
          ...d.data(),
          lastMessageTime: d.data().lastMessageTime?.toDate?.() || new Date()
        }))
        .sort((a, b) => b.lastMessageTime - a.lastMessageTime) // Sort in memory instead
        .slice(0, 5); // Only keep 5 most recent
        setRecentChats(items);
      });
      return () => unsub();
    } catch (e) {
      console.error('Error subscribing to chats:', e);
    }
  }, [auth.currentUser?.uid]);

  // Recalculate dashboard stats when data changes
  useEffect(() => {
    if (bookings.length > 0 || listings.length > 0) {
      calculateDashboardStats();
    }
  }, [bookings, listings]);

  // Calculate realistic dashboard stats from actual data
  const calculateDashboardStats = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's bookings (check-ins today)
    const todayBookings = bookings.filter(b => {
      const checkInDate = new Date(b.checkIn);
      return checkInDate >= today && checkInDate < tomorrow && b.status !== 'Cancelled';
    }).length;

    // Upcoming bookings (check-in date in the future)
    const upcomingBookings = bookings.filter(b => {
      const checkInDate = new Date(b.checkIn);
      return checkInDate >= tomorrow && (b.status === 'Upcoming' || b.status === 'PendingApproval');
    }).length;

    // Calculate occupancy rate - realistic calculation based on nights booked
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const totalAvailableNights = listings.length * daysInMonth; // Total nights available across all listings
    
    // Calculate total nights booked (from completed and upcoming bookings in this month)
    const nightsBooked = bookings.filter(b => {
      if (!b.checkIn || !b.checkOut) return false;
      if (b.status !== 'Completed' && b.status !== 'Upcoming') return false;
      
      const checkIn = b.checkIn.toDate ? b.checkIn.toDate() : new Date(b.checkIn);
      const checkOut = b.checkOut.toDate ? b.checkOut.toDate() : new Date(b.checkOut);
      const bookingMonth = checkIn.getMonth();
      const bookingYear = checkIn.getFullYear();
      
      // Only count bookings from current month
      if (bookingMonth === now.getMonth() && bookingYear === now.getFullYear()) {
        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        return nights;
      }
      return false;
    }).reduce((total, b) => {
      const checkIn = b.checkIn.toDate ? b.checkIn.toDate() : new Date(b.checkIn);
      const checkOut = b.checkOut.toDate ? b.checkOut.toDate() : new Date(b.checkOut);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      return total + nights;
    }, 0);
    
    const occupancyRate = totalAvailableNights > 0 ? Math.min(Math.round((nightsBooked / totalAvailableNights) * 100), 100) : 0;

    // Calculate average rating from all listings that have ratings (only count listings with rating > 0)
    const listingsWithRatings = listings.filter(l => l.rating && l.rating > 0);
    const ratingsSum = listingsWithRatings.reduce((sum, l) => sum + (l.rating || 0), 0);
    const averageRating = listingsWithRatings.length > 0 ? Number((ratingsSum / listingsWithRatings.length).toFixed(1)) : 0;

    // Update host rating in dashboard metrics in Firestore
    if (averageRating > 0 && auth.currentUser?.uid) {
      const metricsRef = doc(db, "dashboardMetrics", auth.currentUser.uid);
      updateDoc(metricsRef, {
        hostRating: averageRating,
        averageRating: averageRating,
        lastUpdated: new Date().toISOString()
      }).catch(err => console.error("Error updating host rating:", err));
    }

    // Calculate response rate (based on bookings)
    const totalRequests = bookings.length;
    const respondedRequests = bookings.filter(b => 
      b.status !== 'PendingApproval'
    ).length;
    const responseRate = totalRequests > 0 ? Math.round((respondedRequests / totalRequests) * 100) : 0;

    setDashboard(prev => ({
      ...prev,
      today: todayBookings,
      upcoming: upcomingBookings,
      occupancyRate: occupancyRate,
      averageRating: averageRating,
      hostRating: averageRating, // Update host rating in local state
      responseRate: responseRate,
      responseTime: responseRate >= 90 ? '<1hr' : '<2hrs'
    }));
  };

  // 7. Receiving Payment Methods
  const handlePaymentMethods = () => {
    alert("Payment Methods Configured:\n" + 
      paymentMethods.map(p => `• ${p.type}: ${p.account} (${p.status})`).join('\n'));
  };

  // Approve or decline booking
  const handleApproveBooking = async (booking) => {
    try {
      await approveBookingTransaction(db, booking.id);
      
      // Get dynamic service fee from admin config
      let serviceFeePercent = 5; // Default to 5%
      try {
        const configRef = doc(db, "adminSettings", "config");
        const configSnap = await getDoc(configRef);
        if (configSnap.exists()) {
          const cfg = configSnap.data();
          const parsedFee = Number(cfg.serviceFee);
          if (!Number.isNaN(parsedFee) && parsedFee >= 0 && parsedFee <= 100) {
            serviceFeePercent = parsedFee;
          }
        }
      } catch (configError) {
        console.warn("Failed to load admin service fee; using default 5%", configError);
      }
      
      // Add earnings to wallet when booking is approved (dynamic percentage)
      const totalAmount = booking.total || booking.price || 0;
      const adminCommission = totalAmount * (serviceFeePercent / 100);
      const hostEarnings = totalAmount - adminCommission;
      const hostPercentage = 100 - serviceFeePercent;
      
      addEarningsToWallet(
        hostEarnings,
        `Booking: ${booking.title} - ${booking.guestName || 'Guest'} (${hostPercentage}% after ${serviceFeePercent}% admin fee)`,
        booking.id
      );

      // Award points for approved booking (50 points per booking)
      try {
        const pointsToAward = 50;
        const metricsRef = doc(db, "dashboardMetrics", auth.currentUser.uid);
        const metricsSnap = await getDoc(metricsRef);
        
        if (metricsSnap.exists()) {
          const currentData = metricsSnap.data();
          const currentPoints = currentData.points || 0;
          const totalPointsEarned = currentData.totalPointsEarned || 0;
          
          await updateDoc(metricsRef, {
            points: increment(pointsToAward),
            totalPointsEarned: increment(pointsToAward),
            lastUpdated: new Date().toISOString()
          });
          
          console.log(`✅ Awarded ${pointsToAward} points for approved booking. New total: ${currentPoints + pointsToAward}`);
        } else {
          // Initialize metrics if doesn't exist
          await initializeDashboardMetrics(auth.currentUser.uid);
          await updateDoc(metricsRef, {
            points: pointsToAward,
            totalPointsEarned: pointsToAward,
            lastUpdated: new Date().toISOString()
          });
        }
      } catch (pointsError) {
        console.error("Error awarding points:", pointsError);
        // Don't block booking approval if points fail
      }
      
      // Send booking confirmation email to guest
      try {
        console.log("📧 Attempting to send booking confirmation email...");
        console.log("📋 Booking object:", booking);
        console.log("📋 Booking fields:", {
          id: booking.id,
          guestId: booking.guestId,
          guestEmail: booking.guestEmail,
          guestName: booking.guestName,
          guest: booking.guest,
          email: booking.email
        });
        
        const bookingTotal = booking.total || booking.price || 0;
        const serviceFee = bookingTotal * (serviceFeePercent / 100); // Dynamic service fee
        const subtotal = bookingTotal - serviceFee;
        
        // Get guest email from users collection if not in booking object
        let guestEmail = booking.guestEmail || booking.email || booking.guest?.email;
        let guestName = booking.guestName || booking.guest?.name || booking.guestName;
        
        // Try to get from Firebase Auth if we have guestId
        if (!guestEmail && booking.guestId) {
          console.log("🔍 Fetching guest email from users collection for guestId:", booking.guestId);
          try {
            const guestDoc = await getDoc(doc(db, "users", booking.guestId));
            if (guestDoc.exists()) {
              const guestData = guestDoc.data();
              console.log("✅ Found guest data:", guestData);
              guestEmail = guestData.email || guestEmail;
              guestName = guestData.name || guestName;
            } else {
              console.warn("⚠️ Guest document not found in users collection for guestId:", booking.guestId);
            }
          } catch (guestError) {
            console.error("❌ Error fetching guest data:", guestError);
          }
        }

        console.log("📧 Final guest email:", guestEmail);
        console.log("👤 Final guest name:", guestName);

        if (!guestEmail || guestEmail.trim() === "") {
          console.warn("❌ Cannot send booking confirmation email: No guest email found for booking", booking.id);
          console.warn("📋 Available booking fields:", Object.keys(booking));
          alert("Booking approved! Note: Could not send confirmation email - guest email not found in booking data.");
        } else {
          console.log("Preparing to send booking confirmation email to:", guestEmail);
          console.log("Booking details:", {
            id: booking.id,
            title: booking.title,
            total: bookingTotal
          });

        const emailHtml = buildBookingConfirmationTemplate({
          guestName: guestName || guestEmail?.split('@')[0] || "Guest",
          bookingId: booking.id,
          listingTitle: booking.title || "Your Booking",
          listingImage: booking.image || booking.listingImage || "https://images.unsplash.com/photo-1505691924083-fb6d2ee58f58?q=80&w=1200&auto=format&fit=crop",
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          guests: booking.guests || booking.numberOfGuests || 1,
          location: booking.location || "",
          totalAmount: bookingTotal,
          serviceFee: serviceFee,
          subtotal: subtotal,
          guestEmail: guestEmail,
          supportEmail: EMAILJS_BOOKING_CONFIG.SUPPORT_EMAIL,
          brandName: EMAILJS_BOOKING_CONFIG.BRAND_NAME,
          appUrl: EMAILJS_BOOKING_CONFIG.APP_URL || window.location.origin
        });

        // Validate email before creating template params
        if (!guestEmail || guestEmail.trim() === "" || !guestEmail.includes("@")) {
          throw new Error(`Invalid guest email: "${guestEmail}". Cannot send confirmation email.`);
        }

        const templateParams = {
          to_email: guestEmail.trim(),
          email: guestEmail.trim(),
          customer_name: guestName || guestEmail?.split('@')[0] || "Guest",
          guest_name: guestName || guestEmail?.split('@')[0] || "Guest",
          booking_id: booking.id,
          booking_reference: booking.id,
          service_name: booking.title || "Your Booking",
          listing_title: booking.title || "Your Booking",
          booking_date: booking.checkIn ? (typeof booking.checkIn === "string" ? booking.checkIn : new Date(booking.checkIn).toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })) : "TBD",
          date: booking.checkIn ? (typeof booking.checkIn === "string" ? booking.checkIn : new Date(booking.checkIn).toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })) : "TBD",
          check_in: booking.checkIn ? (typeof booking.checkIn === "string" ? booking.checkIn : new Date(booking.checkIn).toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })) : "TBD",
          check_out: booking.checkOut ? (typeof booking.checkOut === "string" ? booking.checkOut : new Date(booking.checkOut).toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })) : "TBD",
          booking_time: "", // Not applicable for stay bookings
          guests: booking.guests || booking.numberOfGuests || 1,
          location: booking.location || "",
          total_amount: `₱${bookingTotal.toLocaleString()}`,
          message_html: emailHtml
        };

        console.log("📧 Template params to_email:", templateParams.to_email);
        console.log("📧 Template params email:", templateParams.email);

          console.log("Sending email with EmailJS (Booking Config)...");
          console.log("Template ID:", EMAILJS_BOOKING_CONFIG.TEMPLATE_ID);
          console.log("Service ID:", EMAILJS_BOOKING_CONFIG.SERVICE_ID);
          console.log("Public Key:", EMAILJS_BOOKING_CONFIG.PUBLIC_KEY);
          console.log("Template Params:", templateParams);
          
          // Validate required fields
          if (!guestEmail || !EMAILJS_BOOKING_CONFIG.SERVICE_ID || !EMAILJS_BOOKING_CONFIG.TEMPLATE_ID) {
            throw new Error(`Missing required fields: guestEmail=${!!guestEmail}, serviceId=${!!EMAILJS_BOOKING_CONFIG.SERVICE_ID}, templateId=${!!EMAILJS_BOOKING_CONFIG.TEMPLATE_ID}`);
          }
          
          const emailResult = await emailjs.send(
            EMAILJS_BOOKING_CONFIG.SERVICE_ID,
            EMAILJS_BOOKING_CONFIG.TEMPLATE_ID,
            templateParams
          );

          console.log('✅ Booking confirmation email sent successfully to', guestEmail);
          console.log('EmailJS Response:', emailResult);
        }
      } catch (emailError) {
        console.error("❌ Error sending booking confirmation email:", emailError);
        console.error("Full error object:", emailError);
        console.error("Error details:", {
          message: emailError.message,
          text: emailError.text,
          status: emailError.status,
          response: emailError.response
        });
        
        // Get more detailed error message
        let errorMessage = 'Unknown error';
        if (emailError.text) {
          errorMessage = emailError.text;
        } else if (emailError.message) {
          errorMessage = emailError.message;
        } else if (emailError.response?.text) {
          errorMessage = emailError.response.text;
        }
        
        alert(`Booking approved! Warning: Failed to send confirmation email.\n\nError: ${errorMessage}\n\nPlease check the browser console for more details.`);
      }
      
      // Count guest's total APPROVED bookings from Firestore for accuracy
      try {
        const guestBookingsQuery = query(
          collection(db, 'bookings'),
          where('guestId', '==', booking.guestId),
          where('status', 'in', ['Upcoming', 'Completed'])
        );
        const guestBookingsSnapshot = await getDocs(guestBookingsQuery);
        const totalBookings = guestBookingsSnapshot.size;
        
        console.log(`Guest ${booking.guestEmail} has ${totalBookings} approved bookings`);
        
        const reward = await giveGuestReward(
          booking.guestId, 
          booking.guestEmail,
          totalBookings
        );
        
        if (reward) {
          alert(`Booking approved! Guest earned a reward: ${reward.name} (${reward.discount}% OFF)`);
        } else {
          alert("Booking approved and earnings added to wallet!");
        }
      } catch (rewardError) {
        console.error("Error giving reward:", rewardError);
        alert("Booking approved! (Note: Reward distribution had an issue)");
      }
    } catch (e) {
      console.error("Approve booking failed:", e);
      alert("Failed to approve booking. Please try again.");
    }
  };

  const handleDeclineBooking = async (booking) => {
    try {
      // Process 100% refund to guest
      const totalPaid = booking.total || booking.price || 0;
      const refundAmount = totalPaid; // 100% refund

      // Get guest's current PayPal balance from Firestore
      let guestPayPalBalance = 0;
      if (booking.guestId) {
        try {
          const guestDoc = await getDoc(doc(db, "users", booking.guestId));
          if (guestDoc.exists()) {
            const guestData = guestDoc.data();
            guestPayPalBalance = parseFloat(guestData.paypalBalance || 0);
          }
        } catch (guestError) {
          console.error("Error fetching guest PayPal balance:", guestError);
        }
      }

      // Calculate new balance (using PHP)
      const newGuestBalance = guestPayPalBalance + refundAmount;

      // Update guest's PayPal balance in Firestore
      if (booking.guestId) {
        try {
          await updateDoc(doc(db, "users", booking.guestId), {
            paypalBalance: newGuestBalance,
            updatedAt: serverTimestamp()
          });
          console.log(`✅ Guest PayPal balance updated: ₱${newGuestBalance.toLocaleString()} PHP`);
        } catch (balanceError) {
          console.error("Error updating guest PayPal balance:", balanceError);
        }
      }

      // Save refund transaction to transactions collection
      if (booking.guestId) {
        try {
          await addDoc(collection(db, "transactions"), {
            userId: booking.guestId,
            type: 'Refund',
            amount: refundAmount,
            currency: 'PHP',
            transactionId: `REFUND-DECLINED-${booking.id}`,
            balanceBefore: guestPayPalBalance,
            balanceAfter: newGuestBalance,
            status: 'Completed',
            description: `100% Refund for declined booking: ${booking.title || 'Booking'}`,
            listingTitle: booking.title || '',
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            originalBookingId: booking.id,
            timestamp: serverTimestamp(),
            createdAt: new Date().toISOString()
          });
          console.log("✅ Refund transaction saved");
        } catch (transactionError) {
          console.error("Error saving refund transaction:", transactionError);
        }
      }

      // Update booking status with refund information
      await updateDoc(doc(db, "bookings", booking.id), {
        status: "Declined",
        declinedAt: serverTimestamp(),
        refundAmount: refundAmount,
        refundPercentage: 100,
        updatedAt: serverTimestamp()
      });

      // Send booking declined email to guest
      try {
        console.log("📧 Attempting to send booking declined email...");
        
        // Get guest email
        let guestEmail = booking.guestEmail;
        let guestName = booking.guestName;
        
        if (!guestEmail && booking.guestId) {
          try {
            const guestDoc = await getDoc(doc(db, "users", booking.guestId));
            if (guestDoc.exists()) {
              const guestData = guestDoc.data();
              guestEmail = guestData.email || guestEmail;
              guestName = guestData.name || guestName;
            }
          } catch (guestError) {
            console.error("Error fetching guest data:", guestError);
          }
        }

        if (!guestEmail || guestEmail.trim() === "" || !guestEmail.includes("@")) {
          console.warn("❌ Cannot send declined email: No valid guest email found");
        } else {
          // Initialize EmailJS if not already initialized
          emailjs.init(EMAILJS_DECLINED_CONFIG.PUBLIC_KEY);

          const emailHtml = buildBookingDeclinedTemplate({
            guestName: guestName || guestEmail?.split('@')[0] || "Valued Guest",
            bookingId: booking.id,
            listingTitle: booking.title || "Your Booking",
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            guests: booking.guests || booking.numberOfGuests || 1,
            location: booking.location || "",
            guestEmail: guestEmail,
            supportEmail: EMAILJS_DECLINED_CONFIG.SUPPORT_EMAIL,
            brandName: EMAILJS_DECLINED_CONFIG.BRAND_NAME,
            appUrl: EMAILJS_DECLINED_CONFIG.APP_URL || window.location.origin
          });

          const templateParams = {
            to_email: guestEmail.trim(),
            email: guestEmail.trim(),
            customer_name: guestName || guestEmail?.split('@')[0] || "Valued Guest",
            guest_name: guestName || guestEmail?.split('@')[0] || "Valued Guest",
            booking_id: booking.id,
            booking_reference: booking.id,
            service_name: booking.title || "Your Booking",
            listing_title: booking.title || "Your Booking",
            check_in: booking.checkIn ? (typeof booking.checkIn === "string" ? booking.checkIn : new Date(booking.checkIn).toLocaleDateString('en-US', { 
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })) : "TBD",
            check_out: booking.checkOut ? (typeof booking.checkOut === "string" ? booking.checkOut : new Date(booking.checkOut).toLocaleDateString('en-US', { 
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })) : "TBD",
            guests: booking.guests || booking.numberOfGuests || 1,
            location: booking.location || "",
            message_html: emailHtml
          };

          console.log("Sending declined booking email with EmailJS...");
          console.log("Template ID:", EMAILJS_DECLINED_CONFIG.TEMPLATE_ID);
          console.log("Service ID:", EMAILJS_DECLINED_CONFIG.SERVICE_ID);
          
          if (!EMAILJS_DECLINED_CONFIG.SERVICE_ID || !EMAILJS_DECLINED_CONFIG.TEMPLATE_ID) {
            throw new Error(`Missing EmailJS config: serviceId=${!!EMAILJS_DECLINED_CONFIG.SERVICE_ID}, templateId=${!!EMAILJS_DECLINED_CONFIG.TEMPLATE_ID}`);
          }
          
          const emailResult = await emailjs.send(
            EMAILJS_DECLINED_CONFIG.SERVICE_ID,
            EMAILJS_DECLINED_CONFIG.TEMPLATE_ID,
            templateParams
          );

          console.log('✅ Booking declined email sent successfully to', guestEmail);
          console.log('EmailJS Response:', emailResult);
        }
      } catch (emailError) {
        console.error("❌ Error sending booking declined email:", emailError);
        console.error("Error details:", {
          message: emailError.message,
          text: emailError.text,
          status: emailError.status
        });
        // Don't show error to user - decline was successful, email is just a bonus
      }

      alert(`Booking declined successfully!\n\n100% refund processed:\n- Refund Amount: ₱${refundAmount.toLocaleString()} PHP\n- Guest's new balance: ₱${newGuestBalance.toLocaleString()} PHP`);
    } catch (e) {
      console.error("Decline booking failed:", e);
      alert("Failed to decline booking. Please try again.");
    }
  };

  // Auto-expire pending bookings after 24h
  useEffect(() => {
    const expire = async () => {
      const now = Date.now();
      const toExpire = pendingApprovals.filter(b => {
        const deadline = new Date(b.cancelDeadline || 0).getTime();
        return deadline && now > deadline;
      });
      for (const b of toExpire) {
        try {
          await updateDoc(doc(db, 'bookings', b.id), {
            status: 'Expired',
            updatedAt: new Date().toISOString()
          });
        } catch (e) {
          // ignore per item
        }
      }
    };
    if (pendingApprovals.length) expire();
  }, [pendingApprovals]);

  // 8. Account Settings (Profile, Bookings, Coupon)
  // Edit Profile Modal states
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({ ...profile });

  // Open Edit Profile Modal
  const handleProfileEdit = () => {
    setEditProfileData({ ...profile });
    setShowEditProfile(true);
  };

  // Handle input change - excluding email
  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setEditProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle avatar change
  const handleProfileAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setEditProfileData(prev => ({
          ...prev,
          avatar: event.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Save profile changes
  const handleProfileSave = () => {
    // Keep the Firebase auth email
    const updatedProfile = {
      ...editProfileData,
      email: auth.currentUser?.email // Always use Firebase auth email
    };
    
    setProfile(updatedProfile);
    // Save with user-specific key
    if (auth.currentUser?.uid) {
      localStorage.setItem(`hostProfile_${auth.currentUser.uid}`, JSON.stringify(updatedProfile));
    }
    setShowEditProfile(false);
  };

  const handleAccountSettings = () => {
    setShowAccountSettings(!showAccountSettings);
  };

  const handlePointsRewards = () => {
    setShowRewardsModal(true);
  };

  // Redeem points for cash
  const handleRedeemPoints = async () => {
    const pointsToRedeem = parseInt(redeemPointsAmount);
    
    if (!pointsToRedeem || pointsToRedeem <= 0) {
      alert('Please enter a valid number of points to redeem');
      return;
    }
    
    if (pointsToRedeem > hostPoints) {
      alert(`Insufficient points. You have ${hostPoints.toLocaleString()} points.`);
      return;
    }

    // Redemption rate: 100 points = ₱10 (or 10 points = ₱1)
    const POINTS_TO_PESO_RATE = 10; // 10 points = ₱1
    const cashAmount = pointsToRedeem / POINTS_TO_PESO_RATE;
    
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        alert('User not authenticated');
        return;
      }

      // Update points in dashboard metrics
      const metricsRef = doc(db, "dashboardMetrics", userId);
      const metricsSnap = await getDoc(metricsRef);
      
      if (!metricsSnap.exists()) {
        await initializeDashboardMetrics(userId);
      }
      
      const currentData = metricsSnap.exists() ? metricsSnap.data() : {};
      const currentPoints = currentData.points || 0;
      const currentPointsRedeemed = currentData.pointsRedeemed || 0;
      
      if (pointsToRedeem > currentPoints) {
        alert(`Insufficient points. You have ${currentPoints.toLocaleString()} points.`);
        return;
      }

      // Deduct points and update redeemed amount
      await updateDoc(metricsRef, {
        points: increment(-pointsToRedeem),
        pointsRedeemed: increment(pointsToRedeem),
        lastUpdated: new Date().toISOString()
      });

      // Add cash to wallet (this will also update totalEarnings in dashboardMetrics)
      await addEarningsToWallet(
        cashAmount,
        `Points Redemption: ${pointsToRedeem.toLocaleString()} points converted to cash`,
        null
      );

      // Create transaction record for points redemption
      const transactionsRef = collection(db, "transactions");
      await addDoc(transactionsRef, {
        userId: userId,
        type: 'points-redemption',
        amount: cashAmount,
        points: pointsToRedeem,
        description: `Redeemed ${pointsToRedeem.toLocaleString()} points for ₱${cashAmount.toLocaleString()}`,
        date: serverTimestamp(),
        createdAt: new Date().toISOString(),
        status: 'completed'
      });

      alert(`✅ Successfully redeemed ${pointsToRedeem.toLocaleString()} points for ₱${cashAmount.toLocaleString()}!\n\nPoints have been added to your wallet balance.`);
      
      setRedeemPointsAmount('');
      setShowRedeemPointsModal(false);
    } catch (error) {
      console.error('Error redeeming points:', error);
      alert(`Failed to redeem points: ${error.message}. Please try again.`);
    }
  };

  // Wallet Management Functions
  const addEarningsToWallet = async (amount, description, bookingId) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    
    try {
      // Save transaction to Firestore
      const transactionsRef = collection(db, "transactions");
      const newTransaction = {
        userId: userId,
        type: 'earning',
        amount: amount,
        description: description,
        bookingId: bookingId,
        date: serverTimestamp(),
        createdAt: new Date().toISOString(),
        status: 'completed'
      };
      
      await addDoc(transactionsRef, newTransaction);
      console.log('Earning transaction saved to Firestore');
      
      // Update total earnings in dashboardMetrics (Firestore)
      // The real-time listener will automatically update local state
      const metricsRef = doc(db, "dashboardMetrics", userId);
      const metricsSnap = await getDoc(metricsRef);
      
      if (metricsSnap.exists()) {
        await updateDoc(metricsRef, {
          totalEarnings: increment(amount),
          lastUpdated: new Date().toISOString()
        });
      } else {
        // Initialize if doesn't exist
        await initializeDashboardMetrics(userId);
        await updateDoc(metricsRef, {
          totalEarnings: amount,
          lastUpdated: new Date().toISOString()
        });
      }
      
      // Don't update local state here - let the real-time listener handle it
      // This prevents double counting
    } catch (error) {
      console.error('Error saving earning transaction:', error);
      // Still update local state even if Firestore save fails
      const transaction = {
        id: `TXN-${Date.now()}`,
        type: 'earning',
        amount: amount,
        description: description,
        bookingId: bookingId,
        date: new Date().toISOString(),
        status: 'completed'
      };
      setTransactions(prev => [transaction, ...prev]);
      setWalletBalance(prev => prev + amount);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    if (amount > walletBalance) {
      alert('Insufficient balance');
      return;
    }

    // Validate PayPal email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!paypalEmail || !emailRegex.test(paypalEmail.trim())) {
      alert('Please enter a valid PayPal email address');
      return;
    }
    
    // In PayPal Sandbox, any valid email format is accepted
    // The email should be associated with a PayPal Sandbox account
    
    try {
      // Create withdrawal request for PayPal email only
      const withdrawalRequest = {
        hostId: auth.currentUser.uid,
        hostName: profile.name || auth.currentUser.email?.split('@')[0] || 'Host',
        amount: amount,
        method: 'PayPal',
        paypalEmail: paypalEmail.trim(),
        status: 'pending', // pending, approved, rejected
        requestedAt: serverTimestamp(),
        createdAt: new Date().toISOString(),
        description: `Withdrawal request to PayPal: ${paypalEmail.trim()}`
      };
      
      // Save withdrawal request to Firestore
      const withdrawalRequestsRef = collection(db, "withdrawalRequests");
      await addDoc(withdrawalRequestsRef, withdrawalRequest);
      
      setWithdrawAmount('');
      setPaypalEmail('');
      setShowWithdrawModal(false);
      
      alert(`Withdrawal request submitted successfully!\n\nAmount: ₱${amount.toLocaleString()} PHP\nPayPal Email: ${paypalEmail.trim()}\n\nYour withdrawal request is now pending admin approval. You will be notified once it's processed.`);
    } catch (error) {
      console.error('Error creating withdrawal request:', error);
      alert(`Failed to submit withdrawal request.\n\nError: ${error.message || 'Unknown error'}\n\nPlease try again or contact support if the problem persists.`);
    }
  };

  const getTransactionIcon = (type) => {
    switch(type) {
      case 'earning': return <FaMoneyBillWave className="text-green-500" />;
      case 'withdrawal': return <FaCreditCard className="text-blue-500" />;
      default: return <FaWallet className="text-gray-500" />;
    }
  };

  // Coupon & Rewards Management Functions
  const giveGuestReward = async (guestId, guestEmail, bookingCount) => {
    // Find eligible coupons based on booking count
    const eligibleCoupons = coupons.filter(coupon => 
      coupon.active && 
      bookingCount >= coupon.minBookings &&
      !coupon.usedBy.includes(guestId) &&
      new Date(coupon.validUntil) > new Date()
    );

    if (eligibleCoupons.length === 0) return;

    // Give the best coupon (highest discount)
    const bestCoupon = eligibleCoupons.sort((a, b) => b.discount - a.discount)[0];

    try {
      // Store reward in Firestore for the guest
      await addDoc(collection(db, 'guestRewards'), {
        guestId: guestId,
        guestEmail: guestEmail,
        hostId: auth.currentUser?.uid,
        couponId: bestCoupon.id,
        couponCode: bestCoupon.code,
        couponName: bestCoupon.name,
        discount: bestCoupon.discount,
        description: bestCoupon.description,
        validUntil: bestCoupon.validUntil,
        isUsed: false,
        givenAt: new Date().toISOString()
      });

      // Mark coupon as used by this guest
      setCoupons(prev => prev.map(c => 
        c.id === bestCoupon.id 
          ? { ...c, usedBy: [...c.usedBy, guestId] }
          : c
      ));

      return bestCoupon;
    } catch (error) {
      console.error('Error giving reward:', error);
      return null;
    }
  };

  const handleAddCoupon = () => {
    if (!newCoupon.name || !newCoupon.code || !newCoupon.discount) {
      alert('Please fill in all required fields');
      return;
    }

    const coupon = {
      id: `C-${Date.now()}`,
      ...newCoupon,
      discount: parseFloat(newCoupon.discount),
      minBookings: parseInt(newCoupon.minBookings),
      maxUses: parseInt(newCoupon.maxUses),
      usedBy: [],
      createdAt: new Date().toISOString()
    };

    setCoupons(prev => [coupon, ...prev]);
    setNewCoupon({
      name: '',
      discount: '',
      code: '',
      validUntil: '',
      minBookings: 1,
      maxUses: 1,
      description: '',
      active: true
    });
    setShowAddCouponModal(false);
    alert('Coupon created successfully!');
  };

  const handleDeleteCoupon = (couponId) => {
    if (window.confirm('Are you sure you want to delete this coupon?')) {
      setCoupons(prev => prev.filter(c => c.id !== couponId));
      alert('Coupon deleted successfully!');
    }
  };

  const handleToggleCouponStatus = (couponId) => {
    setCoupons(prev => prev.map(c => 
      c.id === couponId ? { ...c, active: !c.active } : c
    ));
  };

  // Function to download host data as Word document
  const handleDownloadData = () => {
    // Create the document content
    const currentDate = new Date().toLocaleDateString();
    const content = `
      HOST PROFILE AND DATA REPORT
      Generated on: ${currentDate}
      
      PROFILE INFORMATION
      ------------------
      Name: ${profile.name}
      Email: ${profile.email}
      Phone: ${profile.phone}
      Host Rating: ${dashboard.hostRating}
      Superhost Status: ${profile.superhost ? "Yes" : "No"}
      
      DASHBOARD METRICS
      ----------------
      Total Earnings: ₱${dashboard.totalEarnings.toLocaleString()}
      Monthly Revenue: ₱${dashboard.monthlyRevenue.toLocaleString()}
      Average Rating: ${dashboard.averageRating}
      Occupancy Rate: ${dashboard.occupancyRate}%
      Response Rate: ${dashboard.responseRate}%
      Response Time: ${dashboard.responseTime}
      Today's Bookings: ${dashboard.today}
      Upcoming Bookings: ${dashboard.upcoming}
      
      ACTIVE LISTINGS
      --------------
      ${listings.map(listing => `
      Listing ID: ${listing.id}
      Title: ${listing.title}
      Location: ${listing.location}
      Price per Night: ₱${listing.price?.toLocaleString()}
      Total Bookings: ${listing.bookings}
      Total Revenue: ₱${listing.revenue?.toLocaleString()}
      Status: ${listing.status}
      Rating: ${listing.rating || "No ratings yet"}
      `).join('\n')}
      
      PAYMENT METHODS
      --------------
      ${paymentMethods.map(pm => `
      Type: ${pm.type}
      Account: ${pm.account}
      Status: ${pm.status}
      `).join('\n')}
      
      REWARDS AND POINTS
      ----------------
      Total Points: ${hostPoints}
      Available Coupons: ${coupons.length}
      
      END OF REPORT
    `;

    // Create a Blob with the content
    const blob = new Blob([content], { type: 'application/msword' });
    
    // Create download link
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `Host_Data_Report_${currentDate.replace(/\//g, '-')}.doc`;
    
    // Trigger download
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // Save profile to localStorage (listings are stored in Firestore only)
  useEffect(() => {
    if (auth.currentUser?.uid) {
      try {
        // Only save profile data (small), not listings (can be large with images)
        localStorage.setItem(`hostProfile_${auth.currentUser.uid}`, JSON.stringify({
          ...profile,
          email: auth.currentUser.email // Always ensure email matches auth
        }));
      } catch (error) {
        if (error.name === 'QuotaExceededError') {
          console.warn('LocalStorage quota exceeded, skipping save');
        } else {
          console.error('Error saving to localStorage:', error);
        }
      }
    }
  }, [profile]);

  // Update profile when auth state changes
  useEffect(() => {
    if (auth.currentUser) {
      const displayName = auth.currentUser.displayName || 
                         auth.currentUser.email?.split('@')[0] || 
                         "Host User";
      setProfile(prev => ({
        ...prev,
        email: auth.currentUser.email,
        name: displayName // Always use Firebase auth display name
      }));
    }
  }, [auth.currentUser]);

  // Load host coupons from Firestore
  useEffect(() => {
    const loadHostCoupons = async () => {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      try {
        const hostCouponsRef = doc(db, 'hostCoupons', userId);
        const hostCouponsDoc = await getDoc(hostCouponsRef);
        
        if (hostCouponsDoc.exists()) {
          const data = hostCouponsDoc.data();
          setCoupons(data.coupons || []);
          console.log('Loaded host coupons from Firestore:', data.coupons?.length);
        } else {
          // Initialize with default coupons for new hosts
          const defaultCoupons = [
            { 
              id: "C-001", 
              name: "New Guest Welcome", 
              discount: 15, 
              code: "NEWGUEST15", 
              validUntil: "2025-12-31",
              minBookings: 1,
              maxUses: 1,
              description: "Welcome discount for first booking",
              active: true,
              usedBy: []
            },
            { 
              id: "C-002", 
              name: "Loyal Guest Reward", 
              discount: 20, 
              code: "LOYAL20", 
              validUntil: "2025-12-31",
              minBookings: 3,
              maxUses: 1,
              description: "Reward for 3+ bookings",
              active: true,
              usedBy: []
            },
            { 
              id: "C-003", 
              name: "Super Guest VIP", 
              discount: 25, 
              code: "VIP25", 
              validUntil: "2025-12-31",
              minBookings: 5,
              maxUses: 1,
              description: "VIP discount for 5+ bookings",
              active: true,
              usedBy: []
            }
          ];
          setCoupons(defaultCoupons);
          // Save default coupons to Firestore
          await setDoc(hostCouponsRef, { coupons: defaultCoupons });
          console.log('Created default coupons for new host');
        }
        setCouponsLoaded(true);
      } catch (error) {
        console.error('Error loading host coupons:', error);
        setCouponsLoaded(true);
      }
    };

    loadHostCoupons();
  }, []);

  // Save host coupons to Firestore whenever they change
  useEffect(() => {
    const saveHostCoupons = async () => {
      const userId = auth.currentUser?.uid;
      if (!userId || !couponsLoaded) return; // Don't save until initial load is complete

      try {
        const hostCouponsRef = doc(db, 'hostCoupons', userId);
        await setDoc(hostCouponsRef, { coupons });
        console.log('Saved host coupons to Firestore');
      } catch (error) {
        console.error('Error saving host coupons:', error);
      }
    };

    saveHostCoupons();
  }, [coupons, couponsLoaded]);

  return (
<div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-white py-4 md:py-10 px-3 md:px-4 lg:px-2 overflow-x-hidden">
      <div className="max-w-6xl mx-auto relative">
        {/* Airbnb-style Header */}
        <div className="bg-white shadow-sm rounded-lg p-4 md:p-6 mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Logo and Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
          <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-lg md:text-xl">H</span>
                </div>
            <div>
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900">Host Dashboard</h1>
                  <p className="text-xs md:text-sm text-gray-500">Welcome back, {profile.name}</p>
            </div>
          </div>
              
              {/* Mobile Menu Button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition"
              >
                <FaBars className="text-gray-600 text-xl" />
              </button>

              {/* Navigation Tabs */}
              <div className="hidden lg:flex items-center gap-4 lg:gap-6">
                <button 
                  onClick={() => setActiveTab("overview")}
                  className={`py-2 px-3 rounded-lg font-medium text-sm transition ${
                    activeTab === "overview" 
                      ? "bg-yellow-100 text-yellow-700" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Overview
                </button>
                <button 
                  onClick={() => setActiveTab("listings")}
                  className={`py-2 px-3 rounded-lg font-medium text-sm transition ${
                    activeTab === "listings" 
                      ? "bg-yellow-100 text-yellow-700" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Listings
                </button>
                <button 
                  onClick={() => setActiveTab("calendar")}
                  className={`py-2 px-3 rounded-lg font-medium text-sm transition ${
                    activeTab === "calendar" 
                      ? "bg-yellow-100 text-yellow-700" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Calendar
                </button>
                <button 
                  onClick={handleOpenChatList}
                  className={`py-2 px-3 rounded-lg font-medium text-sm transition ${
                    activeTab === "messages" 
                      ? "bg-yellow-100 text-yellow-700" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Messages
                </button>
                <button 
                  onClick={() => setActiveTab("earnings")}
                  className={`py-2 px-3 rounded-lg font-medium text-sm transition ${
                    activeTab === "earnings" 
                      ? "bg-yellow-100 text-yellow-700" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Earnings
                </button>
            </div>
          </div>

          {/* Mobile Navigation Menu */}
          {showMobileMenu && (
            <div className="lg:hidden mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => { setActiveTab("overview"); setShowMobileMenu(false); }}
                  className={`py-2 px-3 rounded-lg font-medium text-sm transition text-left ${
                    activeTab === "overview" 
                      ? "bg-yellow-100 text-yellow-700" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Overview
                </button>
                <button 
                  onClick={() => { setActiveTab("listings"); setShowMobileMenu(false); }}
                  className={`py-2 px-3 rounded-lg font-medium text-sm transition text-left ${
                    activeTab === "listings" 
                      ? "bg-yellow-100 text-yellow-700" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Listings
                </button>
                <button 
                  onClick={() => { setActiveTab("calendar"); setShowMobileMenu(false); }}
                  className={`py-2 px-3 rounded-lg font-medium text-sm transition text-left ${
                    activeTab === "calendar" 
                      ? "bg-yellow-100 text-yellow-700" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Calendar
                </button>
                <button 
                  onClick={() => { handleOpenChatList(); setShowMobileMenu(false); }}
                  className={`py-2 px-3 rounded-lg font-medium text-sm transition text-left ${
                    activeTab === "messages" 
                      ? "bg-yellow-100 text-yellow-700" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Messages
                </button>
                <button 
                  onClick={() => { setActiveTab("earnings"); setShowMobileMenu(false); }}
                  className={`py-2 px-3 rounded-lg font-medium text-sm transition text-left ${
                    activeTab === "earnings" 
                      ? "bg-yellow-100 text-yellow-700" 
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  Earnings
                </button>
              </div>
            </div>
          )}

            {/* User Profile and Actions */}
          <div className="flex items-center gap-2 md:gap-4">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-full hover:bg-gray-100 transition"
              >
                <FaBell className="text-gray-600 text-lg md:text-xl" />
                {pendingApprovals.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-4 md:min-w-[20px] md:h-5 bg-red-500 text-white text-[10px] md:text-xs rounded-full flex items-center justify-center px-1">
                    {pendingApprovals.length}
                  </span>
                )}
              </button>
              <button onClick={() => setShowAccountSettings(true)} className="p-2 rounded-full hover:bg-gray-100 transition">
                <FaSettings className="text-gray-600 text-lg md:text-xl" />
              </button>
              <div className="flex items-center gap-2 md:gap-3 bg-gray-50 rounded-full px-2 md:px-4 py-1.5 md:py-2">
                <img 
                  src={profile.avatar || "https://images.unsplash.com/photo-1494790108755-2616b612b786?q=80&w=100&auto=format&fit=crop"}
                  alt="Profile"
                  className="w-7 h-7 md:w-8 md:h-8 rounded-full flex-shrink-0"
                />
                <div className="hidden sm:block">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{profile.name}</span>
                    {profile.superhost && (
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-medium">
                        Superhost
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">ID: {profile.id || "HOST-2024"}</p>
            </div>
            <button
              onClick={onLogout}
                  className="p-1 hover:bg-gray-200 rounded transition"
            >
                  <FaSignOutAlt className="text-gray-400 text-sm" />
            </button>
              </div>
            </div>
          </div>
        </div>

        {/* Airbnb-style Dashboard Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Pending Approvals */}
            {pendingApprovals.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Pending Booking Approvals</h3>
                  <span className="text-sm text-gray-500">{pendingApprovals.length} pending</span>
                </div>
                <div className="space-y-3">
                  {pendingApprovals.slice(0,5).map((b) => (
                    <div key={b.id} className="bg-yellow-50 rounded-lg border border-yellow-200 overflow-hidden">
                      <div className="flex items-start justify-between p-3">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{b.title}</div>
                          <div className="text-xs text-gray-600 mt-1">{b.checkIn} → {b.checkOut} • ₱{(b.total||0).toLocaleString()}</div>
                          {b.guestName && (
                            <div className="text-xs text-gray-500 mt-1">Guest: {b.guestName}</div>
                          )}
                        </div>
                        <div className="flex gap-2 ml-3">
                          <button onClick={() => handleDeclineBooking(b)} className="px-3 py-1 rounded bg-red-100 text-red-700 text-sm hover:bg-red-200 whitespace-nowrap">Decline</button>
                          <button onClick={() => handleApproveBooking(b)} className="px-3 py-1 rounded bg-green-600 text-white text-sm hover:bg-green-700 whitespace-nowrap">Approve</button>
                        </div>
                      </div>
                      {b.notes && b.notes.trim() && (
                        <div className="px-3 pb-3 pt-2 bg-blue-50 border-t border-blue-200">
                          <div className="flex items-start gap-2">
                            <FaComments className="text-blue-600 text-sm mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="text-xs font-semibold text-blue-800 mb-1">Special Requests from Guest:</div>
                              <div className="text-sm text-gray-800 whitespace-pre-wrap bg-white rounded p-2 border border-blue-200">{b.notes}</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">₱{(dashboard.totalEarnings || 0).toLocaleString()}</p>
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <span>↗</span> +12% from last month
                    </p>
                  </div>
                  <FaMoneyBillWave className="text-3xl text-green-500" />
          </div>
        </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
            <div>
                    <p className="text-sm font-medium text-gray-600">Host Rating</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {dashboard.hostRating > 0 ? dashboard.hostRating : "No rating yet"}
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <FaStar className="text-yellow-400" />
                      {dashboard.hostRating >= 4.8 ? "Excellent" : dashboard.hostRating >= 4.5 ? "Great" : dashboard.hostRating > 0 ? "Good" : "Get bookings"}
                    </p>
                  </div>
                  <FaStar className="text-3xl text-blue-500" />
            </div>
          </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
                <div className="flex items-center justify-between">
            <div>
                    <p className="text-sm font-medium text-gray-600">Host Level</p>
                    <p className="text-2xl font-bold text-gray-900">{hostLevel}</p>
                    <p className="text-sm text-yellow-600 flex items-center gap-1">
                      {dashboard.totalBookings || 0} total bookings
                    </p>
                  </div>
                  <FaGift className="text-3xl text-yellow-500" />
            </div>
          </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-pink-500">
                <div className="flex items-center justify-between">
            <div>
                    <p className="text-sm font-medium text-gray-600">Response Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboard.responseRate}%</p>
                    <p className="text-sm text-yellow-700 flex items-center gap-1">
                      <FaMessage />
                      {dashboard.responseRate > 0 ? dashboard.responseTime : "No requests yet"}
                    </p>
                  </div>
                  <FaComments className="text-3xl text-pink-500" />
            </div>
          </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Host Points</p>
                    <p className="text-2xl font-bold text-gray-900">{hostPoints.toLocaleString()}</p>
                    <p className="text-xs text-purple-600 mt-1">50 pts per booking</p>
                  </div>
                  <FaGift className="text-3xl text-purple-500" />
                </div>
          </div>
        </div>

            {/* Today's Bookings and Upcoming Bookings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Today's Bookings */}
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FaCalendarCheck className="text-green-500" />
                    Today's Bookings
                  </h3>
                  <span className="text-sm font-semibold text-green-600 bg-green-100 px-3 py-1 rounded-full">
                    {(() => {
                      const now = new Date();
                      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                      const tomorrow = new Date(today);
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      return bookings.filter(b => {
                        if (!b.checkIn || b.status === 'Cancelled' || b.status === 'CancelledByGuest') return false;
                        const checkInDate = b.checkIn?.toDate ? b.checkIn.toDate() : new Date(b.checkIn);
                        return checkInDate >= today && checkInDate < tomorrow;
                      }).length;
                    })()}
                  </span>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {(() => {
                    const now = new Date();
                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const todayBookingsList = bookings.filter(b => {
                      if (!b.checkIn || b.status === 'Cancelled' || b.status === 'CancelledByGuest') return false;
                      const checkInDate = b.checkIn?.toDate ? b.checkIn.toDate() : new Date(b.checkIn);
                      return checkInDate >= today && checkInDate < tomorrow;
                    }).sort((a, b) => {
                      const dateA = a.checkIn?.toDate ? a.checkIn.toDate() : new Date(a.checkIn);
                      const dateB = b.checkIn?.toDate ? b.checkIn.toDate() : new Date(b.checkIn);
                      return dateA - dateB;
                    });

                    if (todayBookingsList.length > 0) {
                      return todayBookingsList.map((booking) => (
                        <div key={booking.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900">{booking.title || "Booking"}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              {booking.guestName && booking.guestName !== 'Guest User' ? booking.guestName : 
                               booking.guestEmail ? booking.guestEmail.split('@')[0] : 'Guest'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Check-in: {booking.checkIn ? (new Date(booking.checkIn?.toDate ? booking.checkIn.toDate() : booking.checkIn).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })) : 'TBD'}
                            </div>
                            {booking.checkOut && (
                              <div className="text-xs text-gray-500">
                                Check-out: {new Date(booking.checkOut?.toDate ? booking.checkOut.toDate() : booking.checkOut).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric'
                                })}
                              </div>
                            )}
                          </div>
                          <div className="text-right ml-3">
                            <p className="font-semibold text-sm text-green-700">₱{(booking.total || 0).toLocaleString()}</p>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              booking.status === 'Upcoming' ? 'bg-blue-100 text-blue-700' :
                              booking.status === 'Completed' ? 'bg-gray-100 text-gray-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {booking.status || 'Pending'}
                            </span>
                          </div>
                        </div>
                      ));
                    } else {
                      return (
                        <div className="text-center py-6 text-gray-500">
                          <FaCalendarAlt className="text-3xl mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No check-ins today</p>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>

              {/* Upcoming Bookings */}
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FaClock className="text-blue-500" />
                    Upcoming Bookings
                  </h3>
                  <span className="text-sm font-semibold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                    {(() => {
                      const now = new Date();
                      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                      return bookings.filter(b => {
                        if (!b.checkIn || b.status === 'Cancelled' || b.status === 'CancelledByGuest') return false;
                        const checkInDate = b.checkIn?.toDate ? b.checkIn.toDate() : new Date(b.checkIn);
                        return checkInDate >= tomorrow && (b.status === 'Upcoming' || b.status === 'PendingApproval');
                      }).length;
                    })()}
                  </span>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {(() => {
                    const now = new Date();
                    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
                    const upcomingBookingsList = bookings.filter(b => {
                      if (!b.checkIn || b.status === 'Cancelled' || b.status === 'CancelledByGuest') return false;
                      const checkInDate = b.checkIn?.toDate ? b.checkIn.toDate() : new Date(b.checkIn);
                      return checkInDate >= tomorrow && (b.status === 'Upcoming' || b.status === 'PendingApproval');
                    }).sort((a, b) => {
                      const dateA = a.checkIn?.toDate ? a.checkIn.toDate() : new Date(a.checkIn);
                      const dateB = b.checkIn?.toDate ? b.checkIn.toDate() : new Date(b.checkIn);
                      return dateA - dateB;
                    });

                    if (upcomingBookingsList.length > 0) {
                      return upcomingBookingsList.map((booking) => (
                        <div key={booking.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="flex-1">
                            <div className="font-medium text-sm text-gray-900">{booking.title || "Booking"}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              {booking.guestName && booking.guestName !== 'Guest User' ? booking.guestName : 
                               booking.guestEmail ? booking.guestEmail.split('@')[0] : 'Guest'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Check-in: {booking.checkIn ? (new Date(booking.checkIn?.toDate ? booking.checkIn.toDate() : booking.checkIn).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })) : 'TBD'}
                            </div>
                            {booking.checkOut && (
                              <div className="text-xs text-gray-500">
                                Check-out: {new Date(booking.checkOut?.toDate ? booking.checkOut.toDate() : booking.checkOut).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </div>
                            )}
                          </div>
                          <div className="text-right ml-3">
                            <p className="font-semibold text-sm text-blue-700">₱{(booking.total || 0).toLocaleString()}</p>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              booking.status === 'Upcoming' ? 'bg-green-100 text-green-700' :
                              booking.status === 'PendingApproval' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {booking.status || 'Pending'}
                            </span>
                          </div>
                        </div>
                      ));
                    } else {
                      return (
                        <div className="text-center py-6 text-gray-500">
                          <FaCalendarAlt className="text-3xl mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No upcoming bookings</p>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Bookings */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Bookings</h3>
                  <button onClick={() => setShowAllBookings(true)} className="text-sm text-yellow-700 hover:text-pink-700 font-medium">
                    View All
                  </button>
                </div>
                <div className="space-y-3">
                  {bookings.length > 0 ? (
                    bookings
                      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                      .slice(0, 3)
                      .map((booking, idx) => (
                        <div key={booking.id} className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                          <div className="flex items-start justify-between p-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-yellow-700 font-semibold text-sm">
                                  {booking.guestName && booking.guestName !== 'Guest User' ? booking.guestName.split(' ')[0][0] : 
                                   booking.guestEmail ? booking.guestEmail.split('@')[0][0].toUpperCase() : 'G'}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-gray-900">
                                  {booking.guestName && booking.guestName !== 'Guest User' ? booking.guestName : 
                                   booking.guestEmail ? booking.guestEmail.split('@')[0] : 'Guest'}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{booking.title}</p>
                              </div>
                            </div>
                            <div className="text-right ml-3 flex-shrink-0">
                              <p className="font-semibold text-sm">₱{booking.total?.toLocaleString() || booking.price}</p>
                              <p className="text-xs text-gray-500">
                                {booking.checkIn ? new Date(booking.checkIn).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric' 
                                }) : 'TBD'}
                              </p>
                              <button
                                onClick={() => handleMessageGuest(booking)}
                                className="mt-1 text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition"
                              >
                                Message
                              </button>
                            </div>
                          </div>
                          {booking.notes && booking.notes.trim() && (
                            <div className="px-3 pb-3 pt-2 bg-blue-50 border-t border-blue-200">
                              <div className="flex items-start gap-2">
                                <FaComments className="text-blue-600 text-xs mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-semibold text-blue-800 mb-1">Wishlists:</div>
                                  <div className="text-xs text-gray-700 whitespace-pre-wrap line-clamp-2">{booking.notes}</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FaCalendarAlt className="text-4xl mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No bookings yet</p>
                      <p className="text-xs">Your recent bookings will appear here</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setShowAddListing(true)}
                    className="flex items-center gap-3 p-4 bg-pink-50 rounded-lg hover:bg-yellow-100 transition"
                  >
                    <FaPlus className="text-yellow-700" />
                    <span className="text-sm font-medium text-pink-700">Add Listing</span>
                  </button>
                  <button 
                    onClick={handleOpenChatList}
                    className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                  >
                    <FaMessage className="text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">Messages</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab("calendar")}
                    className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition"
                  >
                    <FaCalendarCheck className="text-green-600" />
                    <span className="text-sm font-medium text-green-700">Calendar</span>
                  </button>
                  <button 
                    onClick={() => handlePointsRewards()}
                    className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition"
                  >
                    <FaGift className="text-purple-600" />
                    <span className="text-sm font-medium text-purple-700">Rewards</span>
                  </button>
                  {hostPoints >= 10 && (
                    <button 
                      onClick={() => setShowRedeemPointsModal(true)}
                      className="flex items-center gap-3 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg hover:from-pink-100 hover:to-purple-100 transition border-2 border-pink-200"
                    >
                      <FaGift className="text-pink-600" />
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-semibold text-pink-700">Redeem Points</span>
                        <span className="text-xs text-pink-600">{hostPoints.toLocaleString()} pts</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Listings Tab */}
        {activeTab === "listings" && (
          <div className="space-y-6">
            {/* Listings Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">My Listings</h2>
                <p className="text-sm md:text-base text-gray-600">Manage your properties and hosting experience</p>
              </div>
              <button 
                onClick={() => setShowAddListing(true)}
                className="bg-yellow-400 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg hover:bg-pink-600 transition flex items-center justify-center gap-2 text-sm md:text-base"
              >
                <FaPlus />
                <span>Add New Listing</span>
              </button>
            </div>

            {/* Category Filter Navigation */}
            <div className="bg-[#f8f6f1] rounded-lg p-1">
              <div className="flex gap-1 overflow-x-auto">
                <button
                  onClick={() => setSelectedCategory("All")}
                  className={`flex-1 px-4 py-3 rounded-md font-medium transition-colors ${
                    selectedCategory === "All"
                      ? "bg-[#bfa14a] text-white"
                      : "text-gray-700 hover:bg-white/50"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setSelectedCategory("Home")}
                  className={`flex-1 px-4 py-3 rounded-md font-medium transition-colors ${
                    selectedCategory === "Home"
                      ? "bg-[#bfa14a] text-white"
                      : "text-gray-700 hover:bg-white/50"
                  }`}
                >
                  Home
                </button>
                <button
                  onClick={() => setSelectedCategory("Experience")}
                  className={`flex-1 px-4 py-3 rounded-md font-medium transition-colors ${
                    selectedCategory === "Experience"
                      ? "bg-[#bfa14a] text-white"
                      : "text-gray-700 hover:bg-white/50"
                  }`}
                >
                  Experience
                </button>
                <button
                  onClick={() => setSelectedCategory("Service")}
                  className={`flex-1 px-4 py-3 rounded-md font-medium transition-colors ${
                    selectedCategory === "Service"
                      ? "bg-[#bfa14a] text-white"
                      : "text-gray-700 hover:bg-white/50"
                  }`}
                >
                  Service
                </button>
              </div>
            </div>

            {/* Listings Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
              {listings
                .filter((listing) => 
                  selectedCategory === "All" || listing.category === selectedCategory
                )
                .map((listing) => (
                <div key={listing.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
                  {/* Listing Image */}
                  <div className="relative h-48 bg-gray-100">
                    <img 
                      src={listing.img || "https://images.unsplash.com/photo-1505691924083-fb6d2ee58f58?q=80&w=1200&auto=format&fit=crop"}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        listing.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {listing.status}
                      </span>
                      {listing.superhost && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-pink-700">
                          Superhost
                        </span>
                      )}
                    </div>
                    <div className="absolute top-3 right-3 flex gap-1">
                      <button 
                        onClick={() => handleEditListing(listing)}
                        className="p-2 bg-white/80 rounded-full hover:bg-white transition"
                        title="Edit Listing"
                      >
                        <FaEdit className="text-gray-600" />
                      </button>
                      <button 
                        onClick={() => handleToggleListingStatus(listing.id)}
                        className="p-2 bg-white/80 rounded-full hover:bg-white transition"
                        title={listing.status === 'Active' ? 'Unpublish' : 'Publish'}
                      >
                        <FaEye className={listing.status === 'Active' ? "text-green-600" : "text-gray-600"} />
                      </button>
                      <button 
                        onClick={() => handleDeleteListing(listing.id)}
                        className="p-2 bg-white/80 rounded-full hover:bg-white transition"
                        title="Delete Listing"
                      >
                        <FaTrash className="text-red-600" />
                      </button>
                    </div>
                  </div>

                  {/* Listing Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg text-gray-900 truncate">{listing.title}</h3>
                      <span className="text-lg font-bold text-green-600">₱{listing.price}</span>
                    </div>
                    
                    <div className="flex items-center gap-1 mb-3">
                      <FaStar className="text-yellow-400" />
                      <span className="text-sm font-medium">{listing.rating}</span>
                      <span className="text-sm text-gray-500">• {listing.location}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                      <span>{listing.category}</span>
                      <span>{listing.bookings} bookings</span>
                    </div>

                    {/* Metrics Row */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{listing.views}</div>
                        <div className="text-xs text-gray-500">Views</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{listing.bookings}</div>
                        <div className="text-xs text-gray-500">Bookings</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-600">₱{(listing.revenue || 0).toLocaleString()}</div>
                        <div className="text-xs text-gray-500">Revenue</div>
          </div>
        </div>

                    {/* Reviews Section */}
                    <div className="mt-4 border-t pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FaStar className="text-yellow-400" />
                          <span className="font-semibold">{listing.rating?.toFixed(1) || "No ratings"}</span>
                          <span className="text-sm text-gray-500">({listing.numReviews || 0} reviews)</span>
                        </div>
                      </div>
                      {listing.reviews && listing.reviews.length > 0 && (
                        <div className="space-y-2 mb-4">
                          {listing.reviews.slice(0, 2).map((review, idx) => (
                            <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <img src={review.guestAvatar} alt={review.guestName} className="w-6 h-6 rounded-full" />
                                <span className="text-sm font-medium">{review.guestName}</span>
                                <div className="flex text-yellow-400">
                                  {[...Array(review.rating)].map((_, i) => (
                                    <FaStar key={i} className="text-xs" />
                                  ))}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600">{review.review}</p>
                              <div className="text-xs text-gray-400 mt-1">
                                {new Date(review.date).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                          {listing.reviews.length > 2 && (
                            <button className="text-sm text-blue-500 hover:underline">
                              View all {listing.reviews.length} reviews
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Publish Button for Draft Listings */}
                    {listing.status === 'Draft' && (
                      <div className="mt-4 pt-4 border-t">
                        <button
                          onClick={() => handleToggleListingStatus(listing.id)}
                          className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 mb-2"
                        >
                          <FaEye />
                          Publish Listing
                        </button>
                        <p className="text-xs text-gray-500 text-center">
                          Publish this listing to make it visible to guests
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4">
                      <button 
                        onClick={() => handleViewReviews(listing)}
                        className="flex-1 bg-yellow-100 text-yellow-700 px-3 py-2 rounded-lg text-sm hover:bg-yellow-200 transition flex items-center justify-center gap-1"
                      >
                        <FaStar className="text-yellow-500" />
                        Reviews ({listing.numReviews || 0})
                      </button>
                      <button 
                        onClick={() => handleEditListing(listing)}
                        className="flex-1 bg-yellow-100 text-pink-700 px-3 py-2 rounded-lg text-sm hover:bg-pink-200 transition"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {listings.filter((listing) => 
              selectedCategory === "All" || listing.category === selectedCategory
            ).length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl shadow-lg">
                <p className="text-gray-500 text-lg mb-2">
                  {selectedCategory === "All" 
                    ? "No listings yet. Create your first listing!" 
                    : `No ${selectedCategory.toLowerCase()} listings found.`}
                </p>
                {selectedCategory !== "All" && (
                  <button
                    onClick={() => setSelectedCategory("All")}
                    className="text-[#bfa14a] hover:underline"
                  >
                    View all listings
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === "calendar" && (
          <div className="space-y-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Booking Calendar</h2>
                <p className="text-gray-600">View your booking schedule and availability</p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => navigateMonth(-1)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition"
                >
                  <FaChevronLeft className="text-gray-600" />
                </button>
                <h3 className="text-lg font-semibold text-gray-900">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <button 
                  onClick={() => navigateMonth(1)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition"
                >
                  <FaChevronRight className="text-gray-600" />
                </button>
              </div>
          </div>
          
            {/* Calendar Grid */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Calendar Header */}
              <div className="grid grid-cols-7 bg-gray-50 border-b">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-4 text-center font-semibold text-gray-600">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7">
                {getCalendarDays().map((day, index) => {
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                  const isToday = day.toDateString() === new Date().toDateString();
                  const isBooked = isDateBooked(day);
                  const dayBookings = getBookingsForDate(day);
                  const checkInBookings = getCheckInBookings(day);
                  const checkOutBookings = getCheckOutBookings(day);
                  
                  return (
                    <div 
                      key={index}
                      className={`min-h-[140px] border-r border-b border-gray-200 p-2 ${
                        !isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'
                      } ${isToday ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium ${
                          isToday ? 'text-blue-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                        }`}>
                          {day.getDate()}
                        </span>
                        <div className="flex gap-1">
                          {checkInBookings.length > 0 && (
                            <div className="w-2 h-2 bg-green-500 rounded-full" title="Check-in"></div>
                          )}
                          {checkOutBookings.length > 0 && (
                            <div className="w-2 h-2 bg-orange-500 rounded-full" title="Check-out"></div>
                          )}
                          {isBooked && checkInBookings.length === 0 && checkOutBookings.length === 0 && (
                            <div className="w-2 h-2 bg-red-500 rounded-full" title="Occupied"></div>
                          )}
                        </div>
                      </div>
                      
                      {/* Check-in Bookings */}
                      {checkInBookings.length > 0 && (
                        <div className="space-y-1 mb-2">
                          {checkInBookings.slice(0, 2).map((booking, idx) => (
                            <div 
                              key={`checkin-${idx}`}
                              className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs truncate border-l-2 border-green-500"
                              title={`Check-in: ${booking.title} - ${booking.guests} guests`}
                            >
                              <div className="font-semibold">✓ {booking.title}</div>
                              <div className="text-xs text-green-600">Check-in</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Check-out Bookings */}
                      {checkOutBookings.length > 0 && (
                        <div className="space-y-1 mb-2">
                          {checkOutBookings.slice(0, 2).map((booking, idx) => (
                            <div 
                              key={`checkout-${idx}`}
                              className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs truncate border-l-2 border-orange-500"
                              title={`Check-out: ${booking.title} - ${booking.guests} guests`}
                            >
                              <div className="font-semibold">→ {booking.title}</div>
                              <div className="text-xs text-orange-600">Check-out</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Occupied Bookings (not check-in/out) */}
                      {dayBookings.length > 0 && checkInBookings.length === 0 && checkOutBookings.length === 0 && (
                        <div className="space-y-1">
                          {dayBookings.slice(0, 2).map((booking, idx) => (
                            <div 
                              key={`occupied-${idx}`}
                              className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs truncate border-l-2 border-red-500"
                              title={`Occupied: ${booking.title} - ${booking.guests} guests`}
                            >
                              <div className="font-semibold">● {booking.title}</div>
                              <div className="text-xs text-red-600">Occupied</div>
                            </div>
                          ))}
                          {dayBookings.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{dayBookings.length - 2} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Booking Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <FaCalendarCheck className="text-red-600" />
              </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Booked Dates</h3>
                    <p className="text-sm text-gray-600">Currently occupied</p>
              </div>
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {getBookedDates().size}
                </div>
                <div className="text-sm text-gray-500">days this month</div>
            </div>

              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <FaCalendarAlt className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Available</h3>
                    <p className="text-sm text-gray-600">Open for booking</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() - getBookedDates().size}
                </div>
                <div className="text-sm text-gray-500">days this month</div>
              </div>

              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FaChartBar className="text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Total Bookings</h3>
                    <p className="text-sm text-gray-600">This month</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {bookings.length}
                </div>
                <div className="text-sm text-gray-500">reservations</div>
              </div>
            </div>
          </div>
        )}

        {/* Earnings/Wallet Tab */}
        {activeTab === "earnings" && (
          <div className="space-y-6">
            {/* Wallet Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Wallet & Earnings</h2>
                <p className="text-gray-600">Manage your earnings and withdrawals</p>
              </div>
            </div>

            {/* Wallet Balance Card */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-8 text-white">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-green-100 text-sm font-medium mb-2">Available Balance</p>
                  <h3 className="text-4xl font-bold">₱{walletBalance.toLocaleString()}</h3>
                </div>
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <FaWallet className="text-3xl" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-green-100 text-xs mb-1">Total Earnings</p>
                  <p className="text-xl font-bold">₱{dashboard.totalEarnings.toLocaleString()}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-green-100 text-xs mb-1">This Month</p>
                  <p className="text-xl font-bold">₱{dashboard.monthlyRevenue.toLocaleString()}</p>
                </div>
              </div>

              <button
                onClick={() => setShowWithdrawModal(true)}
                className="w-full bg-white text-green-600 px-6 py-3 rounded-lg hover:bg-green-50 transition font-semibold flex items-center justify-center gap-2"
              >
                <FaCreditCard />
                Withdraw Funds
              </button>
            </div>

            {/* Pending Withdrawal Requests */}
            {withdrawalRequests.filter(r => r.status === 'pending').length > 0 && (
              <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FaClock className="text-yellow-600" />
                    Pending Withdrawal Requests
                  </h3>
                  <span className="text-sm text-gray-600">
                    {withdrawalRequests.filter(r => r.status === 'pending').length} pending
                  </span>
                </div>
                <div className="space-y-3">
                  {withdrawalRequests
                    .filter(r => r.status === 'pending')
                    .map((request) => (
                      <div key={request.id} className="bg-white rounded-lg p-4 border border-yellow-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">₱{request.amount?.toLocaleString()}</p>
                            <p className="text-sm text-gray-600">To: {request.method || 'PayPal'}</p>
                            {request.paypalEmail && (
                              <p className="text-sm text-blue-600">PayPal: {request.paypalEmail}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              Requested: {request.requestedAt?.toDate ? 
                                request.requestedAt.toDate().toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 
                                request.createdAt ? 
                                new Date(request.createdAt).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 'N/A'}
                            </p>
                          </div>
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                            Pending Approval
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Approved/Completed Withdrawal Requests */}
            {withdrawalRequests.filter(r => r.status === 'approved').length > 0 && (
              <div className="bg-green-50 border-l-4 border-green-500 rounded-xl shadow-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FaCheckCircle className="text-green-600" />
                    Approved Withdrawals
                  </h3>
                  <span className="text-sm text-gray-600">
                    {withdrawalRequests.filter(r => r.status === 'approved').length} completed
                  </span>
                </div>
                <div className="space-y-3">
                  {withdrawalRequests
                    .filter(r => r.status === 'approved')
                    .slice(0, 5) // Show last 5 approved withdrawals
                    .map((request) => (
                      <div key={request.id} className="bg-white rounded-lg p-4 border border-green-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">₱{request.amount?.toLocaleString()}</p>
                            <p className="text-sm text-gray-600">To: {request.method || 'PayPal'}</p>
                            {request.paypalEmail && (
                              <p className="text-sm text-blue-600">PayPal: {request.paypalEmail}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              Approved: {request.approvedAt?.toDate ? 
                                request.approvedAt.toDate().toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 
                                request.updatedAt?.toDate ?
                                request.updatedAt.toDate().toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 'N/A'}
                            </p>
                            {request.payoutBatchId && (
                              <p className="text-xs text-gray-400 mt-1">
                                Batch ID: {request.payoutBatchId}
                              </p>
                            )}
                          </div>
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                            Approved
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                    <p className="text-2xl font-bold text-gray-900">{transactions.length + bookingTransactions.length}</p>
                  </div>
                  <FaHistory className="text-3xl text-blue-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ₱{(() => {
                        const earningsFromTransactions = transactions.filter(t => t.type === 'earning').reduce((sum, t) => sum + (t.amount || 0), 0);
                        const earningsFromBookings = bookingTransactions.filter(t => t.type === 'booking').reduce((sum, t) => sum + (t.amount || 0), 0);
                        return earningsFromTransactions + earningsFromBookings;
                      })().toLocaleString()}
                    </p>
                  </div>
                  <FaMoneyBillWave className="text-3xl text-green-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Withdrawals</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ₱{transactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                    </p>
                  </div>
                  <FaCreditCard className="text-3xl text-purple-500" />
                </div>
              </div>
            </div>

            {/* Transaction History */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Transaction History</h3>
                <div className="flex items-center gap-2">
                  <FaHistory className="text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {transactions.length + bookingTransactions.length} transactions
                  </span>
                </div>
              </div>

              {(() => {
                // Combine regular transactions and booking transactions
                const allTransactions = [
                  ...transactions.map(t => ({ ...t, source: 'transaction' })),
                  ...bookingTransactions.map(t => ({ ...t, source: 'booking' }))
                ].sort((a, b) => {
                  const dateA = a.date?.toDate ? a.date.toDate() : 
                               a.date ? new Date(a.date) : 
                               a.createdAt ? new Date(a.createdAt) : new Date(0);
                  const dateB = b.date?.toDate ? b.date.toDate() : 
                               b.date ? new Date(b.date) : 
                               b.createdAt ? new Date(b.createdAt) : new Date(0);
                  return dateB - dateA; // Most recent first
                });

                return allTransactions.length > 0 ? (
                  <div className="space-y-3">
                    {allTransactions.slice(0, 20).map((transaction) => {
                      const transactionType = transaction.type || transaction.displayType || 'transaction';
                      const isPositive = (transaction.amount || 0) >= 0;
                      const amount = Math.abs(transaction.amount || 0);
                      
                      return (
                        <div 
                          key={transaction.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              transactionType === 'earning' || transactionType === 'booking' || transactionType === 'cancellation-payout' ? 'bg-green-100' : 
                              transactionType === 'cancellation' ? 'bg-red-100' : 
                              'bg-blue-100'
                            }`}>
                              {transactionType === 'booking' ? <FaCalendarCheck className="text-green-500" /> :
                               transactionType === 'cancellation-payout' ? <FaMoneyBillWave className="text-green-500" /> :
                               transactionType === 'cancellation' ? <FaTimes className="text-red-500" /> :
                               getTransactionIcon(transactionType)}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">
                                {transaction.displayType || transaction.description || transactionType}
                              </p>
                              {transaction.guestName && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Guest: {transaction.guestName} • {transaction.listingTitle || ''}
                                </p>
                              )}
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span>{(() => {
                                  let dateValue = transaction.date;
                                  if (dateValue?.toDate) {
                                    dateValue = dateValue.toDate();
                                  } else if (typeof dateValue === 'string') {
                                    dateValue = new Date(dateValue);
                                  } else if (!dateValue && transaction.createdAt) {
                                    dateValue = transaction.createdAt;
                                    if (typeof dateValue === 'string') {
                                      dateValue = new Date(dateValue);
                                    }
                                  }
                                  if (!dateValue || isNaN(new Date(dateValue).getTime())) {
                                    return 'N/A';
                                  }
                                  return new Date(dateValue).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  });
                                })()}</span>
                                <span>•</span>
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  transaction.status === 'completed' ? 'bg-green-100 text-green-700' : 
                                  transaction.status === 'processing' ? 'bg-yellow-100 text-yellow-700' : 
                                  transaction.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {transaction.status || 'completed'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${
                              isPositive ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {isPositive ? '+' : '-'}₱{amount.toLocaleString()}
                            </p>
                            {transaction.method && (
                              <p className="text-xs text-gray-500">{transaction.method}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FaWallet className="text-6xl mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold mb-2">No Transactions Yet</h3>
                    <p className="text-sm">Your transaction history will appear here</p>
                    <p className="text-sm">Start earning by accepting bookings!</p>
                  </div>
                );
              })()}
            </div>

            {/* Payment Methods Info */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Withdrawal Methods</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentMethods.filter(p => p.status === 'Active').map((method) => (
                  <div key={method.id} className="border rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FaCreditCard className="text-2xl text-blue-500" />
                      <div>
                        <p className="font-semibold text-gray-900">{method.type}</p>
                        <p className="text-sm text-gray-600">{method.account}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      {method.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Withdraw Modal */}
        {showWithdrawModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-4 md:p-8 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Withdraw Funds</h3>
                <button 
                  onClick={() => setShowWithdrawModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition"
                >
                  <FaTimes className="text-gray-600" />
                </button>
              </div>

              <div className="mb-6">
                <div className="bg-green-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600 mb-1">Available Balance</p>
                  <p className="text-3xl font-bold text-green-600">₱{walletBalance.toLocaleString()}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Withdrawal Amount
                    </label>
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Enter amount"
                      min="0"
                      max={walletBalance}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      PayPal Email Address (Sandbox)
                    </label>
                    <input
                      type="email"
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                      className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="your-email@example.com"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter your PayPal Sandbox email address to receive the withdrawal
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdraw}
                  className="flex-1 bg-green-500 text-white px-4 py-3 rounded-lg hover:bg-green-600 transition font-semibold flex items-center justify-center gap-2"
                >
                  <FaCreditCard />
                  Withdraw
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Redeem Points Modal */}
        {showRedeemPointsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-4 md:p-8 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Redeem Points for Cash</h3>
                <button 
                  onClick={() => {
                    setShowRedeemPointsModal(false);
                    setRedeemPointsAmount('');
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 transition"
                >
                  <FaTimes className="text-gray-600" />
                </button>
              </div>

              <div className="mb-6">
                <div className="bg-pink-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600 mb-1">Available Points</p>
                  <p className="text-3xl font-bold text-pink-600">{hostPoints.toLocaleString()}</p>
                  <p className="text-xs text-pink-600 mt-2">
                    Conversion Rate: 10 points = ₱1.00
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Points to Redeem
                    </label>
                    <input
                      type="number"
                      value={redeemPointsAmount}
                      onChange={(e) => setRedeemPointsAmount(e.target.value)}
                      className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="Enter points to redeem"
                      min="10"
                      max={hostPoints}
                      step="10"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum: 10 points (₱1.00)
                    </p>
                  </div>

                  {redeemPointsAmount && parseInt(redeemPointsAmount) > 0 && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">You will receive:</p>
                      <p className="text-2xl font-bold text-blue-600">
                        ₱{(parseInt(redeemPointsAmount) / 10).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {parseInt(redeemPointsAmount).toLocaleString()} points × ₱0.10 per point
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRedeemPointsModal(false);
                    setRedeemPointsAmount('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-300 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRedeemPoints}
                  disabled={!redeemPointsAmount || parseInt(redeemPointsAmount) < 10 || parseInt(redeemPointsAmount) > hostPoints}
                  className="flex-1 bg-pink-500 text-white px-4 py-3 rounded-lg hover:bg-pink-600 transition font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FaGift />
                  Redeem Points
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rewards & Coupons Management Modal */}
        {showRewardsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
            <div className="bg-white rounded-xl shadow-lg p-4 md:p-8 w-full max-w-5xl relative my-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6 sticky top-0 bg-white z-10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                    <FaGift className="text-white text-xl" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Rewards & Coupons</h3>
                    <p className="text-sm text-gray-600">Manage guest rewards and automatic coupon distribution</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowRewardsModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition"
                >
                  <FaTimes className="text-gray-600 text-xl" />
                </button>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-700">Total Coupons</p>
                  <p className="text-3xl font-bold text-blue-900">{coupons.length}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-700">Active Coupons</p>
                  <p className="text-3xl font-bold text-green-900">{coupons.filter(c => c.active).length}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                  <p className="text-sm font-medium text-purple-700">Total Distributed</p>
                  <p className="text-3xl font-bold text-purple-900">
                    {coupons.reduce((sum, c) => sum + c.usedBy.length, 0)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-4">
                  <p className="text-sm font-medium text-pink-700">Host Points</p>
                  <p className="text-3xl font-bold text-pink-900">{hostPoints.toLocaleString()}</p>
                  <p className="text-xs text-pink-600 mt-1">Earn 50 points per booking</p>
                  {hostPoints > 0 && (
                    <button
                      onClick={() => setShowRedeemPointsModal(true)}
                      className="mt-2 w-full bg-pink-500 text-white px-3 py-1.5 rounded-lg hover:bg-pink-600 transition text-sm font-semibold"
                    >
                      Redeem for Cash
                    </button>
                  )}
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                  <p className="text-sm font-medium text-purple-700">Host Level</p>
                  <p className="text-xl font-bold text-purple-900">{hostLevel}</p>
                  <p className="text-xs text-purple-600 mt-1">Based on total bookings</p>
                </div>
              </div>

              {/* Add Coupon Button */}
              <div className="mb-6">
                <button
                  onClick={() => setShowAddCouponModal(true)}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-4 rounded-lg hover:from-pink-600 hover:to-purple-600 transition font-semibold flex items-center justify-center gap-2 shadow-lg"
                >
                  <FaPlus />
                  Create New Coupon
                </button>
              </div>

              {/* How It Works Section */}
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <FaInfoCircle className="text-blue-600" />
                  How Automatic Rewards Work
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Guests automatically receive coupons based on their booking count</li>
                  <li>• Set minimum bookings required for each coupon tier</li>
                  <li>• Guests receive the best available coupon they qualify for</li>
                  <li>• Coupons are stored in their account for future bookings</li>
                </ul>
              </div>

              {/* Coupons List */}
              <div className="space-y-4">
                <h4 className="font-bold text-lg text-gray-900">Your Coupon Tiers</h4>
                {coupons.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {coupons.map((coupon) => (
                      <div 
                        key={coupon.id}
                        className={`border-2 rounded-xl p-5 transition ${
                          coupon.active 
                            ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50' 
                            : 'border-gray-300 bg-gray-50 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h5 className="font-bold text-lg text-gray-900">{coupon.name}</h5>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                coupon.active 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-gray-200 text-gray-600'
                              }`}>
                                {coupon.active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{coupon.description}</p>
                          </div>
                        </div>

                        {/* Discount Badge */}
                        <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg p-3 mb-3">
                          <div className="text-center">
                            <p className="text-3xl font-bold">{coupon.discount}%</p>
                            <p className="text-sm">Discount</p>
                          </div>
                        </div>

                        {/* Coupon Details */}
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Code:</span>
                            <span className="font-mono font-bold text-purple-600">{coupon.code}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Min Bookings:</span>
                            <span className="font-semibold">{coupon.minBookings}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Max Uses:</span>
                            <span className="font-semibold">{coupon.maxUses}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Valid Until:</span>
                            <span className="font-semibold">
                              {new Date(coupon.validUntil).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Distributed:</span>
                            <span className="font-semibold text-green-600">
                              {coupon.usedBy.length} {coupon.usedBy.length === 1 ? 'guest' : 'guests'}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleCouponStatus(coupon.id)}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                              coupon.active
                                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {coupon.active ? (
                              <>
                                <FaToggleOff className="inline mr-1" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <FaToggleOn className="inline mr-1" />
                                Activate
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteCoupon(coupon.id)}
                            className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition text-sm font-medium"
                          >
                            <FaTrash className="inline" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FaGift className="text-6xl mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold mb-2">No Coupons Yet</h3>
                    <p className="text-sm">Create your first coupon to reward your guests!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add Coupon Modal */}
        {showAddCouponModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-lg p-4 md:p-8 w-full max-w-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Create New Coupon</h3>
                <button 
                  onClick={() => setShowAddCouponModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition"
                >
                  <FaTimes className="text-gray-600" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Coupon Name *
                    </label>
                    <input
                      type="text"
                      value={newCoupon.name}
                      onChange={(e) => setNewCoupon({...newCoupon, name: e.target.value})}
                      className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., First Time Guest"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Coupon Code *
                    </label>
                    <input
                      type="text"
                      value={newCoupon.code}
                      onChange={(e) => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
                      className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                      placeholder="e.g., FIRST15"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newCoupon.description}
                    onChange={(e) => setNewCoupon({...newCoupon, description: e.target.value})}
                    className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    rows="2"
                    placeholder="Brief description of this reward"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Discount % *
                    </label>
                    <input
                      type="number"
                      value={newCoupon.discount}
                      onChange={(e) => setNewCoupon({...newCoupon, discount: e.target.value})}
                      className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="15"
                      min="1"
                      max="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Min Bookings
                    </label>
                    <input
                      type="number"
                      value={newCoupon.minBookings}
                      onChange={(e) => setNewCoupon({...newCoupon, minBookings: e.target.value})}
                      className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="1"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Max Uses
                    </label>
                    <input
                      type="number"
                      value={newCoupon.maxUses}
                      onChange={(e) => setNewCoupon({...newCoupon, maxUses: e.target.value})}
                      className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="1"
                      min="1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Valid Until *
                  </label>
                  <input
                    type="date"
                    value={newCoupon.validUntil}
                    onChange={(e) => setNewCoupon({...newCoupon, validUntil: e.target.value})}
                    className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-purple-800">
                    <strong>How it works:</strong> This coupon will be automatically given to guests who complete at least <strong>{newCoupon.minBookings || 1} booking(s)</strong> with you. Each guest can use it up to <strong>{newCoupon.maxUses || 1} time(s)</strong>.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddCouponModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCoupon}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-3 rounded-lg hover:from-pink-600 hover:to-purple-600 transition font-semibold flex items-center justify-center gap-2"
                >
                  <FaPlus />
                  Create Coupon
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Listings & Actions */}
          <div className="space-y-8">

          </div>
          {/* Right: Messages, Calendar, Payments, Profile */}
          <div className="space-y-8">

          </div>
        </div>
      </div>

      {/* Edit Listing Modal */}
      {showEditListing && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg p-4 md:p-8 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowEditListing(false)}
              className="sticky top-2 right-4 float-right text-xl text-gray-400 hover:text-pink-500"
            >
              ×
            </button>
            
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">Edit Listing</h3>
              <p className="text-gray-500">Update your listing information</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Title</label>
                <input
                  type="text"
                  value={newListing.title}
                  onChange={(e) => setNewListing({...newListing, title: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Enter listing title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Category</label>
                  <select
                    value={newListing.category}
                    onChange={(e) => setNewListing({...newListing, category: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="Home">Home</option>
                    <option value="Experience">Experience</option>
                    <option value="Service">Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Price (₱/{newListing.category === 'Home' ? 'night' : newListing.category === 'Service' ? 'session' : 'person'})
                  </label>
                  <input
                    type="number"
                    value={newListing.price}
                    onChange={(e) => setNewListing({...newListing, price: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Location</label>
                <input
                  type="text"
                  value={newListing.location}
                  onChange={(e) => setNewListing({...newListing, location: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Enter location (e.g., Manila, Philippines)"
                />
                {newListing.location && (
                  <div className="mt-3 rounded-lg overflow-hidden border">
                    <div className="relative w-full h-48">
                      <iframe
                        title="Location Map"
                        src={`https://www.google.com/maps?q=${encodeURIComponent(newListing.location)}&z=14&output=embed`}
                        className="w-full h-full"
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                    <div className="p-2 bg-gray-50 text-xs text-gray-600 flex items-center gap-2">
                      <FaMapMarkerAlt className="text-red-500" />
                      <span>{newListing.location}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Image Upload Section */}
              <div>
                <label className="block text-sm font-semibold mb-2">Property Images</label>
                <div className="space-y-3">
                  {/* Upload Button */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-pink-500 transition">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      id="edit-image-upload"
                    />
                    <label htmlFor="edit-image-upload" className="cursor-pointer">
                      <FaCamera className="text-4xl text-gray-400 mx-auto mb-2" />
                      <div className="text-sm text-gray-600">Click to upload images</div>
                      <div className="text-xs text-gray-400 mt-1">JPG, PNG, GIF up to 10MB each</div>
                    </label>
                  </div>

                  {/* Preview Uploaded Images */}
                  {newListing.uploadedImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {newListing.uploadedImages.map((image, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={image} 
                            alt={`Upload ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                          >
                            ×
                          </button>
                          <div className="absolute bottom-1 left-1 bg-white/80 text-xs px-2 py-1 rounded">
                            {index === 0 && "Main"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Conditional Fields Based on Category */}
              {newListing.category === 'Home' && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Max Guests</label>
                    <input
                      type="number"
                      value={newListing.maxGuests}
                      onChange={(e) => setNewListing({...newListing, maxGuests: parseInt(e.target.value)})}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      min="1"
                      max="20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Bedrooms</label>
                    <input
                      type="number"
                      value={newListing.bedrooms}
                      onChange={(e) => setNewListing({...newListing, bedrooms: parseInt(e.target.value)})}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Bathrooms</label>
                    <input
                      type="number"
                      value={newListing.bathrooms}
                      onChange={(e) => setNewListing({...newListing, bathrooms: parseInt(e.target.value)})}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      min="1"
                    />
                  </div>
                </div>
              )}

              {newListing.category === 'Service' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Service Type</label>
                    <input
                      type="text"
                      value={newListing.serviceType || ''}
                      onChange={(e) => setNewListing({...newListing, serviceType: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="e.g., Cleaning, Repair, Consultation"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Duration (hours)</label>
                    <input
                      type="number"
                      value={newListing.duration || ''}
                      onChange={(e) => setNewListing({...newListing, duration: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="e.g., 2"
                      min="0.5"
                      step="0.5"
                    />
                  </div>
                </div>
              )}

              {newListing.category === 'Experience' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Group Size (max)</label>
                      <input
                        type="number"
                        value={newListing.groupSize || ''}
                        onChange={(e) => setNewListing({...newListing, groupSize: parseInt(e.target.value)})}
                        className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        placeholder="e.g., 10"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Duration (hours)</label>
                      <input
                        type="number"
                        value={newListing.duration || ''}
                        onChange={(e) => setNewListing({...newListing, duration: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        placeholder="e.g., 3"
                        min="0.5"
                        step="0.5"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">What's Included</label>
                    <textarea
                      value={newListing.whatsIncluded || ''}
                      onChange={(e) => setNewListing({...newListing, whatsIncluded: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 h-20 resize-none"
                      placeholder="e.g., Equipment, Guide, Meals, Photos"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2">Description</label>
                <textarea
                  value={newListing.description}
                  onChange={(e) => setNewListing({...newListing, description: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 h-24 resize-none"
                  placeholder="Describe your listing... What makes it special?"
                />
              </div>

              {/* Amenities/Features - Different for each category */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  {newListing.category === 'Home' ? 'Amenities' : newListing.category === 'Service' ? 'Service Features' : 'Experience Highlights'}
                </label>
                <div className="space-y-2">
                  <textarea
                    value={Array.isArray(newListing.amenities) ? newListing.amenities.join(', ') : ''}
                    onChange={(e) => setNewListing({...newListing, amenities: e.target.value.split(',').map(item => item.trim())})}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 h-24 resize-none"
                    placeholder={
                      newListing.category === 'Home' 
                        ? "Enter amenities separated by commas (e.g., Wifi, Parking, Kitchen, AC)"
                        : newListing.category === 'Service'
                        ? "Enter service features separated by commas (e.g., Professional, Insured, Same-day Available)"
                        : "Enter highlights separated by commas (e.g., Expert Guide, Photos Included, All Equipment Provided)"
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    {newListing.category === 'Home' && ['Wifi', 'Parking', 'Kitchen', 'AC', 'TV', 'Pool', 'Gym', 'Beach Access', 'Hot Tub', 'BBQ'].map((amenity) => (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => {
                          const currentAmenities = Array.isArray(newListing.amenities) ? newListing.amenities : [];
                          if (!currentAmenities.includes(amenity)) {
                            setNewListing({...newListing, amenities: [...currentAmenities, amenity]});
                          }
                        }}
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700"
                      >
                        + {amenity}
                      </button>
                    ))}
                    {newListing.category === 'Service' && ['Professional', 'Insured', 'Licensed', 'Same-day Available', '24/7 Support', 'Free Consultation', 'Satisfaction Guaranteed'].map((feature) => (
                      <button
                        key={feature}
                        type="button"
                        onClick={() => {
                          const currentAmenities = Array.isArray(newListing.amenities) ? newListing.amenities : [];
                          if (!currentAmenities.includes(feature)) {
                            setNewListing({...newListing, amenities: [...currentAmenities, feature]});
                          }
                        }}
                        className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 rounded-full text-blue-700"
                      >
                        + {feature}
                      </button>
                    ))}
                    {newListing.category === 'Experience' && ['Expert Guide', 'All Equipment', 'Photos Included', 'Meals Provided', 'Hotel Pickup', 'Small Group', 'Beginner Friendly'].map((highlight) => (
                      <button
                        key={highlight}
                        type="button"
                        onClick={() => {
                          const currentAmenities = Array.isArray(newListing.amenities) ? newListing.amenities : [];
                          if (!currentAmenities.includes(highlight)) {
                            setNewListing({...newListing, amenities: [...currentAmenities, highlight]});
                          }
                        }}
                        className="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 rounded-full text-green-700"
                      >
                        + {highlight}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditListing(false)}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveDraft(true)}
                className="flex-1 border border-gray-400 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-100 transition font-semibold flex items-center justify-center gap-2"
              >
                <FaSave />
                Save as Draft
              </button>
              <button
                onClick={handleUpdateListing}
                className="flex-1 bg-yellow-400 text-white px-4 py-3 rounded-lg hover:bg-pink-600 transition font-semibold flex items-center gap-2"
              >
                <FaSave />
                Update Listing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Listing Modal */}
      {showAddListing && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-start justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-xl shadow-lg p-4 md:p-8 w-full max-w-2xl relative my-auto">
            <button
              onClick={() => setShowAddListing(false)}
              className="absolute top-2 right-4 text-xl text-gray-400 hover:text-blue-500"
            >
              ×
            </button>
            
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">Add New Listing</h3>
              <p className="text-gray-500">Create a new hosting listing</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Title</label>
                <input
                  type="text"
                  value={newListing.title}
                  onChange={(e) => setNewListing({...newListing, title: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Enter listing title"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Category</label>
                  <select
                    value={newListing.category}
                    onChange={(e) => setNewListing({...newListing, category: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="Home">Home</option>
                    <option value="Experience">Experience</option>
                    <option value="Service">Service</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">
                    Price (₱/{newListing.category === 'Home' ? 'night' : newListing.category === 'Service' ? 'session' : 'person'})
                  </label>
                  <input
                    type="number"
                    value={newListing.price}
                    onChange={(e) => setNewListing({...newListing, price: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Location</label>
                <input
                  type="text"
                  value={newListing.location}
                  onChange={(e) => setNewListing({...newListing, location: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Enter location (e.g., Manila, Philippines)"
                />
                {newListing.location && (
                  <div className="mt-3 rounded-lg overflow-hidden border">
                    <div className="relative w-full h-48">
                      <iframe
                        title="Location Map"
                        src={`https://www.google.com/maps?q=${encodeURIComponent(newListing.location)}&z=14&output=embed`}
                        className="w-full h-full"
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                    <div className="p-2 bg-gray-50 text-xs text-gray-600 flex items-center gap-2">
                      <FaMapMarkerAlt className="text-red-500" />
                      <span>{newListing.location}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Image Upload Section */}
              <div>
                <label className="block text-sm font-semibold mb-2">Property Images</label>
                <div className="space-y-3">
                  {/* Upload Button */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-pink-500 transition">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <FaCamera className="text-4xl text-gray-400 mx-auto mb-2" />
                      <div className="text-sm text-gray-600">Click to upload images</div>
                      <div className="text-xs text-gray-400 mt-1">JPG, PNG, GIF up to 10MB each</div>
                      <div className="text-xs text-gray-400">Upload multiple images for best results</div>
                    </label>
                  </div>

                  {/* Preview Uploaded Images */}
                  {newListing.uploadedImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {newListing.uploadedImages.map((image, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={image} 
                            alt={`Upload ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            onClick={() => handleRemoveImage(index)}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                          >
                            ×
                          </button>
                          <div className="absolute bottom-1 left-1 bg-white/80 text-xs px-2 py-1 rounded">
                            {index === 0 && "Main"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Conditional Fields Based on Category */}
              {newListing.category === 'Home' && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Max Guests</label>
                    <input
                      type="number"
                      value={newListing.maxGuests}
                      onChange={(e) => setNewListing({...newListing, maxGuests: parseInt(e.target.value)})}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      min="1"
                      max="20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Bedrooms</label>
                    <input
                      type="number"
                      value={newListing.bedrooms}
                      onChange={(e) => setNewListing({...newListing, bedrooms: parseInt(e.target.value)})}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Bathrooms</label>
                    <input
                      type="number"
                      value={newListing.bathrooms}
                      onChange={(e) => setNewListing({...newListing, bathrooms: parseInt(e.target.value)})}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      min="1"
                    />
                  </div>
                </div>
              )}

              {newListing.category === 'Service' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Service Type</label>
                    <input
                      type="text"
                      value={newListing.serviceType || ''}
                      onChange={(e) => setNewListing({...newListing, serviceType: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="e.g., Cleaning, Repair, Consultation"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Duration (hours)</label>
                    <input
                      type="number"
                      value={newListing.duration || ''}
                      onChange={(e) => setNewListing({...newListing, duration: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      placeholder="e.g., 2"
                      min="0.5"
                      step="0.5"
                    />
                  </div>
                </div>
              )}

              {newListing.category === 'Experience' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Group Size (max)</label>
                      <input
                        type="number"
                        value={newListing.groupSize || ''}
                        onChange={(e) => setNewListing({...newListing, groupSize: parseInt(e.target.value)})}
                        className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        placeholder="e.g., 10"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Duration (hours)</label>
                      <input
                        type="number"
                        value={newListing.duration || ''}
                        onChange={(e) => setNewListing({...newListing, duration: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                        placeholder="e.g., 3"
                        min="0.5"
                        step="0.5"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">What's Included</label>
                    <textarea
                      value={newListing.whatsIncluded || ''}
                      onChange={(e) => setNewListing({...newListing, whatsIncluded: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 h-20 resize-none"
                      placeholder="e.g., Equipment, Guide, Meals, Photos"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2">Description</label>
                <textarea
                  value={newListing.description}
                  onChange={(e) => setNewListing({...newListing, description: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 h-24 resize-none"
                  placeholder="Describe your listing... What makes it special?"
                />
              </div>

              {/* Amenities/Features - Different for each category */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  {newListing.category === 'Home' ? 'Amenities' : newListing.category === 'Service' ? 'Service Features' : 'Experience Highlights'}
                </label>
                <div className="space-y-2">
                  <textarea
                    value={Array.isArray(newListing.amenities) ? newListing.amenities.join(', ') : ''}
                    onChange={(e) => setNewListing({...newListing, amenities: e.target.value.split(',').map(item => item.trim())})}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 h-24 resize-none"
                    placeholder={
                      newListing.category === 'Home' 
                        ? "Enter amenities separated by commas (e.g., Wifi, Parking, Kitchen, AC)"
                        : newListing.category === 'Service'
                        ? "Enter service features separated by commas (e.g., Professional, Insured, Same-day Available)"
                        : "Enter highlights separated by commas (e.g., Expert Guide, Photos Included, All Equipment Provided)"
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    {newListing.category === 'Home' && ['Wifi', 'Parking', 'Kitchen', 'AC', 'TV', 'Pool', 'Gym', 'Beach Access', 'Hot Tub', 'BBQ'].map((amenity) => (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => {
                          const currentAmenities = Array.isArray(newListing.amenities) ? newListing.amenities : [];
                          if (!currentAmenities.includes(amenity)) {
                            setNewListing({...newListing, amenities: [...currentAmenities, amenity]});
                          }
                        }}
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700"
                      >
                        + {amenity}
                      </button>
                    ))}
                    {newListing.category === 'Service' && ['Professional', 'Insured', 'Licensed', 'Same-day Available', '24/7 Support', 'Free Consultation', 'Satisfaction Guaranteed'].map((feature) => (
                      <button
                        key={feature}
                        type="button"
                        onClick={() => {
                          const currentAmenities = Array.isArray(newListing.amenities) ? newListing.amenities : [];
                          if (!currentAmenities.includes(feature)) {
                            setNewListing({...newListing, amenities: [...currentAmenities, feature]});
                          }
                        }}
                        className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 rounded-full text-blue-700"
                      >
                        + {feature}
                      </button>
                    ))}
                    {newListing.category === 'Experience' && ['Expert Guide', 'All Equipment', 'Photos Included', 'Meals Provided', 'Hotel Pickup', 'Small Group', 'Beginner Friendly'].map((highlight) => (
                      <button
                        key={highlight}
                        type="button"
                        onClick={() => {
                          const currentAmenities = Array.isArray(newListing.amenities) ? newListing.amenities : [];
                          if (!currentAmenities.includes(highlight)) {
                            setNewListing({...newListing, amenities: [...currentAmenities, highlight]});
                          }
                        }}
                        className="px-3 py-1 text-sm bg-green-100 hover:bg-green-200 rounded-full text-green-700"
                      >
                        + {highlight}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddListing(false)}
                className="flex-1 border border-gray-300 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveDraft(false)}
                className="flex-1 border border-gray-400 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-100 transition font-semibold flex items-center justify-center gap-2"
              >
                <FaSave />
                Save as Draft
              </button>
              <button
                onClick={handleAddNewListing}
                className="flex-1 bg-yellow-400 text-white px-4 py-3 rounded-lg hover:bg-pink-600 transition font-semibold flex items-center gap-2"
              >
                <FaPlus />
                Publish Listing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages Modal */}
      {showMessages && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-start justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-xl shadow-lg p-4 md:p-8 w-full max-w-2xl relative my-auto">
            <button
              onClick={() => setShowMessages(false)}
              className="sticky top-2 right-4 float-right text-xl text-gray-400 hover:text-purple-500"
            >
              ×
            </button>
            
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">Messages</h3>
              <p className="text-gray-500">Communicate with guests and manage conversations</p>
            </div>

            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Guest Inquiry - Cozy Home in Tagaytay</span>
                  <span className="text-xs text-gray-500">2 hours ago</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Hi! Is your place available for this weekend?</p>
                <button className="bg-purple-400 text-white px-3 py-1 rounded text-sm hover:bg-purple-500">
                  Reply
                </button>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Booking Confirmation - Beachfront Experience</span>
                  <span className="text-xs text-gray-900 text-gray-500">1 day ago</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Thank you for accepting my booking!</p>
                <button className="bg-green-400 text-white px-3 py-1 rounded text-sm hover:bg-green-500">
                  View Details
                </button>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Review Notification - Mountain Cabin</span>
                  <span className="text-xs text-gray-900 text-gray-500">3 days ago</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">Guest left a 5-star review!</p>
                <button className="bg-blue-400 text-white px-3 py-1 rounded text-sm hover:bg-blue-500">
                  View Review
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Settings Modal */}
      {showAccountSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-start justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-xl shadow-lg p-4 md:p-8 w-full max-w-2xl relative my-auto">
            <button
              onClick={() => setShowAccountSettings(false)}
              className="absolute top-2 right-4 text-xl text-gray-400 hover:text-blue-500"
            >
              ×
            </button>
            
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">Account Settings</h3>
              <p className="text-gray-500">Manage your profile, preferences, and settings</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profile Section */}
              {showEditProfile ? (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaUser className="text-blue-400" />
                      Edit Profile
                    </div>
                    <button
                      onClick={() => setShowEditProfile(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <FaTimes />
                    </button>
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img
                          src={editProfileData.avatar || "https://via.placeholder.com/100"}
                          alt="Profile"
                          className="w-20 h-20 rounded-full object-cover"
                        />
                        <label className="absolute bottom-0 right-0 bg-blue-500 text-white p-1 rounded-full cursor-pointer hover:bg-blue-600">
                          <FaCamera className="text-sm" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleProfileAvatarChange}
                          />
                        </label>
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          name="name"
                          value={editProfileData.name}
                          onChange={handleProfileInputChange}
                          className="w-full border rounded-lg px-3 py-2 mb-2"
                          placeholder="Your Name"
                        />
                        <input
                          type="tel"
                          name="phone"
                          value={editProfileData.phone}
                          onChange={handleProfileInputChange}
                          className="w-full border rounded-lg px-3 py-2"
                          placeholder="Phone Number"
                        />
                      </div>
                    </div>
                    <div className="relative">
                      <div className="text-sm text-gray-600 mb-2">Email Address:</div>
                      <div className="w-full border rounded-lg px-3 py-2 bg-gray-50 text-gray-700">
                        {auth.currentUser?.email}
                      </div>
                    </div>
                    <button
                      onClick={handleProfileSave}
                      className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <FaUser className="text-blue-400" />
                    Profile Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-4 mb-4">
                      <img
                        src={profile.avatar || "https://via.placeholder.com/100"}
                        alt="Profile"
                        className="w-20 h-20 rounded-full object-cover"
                      />
                      <div>
                        <div><strong>Name:</strong> {profile.name}</div>
                        <div><strong>Email:</strong> {profile.email}</div>
                        <div><strong>Phone:</strong> {profile.phone}</div>
                        <div><strong>Host Rating:</strong> ⭐ {dashboard.hostRating}</div>
                      </div>
                    </div>
                    <button
                      onClick={handleProfileEdit}
                      className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
                    >
                      Edit Profile
                    </button>
                  </div>
                </div>
              )}

              {/* Points & Rewards */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FaGift className="text-pink-400" />
                  Points & Rewards
                </h4>
                <div className="space-y-2 text-sm">
                  <div><strong>Current Points:</strong> {hostPoints.toLocaleString()}</div>
                  <div><strong>Available Coupons:</strong> {coupons.length}</div>
                  <div><strong>Total Earnings:</strong> ₱{dashboard.totalEarnings.toLocaleString()}</div>
                  <div><strong>Level:</strong> {hostLevel}</div>
                  <div><strong>Total Bookings:</strong> {dashboard.totalBookings || 0}</div>
                </div>
              </div>

              {/* Notification Settings */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FaEnvelope className="text-green-400" />
                  Notification Settings
                </h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={profile.preferences.notifications} />
                    Push Notifications
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={profile.preferences.emailUpdates} />
                    Email Updates
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={profile.preferences.smsUpdates} />
                    SMS Updates
                  </label>
                </div>
              </div>

              {/* Download Data Section */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <FaDownload className="text-purple-400" />
                  Download Your Data
                </h4>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 mb-2">
                    Download all your hosting data including listings, bookings, and earnings history.
                  </p>
                  <button 
                    onClick={handleDownloadData}
                    className="w-full bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 flex items-center justify-center gap-2"
                  >
                    <FaDownload />
                    Export to Word
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reviews Modal */}
      {showReviewsModal && selectedListingReviews && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-start justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl relative my-auto">
            <button
              onClick={() => setShowReviewsModal(false)}
              className="sticky top-2 right-4 float-right text-xl text-gray-400 hover:text-pink-500"
            >
              ×
            </button>
            
            <div className="mb-6">
              <h3 className="text-2xl font-bold">Reviews for {selectedListingReviews.title}</h3>
              <div className="flex items-center gap-2 mt-2">
                <FaStar className="text-yellow-400 text-xl" />
                <span className="font-bold text-xl">
                  {selectedListingReviews.rating?.toFixed(1) || "No ratings"}
                </span>
                <span className="text-gray-500">
                  ({selectedListingReviews.numReviews || 0} reviews)
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {selectedListingReviews.reviews?.map((review, idx) => (
                <div key={idx} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <img 
                      src={review.guestAvatar || "https://via.placeholder.com/32"} 
                      alt={review.guestName} 
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-medium">{review.guestName}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(review.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex text-yellow-400 mb-2">
                    {[...Array(review.rating)].map((_, i) => (
                      <FaStar key={i} />
                    ))}
                  </div>
                  <p className="text-gray-700">{review.review}</p>
                </div>
              ))}
              
              {(!selectedListingReviews.reviews || selectedListingReviews.reviews.length === 0) && (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-6xl mb-4">📝</div>
                  <p className="font-medium">No reviews yet</p>
                  <p className="text-sm">Keep providing great service to earn reviews!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* All Bookings Modal */}
      {showAllBookings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">All Bookings</h2>
              <button 
                onClick={() => setShowAllBookings(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition"
              >
                <FaTimes className="text-gray-600" />
              </button>
            </div>

            {bookings.length > 0 ? (
              <div className="space-y-4">
                {bookings
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                  .map((booking) => (
                    <div key={booking.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                            <span className="text-yellow-700 font-semibold">
                              {booking.guestName && booking.guestName !== 'Guest User' ? booking.guestName.split(' ')[0][0] : 
                               booking.guestEmail ? booking.guestEmail.split('@')[0][0].toUpperCase() : 'G'}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {booking.guestName && booking.guestName !== 'Guest User' ? booking.guestName : 
                               booking.guestEmail ? booking.guestEmail.split('@')[0] : 'Guest'}
                            </h3>
                            <p className="text-sm text-gray-600">{booking.title}</p>
                            <p className="text-xs text-gray-500">{booking.location}</p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-bold text-lg text-green-600">
                            ₱{booking.total?.toLocaleString() || booking.price}
                          </p>
                          <p className="text-sm text-gray-600">
                            {booking.guests} guest{booking.guests > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Check-in:</span>
                          <p className="font-medium">
                            {booking.checkIn ? new Date(booking.checkIn).toLocaleDateString('en-US', { 
                              month: 'long', 
                              day: 'numeric', 
                              year: 'numeric' 
                            }) : 'TBD'}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Check-out:</span>
                          <p className="font-medium">
                            {booking.checkOut ? new Date(booking.checkOut).toLocaleDateString('en-US', { 
                              month: 'long', 
                              day: 'numeric', 
                              year: 'numeric' 
                            }) : 'TBD'}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <p className={`font-medium ${
                            booking.status === 'Upcoming' ? 'text-green-600' : 
                            booking.status === 'Completed' ? 'text-gray-600' : 
                            'text-yellow-600'
                          }`}>
                            {booking.status}
                          </p>
                        </div>
                      </div>
                      
                      {booking.notes && booking.notes.trim() && (
                        <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <FaComments className="text-blue-600 text-lg mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <span className="text-blue-800 font-semibold text-sm block mb-2">Special Requests from Guest:</span>
                              <p className="text-sm text-gray-800 whitespace-pre-wrap bg-white rounded p-3 border border-blue-200">{booking.notes}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <FaCalendarAlt className="text-6xl mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">No Bookings Yet</h3>
                <p className="text-sm">Your bookings will appear here when guests make reservations</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages Modal */}
      {showMessages && selectedGuest && (
        <Messages
          isOpen={showMessages}
          onClose={() => {
            setShowMessages(false);
            setSelectedGuest(null);
            setSelectedProperty(null);
          }}
          currentUser={auth.currentUser}
          otherUser={selectedGuest}
          userType="host"
          propertyInfo={selectedProperty}
        />
      )}

      {/* Chat List Modal */}
      {showChatList && (
        <ChatList
          isOpen={showChatList}
          onClose={() => setShowChatList(false)}
          currentUser={auth.currentUser}
          onSelectChat={handleSelectChat}
          userType="host"
        />
      )}

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="fixed top-16 right-4 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[500px] overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FaBell className="text-blue-600" />
                <h3 className="font-bold text-gray-900">Notifications</h3>
              </div>
              <button 
                onClick={() => setShowNotifications(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            {pendingApprovals.length > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {pendingApprovals.length} pending booking{pendingApprovals.length !== 1 ? 's' : ''} require your attention
              </p>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {pendingApprovals.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FaBell className="mx-auto text-4xl text-gray-300 mb-3" />
                <p className="font-medium">No pending approvals</p>
                <p className="text-sm mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y">
                {pendingApprovals.map((booking) => (
                  <div key={booking.id} className="p-4 hover:bg-gray-50 transition">
                    <div className="flex gap-3">
                      <img 
                        src={booking.img || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=100"} 
                        alt={booking.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 truncate">
                              {booking.title}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {booking.guestName || 'Guest'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {booking.displayCheckIn} - {booking.displayCheckOut}
                            </p>
                            <p className="text-sm font-medium text-blue-600 mt-1">
                              ₱{booking.total?.toLocaleString()}
                            </p>
                            {booking.notes && (
                              <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-2">
                                <div className="flex items-start gap-2">
                                  <FaComments className="text-blue-500 text-xs mt-0.5 flex-shrink-0" />
                                  <div className="flex-1">
                                    <div className="text-xs font-semibold text-blue-800 mb-1">Wishlists:</div>
                                    <div className="text-xs text-gray-700 whitespace-pre-wrap">{booking.notes}</div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => {
                              handleApproveBooking(booking);
                              setShowNotifications(false);
                            }}
                            className="flex-1 bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-600 transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              handleDeclineBooking(booking);
                              setShowNotifications(false);
                            }}
                            className="flex-1 bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-600 transition"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {pendingApprovals.length > 0 && (
            <div className="p-3 border-t bg-gray-50">
              <button
                onClick={() => {
                  setActiveTab("bookings");
                  setShowNotifications(false);
                }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All Bookings
              </button>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close notifications */}
      {showNotifications && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowNotifications(false)}
        />
      )}
    </div>
  );
}

export default HostPage;
