import { useState, useEffect } from "react";
import { 
  collection, addDoc, doc, updateDoc, getDocs, query, 
  where, onSnapshot, Timestamp, serverTimestamp, getDoc,
  increment, arrayUnion, setDoc, deleteDoc, orderBy, limit, runTransaction
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { incrementDashboardMetrics } from "./utils/dashboardMetrics";
import { 
  FaHeart, FaSearch, FaWallet, FaListAlt, FaUserCircle, FaStar, FaShareAlt, FaTrash, 
  FaRegCalendarAlt, FaRegCommentDots, FaCamera, FaImages, FaSignOutAlt, FaFilter, FaMapMarkerAlt, 
  FaUsers, FaCalendarAlt, FaPhone, FaEnvelope, FaFacebook, FaTwitter, FaInstagram, 
  FaWhatsapp, FaTelegram, FaCopy, FaEye, FaEyeSlash, FaCog, FaBookmark, FaHistory,
  FaGift, FaThumbsUp, FaLocationArrow, FaWifi, FaCar, FaSwimmingPool, FaUtensils,
  FaTv, FaShower, FaBed, FaParking, FaLock, FaFire, FaSnowflake, FaUmbrella, FaCreditCard,
  FaKey, FaSpinner, FaClock, FaExclamationTriangle, FaBars, FaTimes, FaChevronLeft, FaChevronRight, FaGavel, FaSync
} from "react-icons/fa";
import { updateEmail, sendEmailVerification, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { updateListingMetrics } from "./utils/listingMetrics";
import Messages from "./components/Messages";
import ChatList from "./components/ChatList";
import { PAYPAL_CONFIG, EMAILJS_CANCELLATION_CONFIG } from "./config";
import emailjs from '@emailjs/browser';
import { buildCancellationConfirmationTemplate } from "./utils/emailTemplates";

const ENV_SHARE_ORIGIN =
  typeof process !== "undefined" &&
  process.env &&
  typeof process.env.REACT_APP_PUBLIC_URL === "string" &&
  process.env.REACT_APP_PUBLIC_URL.trim() !== ""
    ? process.env.REACT_APP_PUBLIC_URL.replace(/\/$/, "")
    : null;

const SHARE_ORIGIN_FALLBACK = ENV_SHARE_ORIGIN || "https://stayhub.web.app";

// Date Range Picker Component
const DateRangePicker = ({ checkIn, checkOut, onChange, minDate, bookedDates = [], bookedRanges = [] }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selecting, setSelecting] = useState('checkIn'); // 'checkIn' or 'checkOut'
  const [tempCheckIn, setTempCheckIn] = useState(checkIn || '');
  const [tempCheckOut, setTempCheckOut] = useState(checkOut || '');

  useEffect(() => {
    setTempCheckIn(checkIn || '');
    setTempCheckOut(checkOut || '');
    // Navigate to the month of check-in date if available
    if (checkIn) {
      const checkInDate = new Date(checkIn);
      setCurrentMonth(new Date(checkInDate.getFullYear(), checkInDate.getMonth(), 1));
    }
  }, [checkIn, checkOut]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isDateBooked = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return bookedDates.includes(dateStr);
  };

  const isDateInBookedRange = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return bookedRanges.some(range => {
      const rangeStart = new Date(range.checkIn);
      const rangeEnd = new Date(range.checkOut);
      return date >= rangeStart && date < rangeEnd;
    });
  };

  const isDateDisabled = (date) => {
    if (date < today) return true;
    if (isDateBooked(date)) return true;
    if (isDateInBookedRange(date)) return true;
    if (minDate && date < new Date(minDate)) return true;
    return false;
  };

  const handleDateClick = (date) => {
    if (isDateDisabled(date)) return;

    const dateStr = date.toISOString().split('T')[0];

    if (selecting === 'checkIn') {
      setTempCheckIn(dateStr);
      setTempCheckOut('');
      setSelecting('checkOut');
      onChange({ checkIn: dateStr, checkOut: '' });
    } else {
      // Selecting check-out
      if (dateStr <= tempCheckIn) {
        // If selected date is before or equal to check-in, make it the new check-in
        setTempCheckIn(dateStr);
        setTempCheckOut('');
        onChange({ checkIn: dateStr, checkOut: '' });
      } else {
        setTempCheckOut(dateStr);
        setSelecting('checkIn');
        onChange({ checkIn: tempCheckIn, checkOut: dateStr });
      }
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const isInRange = (date) => {
    if (!tempCheckIn || !tempCheckOut) return false;
    const dateStr = date.toISOString().split('T')[0];
    return dateStr >= tempCheckIn && dateStr <= tempCheckOut;
  };

  const isStartDate = (date) => {
    if (!tempCheckIn) return false;
    return date.toISOString().split('T')[0] === tempCheckIn;
  };

  const isEndDate = (date) => {
    if (!tempCheckOut) return false;
    return date.toISOString().split('T')[0] === tempCheckOut;
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = getDaysInMonth(currentMonth);

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          type="button"
        >
          <FaChevronLeft className="text-gray-600" />
        </button>
        <h3 className="font-semibold text-lg">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          type="button"
        >
          <FaChevronRight className="text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }

          const dateStr = date.toISOString().split('T')[0];
          const disabled = isDateDisabled(date);
          const inRange = isInRange(date);
          const isStart = isStartDate(date);
          const isEnd = isEndDate(date);
          const isToday = dateStr === today.toISOString().split('T')[0];

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => handleDateClick(date)}
              disabled={disabled}
              className={`
                aspect-square rounded-lg text-sm font-medium transition-all
                ${disabled 
                  ? 'text-gray-300 cursor-not-allowed bg-gray-50' 
                  : inRange
                    ? isStart || isEnd
                      ? 'bg-[#bfa14a] text-white font-semibold'
                      : 'bg-[#bfa14a]/20 text-[#bfa14a]'
                    : 'text-gray-700 hover:bg-gray-100'
                }
                ${isToday && !disabled ? 'ring-2 ring-[#bfa14a] ring-offset-1' : ''}
              `}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t text-sm text-gray-600">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-[#bfa14a]"></div>
            <span>Selected dates</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-300"></div>
            <span>Unavailable</span>
          </div>
        </div>
        {tempCheckIn && (
          <div className="mt-2 text-xs">
            <span className="font-semibold">Check-in:</span> {new Date(tempCheckIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {tempCheckOut && (
              <>
                {' • '}
                <span className="font-semibold">Check-out:</span> {new Date(tempCheckOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function GuestPage({ onLogout }) {

  useEffect(() => {
    document.title = "Guest Dashboard - StayHub";
  }, []);

  // Load transaction history from Firestore (real-time listener)
  useEffect(() => {
      const userId = auth.currentUser?.uid;
    if (!userId) return;

          const transactionsRef = collection(db, "transactions");
    const transactionsQuery = query(
            transactionsRef,
            where("userId", "==", userId),
            orderBy("createdAt", "desc"),
      limit(100)
          );
    
    const unsubTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      const loadedTransactions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setTransactions(loadedTransactions);
      console.log('Loaded transactions from Firestore:', loadedTransactions.length);
    }, (error) => {
          console.error('Error loading transactions:', error);
      // If orderBy fails (index might not exist), try without orderBy
      const transactionsQueryFallback = query(
        transactionsRef,
        where("userId", "==", userId),
        limit(100)
      );
      const unsubTransactionsFallback = onSnapshot(transactionsQueryFallback, (snapshot) => {
        const loadedTransactions = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : a.timestamp?.toDate ? a.timestamp.toDate() : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : b.timestamp?.toDate ? b.timestamp.toDate() : new Date(0);
            return dateB - dateA;
          });
        setTransactions(loadedTransactions);
      });
      return () => unsubTransactionsFallback();
    });

    return () => {
      unsubTransactions();
    };
  }, [auth.currentUser?.uid]);

  // Load guest coupons/rewards from Firestore
  useEffect(() => {
    const loadCoupons = async () => {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.log('No user logged in, skipping coupon load');
        return;
      }

      try {
        console.log('Loading coupons for user:', userId);
        const rewardsRef = collection(db, "guestRewards");
        const q = query(
          rewardsRef,
          where("guestId", "==", userId),
          where("isUsed", "==", false)
        );
        const querySnapshot = await getDocs(q);
        console.log('Query returned', querySnapshot.size, 'documents');
        
        const loadedCoupons = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Filter out expired coupons and sort by given date
        const validCoupons = loadedCoupons
          .filter(coupon => new Date(coupon.validUntil) > new Date())
          .sort((a, b) => new Date(b.givenAt) - new Date(a.givenAt));
        
        setMyCoupons(validCoupons);
        console.log('✅ Loaded coupons:', validCoupons.length, validCoupons);
      } catch (error) {
        console.error('❌ Error loading coupons:', error);
        console.error('Full error details:', error.message);
      }
    };

    // Add slight delay to ensure auth is ready
    const timer = setTimeout(loadCoupons, 500);
    return () => clearTimeout(timer);
  }, [auth.currentUser]);

  // Load user profile from Firestore
  useEffect(() => {
    const loadUserProfile = async () => {
      const userId = auth.currentUser?.uid;
      if (userId) {
        try {
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setProfile(prev => ({
              ...prev,
              name: userData.name || "Guest User",
              phone: userData.phone || "Not provided",
              email: userData.email || auth.currentUser?.email || "Loading...",
              avatar: userData.avatar || prev.avatar,
              preferences: userData.preferences || prev.preferences
            }));
            
            // Load PayPal balance from Firestore
            if (userData.paypalBalance !== undefined) {
              const balance = parseFloat(userData.paypalBalance) || 0;
              setPaypalBalance(balance);
              console.log('Loaded PayPal balance from Firestore:', balance);
            } else {
              // Initialize balance to 0 if not set
              setPaypalBalance(0);
              await savePayPalBalance(0);
            }
          } else {
            // Fallback to localStorage if Firestore data doesn't exist
            const saved = localStorage.getItem(`guestProfile_${userId}`);
            if (saved) {
              const savedProfile = JSON.parse(saved);
              setProfile(prev => ({
                ...prev,
                ...savedProfile,
                email: auth.currentUser?.email || "Loading..."
              }));
            }
          }
        } catch (error) {
          console.error("Error loading user profile:", error);
          // Fallback to localStorage on error
          const saved = localStorage.getItem(`guestProfile_${userId}`);
          if (saved) {
            const savedProfile = JSON.parse(saved);
            setProfile(prev => ({
              ...prev,
              ...savedProfile,
              email: auth.currentUser?.email || "Loading..."
            }));
          }
        }
      }
    };

    loadUserProfile();
  }, []);

  // Real-time listener for PayPal balance from Firestore (source of truth)
  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const userRef = doc(db, "users", userId);
    const unsubscribe = onSnapshot(userRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const userData = docSnapshot.data();
        if (userData.paypalBalance !== undefined) {
          const balance = parseFloat(userData.paypalBalance) || 0;
          setPaypalBalance(balance);
          console.log('✅ PayPal balance synced from Firestore (source of truth):', balance);
        } else {
          // Initialize balance to 0 if not set
          setPaypalBalance(0);
          savePayPalBalance(0);
        }
      }
    }, (error) => {
      console.error('❌ Error listening to PayPal balance:', error);
    });

    return () => unsubscribe();
  }, [auth.currentUser?.uid]);

  // Countdown timer for cancellation deadline (updates every second)
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  // Initial listings state setup
  useEffect(() => {
    // Get all active listings from both collections in Firestore
    const listingsRef = collection(db, "listings");
    const hostListingsRef = collection(db, "hostListings");
    
    // Listen to both listings and hostListings collections
    const unsubListings = onSnapshot(
      query(listingsRef, 
        where("status", "==", "Active"),
        where("isDeleted", "!=", true)
      ),
      (snapshot) => {
        const listings = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          source: 'listings'
        }));
        
        // Update firebaseListings state and recompute searchResults
        setFirebaseListings(prev => {
          const prevArr = prev || [];
          // Only keep listings that aren't from the listings collection
          const filtered = prevArr.filter(item => item.source !== 'listings');
          const merged = [...listings, ...filtered];
          
          // Deduplicate by id
          const map = new Map();
          merged.forEach(item => {
            if (!item || !item.id) return;
            if (!map.has(item.id)) map.set(item.id, item);
          });
          const uniqueListings = Array.from(map.values());
          setSearchResults(uniqueListings);
          return uniqueListings;
        });
      }
    );

    const unsubHostListings = onSnapshot(
      query(hostListingsRef, where("status", "==", "Active")),
      (snapshot) => {
        const hostListings = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          source: 'hostListings',
          price: doc.data().pricePerNight || doc.data().price
        }));
        
        // Update firebaseListings state and recompute searchResults
        setFirebaseListings(prev => {
          const prevArr = prev || [];
          // Only keep listings that aren't from the hostListings collection
          const filtered = prevArr.filter(item => item.source !== 'hostListings');
          const merged = [...hostListings, ...filtered];
          
          // Deduplicate by id
          const map = new Map();
          merged.forEach(item => {
            if (!item || !item.id) return;
            if (!map.has(item.id)) map.set(item.id, item);
          });
          const uniqueListings = Array.from(map.values());
          setSearchResults(uniqueListings);
          return uniqueListings;
        });
      }
    );

    return () => {
      unsubListings();
      unsubHostListings();
    };
  }, []);

  // Fetch bookings from Firestore and update booking statuses
  useEffect(() => {
    if (!auth.currentUser) return;

    // Get user's bookings
    const bookingsRef = collection(db, "bookings");
    const q = query(
      bookingsRef, 
      where("guestId", "==", auth.currentUser.uid),
      where("status", "in", ["PendingApproval", "Upcoming", "Completed", "Declined", "CancelledByGuest"]) // Show pending and history
    );

    // Listen for real-time updates
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Clear existing bookings first
      setBookings([]); 

      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0); // Normalize to start of day

      // Get unique bookings based on ID
      const uniqueBookings = new Map();
      
      const bookingsData = snapshot.docs
        .filter(doc => {
          const data = doc.data();
          // Only include bookings that have both checkIn and checkOut dates
          return data.checkIn && data.checkOut;
        })
        .map(doc => {
          const data = doc.data();
          const booking = {
            ...data,
            id: doc.id,
            // Format dates consistently
            checkIn: data.checkIn,
            checkOut: data.checkOut,
            bookingDate: data.bookingDate || new Date().toISOString().split('T')[0]
          };

        // Convert any Firestore timestamps
        if (data.bookingDate?.toDate) {
          booking.bookingDate = data.bookingDate.toDate().toISOString().split('T')[0];
        }

        // Ensure we have valid dates
        try {
          // Format dates in MM/DD/YYYY format
          booking.displayCheckIn = new Date(booking.checkIn).toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
          });
          booking.displayCheckOut = new Date(booking.checkOut).toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
          });
          booking.displayBookingDate = new Date(booking.bookingDate).toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
          });
        } catch (error) {
          console.error('Date formatting error:', error);
          booking.displayCheckIn = 'Invalid Date';
          booking.displayCheckOut = 'Invalid Date';
          booking.displayBookingDate = 'Invalid Date';
        }

        // Preserve status from Firestore (PendingApproval, Declined, CancelledByGuest)
        // Only auto-update to Completed if status is Upcoming and check-in has passed
        if (booking.status === "Upcoming") {
          const checkInDate = new Date(booking.checkIn);
          checkInDate.setHours(0, 0, 0, 0);
          if (checkInDate < currentDate) {
            booking.status = "Completed";
          }
        }
        // Keep original status for PendingApproval, Declined, CancelledByGuest
        return booking;
      });

      // Sort by status priority: PendingApproval > Upcoming > others, then by date
      bookingsData.sort((a, b) => {
        const statusPriority = { "PendingApproval": 1, "Upcoming": 2, "Completed": 3, "Declined": 4, "CancelledByGuest": 5 };
        const aPriority = statusPriority[a.status] || 99;
        const bPriority = statusPriority[b.status] || 99;
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        // Same status, sort by checkIn date (newest first for pending, upcoming first for others)
        return new Date(b.checkIn) - new Date(a.checkIn);
      });
      
      setBookings(bookingsData);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [auth.currentUser]);
  
  
  // Enhanced states for Airbnb-style functionality
  const [favorites, setFavorites] = useState(() => {
    try {
      const userId = auth.currentUser?.uid;
      const saved = localStorage.getItem(`guestFavorites_${userId}`);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error loading favorites:', error);
      return [];
    }
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [search, setSearch] = useState("");
  const [searchWhere, setSearchWhere] = useState("");
  const [searchDates, setSearchDates] = useState({ checkIn: "", checkOut: "" });
  const [searchGuests, setSearchGuests] = useState(1);
  const [firebaseListings, setFirebaseListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [profile, setProfile] = useState({
    name: "Loading...",
    phone: "Loading...",
    email: auth.currentUser?.email || "Loading...",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=100&auto=format&fit=crop&ixlib=rb-4.0.3",
      preferences: { notifications: true, emailUpdates: true, smsUpdates: false }
  });
  const [searchResults, setSearchResults] = useState([]);
  const [showBookingDetails, setShowBookingDetails] = useState(null);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [guestCount, setGuestCount] = useState(2);
  const [dateFilter, setDateFilter] = useState("Any week");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const [showShareModal, setShowShareModal] = useState(null);
  const [showBookingShareModal, setShowBookingShareModal] = useState(null);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [paypalBalance, setPaypalBalance] = useState(0); // PHP balance - will be loaded from Firestore
  const [showPayPalTopUp, setShowPayPalTopUp] = useState(false);
  const [showPayPalTopUpPayment, setShowPayPalTopUpPayment] = useState(false);
  const [showPayPalCashIn, setShowPayPalCashIn] = useState(false);
  const [cashInAmount, setCashInAmount] = useState(0);
  const [customAmount, setCustomAmount] = useState('');
  const [topUpAmount, setTopUpAmount] = useState(0);
  const [showCustomAlert, setShowCustomAlert] = useState(false);
  const [customAlertData, setCustomAlertData] = useState({ type: 'success', title: '', message: '', details: [] });
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [bookingDates, setBookingDates] = useState({ checkIn: '', checkOut: '' });
  const [bookingGuests, setBookingGuests] = useState(1);
  const [bookingNotes, setBookingNotes] = useState('');
  const [showBookingConfirmation, setShowBookingConfirmation] = useState(false);
  const [showPayPalPayment, setShowPayPalPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showMessages, setShowMessages] = useState(false);
  const [showChatList, setShowChatList] = useState(false);
  const [selectedHost, setSelectedHost] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedBookingToRate, setSelectedBookingToRate] = useState(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [isImageGalleryOpen, setIsImageGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryListing, setGalleryListing] = useState(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [deepLinkListingId, setDeepLinkListingId] = useState(null);
  const [platformPolicy, setPlatformPolicy] = useState(null);

  // Edit Profile Modal states
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({ ...profile });
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [emailChangeData, setEmailChangeData] = useState({ newEmail: "", password: "", verificationSent: false });
  const [emailChangeError, setEmailChangeError] = useState("");
  const [emailChangeLoading, setEmailChangeLoading] = useState(false);

  // Coupons & Rewards states
  const [myCoupons, setMyCoupons] = useState([]);
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Open Edit Profile Modal
  const handleProfileEdit = () => {
    setEditProfileData({ ...profile });
    setShowEditProfile(true);
  };

  // Handle input change - excluding email
  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    if (name !== 'email') { // Never update email
      setEditProfileData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Handle avatar change
  const handleProfileAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setEditProfileData((prev) => ({ ...prev, avatar: ev.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Save profile
  const handleProfileSave = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (userId) {
        // Update Firestore (including avatar)
        await updateDoc(doc(db, "users", userId), {
          name: editProfileData.name,
          phone: editProfileData.phone,
          avatar: editProfileData.avatar,
          updatedAt: new Date()
        });
        
        // Update local state
    setProfile(editProfileData);
        
        // Update localStorage as backup
        localStorage.setItem(`guestProfile_${userId}`, JSON.stringify({
          name: editProfileData.name,
          phone: editProfileData.phone,
          avatar: editProfileData.avatar,
          preferences: editProfileData.preferences
        }));
      }
    setShowEditProfile(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      // Still update local state even if Firestore fails
      setProfile(editProfileData);
      setShowEditProfile(false);
    }
  };

  // Helper function to safely render reviews/rating - shows actual rating and review count
  const renderReviewsRating = (listing) => {
    // If it's a listing object with rating and numReviews
    if (typeof listing === 'object' && listing !== null && !Array.isArray(listing)) {
      const rating = listing.rating || 0;
      const numReviews = listing.numReviews || 0;
      
      if (numReviews > 0 && rating > 0) {
        return `${rating.toFixed(1)} (${numReviews} ${numReviews === 1 ? 'review' : 'reviews'})`;
      }
      return 'New listing';
    }
    
    // Legacy support for direct values
    if (Array.isArray(listing)) {
      return listing.length > 0 ? `${listing.length} ${listing.length === 1 ? 'review' : 'reviews'}` : 'New listing';
    }
    if (typeof listing === 'number') {
      return listing > 0 ? listing.toFixed(1) : 'New listing';
    }
    return 'New listing';
  };

  // Star rating component
  const StarRating = ({ rating, onRatingChange }) => {
    const [hover, setHover] = useState(0);
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <FaStar
            key={star}
            className={`text-2xl cursor-pointer transition-colors ${
              (hover || rating) >= star ? 'text-yellow-400' : 'text-gray-300'
            }`}
            onClick={() => onRatingChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
          />
        ))}
      </div>
    );
  };

        // Add to favorites (and save to Firestore)
      const handleAddFavorite = async (listing) => {
        const userId = auth.currentUser?.uid;
        if (!userId) return alert("Please log in to add favorites.");

        const alreadyFav = favorites.find((fav) => fav.id === listing.id);
        if (alreadyFav) return;

        try {
          // Save to Firestore only — let onSnapshot handle UI update
          await setDoc(doc(db, "users", userId, "favorites", listing.id), listing);
          console.log("✅ Favorite added to Firestore");
        } catch (error) {
          console.error("Error adding favorite:", error);
        }
      };

// Remove from favorites (unheart)
const handleRemoveFavorite = async (id) => {
  const userId = auth.currentUser?.uid;
  if (!userId) return;

  try {
    await deleteDoc(doc(db, "users", userId, "favorites", id));
    setFavorites((prev) => prev.filter((fav) => fav.id !== id));
  } catch (error) {
    console.error("Error removing favorite:", error);
  }
};

// Toggle favorite (heart/unheart)
const toggleFavorite = (listing) => {
  if (isFavorited(listing.id)) {
    handleRemoveFavorite(listing.id);
  } else {
    handleAddFavorite(listing);
  }
};

// Check if favorited
const isFavorited = (id) => favorites.some((f) => f.id === id);

// --- Sync favorites from Firestore in real time ---
useEffect(() => {
  const userId = auth.currentUser?.uid;
  if (!userId) return;

  const favRef = collection(db, "users", userId, "favorites");
  const unsub = onSnapshot(favRef, (snapshot) => {
    const favs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setFavorites(favs);
  });

  return () => unsub();
}, [auth.currentUser]);

useEffect(() => {
  const fetchPlatformPolicy = async () => {
    try {
      const policySnap = await getDoc(doc(db, "adminSettings", "platformPolicy"));
      if (policySnap.exists()) {
        const data = policySnap.data();
        setPlatformPolicy({
          cancellation: data.cancellation || "24-hour free cancellation",
          rules: data.rules || "Please follow house guidelines",
          reports: data.reports || "Contact support for assistance",
        });
      } else {
        setPlatformPolicy({
          cancellation: "24-hour free cancellation",
          rules: "Please follow house guidelines",
          reports: "Contact support for assistance",
        });
      }
    } catch (error) {
      console.error("Failed to load platform policy:", error);
    }
  };
  fetchPlatformPolicy();
}, []);

  const buildShareUrl = (type, id) => {
    const origin =
      typeof window !== "undefined" &&
      window.location &&
      typeof window.location.origin === "string"
        ? window.location.origin
        : SHARE_ORIGIN_FALLBACK;
    const queryKey = type === "booking" ? "bookingId" : "listingId";
    return `${origin}/guest?${queryKey}=${encodeURIComponent(id)}`;
  };

  const parseNumber = (value) => {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value === "number" && !Number.isNaN(value)) return value;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return null;
      if (/^-?\d+(\.\d+)?$/g.test(trimmed)) {
        const parsed = Number(trimmed);
        return Number.isNaN(parsed) ? null : parsed;
      }
      const match = trimmed.match(/-?\d+(\.\d+)?/);
      if (match) {
        const parsed = Number(match[0]);
        return Number.isNaN(parsed) ? null : parsed;
      }
    }
    return null;
  };

  const getNumericValue = (listing, keys = [], fallback = null) => {
    if (!listing) return fallback;
    for (const key of keys) {
      if (!(key in listing)) continue;
      const numeric = parseNumber(listing[key]);
      if (numeric !== null) return numeric;
    }
    return fallback;
  };

  const getListingGuestCapacity = (listing) =>
    getNumericValue(listing, ["maxGuests", "guestCapacity", "capacity", "guestsAllowed", "guests"], 1);

  const getListingBedrooms = (listing) =>
    getNumericValue(listing, ["bedrooms", "beds", "rooms", "roomCount"], null);

  const getListingBathrooms = (listing) =>
    getNumericValue(listing, ["bathrooms", "baths", "bathroomCount"], null);

  const formatDuration = (value) => {
    if (!value && value !== 0) return null;
    if (typeof value === "number") {
      return `${value} hour${value === 1 ? "" : "s"}`;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return null;
      if (/^\d+$/g.test(trimmed)) {
        const num = Number(trimmed);
        if (!Number.isNaN(num)) {
          return `${num} hour${num === 1 ? "" : "s"}`;
        }
      }
      return trimmed;
    }
    return null;
  };

  const getListingDuration = (listing) => {
    if (!listing) return null;
    const raw =
      listing.duration ??
      listing.durationLabel ??
      listing.time ??
      listing.experienceDuration ??
      listing.serviceDuration ??
      null;
    return formatDuration(raw);
  };

  const getListingGroupSize = (listing) =>
    getNumericValue(listing, ["groupSize", "maxGroupSize", "capacity", "maxGuests"], null);

  const getListingServiceType = (listing) => {
    if (!listing) return null;
    return (
      listing.serviceType ||
      listing.type ||
      listing.serviceName ||
      listing.serviceCategory ||
      null
    );
  };

  const extractListingImages = (listing) => {
    if (!listing) return [];

    const pushImage = (img, target) => {
      if (!img) return;
      if (typeof img === "string") {
        const trimmed = img.trim();
        if (trimmed) target.push(trimmed);
        return;
      }
      if (typeof img === "object") {
        const candidates = [img.url, img.src, img.path];
        candidates.forEach((candidate) => {
          if (typeof candidate === "string") {
            const trimmed = candidate.trim();
            if (trimmed) target.push(trimmed);
          }
        });
      }
    };

    const collected = [];
    const candidateArrays = [
      listing.uploadedImages,
      listing.images,
      listing.gallery,
      listing.imageGallery,
      listing.media,
      listing.photos,
    ];

    candidateArrays.forEach((arr) => {
      if (Array.isArray(arr)) {
        arr.forEach((item) => pushImage(item, collected));
      }
    });

    pushImage(listing.img, collected);
    pushImage(listing.coverPhoto, collected);
    pushImage(listing.primaryImage, collected);

    const unique = [];
    const seen = new Set();
    collected.forEach((src) => {
      if (!seen.has(src)) {
        seen.add(src);
        unique.push(src);
      }
    });

    return unique;
  };

  const handleOpenImageGallery = (listing, startIndex = 0, fallbackImage = null) => {
    let images = extractListingImages(listing);
    if (images.length === 0 && fallbackImage) {
      images = [fallbackImage];
    }
    if (images.length === 0) {
      alert("No images available for this listing yet.");
      return;
    }

    const normalizedIndex =
      typeof startIndex === "number" && startIndex >= 0 && startIndex < images.length
        ? startIndex
        : 0;

    setGalleryListing(listing);
    setGalleryImages(images);
    setGalleryIndex(normalizedIndex);
    setIsImageGalleryOpen(true);
  };

  const handleCloseImageGallery = () => {
    setIsImageGalleryOpen(false);
    setGalleryImages([]);
    setGalleryListing(null);
    setGalleryIndex(0);
  };

  const handleGalleryNavigate = (direction) => {
    setGalleryIndex((prev) => {
      if (!galleryImages || galleryImages.length === 0) return 0;
      const nextIndex = (prev + direction + galleryImages.length) % galleryImages.length;
      return nextIndex;
    });
  };

  const handleSelectGalleryImage = (index) => {
    if (!galleryImages || galleryImages.length === 0) return;
    if (index < 0 || index >= galleryImages.length) return;
    setGalleryIndex(index);
  };

  useEffect(() => {
    if (!isImageGalleryOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsImageGalleryOpen(false);
        setGalleryImages([]);
        setGalleryListing(null);
        setGalleryIndex(0);
      } else if (event.key === "ArrowRight" && galleryImages.length > 0) {
        setGalleryIndex((prev) => (prev + 1) % galleryImages.length);
      } else if (event.key === "ArrowLeft" && galleryImages.length > 0) {
        setGalleryIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isImageGalleryOpen, galleryImages.length]);

  // Handle opening the rating modal
  const handleOpenRating = (booking) => {
    setSelectedBookingToRate(booking);
    setRating(0);
    setReview("");
    setShowRatingModal(true);
  };

  // Handle submitting the rating
  const handleSubmitRating = async () => {
    // Validation checks
    if (!selectedBookingToRate) {
      alert("No booking selected");
      return;
    }

    if (rating === 0) {
      alert("Please select a rating (1-5 stars)");
      return;
    }

    if (selectedBookingToRate.hasRated) {
      alert("You have already rated this booking");
      return;
    }

    if (selectedBookingToRate.status !== "Completed") {
      alert("You can only rate completed stays");
      return;
    }

    if (!selectedBookingToRate.listingId) {
      alert("Error: Missing listing information");
      return;
    }

    try {
      // Create a review object
      const reviewObj = {
        rating: rating,
        review: review.trim() || "No review provided",
        guestId: auth.currentUser.uid,
        guestName: profile.name || "Guest",
        guestAvatar: profile.avatar || "",
        date: new Date().toISOString(),
        bookingId: selectedBookingToRate.id,
        propertyTitle: selectedBookingToRate.title,
        checkInDate: selectedBookingToRate.checkIn,
        checkOutDate: selectedBookingToRate.checkOut
      };

      // Get the listing document from Firestore
      const listingRef = doc(db, "hostListings", selectedBookingToRate.listingId);
      const listingDoc = await getDoc(listingRef);

      if (!listingDoc.exists()) {
        throw new Error("Listing not found");
      }

      const listingData = listingDoc.data();
      const currentRating = listingData.rating || 0;
      const currentNumReviews = listingData.numReviews || 0;
      
      // Calculate new average rating
      const newNumReviews = currentNumReviews + 1;
      const newRating = ((currentRating * currentNumReviews) + rating) / newNumReviews;
      
      // Store review in a separate collection to avoid document size limit
      const reviewsRef = collection(db, "reviews");
      const newReviewRef = await addDoc(reviewsRef, {
        ...reviewObj,
        listingId: selectedBookingToRate.listingId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Update the listing document - only store rating and count, not full reviews
      await updateDoc(listingRef, {
        rating: parseFloat(newRating.toFixed(1)),
        numReviews: newNumReviews,
        lastReviewDate: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log(`Updated listing ${selectedBookingToRate.listingId} with new rating: ${newRating.toFixed(1)}`);
      console.log(`Review saved to separate collection: ${newReviewRef.id}`);

      // Update the booking document to mark as rated
      const bookingRef = doc(db, "bookings", selectedBookingToRate.id);
      await updateDoc(bookingRef, {
        hasRated: true,
        rating: rating,
        review: review.trim(),
        reviewId: newReviewRef.id, // Store reference to review
        reviewDate: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log(`Marked booking ${selectedBookingToRate.id} as rated`);

      // Close modal and reset
      setShowRatingModal(false);
      setSelectedBookingToRate(null);
      setRating(0);
      setReview("");
      
      alert("✅ Thank you for your rating! Your feedback helps other guests.");
    } catch (error) {
      console.error("Error submitting rating:", error);
      alert(`Sorry, there was an error submitting your rating: ${error.message}. Please try again.`);
    }
  };

  // update favorite img with selected file (converts to base64)
  const handleFavoriteImageChange = (id, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFavorites((prev) =>
        prev.map((f) => (f.id === id ? { ...f, img: ev.target.result } : f))
      );
    };
    reader.readAsDataURL(file);
  };

  // Search/filter listings
  const handleSearch = () => {
    const pool = getListingsPool();
    if (!search.trim()) {
      setSearchResults(pool);
      return;
    }

    const q = search.toLowerCase();
    const results = pool.filter((l) =>
      (l.title || '').toLowerCase().includes(q) ||
      (l.category || '').toLowerCase().includes(q) ||
      (l.location || '').toLowerCase().includes(q) ||
      (l.host || '').toLowerCase().includes(q)
    );
    setSearchResults(results);
  };


  // View booking details
  const handleViewBookingDetails = (booking) => {
    setShowBookingDetails(booking);
    
    // Update view count for the listing
    const hostListings = JSON.parse(localStorage.getItem("hostListings") || "[]");
    const updatedHostListings = hostListings.map(listing => {
      if (listing.id === booking.id.replace('B-', 'L-')) {
        return {
          ...listing,
          views: (listing.views || 0) + 1
        };
      }
      return listing;
    });
    localStorage.setItem("hostListings", JSON.stringify(updatedHostListings));
  };

  // Close booking details
  const handleCloseBookingDetails = () => {
    setShowBookingDetails(null);
  };

  // Wishlist (favorites) toggle
  const handleShowWishlist = () => {
    setShowWishlist(!showWishlist);
  };

  // Custom Alert Helper
  const showAlert = (type, title, message, details = []) => {
    setCustomAlertData({ type, title, message, details });
    setShowCustomAlert(true);
  };

  // Save transaction to Firestore
  const saveTransaction = async (transactionData) => {
    const userId = auth.currentUser?.uid;
    if (userId) {
      try {
        const transactionsRef = collection(db, "transactions");
        const newTransaction = {
          ...transactionData,
          userId: userId,
          timestamp: serverTimestamp(),
          createdAt: new Date().toISOString()
        };
        await addDoc(transactionsRef, newTransaction);
        console.log('Transaction saved to Firestore:', newTransaction);
        
        // Local state will be updated automatically by the real-time listener
      } catch (error) {
        console.error('Error saving transaction:', error);
      }
    }
  };

  // Sync PayPal balance - Firestore is the source of truth
  // Note: PayPal doesn't provide a direct API to get user balance by email
  // So we use Firestore as the source of truth and update it on every transaction
  const syncPayPalBalance = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.error('Cannot sync PayPal balance: User not authenticated');
      return;
    }

    try {
      // Firestore is the source of truth for balance
      // The balance is updated on every transaction (cash-in, top-up, booking, refund)
      // So we just need to ensure it's loaded from Firestore
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const currentBalance = parseFloat(userData.paypalBalance || 0);
        
        // Update local state to match Firestore
        setPaypalBalance(currentBalance);
        
        console.log('✅ PayPal balance synced from Firestore (source of truth):', currentBalance);
        alert(`Balance synced! Current wallet balance: ₱${currentBalance.toLocaleString()} PHP`);
      } else {
        // User document doesn't exist, initialize balance to 0
        await savePayPalBalance(0);
        alert('Balance initialized to ₱0 PHP');
      }
    } catch (error) {
      console.error('❌ Error syncing PayPal balance:', error);
      alert(`Failed to sync balance: ${error.message}`);
    }
  };

  // Save PayPal balance to Firestore (ensures it's always saved to PayPal account via Firestore)
  const savePayPalBalance = async (newBalance) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.error('Cannot save PayPal balance: User not authenticated');
      return;
    }

    try {
      // Ensure balance is a valid number
      const balance = parseFloat(newBalance) || 0;
      
      // Save to Firestore (this syncs with PayPal Sandbox account)
        await updateDoc(doc(db, "users", userId), {
        paypalBalance: balance,
          updatedAt: serverTimestamp()
        });
      
      console.log('✅ PayPal balance saved to Firestore (synced with PayPal Sandbox):', balance);
      
      // Update local state immediately (real-time listener will also update it)
      setPaypalBalance(balance);
      } catch (error) {
      console.error('❌ Error saving PayPal balance to Firestore:', error);
      // Show user-friendly error
      alert('Failed to save PayPal balance. Please try again.');
    }
  };

  // PayPal Cash-In handler - Show amount selection first
  const handleSelectCashInAmount = (amount) => {
    setCashInAmount(amount);
    setShowPayPalTopUp(false);
    setShowPayPalCashIn(true);
  };

  // Handle custom amount submission
  const handleCustomAmountSubmit = () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount <= 0) {
      showAlert('error', 'Invalid Amount', 'Please enter a valid amount greater than ₱0', [
        'Amount must be a positive number',
        'Minimum: ₱1 PHP'
      ]);
      return;
    }
    if (amount > 1000000) {
      showAlert('error', 'Amount Too Large', 'Maximum amount is ₱1,000,000 PHP', [
        `You entered: ₱${amount.toLocaleString()} PHP`,
        'Please enter a smaller amount'
      ]);
      return;
    }
    handleSelectCashInAmount(amount);
    setCustomAmount('');
  };

  // Process cash-in after successful PayPal payment
  const processCashInAfterPayment = async (transactionId) => {
    try {
      const newBalance = paypalBalance + cashInAmount;
      setPaypalBalance(newBalance);
      await savePayPalBalance(newBalance);
      
      console.log(`✅ Cash-in successful: ₱${cashInAmount.toLocaleString()} PHP. Transaction: ${transactionId}`);
      
      // Save transaction to history
      await saveTransaction({
        type: 'Cash-In',
        amount: cashInAmount,
        currency: 'PHP',
        transactionId: transactionId,
        balanceBefore: paypalBalance,
        balanceAfter: newBalance,
        status: 'Completed',
        description: 'PayPal Cash-In'
      });
      
      // Sync with PayPal Sandbox account after successful payment
      // This ensures the balance in the app matches the actual PayPal account
      try {
        await syncPayPalBalance();
      } catch (syncError) {
        console.warn('Balance sync failed, but payment was successful:', syncError);
        // Don't show error to user if sync fails, payment was successful
      }
      
      setShowPayPalCashIn(false);
      setCashInAmount(0);
      
      // Show custom success alert
      showAlert('success', 'Cash-in successful!', '', [
        `Amount: ₱${cashInAmount.toLocaleString()} PHP`,
        `New Balance: ₱${newBalance.toLocaleString()} PHP`,
        `Transaction ID: ${transactionId}`
      ]);
    } catch (error) {
      console.error('Error processing cash-in:', error);
      showAlert('error', 'Cash-in Failed', 'There was an error adding funds.', [
        `Transaction ID: ${transactionId}`,
        'Please contact support for assistance.'
      ]);
    }
  };

  // PayPal Top-up handler - Show PayPal payment modal
  const handlePayPalTopUp = (amount) => {
    setTopUpAmount(amount);
    setShowPayPalTopUp(false);
    setShowPayPalTopUpPayment(true);
  };

  // Process top-up after successful PayPal payment
  const processTopUpAfterPayment = async (transactionId) => {
    try {
      const newBalance = paypalBalance + topUpAmount;
      setPaypalBalance(newBalance);
      await savePayPalBalance(newBalance);
      
      // Sync with PayPal Sandbox account after successful payment
      // This ensures the balance in the app matches the actual PayPal account
      try {
        await syncPayPalBalance();
      } catch (syncError) {
        console.warn('Balance sync failed, but payment was successful:', syncError);
        // Don't show error to user if sync fails, payment was successful
      }
      
      console.log(`✅ Top-up successful: ₱${topUpAmount.toLocaleString()} PHP. Transaction: ${transactionId}`);
      alert(`✅ Top-up successful!\nAmount: ₱${topUpAmount.toLocaleString()} PHP\nNew Balance: ₱${newBalance.toLocaleString()} PHP\nTransaction ID: ${transactionId}`);
      
      setShowPayPalTopUpPayment(false);
      setTopUpAmount(0);
    } catch (error) {
      console.error('Error processing top-up:', error);
      alert('There was an error adding funds. Please contact support with transaction ID: ' + transactionId);
    }
  };

  // Suggestions & Recommendations (based on previous bookings)
  const getSuggestions = () => {
    // Simple logic: recommend listings not yet booked/favorited
    const bookedIds = bookings.map((b) => b.id.replace("B", "L"));
    const favoriteIds = favorites.map((f) => f.id);
    return listings.filter(l => !bookedIds.includes(l.id) && !favoriteIds.includes(l.id));
  };

  // Enhanced listings with more details for Airbnb-style experience
  const listings = [
    
  ];

  // Available amenities for filtering
  const availableAmenities = [
    { name: "Wifi", icon: FaWifi },
    { name: "Parking", icon: FaCar },
    { name: "Pool", icon: FaSwimmingPool },
    { name: "Kitchen", icon: FaUtensils },
    { name: "AC", icon: FaSnowflake },
    { name: "TV", icon: FaTv },
    { name: "Shower", icon: FaShower },
    { name: "Bed", icon: FaBed },
    { name: "Lock", icon: FaLock },
    { name: "Fireplace", icon: FaFire }
  ];

  // Enhanced functions for Airbnb-style functionality
  
  // Advanced search with filters
  const handleAdvancedSearch = () => {
    const pool = getListingsPool();
    const searchTerm = searchWhere.trim() || search.trim();
    
    let results = pool.filter(listing => {
      // 1. Search by location/title/category
      const matchesSearch = !searchTerm || 
        listing.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.category?.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;
      
      // 2. Category filter
      const matchesCategory = activeCategory === "All" || listing.category === activeCategory;
      if (!matchesCategory) return false;
      
      // 3. Price filter - handle different listing types
      let listingPrice = listing.pricePerNight || listing.price || 0;
      // For Experience and Service, use flat rate
      if (listing.category === "Experience" || listing.category === "Service") {
        listingPrice = listing.price || listing.pricePerNight || 0;
      }
      const matchesPrice = listingPrice >= priceRange[0] && listingPrice <= priceRange[1];
      if (!matchesPrice) return false;
      
      // 4. Guest capacity filter - only apply if searchGuests > 1
      if (searchGuests > 1) {
        const guestCapacity = getListingGuestCapacity(listing);
        const maxGuests = guestCapacity ? parseInt(guestCapacity) : 0;
        const matchesGuests = maxGuests >= searchGuests;
        if (!matchesGuests) return false;
      }
      
      // 5. Amenities filter
      const listingAmenities = listing.amenities || [];
      const matchesAmenities = selectedAmenities.length === 0 || 
        selectedAmenities.every(amenity => listingAmenities.includes(amenity));
      if (!matchesAmenities) return false;
      
      // 6. Date availability filter - only apply if both dates are selected
      if (searchDates.checkIn && searchDates.checkOut) {
        const matchesDates = checkDateAvailability(
          listing.id,
          searchDates.checkIn,
          searchDates.checkOut
        );
        if (!matchesDates) return false;
      }
      
      return true;
    });
    
    setSearchResults(results);
    setSearchQuery(searchTerm);
  };


  // Helper to merge firebaseListings with local `listings` and deduplicate by id
  const getListingsPool = () => {
    const merged = [...(firebaseListings || []), ...(listings || [])];
    const map = new Map();
    merged.forEach(item => {
      if (!item || !item.id) return;
      if (!map.has(item.id)) map.set(item.id, item);
    });
    return Array.from(map.values());
  };

  // Enhanced share functionality
  const handleShare = (item, platform = 'copy') => {
    try {
      // Handle both listing and booking objects
      const isBooking = item && item.id && item.id.startsWith('B-');
      const category = item?.category || 'Property';
      const title = item?.title || 'Unknown Property';
      const location = item?.location || 'Unknown Location';
      const price = item?.pricePerNight || item?.price || 0;
      
      const shareText = isBooking 
        ? `I booked: ${title} in ${location} for ${item.date} - ₱${price}/night`
        : `Check out this ${category.toLowerCase()}: ${title} in ${location} - ₱${price}/night`;
      
      const shareUrl = buildShareUrl(isBooking ? 'booking' : 'listing', item.id);
      
      switch(platform) {
        case 'copy':
          if (navigator.clipboard) {
            navigator.clipboard.writeText(`${shareText}\n${shareUrl}`).then(() => {
              alert("Link copied to clipboard!");
            }).catch(() => {
              alert(`${shareText}\n${shareUrl}`);
            });
          } else {
            alert(`${shareText}\n${shareUrl}`);
          }
          break;
        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`, '_blank');
          break;
        case 'twitter':
          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
          break;
        case 'instagram':
          alert("Share to Instagram: Copy the link and paste in your Instagram story!");
          break;
        case 'whatsapp':
          window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
          break;
        case 'telegram':
          window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
          break;
        default:
          console.warn('Unknown sharing platform:', platform);
      }
      
      if (showShareModal) {
        setShowShareModal(null);
      }
      if (showBookingShareModal) {
        setShowBookingShareModal(null);
      }
    } catch (error) {
      console.error('Error sharing:', error);
      alert('Sorry, there was an error sharing. Please try again.');
    }
  };

  // Enhanced booking share functionality
  const handleBookingShare = (booking, platform = 'copy') => {
    try {
      const shareText = `I just booked: ${booking.title} in ${booking.location} for ${booking.checkIn} to ${booking.checkOut} - ₱${booking.price}/night`;
      const shareUrl = buildShareUrl('booking', booking.id);
      
      switch(platform) {
        case 'copy':
          if (navigator.clipboard) {
            navigator.clipboard.writeText(`${shareText}\n${shareUrl}`).then(() => {
              alert("Booking link copied to clipboard!");
            }).catch(() => {
              alert(`${shareText}\n${shareUrl}`);
            });
          } else {
            alert(`${shareText}\n${shareUrl}`);
          }
          break;
        case 'facebook':
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`, '_blank');
          break;
        case 'twitter':
          window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
          break;
        case 'instagram':
          alert("Share to Instagram: Copy the link and paste in your Instagram story!");
          break;
        case 'whatsapp':
          window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
          break;
        case 'telegram':
          window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`, '_blank');
          break;
        default:
          console.warn('Unknown sharing platform:', platform);
      }
      
      setShowBookingShareModal(null);
    } catch (error) {
      console.error('Error sharing booking:', error);
      alert('Sorry, there was an error sharing your booking. Please try again.');
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const listingParam = params.get('listingId') || params.get('viewListing') || params.get('listing');
      if (listingParam) {
        setDeepLinkListingId(listingParam);
      }
    } catch (error) {
      console.error('Failed to parse share parameters:', error);
    }
  }, []);

  useEffect(() => {
    if (deepLinkListingId) return;
    if (typeof window === "undefined") return;
    try {
      const storedListingId = sessionStorage.getItem("sharedListingId");
      if (storedListingId) {
        setDeepLinkListingId(storedListingId);
        sessionStorage.removeItem("sharedListingId");
      }
    } catch (error) {
      console.error("Failed to restore shared listing id:", error);
    }
  }, [deepLinkListingId]);

  useEffect(() => {
    if (!deepLinkListingId) return;
    const listingsPool = getListingsPool();
    if (!Array.isArray(listingsPool) || listingsPool.length === 0) return;

    const targetListing = listingsPool.find((listing) => {
      if (!listing) return false;
      if (listing.id === deepLinkListingId) return true;
      if (listing.publicListingId && listing.publicListingId === deepLinkListingId) return true;
      if (listing.hostListingId && listing.hostListingId === deepLinkListingId) return true;
      return false;
    });

    if (!targetListing) return;

    const images = extractListingImages(targetListing);
    const fallbackImage = targetListing.img || targetListing.coverPhoto || targetListing.primaryImage || "/images/cozy home.jpg";
    const finalImages = images.length > 0 ? images : [fallbackImage];

    setSelectedListing(targetListing);
    setShowBookingModal(true);
    setGalleryListing(targetListing);
    setGalleryImages(finalImages);
    setGalleryIndex(0);
    setIsImageGalleryOpen(true);
    setBookingGuests(getListingGuestCapacity(targetListing));

    if (typeof window !== 'undefined' && window.history && window.location) {
      const url = new URL(window.location.href);
      ['listingId', 'viewListing', 'listing'].forEach((paramKey) => url.searchParams.delete(paramKey));
      const search = url.searchParams.toString();
      const newUrl = `${url.pathname}${search ? `?${search}` : ''}${url.hash}`;
      window.history.replaceState({}, document.title, newUrl);
    }

    setDeepLinkListingId(null);
  }, [deepLinkListingId, firebaseListings, listings, extractListingImages, getListingsPool, getListingGuestCapacity]);

  // Check PayPal balance before payment
  const checkPayPalBalance = (phpAmount) => {
    if (paypalBalance >= phpAmount) {
      return true;
    } else {
      alert(`Insufficient wallet balance!\nRequired: ₱${phpAmount.toLocaleString()} PHP\nCurrent Balance: ₱${paypalBalance.toLocaleString()} PHP\n\nPlease top up your account.`);
      setShowPayPalTopUp(true);
      return false;
    }
  };

  // Check if dates are available for a listing
  const checkDateAvailability = (listingId, checkInDate, checkOutDate) => {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    
    // Get all bookings for this listing that are active (Upcoming or PendingApproval)
    const listingBookings = bookings.filter(
      b => (b.listingId === listingId || b.id?.includes(listingId)) && 
           (b.status === "Upcoming" || b.status === "PendingApproval")
    );
    
    // Check if requested dates overlap with any existing booking
    for (const booking of listingBookings) {
      const bookedCheckIn = new Date(booking.checkIn);
      const bookedCheckOut = new Date(booking.checkOut);
      
      // Check for date overlap
      if (
        (checkIn >= bookedCheckIn && checkIn < bookedCheckOut) ||
        (checkOut > bookedCheckIn && checkOut <= bookedCheckOut) ||
        (checkIn <= bookedCheckIn && checkOut >= bookedCheckOut)
      ) {
        return false; // Dates are not available
      }
    }
    
    return true; // Dates are available
  };

  // Get booked dates for a listing to disable in calendar
  const getBookedDatesForListing = (listingId) => {
    const listingBookings = bookings.filter(
      b => (b.listingId === listingId || b.id?.includes(listingId)) && 
           (b.status === "Upcoming" || b.status === "PendingApproval")
    );
    
    const bookedDates = [];
    listingBookings.forEach(booking => {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      
      for (let d = new Date(checkIn); d < checkOut; d.setDate(d.getDate() + 1)) {
        bookedDates.push(d.toISOString().split('T')[0]);
      }
    });
    
    return bookedDates;
  };

  // Check if a specific date is booked
  const isDateBooked = (listingId, date) => {
    const bookedDates = getBookedDatesForListing(listingId);
    return bookedDates.includes(date);
  };

  // Get booked date ranges for display
  const getBookedRanges = (listingId) => {
    const listingBookings = bookings.filter(
      b => (b.listingId === listingId || b.id?.includes(listingId)) && 
           (b.status === "Upcoming" || b.status === "PendingApproval")
    );
    
    return listingBookings.map(booking => ({
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      displayCheckIn: booking.displayCheckIn,
      displayCheckOut: booking.displayCheckOut
    }));
  };

  // Booking functionality
  const handleBookListing = (listing) => {
    setSelectedListing(listing);
    setShowBookingModal(true);
    setBookingGuests(getListingGuestCapacity(listing));
    
    try {
      // Set default dates (starting from tomorrow)
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);
      
      setBookingDates({
        checkIn: tomorrow.toISOString().split('T')[0],
        checkOut: dayAfter.toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Error setting initial dates:', error);
      // Set to empty if there's an error
      setBookingDates({ checkIn: '', checkOut: '' });
    }
  };

  const calculateBookingTotal = () => {
    if (!selectedListing) return 0;
    
    const category = selectedListing.category || "Home";
    let subtotal = 0;
    
    if (category === "Experience") {
      const basePrice = selectedListing.pricePerNight || selectedListing.price || 0;
      const duration = getListingDuration(selectedListing);
      const groupSize = getListingGroupSize(selectedListing);
      subtotal = basePrice;
      if (duration) {
        subtotal = basePrice; // Duration included in listing description; price is per experience
      }
      if (groupSize) {
        subtotal = basePrice; // assume price already accounts for group size
      }
    } else if (category === "Service") {
      const basePrice = selectedListing.pricePerNight || selectedListing.price || 0;
      subtotal = basePrice;
    } else {
      // For Home/accommodation: price per night
      if (!bookingDates.checkIn || !bookingDates.checkOut) return 0;
      const checkIn = new Date(bookingDates.checkIn);
      const checkOut = new Date(bookingDates.checkOut);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      subtotal = nights * (selectedListing.pricePerNight || selectedListing.price || 0);
    }
    
    // Apply coupon discount if available
    if (appliedCoupon) {
      const discount = (subtotal * appliedCoupon.discount) / 100;
      return subtotal - discount;
    }
    
    return subtotal;
  };

  const calculateSubtotal = () => {
    if (!selectedListing) return 0;
    
    const category = selectedListing.category || "Home";
    
    if (category === "Experience") {
      const basePrice = selectedListing.pricePerNight || selectedListing.price || 0;
      return basePrice;
    } else if (category === "Service") {
      const basePrice = selectedListing.pricePerNight || selectedListing.price || 0;
      return basePrice;
    } else {
      if (!bookingDates.checkIn || !bookingDates.checkOut) return 0;
      const checkIn = new Date(bookingDates.checkIn);
      const checkOut = new Date(bookingDates.checkOut);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      return nights * (selectedListing.pricePerNight || selectedListing.price || 0);
    }
  };

  const calculateDiscount = () => {
    if (!appliedCoupon) return 0;
    const subtotal = calculateSubtotal();
    return (subtotal * appliedCoupon.discount) / 100;
  };

  const handleApplyCoupon = (coupon) => {
    setAppliedCoupon(coupon);
    setShowRewardsModal(false);
    
    // Calculate potential savings
    const subtotal = calculateSubtotal();
    const discount = (subtotal * coupon.discount) / 100;
    
    if (subtotal > 0) {
      alert(`Coupon applied! You'll save ₱${discount.toLocaleString()} (${coupon.discount}% off)`);
    } else {
      alert(`Coupon "${coupon.couponName}" applied! ${coupon.discount}% discount will be calculated at checkout.`);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
  };

  const handleConfirmBooking = async () => {
    console.log("Starting booking process...");
    
    // Input validation
    // Validate required fields and listing selection  
    if (!selectedListing) {
      alert("No listing selected for booking.");
      return;
    }

    if (!bookingDates.checkIn || !bookingDates.checkOut) {
      alert("Please select both check-in and check-out dates.");
      return;
    }

    // Parse and validate dates
    try {
      const checkInDate = new Date(bookingDates.checkIn);
      const checkOutDate = new Date(bookingDates.checkOut); 
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Validate date objects are valid
      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        throw new Error("Invalid dates selected");
      }

      // Check date constraints
      if (checkInDate < today) {
        alert("Check-in date cannot be in the past.");
        return;
      }

      // Category-specific date validation
      const category = selectedListing.category || "Home";
      
      if (category === "Experience" || category === "Service") {
        // For Experience/Service, check-out can be same day or next day
        if (checkOutDate < checkInDate) {
          alert("End date cannot be before start date.");
          return;
        }
        const daysDiff = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        if (daysDiff > 7) {
          alert(`${category} bookings are limited to 7 days maximum.`);
          return;
        }
      } else {
        // For Home/accommodation, standard validation
        if (checkOutDate <= checkInDate) {
          alert("Check-out date must be after check-in date.");
          return;
        }
        const daysDiff = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        if (daysDiff > 30) {
          alert("Maximum stay duration is 30 days.");
          return;
        }
      }
      
      // Check if dates are available (prevent double booking)
      const isAvailable = checkDateAvailability(
        selectedListing.id,
        bookingDates.checkIn,
        bookingDates.checkOut
      );
      
      if (!isAvailable) {
        alert("Sorry, these dates are not available. Please select different dates.");
        return;
      }
    } catch (error) {
      console.error("Date validation error:", error);
      alert("Invalid dates selected. Please try again.");
      return;
    }

    // Validate user
    if (!auth.currentUser) {
      alert("You must be logged in to make a booking.");
      return;
    }

    const total = calculateBookingTotal();
    if (isNaN(total) || total <= 0) {
      alert("Invalid booking total. Please try again.");
      return;
    }

    // Show PayPal payment modal instead of directly booking
    console.log("Redirecting to PayPal payment...");
    setShowBookingModal(false);
    setPaymentAmount(total);
    setShowPayPalPayment(true);
  };

  const handleCloseBookingConfirmation = () => {
    setShowBookingConfirmation(false);
  };

  // Calculate remaining time until cancellation deadline
  // Uses currentTime state to trigger re-renders every second
  const getCancellationTimeRemaining = (booking) => {
    if (!booking.cancelDeadline) {
      // If no deadline set, calculate from createdAt (24 hours from booking)
      const createdAt = booking.createdAt?.toDate ? booking.createdAt.toDate() : 
                       booking.createdAt ? new Date(booking.createdAt) : 
                       booking.bookingDate?.toDate ? booking.bookingDate.toDate() :
                       booking.bookingDate ? new Date(booking.bookingDate) : null;
      
      if (!createdAt) return null;
      
      const deadline = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);
      const now = currentTime; // Use currentTime state for real-time updates
      const remaining = deadline.getTime() - now.getTime();
      
      if (remaining <= 0) return { expired: true, remaining: 0 };
      
      return {
        expired: false,
        remaining: remaining,
        deadline: deadline
      };
    }
    
    const deadline = booking.cancelDeadline?.toDate ? booking.cancelDeadline.toDate() : 
                    new Date(booking.cancelDeadline);
    const now = currentTime; // Use currentTime state for real-time updates
    const remaining = deadline.getTime() - now.getTime();
    
    if (remaining <= 0) return { expired: true, remaining: 0 };
    
    return {
      expired: false,
      remaining: remaining,
      deadline: deadline
    };
  };

  // Format time remaining as readable string
  const formatTimeRemaining = (ms) => {
    if (ms <= 0) return 'Expired';
    
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Allow guest to cancel a pending booking within 24 hours with 50% refund
  const handleCancelPendingBooking = async (booking) => {
    try {
      if (booking.status !== 'PendingApproval') {
        showAlert('error', 'Cannot Cancel', 'Only pending bookings can be cancelled.', [
          'This booking cannot be cancelled',
          'Contact support for assistance'
        ]);
        return;
      }
      
      const timeRemaining = getCancellationTimeRemaining(booking);
      
      if (!timeRemaining || timeRemaining.expired) {
        showAlert('error', 'Cancellation Expired', 'The 24-hour cancellation window has passed.', [
          'Cancellations are only allowed within 24 hours of booking',
          'Contact support for special requests'
        ]);
        return;
      }

      // Calculate 50% refund
      const totalPaid = booking.total || 0;
      const refundAmount = totalPaid * 0.5; // 50% refund
      
      // Update guest PayPal balance (50% refund)
      const newBalance = paypalBalance + refundAmount;
      setPaypalBalance(newBalance);
      await savePayPalBalance(newBalance);

      // Save refund transaction
      await saveTransaction({
        type: 'Refund',
        amount: refundAmount,
        currency: 'PHP',
        transactionId: `REFUND-${booking.id}`,
        balanceBefore: paypalBalance,
        balanceAfter: newBalance,
        status: 'Completed',
        description: `50% Refund for cancelled booking: ${booking.title || 'Booking'}`,
        listingTitle: booking.title || '',
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        originalBookingId: booking.id
      });

      // Update booking status
      await updateDoc(doc(db, 'bookings', booking.id), {
        status: 'CancelledByGuest',
        cancelledAt: serverTimestamp(),
        refundAmount: refundAmount,
        refundPercentage: 50,
        updatedAt: serverTimestamp()
      });

      // Allocate refunds to host and admin (25% + 25%) - Send to their PayPal accounts
      const hostPayout = refundAmount * 0.5; // 25% of original total (50% of refund)
      const adminPayout = refundAmount * 0.5; // 25% of original total (50% of refund)
      
      try {
        // Helper function to process PayPal payout
        const processPayPalPayout = async (paypalEmail, amountPHP) => {
          try {
            // Parse first, then format
            const parsedAmount = parseFloat(amountPHP);
            if (isNaN(parsedAmount) || parsedAmount <= 0) {
              throw new Error(`Invalid amount: ₱${amountPHP}. Amount must be a positive number.`);
            }
            const amount = parseFloat(parsedAmount.toFixed(2));
            
            if (amount < 0.01) {
              throw new Error(`Invalid amount: ₱${amount}. Minimum payout is ₱0.01 PHP.`);
            }
            
            // Get PayPal access token
            const credentials = btoa(`${PAYPAL_CONFIG.CLIENT_ID}:${PAYPAL_CONFIG.SECRET}`);
            const tokenResponse = await fetch(
              `${PAYPAL_CONFIG.API_BASE_URL}/v1/oauth2/token`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'Accept': 'application/json',
                  'Authorization': `Basic ${credentials}`,
                },
                body: 'grant_type=client_credentials',
              }
            );

            if (!tokenResponse.ok) {
              const errorData = await tokenResponse.json().catch(() => ({}));
              throw new Error(errorData.error_description || errorData.error || 'Failed to get PayPal access token');
            }

            const tokenData = await tokenResponse.json();
            const accessToken = tokenData.access_token;

            // Create payout batch
            const payoutResponse = await fetch(
              `${PAYPAL_CONFIG.API_BASE_URL}/v1/payments/payouts`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  sender_batch_header: {
                    sender_batch_id: `CANCEL-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                    email_subject: 'You have received a cancellation payout from StayHub',
                    email_message: `You have received a cancellation payout of ₱${amountPHP.toLocaleString()} PHP from StayHub.`,
                  },
                  items: [
                    {
                      recipient_type: 'EMAIL',
                      amount: {
                        value: amount.toFixed(2),
                        currency: 'PHP',
                      },
                      receiver: paypalEmail,
                      note: `Cancellation payout from StayHub - ₱${amount.toLocaleString()}`,
                      sender_item_id: `CANCEL-${Date.now()}`,
                    },
                  ],
                }),
              }
            );

            if (!payoutResponse.ok) {
              const errorData = await payoutResponse.json().catch(() => ({}));
              const errorMessage = errorData.message || 
                                errorData.details?.[0]?.description || 
                                errorData.details?.[0]?.issue ||
                                `PayPal API error: ${payoutResponse.status} ${payoutResponse.statusText}`;
              throw new Error(errorMessage);
            }

            const payoutData = await payoutResponse.json();
            const batchHeader = payoutData.batch_header || {};
            const items = payoutData.items || [];
            const firstItem = items[0] || {};
            
            return {
              success: true,
              payoutBatchId: batchHeader.payout_batch_id || `PAYOUT-${Date.now()}`,
              payoutItemId: firstItem.payout_item_id || firstItem.payout_item?.payout_item_id || `ITEM-${Date.now()}`,
              status: batchHeader.batch_status || 'PENDING',
            };
          } catch (error) {
            console.error('PayPal Payout Error:', error);
            throw new Error(error.message || 'Failed to process PayPal payout');
          }
        };

        // Add 25% cancellation share to Host wallet
        if (booking.hostId) {
          try {
            console.log(`💰 Adding ₱${hostPayout.toLocaleString()} (25% cancellation share) to host wallet`);
            
            // Get current host wallet balance
            const hostUserRef = doc(db, "users", booking.hostId);
            const hostUserSnap = await getDoc(hostUserRef);
            let currentBalance = 0;
            
            if (hostUserSnap.exists()) {
              const hostUserData = hostUserSnap.data();
              currentBalance = parseFloat(hostUserData.paypalBalance) || 0;
            }
            
            // Update host wallet balance
            const newHostBalance = currentBalance + hostPayout;
            await updateDoc(hostUserRef, {
              paypalBalance: newHostBalance,
              updatedAt: serverTimestamp()
            });
            
            console.log('✅ Host wallet updated successfully:', {
              hostId: booking.hostId,
              previousBalance: currentBalance,
              amountAdded: hostPayout,
              newBalance: newHostBalance
            });
            
            // Create transaction for host (25% cancellation payout - positive amount)
            await addDoc(collection(db, 'transactions'), {
              userId: booking.hostId,
              type: 'cancellation-payout',
              displayType: 'Cancellation Payout',
              amount: hostPayout, // Positive amount - host receives 25%
              description: `25% Cancellation payout: ${booking.title || 'Booking'} - ${booking.guestName || 'Guest'}`,
              bookingId: booking.id,
              guestName: booking.guestName || 'Guest',
              listingTitle: booking.title || '',
              checkIn: booking.checkIn,
              checkOut: booking.checkOut,
              status: 'completed',
              method: 'Wallet',
              balanceBefore: currentBalance,
              balanceAfter: newHostBalance,
              date: serverTimestamp(),
              createdAt: new Date().toISOString()
            });
            
            // Update host's dashboard metrics
            await incrementDashboardMetrics(booking.hostId, "totalEarnings", hostPayout);
          } catch (hostWalletError) {
            console.error('❌ Error updating host wallet:', hostWalletError);
            console.error('Host wallet error details:', {
              hostId: booking.hostId,
              hostPayout: hostPayout,
              error: hostWalletError.message,
              stack: hostWalletError.stack
            });
            // Still create transaction record but mark as pending
            await addDoc(collection(db, 'transactions'), {
              userId: booking.hostId,
              type: 'cancellation-payout',
              displayType: 'Cancellation Payout',
              amount: hostPayout,
              description: `25% Cancellation payout: ${booking.title || 'Booking'} - ${booking.guestName || 'Guest'} (Wallet update failed: ${hostWalletError.message})`,
              bookingId: booking.id,
              status: 'pending',
              method: 'Wallet',
              date: serverTimestamp(),
              createdAt: new Date().toISOString()
            });
            // Update metrics anyway
            await incrementDashboardMetrics(booking.hostId, "totalEarnings", hostPayout);
          }
        }

        // Send payout to Admin (25%)
        try {
          // Get admin's PayPal email (always gabennewell79@gmail.com)
          const adminPayPalEmail = "gabennewell79@gmail.com";
          
          console.log(`💰 Sending ₱${adminPayout.toLocaleString()} to admin PayPal: ${adminPayPalEmail}`);
          
          // Send actual PayPal payout to admin
          const adminPayoutResult = await processPayPalPayout(adminPayPalEmail, adminPayout);
          
          console.log('✅ Admin PayPal payout successful:', adminPayoutResult);
          
          // Update admin wallet
          const adminWalletRef = doc(db, "adminWallet", "earnings");
          await runTransaction(db, async (tx) => {
            const snap = await tx.get(adminWalletRef);
            if (snap.exists()) {
              const data = snap.data();
              tx.update(adminWalletRef, {
                balance: (Number(data.balance) || 0) + adminPayout,
                totalEarnings: (Number(data.totalEarnings) || 0) + adminPayout,
                lastUpdated: serverTimestamp(),
              });
            } else {
              tx.set(adminWalletRef, {
                balance: adminPayout,
                totalEarnings: adminPayout,
                paypalBalance: 0,
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp(),
              });
            }
          });

          // Create admin transaction for cancellation share (25% - positive amount)
          await addDoc(collection(db, 'adminTransactions'), {
            type: 'cancellation-fee',
            displayType: 'Cancellation Share',
            amount: adminPayout, // Positive amount - admin receives 25%
            bookingId: booking.id,
            hostId: booking.hostId || null,
            hostName: booking.host || 'Host',
            guestName: booking.guestName || 'Guest',
            listingTitle: booking.title || 'Booking',
            description: `25% Cancellation share from booking: ${booking.title || 'Booking'}`,
            method: 'PayPal',
            paypalEmail: adminPayPalEmail,
            payoutBatchId: adminPayoutResult.payoutBatchId,
            payoutItemId: adminPayoutResult.payoutItemId,
            date: serverTimestamp(),
            createdAt: new Date().toISOString(),
            status: 'completed'
          });
        } catch (adminPayoutError) {
          console.error('❌ Error sending admin PayPal payout:', adminPayoutError);
        }
      } catch (refundError) {
        console.error("Failed to allocate cancellation refund to host/admin:", refundError);
      }

      // Send cancellation confirmation email to guest
      try {
        console.log("📧 Attempting to send cancellation confirmation email...");
        
        // Get guest email
        let guestEmail = booking.guestEmail || auth.currentUser?.email;
        let guestName = booking.guestName || profile?.name || "Valued Guest";
        
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
          console.warn("❌ Cannot send cancellation email: No valid guest email found");
        } else {
          // Initialize EmailJS if not already initialized
          emailjs.init(EMAILJS_CANCELLATION_CONFIG.PUBLIC_KEY);

          const cancellationDate = new Date();
          const emailHtml = buildCancellationConfirmationTemplate({
            guestName: guestName,
            bookingId: booking.id,
            listingTitle: booking.title || "Your Booking",
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            guests: booking.guests || booking.numberOfGuests || 1,
            location: booking.location || "",
            cancellationDate: cancellationDate,
            refundAmount: refundAmount,
            guestEmail: guestEmail,
            supportEmail: EMAILJS_CANCELLATION_CONFIG.SUPPORT_EMAIL,
            brandName: EMAILJS_CANCELLATION_CONFIG.BRAND_NAME,
            appUrl: EMAILJS_CANCELLATION_CONFIG.APP_URL || window.location.origin
          });

          const templateParams = {
            to_email: guestEmail.trim(),
            email: guestEmail.trim(),
            customer_name: guestName,
            guest_name: guestName,
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
            cancellation_date: cancellationDate.toLocaleDateString('en-US', { 
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            refund_amount: `₱${refundAmount.toLocaleString()}`,
            message_html: emailHtml
          };

          console.log("Sending cancellation email with EmailJS...");
          console.log("Template ID:", EMAILJS_CANCELLATION_CONFIG.TEMPLATE_ID);
          console.log("Service ID:", EMAILJS_CANCELLATION_CONFIG.SERVICE_ID);
          
          if (!EMAILJS_CANCELLATION_CONFIG.SERVICE_ID || !EMAILJS_CANCELLATION_CONFIG.TEMPLATE_ID) {
            throw new Error(`Missing EmailJS config: serviceId=${!!EMAILJS_CANCELLATION_CONFIG.SERVICE_ID}, templateId=${!!EMAILJS_CANCELLATION_CONFIG.TEMPLATE_ID}`);
          }
          
          const emailResult = await emailjs.send(
            EMAILJS_CANCELLATION_CONFIG.SERVICE_ID,
            EMAILJS_CANCELLATION_CONFIG.TEMPLATE_ID,
            templateParams
          );

          console.log('✅ Cancellation confirmation email sent successfully to', guestEmail);
          console.log('EmailJS Response:', emailResult);
        }
      } catch (emailError) {
        console.error("❌ Error sending cancellation confirmation email:", emailError);
        console.error("Error details:", {
          message: emailError.message,
          text: emailError.text,
          status: emailError.status
        });
        // Don't show error to user - cancellation was successful, email is just a bonus
      }

      // Show success alert
      showAlert('success', 'Booking Cancelled', '50% refund has been processed', [
        `Refund Amount: ₱${refundAmount.toLocaleString()} PHP`,
        `Admin Share: ₱${(refundAmount * 0.5).toLocaleString()}`,
        `Host Share: ₱${hostPayout.toLocaleString()}`,
        `Guest New Balance: ₱${newBalance.toLocaleString()} PHP`
      ]);
      
    } catch (e) {
      console.error('Cancel booking failed:', e);
      showAlert('error', 'Cancellation Failed', 'Failed to cancel booking.', [
        'Please try again',
        'If the problem persists, contact support'
      ]);
    }
  };

  // Messaging functions
  const handleMessageHost = (listing) => {
    setSelectedHost({
      uid: listing.hostId || 'host_' + listing.id,
      displayName: listing.host || listing.hostEmail?.split('@')[0] || 'Host',
      name: listing.host || 'Host',
      email: listing.hostEmail || 'host@stayhub.com'
    });
    setSelectedProperty({
      id: listing.id,
      name: listing.title || listing.name || listing.propertyName || 'Property',
      type: listing.type || 'accommodation',
      location: listing.location || listing.address || 'Location not specified'
    });
    setShowMessages(true);
  };

  // Handle chat selection from chat list
  const handleSelectChat = (otherUser, propertyInfo = null) => {
    // Ensure displayName is set for Messages component compatibility
    setSelectedHost({
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

  // PayPal Integration Functions
  const initializePayPal = () => {
    try {
      const container = document.getElementById('paypal-button-container');
      
      if (!container) {
        console.error('PayPal container not found');
        return;
      }

      if (window.paypal) {
        // Only clear if there's existing content
        if (container.children.length > 0) {
          container.innerHTML = '';
        }
        
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          // Validate paymentAmount first
          const validPaymentAmount = parseFloat(paymentAmount) || 0;
          if (validPaymentAmount <= 0) {
            console.error('Invalid payment amount:', paymentAmount);
            alert('Invalid payment amount. Please try again.');
            setShowPayPalPayment(false);
            return;
          }
          
          // Convert PHP to USD for PayPal API (approximate rate: 1 USD = 56 PHP)
          const usdAmount = parseFloat((validPaymentAmount / 56).toFixed(2));
          
          // Ensure minimum USD amount (PayPal requires at least $0.01)
          const finalUsdAmount = Math.max(0.01, usdAmount);
          
          console.log('Initializing PayPal buttons:', {
            phpAmount: paymentAmount,
            usdAmount: finalUsdAmount,
            container: container ? 'found' : 'not found'
          });
          
          window.paypal.Buttons({
            createOrder: (data, actions) => {
              console.log('Creating PayPal order for ₱' + paymentAmount + ' PHP (USD $' + finalUsdAmount + ')');
              
              return actions.order.create({
                purchase_units: [{
                  amount: {
                    value: finalUsdAmount.toFixed(2),
                    currency_code: 'USD'
                  },
                  description: selectedListing ? `${selectedListing.title} - ${bookingDates.checkIn} to ${bookingDates.checkOut}` : 'StayHub Booking Payment'
                }]
              });
            },
            onApprove: (data, actions) => {
              console.log('PayPal approval received, order ID:', data.orderID);
              return actions.order.capture().then(async (details) => {
                console.log('Payment captured successfully:', details);
                
                try {
                  // PayPal payment is external - no need to deduct from wallet balance
                  // The payment was processed through PayPal, not the wallet
                  
                  // Save transaction to history (for record keeping)
                  await saveTransaction({
                    type: 'Booking Payment',
                    amount: -paymentAmount,
                    currency: 'PHP',
                    transactionId: details.id,
                    balanceBefore: paypalBalance,
                    balanceAfter: paypalBalance, // Balance unchanged - external PayPal payment
                    status: 'Completed',
                    description: selectedListing ? `PayPal Payment for ${selectedListing.title}` : 'PayPal Booking Payment',
                    listingTitle: selectedListing?.title || '',
                    checkIn: bookingDates.checkIn,
                    checkOut: bookingDates.checkOut,
                    paymentMethod: 'PayPal External'
                  });
                  
                  setShowPayPalPayment(false);
                  
                  // Process booking after successful payment
                  await processBookingAfterPayment(details.id);
                  
                  // Show custom success alert
                  showAlert('success', 'Payment successful!', '', [
                    `Transaction ID: ${details.id}`,
                    `Amount: ₱${paymentAmount.toLocaleString()} PHP`,
                    'Payment processed through PayPal'
                  ]);
                } catch (error) {
                  console.error('Error processing PayPal payment:', error);
                  showAlert('error', 'Payment Processed', 'Payment was successful but there was an error processing your booking.', [
                    'Please contact support with transaction ID: ' + details.id
                  ]);
                }
              }).catch((error) => {
                console.error('Error capturing PayPal payment:', error);
                showAlert('error', 'Payment Error', 'There was an error capturing your payment.', [
                  'Please try again',
                  'If the problem persists, contact support'
                ]);
              });
            },
            onError: (err) => {
              console.error('PayPal error:', err);
              setShowPayPalPayment(false);
              showAlert('error', 'Payment Failed', 'There was an error processing your payment.', [
                'Please try again',
                'If the problem persists, contact support'
              ]);
            },
            onCancel: () => {
              console.log('PayPal payment cancelled');
              setShowPayPalPayment(false);
              showAlert('info', 'Payment Cancelled', 'You cancelled the payment.', [
                'No charges were made',
                'You can try again anytime'
              ]);
            }
          }).render('#paypal-button-container').then(() => {
            console.log('PayPal buttons rendered successfully');
            // Hide the loading text when buttons are rendered
            const container = document.getElementById('paypal-button-container');
            const loadingText = container?.querySelector('.text-gray-500');
            if (loadingText) {
              loadingText.style.display = 'none';
            }
          }).catch((error) => {
            console.error('PayPal render error:', error);
            // Suppress generic script errors
            if (error && error.message && !error.message.includes('Script error')) {
              alert('Failed to load payment buttons. Please refresh and try again.');
            }
            // Don't close modal - user can use wallet payment instead
          });
        }, 100);
      } else {
        console.error('PayPal SDK not loaded');
        alert('Payment system not ready. Please refresh and try again.');
        setShowPayPalPayment(false);
      }
    } catch (error) {
      console.error('PayPal initialization error:', error);
      alert('Payment system error. Please try again later.');
      setShowPayPalPayment(false);
    }
  };

  const handlePayPalPayment = (amount, booking = null) => {
    setPaymentAmount(amount);
    setSelectedBooking(booking);
    setShowPayPalPayment(true);
  };

  // Initialize PayPal for Cash-In
  const initializePayPalCashIn = () => {
    try {
      const container = document.getElementById('paypal-cashin-container');
      
      if (!container) {
        console.error('PayPal cash-in container not found');
        return;
      }

      if (window.paypal) {
        if (container.children.length > 0) {
          container.innerHTML = '';
        }
        
        setTimeout(() => {
          window.paypal.Buttons({
            createOrder: (data, actions) => {
              // Convert PHP to USD for PayPal (approximate rate: 1 USD = 56 PHP)
              const usdAmount = parseFloat((cashInAmount / 56).toFixed(2));
              console.log('Creating PayPal cash-in order for ₱' + cashInAmount + ' PHP (USD $' + usdAmount + ')');
              return actions.order.create({
                purchase_units: [{
                  amount: {
                    value: usdAmount.toString(),
                    currency_code: 'USD'
                  },
                  description: `StayHub Cash-In - ₱${cashInAmount.toLocaleString()} PHP`
                }]
              });
            },
            onApprove: (data, actions) => {
              console.log('PayPal cash-in approved...');
              return actions.order.capture().then((details) => {
                console.log('Cash-in payment captured:', details);
                processCashInAfterPayment(details.id);
              });
            },
            onError: (err) => {
              console.error('PayPal cash-in error:', err);
              alert('Cash-in failed. Please try again.');
              setShowPayPalCashIn(false);
            },
            onCancel: () => {
              console.log('PayPal cash-in cancelled');
              alert('Cash-in cancelled');
              setShowPayPalCashIn(false);
            }
          }).render('#paypal-cashin-container').then(() => {
            console.log('PayPal cash-in buttons rendered');
          }).catch((error) => {
            console.error('PayPal cash-in render error:', error);
            // Don't show alert for script errors, just log them
            if (error && error.message && !error.message.includes('Script error')) {
              alert('Failed to load payment buttons. Please try again.');
            }
            // Don't close modal on script errors, let user try again
          });
        }, 100);
      } else {
        console.error('PayPal SDK not loaded');
        alert('Payment system not ready. Please try again.');
        setShowPayPalCashIn(false);
      }
    } catch (error) {
      console.error('PayPal cash-in initialization error:', error);
      alert('Payment system error. Please try again.');
      setShowPayPalCashIn(false);
    }
  };

  // Initialize PayPal for Top-Up
  const initializePayPalTopUp = () => {
    try {
      const container = document.getElementById('paypal-topup-container');
      
      if (!container) {
        console.error('PayPal top-up container not found');
        return;
      }

      if (window.paypal) {
        // Clear existing content
        if (container.children.length > 0) {
          container.innerHTML = '';
        }
        
        setTimeout(() => {
          window.paypal.Buttons({
            createOrder: (data, actions) => {
              // Convert PHP to USD for PayPal (approximate rate: 1 USD = 56 PHP)
              const usdAmount = parseFloat((topUpAmount / 56).toFixed(2));
              console.log('Creating PayPal top-up order for ₱' + topUpAmount + ' PHP (USD $' + usdAmount + ')');
              return actions.order.create({
                purchase_units: [{
                  amount: {
                    value: usdAmount.toString(),
                    currency_code: 'USD'
                  },
                  description: `StayHub PayPal Top-Up - ₱${topUpAmount.toLocaleString()} PHP`
                }]
              });
            },
            onApprove: (data, actions) => {
              console.log('PayPal top-up approved...');
              return actions.order.capture().then((details) => {
                console.log('Top-up payment captured:', details);
                processTopUpAfterPayment(details.id);
              });
            },
            onError: (err) => {
              console.error('PayPal top-up error:', err);
              alert('Top-up failed. Please try again.');
              setShowPayPalTopUpPayment(false);
            },
            onCancel: () => {
              console.log('PayPal top-up cancelled');
              alert('Top-up cancelled');
              setShowPayPalTopUpPayment(false);
            }
          }).render('#paypal-topup-container').then(() => {
            console.log('PayPal top-up buttons rendered');
          }).catch((error) => {
            console.error('PayPal top-up render error:', error);
            // Suppress generic script errors
            if (error && error.message && !error.message.includes('Script error')) {
              alert('Failed to load payment buttons. Please try again.');
            }
            // Don't close modal on script errors
          });
        }, 100);
      } else {
        console.error('PayPal SDK not loaded');
        alert('Payment system not ready. Please try again.');
        setShowPayPalTopUpPayment(false);
      }
    } catch (error) {
      console.error('PayPal top-up initialization error:', error);
      alert('Payment system error. Please try again.');
      setShowPayPalTopUpPayment(false);
    }
  };

  // Process booking after successful PayPal payment
  const processBookingAfterPayment = async (transactionId) => {
    if (!selectedListing || !bookingDates.checkIn || !bookingDates.checkOut) {
      alert("Booking information is missing. Please try again.");
      return;
    }

    try {
      const total = calculateBookingTotal();
      const bookingsRef = collection(db, "bookings");
      
      // Parse dates
      const checkInDate = new Date(bookingDates.checkIn);
      const checkOutDate = new Date(bookingDates.checkOut);
      
      // Determine payment method based on transaction ID
      const isWalletPayment = transactionId.startsWith('WALLET_');
      const paymentMethod = isWalletPayment ? 'Wallet' : 'PayPal';
      
      // Create booking data
      const bookingData = {
        listingId: selectedListing.id,
        title: selectedListing.title,
        category: selectedListing.category || "Home", // Include category for proper handling
        checkIn: checkInDate.toISOString().split('T')[0],
        checkOut: checkOutDate.toISOString().split('T')[0],
        status: "PendingApproval", // Still needs host approval even after payment
        img: selectedListing.img || "",
        location: selectedListing.location,
        amenities: selectedListing.amenities || [],
        reviews: selectedListing.reviews || 0,
        price: selectedListing.pricePerNight || selectedListing.price || 0,
        host: selectedListing.host || "",
        guests: bookingGuests,
        notes: bookingNotes || "",
        total: total,
        subtotal: calculateSubtotal(),
        discount: calculateDiscount(),
        couponApplied: appliedCoupon ? {
          id: appliedCoupon.id,
          code: appliedCoupon.couponCode,
          name: appliedCoupon.couponName,
          discount: appliedCoupon.discount
        } : null,
        paymentMethod: paymentMethod,
        paymentStatus: 'paid', // Payment already completed
        transactionId: transactionId,
        hasRated: false,
        guestId: auth.currentUser.uid,
        guestName: profile.name,
        guestEmail: auth.currentUser.email,
        hostId: selectedListing.hostId || "",
        cancelDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        bookingDate: serverTimestamp(),
        paidAt: serverTimestamp()
      };

      console.log(`Creating booking with ${paymentMethod} transaction:`, transactionId);

      // Add the booking to Firestore
      const newBookingRef = await addDoc(bookingsRef, bookingData);
      console.log("Booking added to Firestore with ID:", newBookingRef.id);

      // Update the booking with its ID
      await updateDoc(newBookingRef, {
        id: newBookingRef.id
      });

      // If payment was via PayPal, send money to host's PayPal account
      if (!isWalletPayment) {
        // Get hostId from listing - check multiple possible fields
        const hostId = selectedListing.hostId || selectedListing.host?.id || (selectedListing.host && typeof selectedListing.host === 'string' ? selectedListing.host : null);
        
        if (!hostId) {
          console.error('❌ Host ID not found in listing:', {
            listingId: selectedListing.id,
            listingData: selectedListing,
            availableFields: Object.keys(selectedListing)
          });
          alert('Error: Host ID not found. Please contact support.');
          return;
        }
        
        console.log('🔍 Host ID found:', hostId);
        
        try {
          // Helper function to process PayPal payout (reuse from cancellation)
          const processPayPalPayout = async (paypalEmail, amountPHP) => {
            try {
              // Parse first, then format
              const parsedAmount = parseFloat(amountPHP);
              if (isNaN(parsedAmount) || parsedAmount <= 0) {
                throw new Error(`Invalid amount: ₱${amountPHP}. Amount must be a positive number.`);
              }
              const amount = parseFloat(parsedAmount.toFixed(2));
              
              if (amount <= 0 || amount < 0.01) {
                throw new Error(`Invalid amount: ₱${amount}. Minimum payout is ₱0.01 PHP.`);
              }
              
              // Get PayPal access token
              const credentials = btoa(`${PAYPAL_CONFIG.CLIENT_ID}:${PAYPAL_CONFIG.SECRET}`);
              const tokenResponse = await fetch(
                `${PAYPAL_CONFIG.API_BASE_URL}/v1/oauth2/token`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                    'Authorization': `Basic ${credentials}`,
                  },
                  body: 'grant_type=client_credentials',
                }
              );

              if (!tokenResponse.ok) {
                const errorData = await tokenResponse.json().catch(() => ({}));
                throw new Error(errorData.error_description || errorData.error || 'Failed to get PayPal access token');
              }

              const tokenData = await tokenResponse.json();
              const accessToken = tokenData.access_token;

              // Create payout batch
              const payoutResponse = await fetch(
                `${PAYPAL_CONFIG.API_BASE_URL}/v1/payments/payouts`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                  },
                  body: JSON.stringify({
                    sender_batch_header: {
                      sender_batch_id: `BOOKING-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                      email_subject: 'You have received a booking payment from StayHub',
                      email_message: `You have received a booking payment of ₱${amountPHP.toLocaleString()} PHP from StayHub.`,
                    },
                    items: [
                      {
                        recipient_type: 'EMAIL',
                        amount: {
                          value: amount.toFixed(2),
                          currency: 'PHP',
                        },
                        receiver: paypalEmail,
                        note: `Booking payment from StayHub - ₱${amount.toLocaleString()}`,
                        sender_item_id: `BOOKING-${Date.now()}`,
                      },
                    ],
                  }),
                }
              );

              if (!payoutResponse.ok) {
                const errorData = await payoutResponse.json().catch(() => ({}));
                const errorMessage = errorData.message || 
                                  errorData.details?.[0]?.description || 
                                  errorData.details?.[0]?.issue ||
                                  `PayPal API error: ${payoutResponse.status} ${payoutResponse.statusText}`;
                throw new Error(errorMessage);
              }

              const payoutData = await payoutResponse.json();
              const batchHeader = payoutData.batch_header || {};
              const items = payoutData.items || [];
              const firstItem = items[0] || {};
              
              return {
                success: true,
                payoutBatchId: batchHeader.payout_batch_id || `PAYOUT-${Date.now()}`,
                payoutItemId: firstItem.payout_item_id || firstItem.payout_item?.payout_item_id || `ITEM-${Date.now()}`,
                status: batchHeader.batch_status || 'PENDING',
              };
            } catch (error) {
              console.error('PayPal Payout Error:', error);
              throw new Error(error.message || 'Failed to process PayPal payout');
            }
          };

          // Get service fee percentage (default 10%)
          let serviceFeePercent = 10;
          try {
            const configRef = doc(db, "adminSettings", "config");
            const configSnap = await getDoc(configRef);
            if (configSnap.exists()) {
              const configData = configSnap.data();
              const parsedFee = Number(configData.serviceFee);
              if (!Number.isNaN(parsedFee) && parsedFee >= 0 && parsedFee <= 100) {
                serviceFeePercent = parsedFee;
              }
            }
          } catch (configError) {
            console.warn("Failed to load service fee config, using default 10%", configError);
          }

          // Calculate host share (90% after 10% admin commission)
          const adminCommission = total * (serviceFeePercent / 100);
          const hostShare = total - adminCommission;

          // Add host earnings to their wallet instead of PayPal payout
          console.log(`💰 Adding ₱${hostShare.toLocaleString()} (${100 - serviceFeePercent}%) to host wallet`);
          
          try {
            // Get current host wallet balance
            const hostUserRef = doc(db, "users", hostId);
            const hostUserSnap = await getDoc(hostUserRef);
            let currentBalance = 0;
            
            if (hostUserSnap.exists()) {
              const hostUserData = hostUserSnap.data();
              currentBalance = parseFloat(hostUserData.paypalBalance) || 0;
            }
            
            // Update host wallet balance
            const newHostBalance = currentBalance + hostShare;
            await updateDoc(hostUserRef, {
              paypalBalance: newHostBalance,
              updatedAt: serverTimestamp()
            });
            
            console.log('✅ Host wallet updated successfully:', {
              hostId: hostId,
              previousBalance: currentBalance,
              amountAdded: hostShare,
              newBalance: newHostBalance
            });
            
            // Create transaction record for host
            await addDoc(collection(db, 'transactions'), {
              userId: hostId,
              type: 'booking-payment',
              displayType: 'Booking Payment Received',
              amount: hostShare,
              description: `Booking payment: ${selectedListing.title || 'Booking'} - ${profile.name || 'Guest'}`,
              bookingId: newBookingRef.id,
              guestName: profile.name,
              listingTitle: selectedListing.title || '',
              checkIn: bookingDates.checkIn,
              checkOut: bookingDates.checkOut,
              status: 'completed',
              method: 'Wallet',
              balanceBefore: currentBalance,
              balanceAfter: newHostBalance,
              date: serverTimestamp(),
              createdAt: new Date().toISOString()
            });
            
            // Update host's dashboard metrics
            await incrementDashboardMetrics(hostId, "totalEarnings", hostShare);
            await incrementDashboardMetrics(hostId, "monthlyRevenue", hostShare);
          } catch (hostWalletError) {
            console.error('❌ Error updating host wallet:', hostWalletError);
            console.error('Host wallet error details:', {
              hostId: hostId,
              hostShare: hostShare,
              error: hostWalletError.message,
              stack: hostWalletError.stack
            });
            alert(`Warning: Payment received but failed to add to host wallet.\n\nError: ${hostWalletError.message}\n\nPlease check console for details.`);
            // Still create transaction record but mark as pending
            await addDoc(collection(db, 'transactions'), {
              userId: hostId,
              type: 'booking-payment',
              displayType: 'Booking Payment Received',
              amount: hostShare,
              description: `Booking payment: ${selectedListing.title || 'Booking'} - ${profile.name || 'Guest'} (Wallet update failed: ${hostWalletError.message})`,
              bookingId: newBookingRef.id,
              status: 'pending',
              method: 'Wallet',
              date: serverTimestamp(),
              createdAt: new Date().toISOString()
            });
            // Update metrics anyway
            await incrementDashboardMetrics(hostId, "totalEarnings", hostShare);
            await incrementDashboardMetrics(hostId, "monthlyRevenue", hostShare);
          }

          // Send admin commission to admin PayPal account
          const adminPayPalEmail = "gabennewell79@gmail.com";
          console.log(`💰 Sending ₱${adminCommission.toLocaleString()} (${serviceFeePercent}% commission) to admin PayPal: ${adminPayPalEmail}`);
          
          const adminPayoutResult = await processPayPalPayout(adminPayPalEmail, adminCommission);
          
          console.log('✅ Admin commission payout successful:', adminPayoutResult);
          
          // Update admin wallet
          const adminWalletRef = doc(db, "adminWallet", "earnings");
          await runTransaction(db, async (tx) => {
            const snap = await tx.get(adminWalletRef);
            if (snap.exists()) {
              const data = snap.data();
              tx.update(adminWalletRef, {
                balance: (Number(data.balance) || 0) + adminCommission,
                totalEarnings: (Number(data.totalEarnings) || 0) + adminCommission,
                lastUpdated: serverTimestamp(),
              });
            } else {
              tx.set(adminWalletRef, {
                balance: adminCommission,
                totalEarnings: adminCommission,
                paypalBalance: 0,
                createdAt: serverTimestamp(),
                lastUpdated: serverTimestamp(),
              });
            }
          });

          // Create admin transaction record
          await addDoc(collection(db, 'adminTransactions'), {
            type: 'commission',
            amount: adminCommission,
            bookingId: newBookingRef.id,
            hostId: hostId,
            serviceFeePercent,
            description: `${serviceFeePercent}% commission from booking: ${selectedListing.title || 'Booking'}`,
            method: 'PayPal',
            paypalEmail: adminPayPalEmail,
            payoutBatchId: adminPayoutResult.payoutBatchId,
            payoutItemId: adminPayoutResult.payoutItemId,
            date: serverTimestamp(),
            status: 'completed'
          });
        } catch (payoutError) {
          console.error('❌ Error sending payouts to host/admin:', payoutError);
          // Don't fail the booking if payout fails - booking is already created
          // The admin can manually process the payout later
        }
      }

      // Mark coupon as used if applied
      if (appliedCoupon) {
        try {
          await updateDoc(doc(db, "guestRewards", appliedCoupon.id), {
            isUsed: true,
            usedAt: serverTimestamp(),
            usedForBooking: newBookingRef.id
          });
          console.log("Coupon marked as used");
          
          // Remove from myCoupons list
          setMyCoupons(prev => prev.filter(c => c.id !== appliedCoupon.id));
          setAppliedCoupon(null);
        } catch (error) {
          console.error("Error marking coupon as used:", error);
        }
      }

      console.log("✅ Booking submitted for host approval with payment completed");
      
      // Close modals and show confirmation
      setShowBookingConfirmation(true);
      
      // Reset form
      setBookingDates({ checkIn: '', checkOut: '' });
      setBookingGuests(2);
      setBookingNotes('');
      setSelectedListing(null);
      
    } catch (error) {
      console.error('Error processing booking after payment:', error);
      alert('There was an error completing your booking. Please contact support with transaction ID: ' + transactionId);
    }
  };

  // Load PayPal SDK
  useEffect(() => {
    if (showPayPalPayment && paymentAmount > 0) {
      // Check if script already exists
      const existingScript = document.querySelector('script[data-paypal-sdk="booking"]');
      
      if (!window.paypal && !existingScript) {
        console.log('Loading PayPal SDK...');
        const script = document.createElement('script');
        script.setAttribute('data-paypal-sdk', 'booking');
        // PayPal Sandbox Client ID from config
        // Note: PayPal payment buttons require USD currency, even though we use PHP for payouts
        script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CONFIG.CLIENT_ID}&currency=USD&intent=capture`;
        script.async = true;
        script.onload = () => {
          console.log('✅ PayPal SDK loaded successfully');
          // Wait a bit longer to ensure SDK is fully initialized
          setTimeout(() => {
            try {
              if (window.paypal && showPayPalPayment) {
                initializePayPal();
              }
            } catch (error) {
              console.error('PayPal initialization error:', error);
              alert('Failed to initialize payment. Please try again.');
            }
          }, 300);
        };
        script.onerror = (error) => {
          console.error('❌ Failed to load PayPal SDK:', error);
          alert('Failed to load payment system. Please check your internet connection and try again.');
        };
        document.body.appendChild(script);
      } else if (window.paypal) {
        console.log('✅ PayPal SDK already loaded, initializing buttons...');
        // Wait for DOM to be ready
        setTimeout(() => {
          try {
            if (showPayPalPayment) {
              initializePayPal();
            }
          } catch (error) {
            console.error('PayPal initialization error:', error);
            alert('Failed to initialize payment buttons. Please try again.');
          }
        }, 300);
      } else if (existingScript) {
        // Script is loading, wait for it
        existingScript.addEventListener('load', () => {
          setTimeout(() => {
            if (window.paypal && showPayPalPayment) {
              initializePayPal();
            }
          }, 300);
        }, { once: true });
      }
    }
  }, [showPayPalPayment, paymentAmount]);

  // Cleanup PayPal SDK when modal closes
  useEffect(() => {
    return () => {
      const container = document.getElementById('paypal-button-container');
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [showPayPalPayment]);

  // Load PayPal SDK for Cash-In
  useEffect(() => {
    if (showPayPalCashIn) {
      if (!window.paypal) {
        console.log('Loading PayPal SDK for cash-in...');
        const script = document.createElement('script');
        // PayPal payment buttons require USD currency
        script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CONFIG.CLIENT_ID}&currency=USD`;
        script.async = true;
        script.onload = () => {
          console.log('PayPal SDK loaded for cash-in');
          setTimeout(() => {
            try {
              initializePayPalCashIn();
            } catch (error) {
              console.error('PayPal cash-in initialization error:', error);
              alert('Failed to initialize payment. Please try again.');
              setShowPayPalCashIn(false);
            }
          }, 200);
        };
        script.onerror = (error) => {
          console.error('Failed to load PayPal SDK for cash-in:', error);
          // Suppress generic script errors
          if (error && error.message && !error.message.includes('Script error')) {
            alert('Failed to load payment system. Please check your internet connection.');
          }
          // Don't close modal - let user try again
        };
        document.body.appendChild(script);
      } else {
        console.log('PayPal SDK already loaded, initializing cash-in...');
        setTimeout(() => {
          try {
            initializePayPalCashIn();
          } catch (error) {
            console.error('PayPal cash-in initialization error:', error);
            alert('Failed to initialize payment. Please try again.');
            setShowPayPalCashIn(false);
          }
        }, 200);
      }
    }
  }, [showPayPalCashIn, cashInAmount]);

  // Load PayPal SDK for Top-Up
  useEffect(() => {
    if (showPayPalTopUpPayment) {
      if (!window.paypal) {
        console.log('Loading PayPal SDK for top-up...');
        const script = document.createElement('script');
        // PayPal payment buttons require USD currency
        script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CONFIG.CLIENT_ID}&currency=USD`;
        script.async = true;
        script.onload = () => {
          console.log('PayPal SDK loaded for top-up');
          setTimeout(() => {
            try {
              initializePayPalTopUp();
            } catch (error) {
              console.error('PayPal top-up initialization error:', error);
              alert('Failed to initialize payment. Please try again.');
              setShowPayPalTopUpPayment(false);
            }
          }, 200);
        };
        script.onerror = (error) => {
          console.error('Failed to load PayPal SDK for top-up:', error);
          // Suppress generic script errors
          if (error && error.message && !error.message.includes('Script error')) {
            alert('Failed to load payment system. Please check your internet connection.');
          }
          // Don't close modal - let user try again
        };
        document.body.appendChild(script);
      } else {
        console.log('PayPal SDK already loaded, initializing top-up...');
        setTimeout(() => {
          try {
            initializePayPalTopUp();
          } catch (error) {
            console.error('PayPal top-up initialization error:', error);
            alert('Failed to initialize payment. Please try again.');
            setShowPayPalTopUpPayment(false);
          }
        }, 200);
      }
    }
  }, [showPayPalTopUpPayment, topUpAmount]);

  // Enhanced suggestions based on booking history, favorites, and user behavior
  const getEnhancedSuggestions = () => {
    const allListings = getListingsPool(); // Use full pool, not filtered searchResults
    
    if (allListings.length === 0) return []; // No listings available
    
    // Get booked listing IDs for exclusion
    const bookedListingIds = bookings.map(b => b.listingId).filter(Boolean);
    const favoriteListingIds = favorites.map(f => f.id).filter(Boolean);
    
    // Get categories from bookings
    const bookedCategories = bookings
      .map(b => {
        const listing = allListings.find(l => l.id === b.listingId);
        return listing?.category;
      })
      .filter(Boolean);
    
    // Get categories from favorites
    const favoriteCategories = favorites
      .map(f => f.category)
      .filter(Boolean);
    
    // Count category preferences (weighted: bookings = 2x, favorites = 1x)
    const categoryScores = {};
    bookedCategories.forEach(cat => {
      categoryScores[cat] = (categoryScores[cat] || 0) + 2;
    });
    favoriteCategories.forEach(cat => {
      categoryScores[cat] = (categoryScores[cat] || 0) + 1;
    });
    
    // Get preferred categories (top 2)
    const preferredCategories = Object.entries(categoryScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([cat]) => cat);
    
    // Get average price range from bookings
    const bookedPrices = bookings
      .map(b => {
        const listing = allListings.find(l => l.id === b.listingId);
        return listing?.price || listing?.pricePerNight;
      })
      .filter(p => p && p > 0);
    
    const avgPrice = bookedPrices.length > 0
      ? bookedPrices.reduce((sum, p) => sum + p, 0) / bookedPrices.length
      : 0;
    
    // Get locations from bookings
    const bookedLocations = bookings
      .map(b => {
        const listing = allListings.find(l => l.id === b.listingId);
        return listing?.location;
      })
      .filter(Boolean);
    
    // Filter and score suggestions
    const scoredListings = allListings
      .filter(listing => {
        if (!listing || !listing.id) return false;
        // Exclude already booked or favorited
        if (bookedListingIds.includes(listing.id)) return false;
        if (favoriteListingIds.includes(listing.id)) return false;
        // Only show active listings
        if (listing.status !== "Active") return false;
        return true;
      })
      .map(listing => {
        let score = 0;
        
        // Category match (highest priority)
        if (preferredCategories.includes(listing.category)) {
          score += 100;
        }
        
        // Price similarity (if we have booking history)
        if (avgPrice > 0) {
          const listingPrice = listing.price || listing.pricePerNight || 0;
          const priceDiff = Math.abs(listingPrice - avgPrice);
          const priceScore = Math.max(0, 50 - (priceDiff / avgPrice) * 50);
          score += priceScore;
        }
        
        // Same location preference
        if (bookedLocations.includes(listing.location)) {
          score += 30;
        }
        
        // High rating bonus
        if (listing.rating >= 4.5) {
          score += 20;
        }
        
        // Random factor for variety
        score += Math.random() * 10;
        
        return { ...listing, score };
      })
      .sort((a, b) => b.score - a.score);
    
    // If no bookings/favorites yet, show popular listings (high rating)
    if (preferredCategories.length === 0 && scoredListings.length > 0) {
      return scoredListings
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 6);
    }
    
    // Return top 6 recommendations
    return scoredListings.slice(0, 6);
  };

  // Save profile and favorites to localStorage, but not bookings (using Firestore for bookings)
  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (userId) {
      const { email, ...profileWithoutEmail } = profile;
      localStorage.setItem(`guestProfile_${userId}`, JSON.stringify(profileWithoutEmail));
      localStorage.setItem(`guestFavorites_${userId}`, JSON.stringify(favorites));
    }
  }, [profile, favorites]);

  // Removed duplicate hostListings listener - now using single optimized listener above

  // Sanitize saved localStorage images on first load: replace Pinterest or non-direct links
  useEffect(() => {
    const sanitizeKey = (key, fallbackMap) => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const arr = JSON.parse(raw);
        let changed = false;
        const cleaned = arr.map(item => {
          if (!item || !item.img) return item;
          const url = item.img;
          // If the image is a Pinterest page (not a direct image) or contains 'pin', replace with fallback
          if (url.includes('pinterest.com') || url.includes('pin/')) {
            changed = true;
            return { ...item, img: fallbackMap[item.id] || fallbackMap['default'] || item.img };
          }
          return item;
        });
        if (changed) {
          localStorage.setItem(key, JSON.stringify(cleaned));
          return cleaned;
        }
        return null;
      } catch (e) {
        console.error('Sanitize localStorage failed for', key, e);
        return null;
      }
    };

    // map of fallbacks for known ids
    const favFallbacks = {
      'L-001': '/images/cozy home.jpg',
      'L-002': '/images/beach front.jpg',
      'default': '/images/cozy home.jpg'
    };
    const bookingFallbacks = {
      'B-001': '/images/cozy home.jpg',
      'B-002': '/images/beach front.jpg',
      'default': '/images/cozy home.jpg'
    };

    const newFavs = sanitizeKey('guestFavorites', favFallbacks);
    if (newFavs) setFavorites(newFavs);

    const newBookings = sanitizeKey('guestBookings', bookingFallbacks);
    if (newBookings) setBookings(newBookings);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDatePicker && !event.target.closest('.date-picker-container')) {
        setShowDatePicker(false);
      }
      if (showGuestDropdown && !event.target.closest('.guest-dropdown-container')) {
        setShowGuestDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDatePicker, showGuestDropdown]);

  return (
    <div className="min-h-screen bg-gold-50">
      {/* Sidebar Menu */}
      {isSidebarOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setIsSidebarOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300">
            {/* Sidebar Header */}
            <div className="bg-gradient-to-r from-gold-500 to-gold-600 p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Menu</h2>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="text-white hover:text-gray-200 transition"
                >
                  <FaTimes className="text-2xl" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <img
                  src={profile.avatar}
                  alt="avatar"
                  className="w-14 h-14 rounded-full border-2 border-white object-cover"
                />
                <div>
                  <div className="font-semibold text-lg">{profile.name}</div>
                  <div className="text-xs text-gold-100">{profile.email}</div>
                </div>
              </div>
            </div>

            {/* Sidebar Menu Items */}
            <div className="p-4">
              <nav className="space-y-2">
                {/* Edit Profile */}
                <button
                  onClick={() => {
                    handleProfileEdit();
                    setIsSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gold-50 transition group"
                >
                  <FaUserCircle className="text-gold-500 text-xl group-hover:scale-110 transition" />
                  <span className="text-gray-700 font-medium">Edit Profile</span>
                </button>

                {/* Messages */}
                <button
                  onClick={() => {
                    handleOpenChatList();
                    setIsSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-50 transition group"
                >
                  <FaRegCommentDots className="text-blue-500 text-xl group-hover:scale-110 transition" />
                  <span className="text-gray-700 font-medium">Messages</span>
                </button>

                {/* Wallet */}
                <button
                  onClick={() => {
                    setShowPayPalTopUp(true);
                    setIsSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-green-50 transition group"
                >
                  <FaWallet className="text-green-500 text-xl group-hover:scale-110 transition" />
                  <div className="flex flex-col items-start">
                    <span className="text-gray-700 font-medium">Wallet</span>
                    <span className="text-xs text-green-600">₱{paypalBalance.toLocaleString()} PHP</span>
                  </div>
                </button>

                {/* Favorites */}
                <button
                  onClick={() => {
                    setShowWishlist(true);
                    setIsSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-pink-50 transition group"
                >
                  <FaHeart className="text-pink-500 text-xl group-hover:scale-110 transition" />
                  <div className="flex flex-col items-start">
                    <span className="text-gray-700 font-medium">Favorites</span>
                    <span className="text-xs text-gray-500">{favorites.length} saved</span>
                  </div>
                </button>

                {/* Your Bookings */}
                <button
                  onClick={() => {
                    setShowAllBookings(true);
                    setIsSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-purple-50 transition group"
                >
                  <FaListAlt className="text-purple-500 text-xl group-hover:scale-110 transition" />
                  <div className="flex flex-col items-start">
                    <span className="text-gray-700 font-medium">Your Bookings</span>
                    <span className="text-xs text-gray-500">{bookings.length} total</span>
                  </div>
                </button>

                {/* Transaction History */}
                <button
                  onClick={() => {
                    setShowTransactionHistory(true);
                    setIsSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-50 transition group"
                >
                  <FaHistory className="text-blue-500 text-xl group-hover:scale-110 transition" />
                  <div className="flex flex-col items-start">
                    <span className="text-gray-700 font-medium">Transaction History</span>
                    <span className="text-xs text-gray-500">{transactions.length} transactions</span>
                  </div>
                </button>

                {/* My Rewards */}
                <button
                  onClick={() => {
                    setShowRewardsModal(true);
                    setIsSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50 transition group"
                >
                  <FaGift className="text-pink-500 text-xl group-hover:scale-110 transition" />
                  <div className="flex flex-col items-start">
                    <span className="text-gray-700 font-medium">My Rewards</span>
                    <span className="text-xs text-gray-500">{myCoupons.length} available</span>
                  </div>
                </button>

                {/* Divider */}
                <div className="border-t border-gray-200 my-4"></div>

                {/* Logout */}
                <button
                  onClick={() => {
                    setIsSidebarOpen(false);
                    onLogout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 transition group"
                >
                  <FaSignOutAlt className="text-red-500 text-xl group-hover:scale-110 transition" />
                  <span className="text-gray-700 font-medium">Logout</span>
                </button>
              </nav>
            </div>
          </div>
        </>
      )}

      {/* Sticky Airbnb-like Header */}
      {/* Sticky StayHub Header */}
<div className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur-md border-white/30 shadow-sm">
  <div className="max-w-7xl mx-auto px-3 md:px-4">
    <div className="h-16 md:h-20 flex items-center justify-between gap-2 md:gap-4">
      {/* Left: Profile Info */}
      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        <img
          src={profile.avatar}
          alt="avatar"
          className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-gold-400 object-cover flex-shrink-0"
        />
        <div className="hidden sm:block">
          <div className="text-xs text-gray-500">Signed in as</div>
          <div className="font-semibold text-gold-600">{profile.name}</div>
        </div>
      </div>

      {/* Center: Search Bar with Where, Dates, Who */}
      <div className="flex-1 max-w-3xl w-full">
        {/* Mobile: Simple search button */}
        <div className="lg:hidden">
          <div className="w-full flex items-center justify-between rounded-full border border-gold-200 shadow-md px-4 py-3 bg-white">
            <div className="flex items-center gap-2 text-gray-600">
              <FaSearch className="text-gold-500" />
              <span className="text-sm">Search destinations</span>
            </div>
          </div>
        </div>

        {/* Desktop: Full search bar */}
        <div className="hidden lg:flex items-center rounded-full border border-gold-200 shadow-md px-2 py-2 gap-1 bg-white">
          {/* Where */}
          <div className="flex items-center gap-2 px-3 py-1 flex-1 border-r border-gray-200 min-w-0">
            <FaMapMarkerAlt className="text-gold-500 flex-shrink-0" />
            <div className="flex flex-col flex-1 min-w-0">
              <label className="text-xs font-semibold text-gray-700">Where</label>
              <input
                type="text"
                value={searchWhere}
                onChange={(e) => {
                  setSearchWhere(e.target.value);
                  setSearch(e.target.value);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleAdvancedSearch()}
                className="bg-transparent outline-none text-sm w-full"
                placeholder="Search destinations"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="relative date-picker-container flex items-center gap-2 px-3 py-1 flex-1 border-r border-gray-200 min-w-0">
            <FaCalendarAlt className="text-gold-500 flex-shrink-0" />
            <div className="flex flex-col flex-1 min-w-0">
              <label className="text-xs font-semibold text-gray-700">Dates</label>
              <input
                type="text"
                value={
                  searchDates.checkIn && searchDates.checkOut
                    ? `${new Date(searchDates.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(searchDates.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                    : ""
                }
                className="bg-transparent outline-none text-sm cursor-pointer w-full truncate"
                placeholder="Add dates"
                readOnly
                onClick={() => setShowDatePicker(!showDatePicker)}
              />
            </div>
            {showDatePicker && (
              <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-xl shadow-2xl border p-4">
                <DateRangePicker
                  checkIn={searchDates.checkIn}
                  checkOut={searchDates.checkOut}
                  onChange={(dates) => {
                    setSearchDates(dates);
                    // Auto-apply search when both dates are selected
                    if (dates.checkIn && dates.checkOut) {
                      setShowDatePicker(false);
                      // Trigger search after state update
                      setTimeout(() => {
                        handleAdvancedSearch();
                      }, 100);
                    }
                  }}
                  minDate={new Date().toISOString().split('T')[0]}
                  bookedDates={[]}
                  bookedRanges={[]}
                />
              </div>
            )}
          </div>

          {/* Who */}
          <div className="relative guest-dropdown-container flex items-center gap-2 px-3 py-1 flex-1 min-w-0">
            <FaUsers className="text-gold-500 flex-shrink-0" />
            <div className="flex flex-col flex-1 min-w-0">
              <label className="text-xs font-semibold text-gray-700">Who</label>
              <input
                type="text"
                value={searchGuests > 0 ? `${searchGuests} guest${searchGuests > 1 ? 's' : ''}` : ""}
                className="bg-transparent outline-none text-sm cursor-pointer w-full truncate"
                placeholder="Add guests"
                readOnly
                onClick={() => setShowGuestDropdown(!showGuestDropdown)}
              />
            </div>
            {showGuestDropdown && (
              <div className="absolute top-full right-0 mt-2 z-50 bg-white rounded-lg shadow-xl border min-w-[200px]">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold text-gray-700">Number of Guests</span>
                    <button
                      onClick={() => setShowGuestDropdown(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <FaTimes className="text-sm" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-700">Guests</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSearchGuests(Math.max(1, searchGuests - 1))}
                        className="w-8 h-8 rounded-full border border-gray-300 hover:border-gold-500 flex items-center justify-center text-gray-600 hover:text-gold-600 transition"
                      >
                        -
                      </button>
                      <span className="text-lg font-semibold w-8 text-center">{searchGuests}</span>
                      <button
                        onClick={() => setSearchGuests(searchGuests + 1)}
                        className="w-8 h-8 rounded-full border border-gray-300 hover:border-gold-500 flex items-center justify-center text-gray-600 hover:text-gold-600 transition"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowGuestDropdown(false);
                      // Trigger search when guest count is changed
                      handleAdvancedSearch();
                    }}
                    className="w-full bg-gold-500 text-white py-2 rounded-lg hover:bg-gold-600 transition font-medium text-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Search Button */}
          <button
            onClick={handleAdvancedSearch}
            className="bg-gold-500 text-white p-3 rounded-full hover:bg-gold-600 transition flex-shrink-0"
            title="Search"
          >
            <FaSearch />
          </button>
        </div>
      </div>

      {/* Right: Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="flex items-center gap-1 md:gap-2 border border-gold-200 px-2 md:px-3 py-1.5 md:py-2 rounded-full hover:shadow hover:bg-gold-50 transition flex-shrink-0"
      >
        <FaBars className="text-gold-500 text-lg md:text-xl" />
        <span className="text-xs md:text-sm text-gray-700 hidden sm:inline">Menu</span>
      </button>
    </div>
  </div>

  {/* Categories bar */}
  <div className="border-t border-gold-100 bg-gold-gradient-light">
    <div className="max-w-7xl mx-auto px-3 md:px-4">
      <div className="flex items-center gap-3 md:gap-4 overflow-x-auto no-scrollbar py-2 md:py-3">
        {["All", "Home", "Experience", "Service"].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`whitespace-nowrap border-b-2 pb-2 text-sm transition 
              ${
                activeCategory === cat
                  ? "text-gold-700 border-gold-600 font-semibold"
                  : "text-gray-600 border-transparent hover:text-gold-600"
              }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  </div>
</div>


      <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-8">
        {/* Results Count */}
        <div className="mb-4 md:mb-6">
          <div className="text-sm text-gray-600">
            {(() => {
              let listingsToShow = [];
              // Check if any filters are active
              const hasActiveFilters = searchQuery || 
                selectedAmenities.length > 0 || 
                priceRange[1] < 10000 || 
                (searchDates.checkIn && searchDates.checkOut) || 
                searchGuests > 1;
              
              if (hasActiveFilters) {
                listingsToShow = searchResults;
              } else {
                listingsToShow = getListingsPool();
              }
              listingsToShow = listingsToShow.filter(l => activeCategory === "All" ? true : l.category === activeCategory);
              return `${listingsToShow.length} place${listingsToShow.length === 1 ? '' : 's'} available`;
            })()}
          </div>
        </div>

        {isImageGalleryOpen && galleryImages.length > 0 && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={handleCloseImageGallery}
          >
            <div
              className="relative w-full max-w-5xl"
              onClick={(e) => e.stopPropagation()}
            >
          <button 
                type="button"
                onClick={handleCloseImageGallery}
                className="absolute -top-3 -right-3 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-700 shadow-lg hover:text-gold-500 transition"
                aria-label="Close gallery"
              >
                <FaTimes />
              </button>
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="relative bg-black">
                  <img
                    src={galleryImages[galleryIndex]}
                    alt={
                      galleryListing?.title
                        ? `${galleryListing.title} photo ${galleryIndex + 1}`
                        : `Listing photo ${galleryIndex + 1}`
                    }
                    className="w-full max-h-[70vh] object-contain bg-black"
                  />
                  {galleryImages.length > 1 && (
                    <>
                  <button
                        type="button"
                        onClick={() => handleGalleryNavigate(-1)}
                        className="absolute left-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white shadow-lg hover:bg-black/80 transition"
                        aria-label="Previous photo"
                      >
                        <FaChevronLeft />
                  </button>
                  <button
                        type="button"
                        onClick={() => handleGalleryNavigate(1)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white shadow-lg hover:bg-black/80 transition"
                        aria-label="Next photo"
                      >
                        <FaChevronRight />
                  </button>
                      <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                        {galleryIndex + 1} / {galleryImages.length}
                </div>
                    </>
                  )}
              </div>
                <div className="p-4 bg-white">
                  {galleryListing && (
                    <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                        <div className="text-lg font-semibold text-gray-900">
                          {galleryListing.title || "Listing photos"}
                </div>
                        {(galleryListing.location || galleryListing.category) && (
                          <div className="text-sm text-gray-500">
                            {[galleryListing.location, galleryListing.category]
                              .filter(Boolean)
                              .join(" • ")}
              </div>
                        )}
                </div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {galleryImages.length} photo{galleryImages.length > 1 ? "s" : ""}
              </div>
                    </div>
                  )}
                  {galleryImages.length > 1 && (
                    <div className="grid grid-cols-5 gap-2 max-h-32 overflow-y-auto">
                      {galleryImages.map((image, index) => (
                <button
                          type="button"
                          key={index}
                          onClick={() => handleSelectGalleryImage(index)}
                          className={`relative h-16 rounded-md overflow-hidden border-2 transition ${
                            galleryIndex === index ? "border-gold-500" : "border-transparent"
                          }`}
                          aria-label={`View photo ${index + 1}`}
                        >
                          <img
                            src={image}
                            alt={`Gallery thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Profile Modal */}
        {showEditProfile && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm relative">
              <button
                onClick={() => setShowEditProfile(false)}
                className="absolute top-2 right-4 text-xl text-gray-400 hover:text-gold-500"
              >
                ×
              </button>
              <div className="flex flex-col items-center mb-4">
                <div className="relative">
                  <img
                    src={editProfileData.avatar}
                    alt="avatar"
                    className="w-24 h-24 rounded-full border-4 border-gold-200 shadow object-cover"
                  />
                  <label className="absolute bottom-0 right-0 bg-gold-500 text-white rounded-full p-2 cursor-pointer hover:bg-gold-600 transition">
                    <FaCamera />
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfileAvatarChange}
                    />
                  </label>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  value={editProfileData.name}
                  onChange={handleProfileInputChange}
                  className="border rounded px-3 py-2 w-full"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-1">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={editProfileData.phone}
                  onChange={handleProfileInputChange}
                  className="border rounded px-3 py-2 w-full"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-1">Login Email</label>
                <input
                  type="email"
                  name="email"
                  value={auth.currentUser?.email || "Loading..."}
                  readOnly
                  className="border rounded px-3 py-2 w-full bg-gray-100 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">This is your login email address and cannot be changed.</p>
              </div>
              <button
                onClick={handleProfileSave}
                className="bg-gold-500 text-white px-6 py-2 rounded-full shadow hover:bg-gold-600 transition w-full"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Account Settings Modal */}
        {showAccountSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md relative">
              <div className="bg-gradient-to-r from-gray-700 to-gray-800 p-6 text-white rounded-t-xl">
                <button
                  onClick={() => setShowAccountSettings(false)}
                  className="absolute top-4 right-4 text-white hover:text-gray-200 transition"
                >
                  <FaTimes className="text-xl" />
                </button>
                <div className="flex items-center gap-3">
                  <FaCog className="text-3xl" />
                  <div>
                    <h3 className="text-2xl font-bold">Account Settings</h3>
                    <p className="text-gray-300 text-sm">Manage your preferences</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Notifications */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FaRegCommentDots className="text-blue-500 text-xl" />
                    <div>
                      <div className="font-semibold">Push Notifications</div>
                      <div className="text-xs text-gray-500">Receive booking updates</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.preferences.notifications}
                      onChange={(e) => {
                        setProfile(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, notifications: e.target.checked }
                        }));
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gold-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
                  </label>
                </div>

                {/* Email Updates */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FaEnvelope className="text-green-500 text-xl" />
                    <div>
                      <div className="font-semibold">Email Updates</div>
                      <div className="text-xs text-gray-500">Get promotional emails</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.preferences.emailUpdates}
                      onChange={(e) => {
                        setProfile(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, emailUpdates: e.target.checked }
                        }));
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gold-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
                  </label>
                </div>

                {/* SMS Updates */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FaPhone className="text-purple-500 text-xl" />
                    <div>
                      <div className="font-semibold">SMS Updates</div>
                      <div className="text-xs text-gray-500">Receive text messages</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.preferences.smsUpdates}
                      onChange={(e) => {
                        setProfile(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, smsUpdates: e.target.checked }
                        }));
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gold-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
                  </label>
                </div>

                {/* Privacy */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <FaLock className="text-red-500 text-xl" />
                    <div className="font-semibold">Privacy & Security</div>
                  </div>
                  <div className="text-xs text-gray-600 ml-8">
                    Your data is encrypted and secure. We never share your personal information with third parties.
                  </div>
                </div>

                <button
                  onClick={async () => {
                    try {
                      const userId = auth.currentUser?.uid;
                      if (userId) {
                        // Save preferences to Firestore
                        await updateDoc(doc(db, "users", userId), {
                          preferences: profile.preferences,
                          updatedAt: new Date()
                        });
                        
                        // Update localStorage as backup
                        localStorage.setItem(`guestProfile_${userId}`, JSON.stringify({
                          name: profile.name,
                          phone: profile.phone,
                          avatar: profile.avatar,
                          preferences: profile.preferences
                        }));
                        
                        alert('Settings saved successfully!');
                      }
                    } catch (error) {
                      console.error('Error saving settings:', error);
                      alert('Failed to save settings. Please try again.');
                    }
                    setShowAccountSettings(false);
                  }}
                  className="w-full bg-gold-500 text-white px-6 py-3 rounded-lg shadow hover:bg-gold-600 transition font-semibold"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Favorites Modal */}
        {showWishlist && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="bg-gradient-to-r from-gold-500 to-gold-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FaHeart className="text-3xl" />
                    <div>
                      <h3 className="text-2xl font-bold">Your Favorites</h3>
                      <p className="text-gold-100 text-sm">{favorites.length} saved places</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowWishlist(false)}
                    className="text-white hover:text-gray-200 transition"
                  >
                    <FaTimes className="text-2xl" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {favorites.length === 0 ? (
                  <div className="text-center py-12">
                    <FaHeart className="text-6xl text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No favorites yet</p>
                    <p className="text-gray-400 text-sm mt-2">Start adding your favorite places!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {favorites.map((fav) => (
                      <div key={fav.id} className="bg-white rounded-xl border hover:shadow-lg transition group">
                        <div className="relative">
                          <img src={fav.img} alt={fav.title} className="w-full h-48 rounded-t-xl object-cover" />
                          <button
                            onClick={() => toggleFavorite(fav)}
                            className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white shadow"
                          >
                            <FaHeart className="text-gold-500" />
                          </button>
                        </div>
                        <div className="p-4">
                          <div className="font-semibold text-lg mb-1">{fav.title}</div>
                          <div className="text-sm text-gray-500 mb-2">{fav.location}</div>
                          <div className="text-sm font-semibold text-gold-600">
                            ₱{fav.pricePerNight?.toLocaleString() || fav.price?.toLocaleString()}/night
                          </div>
                          <button
                            onClick={() => {
                              handleBookListing(fav);
                              setShowWishlist(false);
                            }}
                            className="w-full mt-3 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition"
                          >
                            Book Now
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Your Bookings Modal */}
        {showAllBookings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
              <div className="bg-gradient-to-r from-gold-500 to-gold-600 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FaListAlt className="text-3xl" />
                    <div>
                      <h3 className="text-2xl font-bold">Your Bookings</h3>
                      <p className="text-gold-100 text-sm">{bookings.length} total bookings</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAllBookings(false)}
                    className="text-white hover:text-gray-200 transition"
                  >
                    <FaTimes className="text-2xl" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {bookings.length === 0 ? (
                  <div className="text-center py-12">
                    <FaListAlt className="text-6xl text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No bookings yet</p>
                    <p className="text-gray-400 text-sm mt-2">Book your first stay to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Pending Approval Section */}
                    {bookings.filter(b => b.status === "PendingApproval").length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                          <FaSpinner className="text-yellow-500 animate-spin" /> Pending Approval
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {bookings.filter(b => b.status === "PendingApproval").map((b) => {
                            const timeRemaining = getCancellationTimeRemaining(b);
                            const canCancel = timeRemaining && !timeRemaining.expired;
                            
                            return (
                            <div key={b.id} className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
                              <div className="flex gap-3">
                                <img src={b.img} alt={b.title} className="w-20 h-20 rounded-lg object-cover" />
                                <div className="flex-1">
                                  <div className="font-semibold">{b.title}</div>
                                  <div className="text-sm text-gray-500">{b.location}</div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {b.displayCheckIn} - {b.displayCheckOut}
                                  </div>
                                    {timeRemaining && (
                                      <div className="mt-2 text-xs">
                                        {canCancel ? (
                                          <div className="flex items-center gap-1 text-orange-600 font-medium">
                                            <FaClock className="text-xs" />
                                            <span>Cancel within: {formatTimeRemaining(timeRemaining.remaining)}</span>
                                          </div>
                                        ) : (
                                          <div className="text-red-600 font-medium">
                                            ⏰ Cancellation window expired
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                                    <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                                      {b.status}
                                    </span>
                                    <button
                                      onClick={() => handleCancelPendingBooking(b)}
                                        disabled={!canCancel}
                                        className={`px-3 py-1 rounded text-xs flex items-center gap-1 transition ${
                                          canCancel 
                                            ? 'bg-red-500 text-white hover:bg-red-600' 
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        }`}
                                    >
                                      <FaTimes /> Cancel
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Upcoming Bookings */}
                    {bookings.filter(b => b.status === "Upcoming").length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                          <FaCalendarAlt className="text-green-500" /> Upcoming
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {bookings.filter(b => b.status === "Upcoming").map((b) => {
                            const timeRemaining = getCancellationTimeRemaining(b);
                            const canCancel = timeRemaining && !timeRemaining.expired;
                            
                            return (
                            <div key={b.id} className="bg-white border rounded-xl p-4 hover:shadow-lg transition">
                              <div className="flex gap-3">
                                <img src={b.img} alt={b.title} className="w-20 h-20 rounded-lg object-cover" />
                                <div className="flex-1">
                                  <div className="font-semibold">{b.title}</div>
                                  <div className="text-sm text-gray-500">{b.location}</div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {b.displayCheckIn} - {b.displayCheckOut}
                                  </div>
                                    {timeRemaining && (
                                      <div className="mt-2 text-xs">
                                        {canCancel ? (
                                          <div className="flex items-center gap-1 text-orange-600 font-medium">
                                            <FaClock className="text-xs" />
                                            <span>Cancel within: {formatTimeRemaining(timeRemaining.remaining)}</span>
                                          </div>
                                        ) : (
                                          <div className="text-red-600 font-medium">
                                            ⏰ Cancellation window expired
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                                      {b.status}
                                    </span>
                                    <button
                                      onClick={() => handleCancelPendingBooking(b)}
                                        disabled={!canCancel}
                                        className={`px-3 py-1 rounded text-xs flex items-center gap-1 transition ${
                                          canCancel 
                                            ? 'bg-red-500 text-white hover:bg-red-600' 
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        }`}
                                    >
                                      <FaTimes /> Cancel
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Completed Bookings */}
                    {bookings.filter(b => b.status === "Completed").length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                          <FaHistory className="text-blue-500" /> Completed
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {bookings.filter(b => b.status === "Completed").map((b) => (
                            <div key={b.id} className="bg-white border rounded-xl p-4 hover:shadow-lg transition">
                              <div className="flex gap-3">
                                <img src={b.img} alt={b.title} className="w-20 h-20 rounded-lg object-cover" />
                                <div className="flex-1">
                                  <div className="font-semibold">{b.title}</div>
                                  <div className="text-sm text-gray-500">{b.location}</div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {b.displayCheckIn} - {b.displayCheckOut}
                                  </div>
                                  <div className="mt-2 flex items-center gap-2">
                                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                                      {b.status}
                                    </span>
                                    {!b.hasRated && (
                                      <button
                                        onClick={() => {
                                          handleOpenRating(b);
                                          setShowAllBookings(false);
                                        }}
                                        className="bg-yellow-400 text-white px-2 py-1 rounded text-xs hover:bg-yellow-500 flex items-center gap-1"
                                      >
                                        <FaStar /> Rate
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Declined/Cancelled Bookings */}
                    {bookings.filter(b => b.status === "Declined" || b.status === "CancelledByGuest").length > 0 && (
                      <div>
                        <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                          <FaExclamationTriangle className="text-red-500" /> Declined/Cancelled
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {bookings.filter(b => b.status === "Declined" || b.status === "CancelledByGuest").map((b) => (
                            <div key={b.id} className="bg-white border rounded-xl p-4 opacity-75">
                              <div className="flex gap-3">
                                <img src={b.img} alt={b.title} className="w-20 h-20 rounded-lg object-cover grayscale" />
                                <div className="flex-1">
                                  <div className="font-semibold">{b.title}</div>
                                  <div className="text-sm text-gray-500">{b.location}</div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {b.displayCheckIn} - {b.displayCheckOut}
                                  </div>
                                  <div className="mt-2">
                                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                                      {b.status}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Explore Grid */}
        <div className="mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {/* Display filtered results */}
            {(() => {
              // Get the listings to display
              let listingsToShow = [];
              
              // Check if any filters are active
              const hasActiveFilters = searchQuery || 
                selectedAmenities.length > 0 || 
                priceRange[1] < 10000 || 
                (searchDates.checkIn && searchDates.checkOut) || 
                searchGuests > 1;
              
              // If there's an active search query or filters applied, use searchResults
              if (hasActiveFilters) {
                listingsToShow = searchResults;
              } else {
                // Otherwise use the full pool
                listingsToShow = getListingsPool();
              }
              
              // Apply category filter
              listingsToShow = listingsToShow.filter((l) => activeCategory === "All" ? true : l.category === activeCategory);
              
              if (listingsToShow.length === 0) {
                return (
                  <div className="col-span-full text-center py-16 bg-gray-50 rounded-xl">
                    <FaSearch className="text-5xl text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No listings found</h3>
                    <p className="text-gray-500 mb-4">Try adjusting your filters or search criteria.</p>
                    <button
                      onClick={() => {
                        setPriceRange([0, 10000]);
                        setSelectedAmenities([]);
                        setActiveCategory("All");
                        setSearchDates({ checkIn: "", checkOut: "" });
                        setSearchGuests(1);
                        setSearchWhere("");
                        setSearch("");
                        setSearchQuery("");
                        setSearchResults(getListingsPool());
                      }}
                      className="bg-gold-500 text-white px-6 py-2 rounded-lg hover:bg-gold-600 transition font-medium"
                    >
                      Clear all filters
                    </button>
            </div>
                );
              }
              
              return listingsToShow.map((l) => {
                    const listingImages = extractListingImages(l);
                    const coverImage =
                      listingImages[0] ||
                      l.img ||
                      "/images/cozy home.jpg";
                    const viewPhotosLabel = listingImages.length > 1 ? "View photos" : "View photo";
                    const guestCapacity = getListingGuestCapacity(l);
                    const bedrooms = getListingBedrooms(l);
                    const bathrooms = getListingBathrooms(l);

                    return (
                    <div key={l.id} className="group flex flex-col bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden h-full">
                      {/* Image Section */}
                      <div
                        className="relative overflow-hidden aspect-[4/3] bg-gray-100 cursor-pointer"
                        onClick={() => handleOpenImageGallery(l, 0, coverImage)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleOpenImageGallery(l, 0, coverImage);
                          }
                        }}
                      >
                        <img
                          src={coverImage}
                          alt={l.title}
                          className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(l);
                          }}
                          className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white shadow"
                          aria-label="Toggle favorite"
                        >
                          <FaHeart
                            className={
                              isFavorited(l.id) ? "text-gold-600" : "text-gray-400"
                            }
                          />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowShareModal(l);
                          }}
                          className="absolute top-3 left-3 p-2 rounded-full bg-white/80 hover:bg-white shadow"
                          aria-label="Share"
                        >
                          <FaShareAlt className="text-gray-400" />
                        </button>
                        <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white bg-black/50 px-2 py-1 rounded-full text-xs">
                          <FaStar className="text-yellow-300" /> {renderReviewsRating(l)}
                        </div>
                        <div className="absolute bottom-3 right-3 bg-white/80 text-xs px-2 py-1 rounded-full font-medium">
                          {l.calendar || 'Available'}
                        </div>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none z-10 flex items-center gap-2 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
                          <FaImages /> <span>{viewPhotosLabel}</span>
                        </div>
                      </div>

                      {/* Map Section */}
                      {(l?.coordinates?.lat && l?.coordinates?.lng) || (l?.location || l?.title) ? (
                        <div className="w-full">
                          <div className="overflow-hidden">
                            <iframe
                              title={`map-${l.id}`}
                              src={
                                l?.coordinates?.lat && l?.coordinates?.lng
                                  ? `https://www.google.com/maps?q=${encodeURIComponent(l.coordinates.lat)},${encodeURIComponent(l.coordinates.lng)}&z=14&output=embed`
                                  : `https://www.google.com/maps?q=${encodeURIComponent(`${l?.title || ''} ${l?.location || ''}`.trim())}&z=14&output=embed`
                              }
                              className="w-full h-28"
                              loading="lazy"
                              allowFullScreen
                              referrerPolicy="no-referrer-when-downgrade"
                            />
                          </div>
                        </div>
                      ) : null}

                      {/* Content Section */}
                      <div className="flex flex-col flex-grow p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-semibold truncate mr-2 flex-1">{l.title}</div>
                          <div className="text-sm font-semibold whitespace-nowrap">
                            ₱{(l.pricePerNight || l.price)?.toLocaleString?.()}{" "}
                            <span className="text-gray-500 text-xs">night</span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 truncate mb-1">
                          {l.location} • {l.category}
                        </div>
                        <div className="text-xs text-gray-400 mb-2">Hosted by {l.host}</div>
                        <div className="flex flex-wrap items-center gap-1 mb-3">
                          {(l.amenities || []).slice(0, 3).map((amenity, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-gray-100 px-2 py-1 rounded-full"
                            >
                              {amenity}
                            </span>
                          ))}
                          {(l.amenities || []).length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{(l.amenities || []).length - 3} more
                            </span>
                          )}
                        </div>
                    <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-gray-500">
                          {l.category === "Experience" ? (
                            <>
                              {getListingDuration(l) && (
                                <span className="bg-gray-100 px-2 py-1 rounded-full">
                                  Duration: {getListingDuration(l)}
                                </span>
                              )}
                              {getListingGroupSize(l) && (
                                <span className="bg-gray-100 px-2 py-1 rounded-full">
                                  Group Size: {getListingGroupSize(l)} {getListingGroupSize(l) === 1 ? "person" : "people"}
                                </span>
                              )}
                            </>
                          ) : l.category === "Service" ? (
                            <>
                              {getListingServiceType(l) && (
                                <span className="bg-gray-100 px-2 py-1 rounded-full">
                                  Service: {getListingServiceType(l)}
                                </span>
                              )}
                              {getListingDuration(l) && (
                                <span className="bg-gray-100 px-2 py-1 rounded-full">
                                  Duration: {getListingDuration(l)}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              {guestCapacity ? (
                                <span className="bg-gray-100 px-2 py-1 rounded-full">
                                  {guestCapacity} {guestCapacity === 1 ? "Guest" : "Guests"}
                                </span>
                              ) : null}
                              {bedrooms ? (
                                <span className="bg-gray-100 px-2 py-1 rounded-full">
                                  {bedrooms} {bedrooms === 1 ? "Bedroom" : "Bedrooms"}
                                </span>
                              ) : null}
                              {bathrooms !== null ? (
                                <span className="bg-gray-100 px-2 py-1 rounded-full">
                                  {bathrooms} {bathrooms === 1 ? "Bathroom" : "Bathrooms"}
                                </span>
                              ) : null}
                            </>
                          )}
                        </div>
                        
                        {/* Buttons at bottom */}
                        <div className="mt-auto grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleBookListing(l)}
                            className="bg-gold-500 hover:bg-gold-600 text-white px-4 py-2 rounded-lg shadow-md transition text-sm font-semibold"
                          >
                            Book Now
                          </button>
                          <button
                            onClick={() => handleMessageHost(l)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md transition flex items-center justify-center gap-1 text-sm font-semibold"
                          >
                            <FaEnvelope className="text-xs" /> Message
                          </button>
                        </div>
                      </div>
                    </div>
                    );
              });
            })()}
          </div>
        </div>

        {/* Upcoming trips removed per user request */}

        {/* Wishlists from favorites - horizontal carousel */}
        {/* <div className="mb-12">
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-xl">Wishlists</div>
            <button onClick={handleShowWishlist} className="text-sm text-gold-600 underline">
              {showWishlist ? "Hide" : "Show"}
            </button>
          </div>
          {favorites.length === 0 ? (
            <div className="text-gray-500 text-sm">No favorites yet. Add some from Explore.</div>
          ) : (
            <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
              {favorites.map((fav) => (
                <div key={fav.id} className="min-w-[220px]">
                  <div className="relative overflow-hidden rounded-2xl aspect-[4/3] bg-gray-100">
                    <img src={fav.img} alt={fav.title} className="h-full w-full object-cover" />
                    <button
                      onClick={() => handleRemoveFavorite(fav.id)}
                      className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white shadow"
                      title="Remove"
                    >
                      <FaTrash className="text-gray-500" />
                    </button>
                  </div>
                  <div className="mt-2">
                    <div className="font-semibold truncate">{fav.title}</div>
                    <div className="text-sm text-gray-500 truncate">Saved place</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div> */}


        {/* Rating Modal */}
        {showRatingModal && selectedBookingToRate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg relative overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-6 text-white">
                <button
                  onClick={() => setShowRatingModal(false)}
                  className="absolute top-4 right-4 text-white hover:text-gray-200 text-2xl"
                >
                  ×
                </button>
                <div className="flex items-center gap-3">
                  <FaStar className="text-3xl" />
                  <div>
                    <h3 className="text-2xl font-bold">Rate Your Stay</h3>
                    <p className="text-yellow-50 text-sm mt-1">
                      Share your experience
                    </p>
                  </div>
                </div>
              </div>

              {/* Booking Info */}
              <div className="p-6 bg-gray-50 border-b">
                <div className="flex items-center gap-3">
                  <img 
                    src={selectedBookingToRate.img} 
                    alt={selectedBookingToRate.title}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {selectedBookingToRate.title}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {selectedBookingToRate.displayCheckIn} - {selectedBookingToRate.displayCheckOut}
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedBookingToRate.location}
                    </p>
                  </div>
                </div>
              </div>

              {/* Rating Section */}
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-center text-sm font-semibold text-gray-700 mb-3">
                    How would you rate your stay?
                  </label>
                  <div className="flex justify-center mb-2">
                    <StarRating rating={rating} onRatingChange={setRating} />
                  </div>
                  <div className="text-center">
                    {rating === 0 && <p className="text-sm text-gray-400">Select a rating</p>}
                    {rating === 1 && <p className="text-sm text-red-500 font-medium">Poor</p>}
                    {rating === 2 && <p className="text-sm text-orange-500 font-medium">Fair</p>}
                    {rating === 3 && <p className="text-sm text-yellow-500 font-medium">Good</p>}
                    {rating === 4 && <p className="text-sm text-blue-500 font-medium">Very Good</p>}
                    {rating === 5 && <p className="text-sm text-green-500 font-medium">Excellent!</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Write a Review or Your Wishlist Experience(Optional)
                  </label>
                  <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    placeholder="Tell others about your experience..."
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent h-32 resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {review.length}/500 characters
                  </p>
                </div>

                <button
                  onClick={handleSubmitRating}
                  disabled={rating === 0}
                  className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-6 py-3 rounded-lg font-semibold hover:from-yellow-500 hover:to-orange-500 transition disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed shadow-lg disabled:shadow-none flex items-center justify-center gap-2"
                >
                  <FaStar className="text-lg" />
                  {rating === 0 ? 'Select a Rating' : 'Submit Rating'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Booking Details Modal */}
        {showBookingDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative">
              <button
                onClick={handleCloseBookingDetails}
                className="absolute top-2 right-4 text-xl text-gray-400 hover:text-gold-500"
              >
                ×
              </button>
              <div className="flex items-center gap-4 mb-4">
                <img src={showBookingDetails.img} alt={showBookingDetails.title} className="w-20 h-20 rounded-lg object-cover" />
                <div>
                  <div className="font-bold text-lg">{showBookingDetails.title}</div>
                  <div className="space-y-1">
                  <div className="text-sm font-medium">{showBookingDetails.location}</div>
                  <div className="text-xs text-blue-500">
                    Booked on: {showBookingDetails.displayBookingDate}
                  </div>
                  <div className="text-xs bg-gray-100 px-2 py-1 rounded-full inline-block">
                    Check-in: {showBookingDetails.displayCheckIn} • Check-out: {showBookingDetails.displayCheckOut}
                  </div>
                  <div className="flex items-center gap-1 text-yellow-500 text-xs">
                    <FaStar /> {renderReviewsRating(showBookingDetails)}
                  </div>
                </div>
                </div>
              </div>

              {showBookingDetails.status === "Completed" && !showBookingDetails.hasRated && (
                <div className="mb-4 bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-lg relative overflow-hidden">
                  {/* Background decorative stars */}
                  <div className="absolute -right-4 -top-4 text-yellow-200 opacity-30">
                    <FaStar className="text-8xl transform rotate-12" />
                  </div>
                  <div className="absolute -left-4 -bottom-4 text-yellow-200 opacity-30">
                    <FaStar className="text-8xl transform -rotate-12" />
                  </div>

                  {/* Content */}
                  <div className="relative">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="bg-yellow-400 p-3 rounded-full shrink-0">
                        <FaStar className="text-2xl text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xl text-yellow-800 mb-1">Share Your Experience!</h3>
                        <p className="text-yellow-700">
                          Your feedback is valuable! Help future guests make informed decisions by rating your stay.
                        </p>
                      </div>
                    </div>

                    <div className="pl-16 space-y-4">
                      <div className="flex items-center text-lg text-yellow-400">
                        <FaStar />
                        <FaStar />
                        <FaStar />
                        <FaStar />
                        <FaStar />
                      </div>

                      <button
                        onClick={() => {
                          handleCloseBookingDetails();
                          handleOpenRating(showBookingDetails);
                        }}
                        className="w-full bg-yellow-400 text-white px-6 py-3 rounded-lg hover:bg-yellow-500 transition flex items-center justify-center gap-2 shadow-sm font-semibold"
                      >
                        <FaStar className="text-lg" /> Rate Your Stay Now
                      </button>

                      <p className="text-center text-yellow-600 text-sm">
                        Takes just a minute • Helps the community
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {showBookingDetails.hasRated && (
                <div className="mb-4 bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FaStar className="text-yellow-400" />
                    <p className="text-sm text-green-700">
                      You rated this stay {showBookingDetails.rating}/5
                    </p>
                  </div>
                </div>
              )}

              <div className="mb-2">
                <span className="font-semibold">Amenities:</span>{" "}
                <span className="text-gray-700 text-sm">{showBookingDetails.amenities.join(", ")}</span>
              </div>
              <div className="mb-2 flex items-center gap-2">
                <FaRegCalendarAlt className="text-blue-400" />
                <span className="text-xs text-green-600">{showBookingDetails.status}</span>
              </div>
              <div className="mb-2 flex items-center gap-2">
                <FaRegCommentDots className="text-gold-400" />
                <span className="text-xs text-gray-500">Share or review your booking!</span>
              </div>
              <button
                onClick={() => setShowBookingShareModal(showBookingDetails)}
                className="bg-blue-400 text-white px-4 py-2 rounded-full shadow hover:bg-blue-500 transition mt-2"
              >
                <FaShareAlt className="inline mr-1" /> Share Booking
              </button>
            </div>
          </div>
        )}


        {/* PayPal Add Funds Modal */}
        {showPayPalTopUp && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md relative overflow-hidden">
              <button
                onClick={() => setShowPayPalTopUp(false)}
                className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-gray-600 z-10"
              >
                ×
              </button>
              
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FaWallet className="text-3xl" />
                  <div>
                    <h3 className="text-2xl font-bold">Add Funds</h3>
                    <p className="text-blue-50 text-sm mt-1">
                      Current Balance: ₱{paypalBalance.toLocaleString()} PHP
                    </p>
                  </div>
                  </div>
                  <button
                    onClick={syncPayPalBalance}
                    className="flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition text-sm font-medium"
                    title="Sync with PayPal Sandbox"
                  >
                    <FaSync className="text-sm" />
                    <span>Sync</span>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <p className="text-gray-700 mb-4">Enter amount to add:</p>
                
                {/* Custom Amount Input */}
                <div className="mb-6">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">₱</span>
                    <input
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleCustomAmountSubmit();
                        }
                      }}
                      placeholder="0"
                      min="1"
                      step="1"
                      className="w-full pl-12 pr-16 py-4 text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-gray-400">PHP</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Minimum: ₱1 • Maximum: ₱1,000,000</p>
                </div>

                {/* Quick Amount Suggestions */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Quick amounts:</p>
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={() => setCustomAmount('500')}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition"
                    >
                      ₱500
                    </button>
                    <button
                      onClick={() => setCustomAmount('1000')}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition"
                    >
                      ₱1,000
                    </button>
                    <button
                      onClick={() => setCustomAmount('2500')}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition"
                    >
                      ₱2,500
                    </button>
                    <button
                      onClick={() => setCustomAmount('5000')}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition"
                    >
                      ₱5,000
                    </button>
                  </div>
                </div>

                {/* Continue Button */}
                <button
                  onClick={handleCustomAmountSubmit}
                  disabled={!customAmount || parseFloat(customAmount) <= 0}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-lg hover:from-blue-700 hover:to-blue-800 transition font-bold text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FaCreditCard />
                  Continue to PayPal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PayPal Cash-In Payment Modal */}
        {showPayPalCashIn && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md relative overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                <button
                  onClick={() => setShowPayPalCashIn(false)}
                  className="absolute top-4 right-4 text-white hover:text-gray-200 text-2xl"
                >
                  ×
                </button>
                <div className="flex items-center gap-3">
                  <FaWallet className="text-3xl" />
                  <div>
                    <h3 className="text-2xl font-bold">Cash In via PayPal</h3>
                    <p className="text-blue-50 text-sm mt-1">
                      Add ₱{cashInAmount.toLocaleString()} PHP to your balance
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="p-6 bg-gray-50 border-b">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600">Cash-In Amount:</span>
                  <span className="text-2xl font-bold text-blue-600">₱{cashInAmount.toLocaleString()} PHP</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Current Balance:</span>
                  <span className="text-lg font-semibold text-gray-900">₱{paypalBalance.toLocaleString()} PHP</span>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-gray-900 font-semibold">New Balance:</span>
                  <span className="text-lg font-bold text-green-600">₱{(paypalBalance + cashInAmount).toLocaleString()} PHP</span>
                </div>
              </div>

              {/* PayPal Button Container */}
              <div className="p-6">
                <div className="mb-4 text-center">
                  <p className="text-sm text-gray-600">
                    Complete payment with PayPal or Card
                  </p>
                </div>
                <div id="paypal-cashin-container" className="min-h-[150px] flex items-center justify-center">
                  <div className="text-gray-500 text-center">
                    <FaSpinner className="animate-spin text-3xl mx-auto mb-2 text-blue-600" />
                    <p>Loading PayPal...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PayPal Top-Up Payment Modal */}
        {showPayPalTopUpPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md relative overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                <button
                  onClick={() => setShowPayPalTopUpPayment(false)}
                  className="absolute top-4 right-4 text-white hover:text-gray-200 text-2xl"
                >
                  ×
                </button>
                <div className="flex items-center gap-3">
                  <FaCreditCard className="text-3xl" />
                  <div>
                    <h3 className="text-2xl font-bold">Top Up PayPal</h3>
                    <p className="text-blue-50 text-sm mt-1">
                      Add ₱{topUpAmount.toLocaleString()} PHP to your account
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Info */}
              <div className="p-6 bg-gray-50 border-b">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-600">Top-Up Amount:</span>
                  <span className="text-2xl font-bold text-blue-600">₱{topUpAmount.toLocaleString()} PHP</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Current Balance:</span>
                  <span className="text-lg font-semibold text-gray-900">₱{paypalBalance.toLocaleString()} PHP</span>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-gray-900 font-semibold">New Balance:</span>
                  <span className="text-lg font-bold text-green-600">₱{(paypalBalance + topUpAmount).toLocaleString()} PHP</span>
                </div>
              </div>

              {/* PayPal Button Container */}
              <div className="p-6">
                <div className="mb-4 text-center">
                  <p className="text-sm text-gray-600">
                    Complete payment with PayPal Sandbox
                  </p>
                </div>
                <div id="paypal-topup-container" className="min-h-[150px] flex items-center justify-center">
                  <div className="text-gray-500 text-center">
                    <FaSpinner className="animate-spin text-3xl mx-auto mb-2 text-blue-600" />
                    <p>Loading PayPal...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Enhanced Suggestions & Recommendations */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-2xl text-gray-800 flex items-center gap-2">
                <FaGift className="text-yellow-500" />
                Personalized Recommendations
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {bookings.length > 0 || favorites.length > 0 
                  ? "Based on your bookings and favorites" 
                  : "Popular listings you might like"}
              </p>
            </div>
            <div className="text-sm bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full">
              {getEnhancedSuggestions().length} suggestions
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {getEnhancedSuggestions().length === 0 && (
              <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl">
                <FaGift className="text-5xl text-gray-300 mx-auto mb-3" />
                <div className="text-gray-500 font-medium text-lg">No recommendations available yet</div>
                <div className="text-sm text-gray-400 mt-1">Start booking or adding favorites to get personalized suggestions!</div>
              </div>
            )}
            {getEnhancedSuggestions().map((s) => {
              // Determine recommendation reason
              const bookedCategories = bookings.map(b => {
                const listing = getListingsPool().find(l => l.id === b.listingId);
                return listing?.category;
              }).filter(Boolean);
              const favoriteCategories = favorites.map(f => f.category).filter(Boolean);
              const hasBookingHistory = bookings.length > 0;
              const hasFavorites = favorites.length > 0;
              
              let recommendationBadge = "";
              let badgeColor = "";
              
              if (hasBookingHistory && bookedCategories.includes(s.category)) {
                recommendationBadge = "Similar to your bookings";
                badgeColor = "bg-blue-100 text-blue-700";
              } else if (hasFavorites && favoriteCategories.includes(s.category)) {
                recommendationBadge = "Matches your favorites";
                badgeColor = "bg-purple-100 text-purple-700";
              } else if (s.rating >= 4.5) {
                recommendationBadge = "Popular choice";
                badgeColor = "bg-yellow-100 text-yellow-700";
              } else {
                recommendationBadge = "You might like";
                badgeColor = "bg-green-100 text-green-700";
              }
              const suggestionImages = extractListingImages(s);
              const suggestionCoverImage =
                suggestionImages[0] ||
                s.img ||
                "/images/cozy home.jpg";
              const suggestionViewLabel = suggestionImages.length > 1 ? "View photos" : "View photo";
              const guestCapacity = getListingGuestCapacity(s);
              const bedrooms = getListingBedrooms(s);
              const bathrooms = getListingBathrooms(s);
              
              return (
              <div key={s.id} className="bg-white rounded-xl shadow hover:shadow-lg transition p-4 flex flex-col group">
                  <div
                    className="relative mb-3 rounded-lg overflow-hidden cursor-pointer"
                    onClick={() => handleOpenImageGallery(s, 0, suggestionCoverImage)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleOpenImageGallery(s, 0, suggestionCoverImage);
                      }
                    }}
                  >
                    <img src={suggestionCoverImage} alt={s.title} className="w-full h-48 object-cover group-hover:scale-[1.03] transition duration-300" />
                  <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-semibold ${badgeColor}`}>
                    {recommendationBadge}
                  </div>
                  <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(s);
                      }}
                    className="absolute top-2 right-2 p-2 rounded-full bg-white/80 hover:bg-white shadow"
                  >
                    <FaHeart className={isFavorited(s.id) ? "text-gold-600" : "text-gray-400"} />
                  </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none z-10 flex items-center gap-2 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
                      <FaImages /> <span>{suggestionViewLabel}</span>
                    </div>
                </div>
                <div className="font-bold text-center text-lg">{s.title}</div>
                <div className="text-xs text-gray-400 mb-2 text-center">{s.category} • {s.location}</div>
                <div className="flex items-center gap-1 text-yellow-500 mb-2 justify-center text-xs">
                  <FaStar /> {renderReviewsRating(s)}
                </div>
                <div className="text-sm text-gray-700 font-semibold mb-3 text-center">₱{s.pricePerNight?.toLocaleString?.()}/night</div>
                <div className="flex flex-wrap items-center justify-center gap-2 mb-3 text-xs text-gray-500">
                  {guestCapacity ? (
                    <span className="bg-gray-100 px-2 py-1 rounded-full">
                      {guestCapacity} {guestCapacity === 1 ? "Guest" : "Guests"}
                    </span>
                  ) : null}
                  {bedrooms ? (
                    <span className="bg-gray-100 px-2 py-1 rounded-full">
                      {bedrooms} {bedrooms === 1 ? "Bedroom" : "Bedrooms"}
                    </span>
                  ) : null}
                  {bathrooms !== null ? (
                    <span className="bg-gray-100 px-2 py-1 rounded-full">
                      {bathrooms} {bathrooms === 1 ? "Bathroom" : "Bathrooms"}
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-gray-500 mb-3 text-center">
                  {s.category === "Experience"
                    ? getListingDuration(s)
                      ? `Duration: ${getListingDuration(s)}${getListingGroupSize(s) ? ` • Group Size: ${getListingGroupSize(s)}` : ""}`
                      : getListingGroupSize(s)
                        ? `Group Size: ${getListingGroupSize(s)}`
                        : "Experience"
                    : s.category === "Service"
                      ? getListingServiceType(s) || getListingDuration(s)
                        ? `${getListingServiceType(s) ? `Service: ${getListingServiceType(s)}` : ""}${getListingDuration(s) ? ` • Duration: ${getListingDuration(s)}` : ""}`
                        : "Service"
                      : `Amenities: ${(s.amenities || []).slice(0, 2).join(", ")}`}
                </div>
                <div className="mt-auto grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleBookListing(s)}
                    className="bg-gold-500 hover:bg-gold-600 text-white px-4 py-2 rounded-lg shadow-md transition text-sm font-semibold"
                  >
                    Book Now
                  </button>
                  <button
                    onClick={() => handleMessageHost(s)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md transition flex items-center justify-center gap-1 text-sm font-semibold"
                  >
                    <FaEnvelope className="text-xs" /> Message
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        </div>

        {platformPolicy && (
          <div className="mt-12">
            <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FaGavel className="text-red-400" />
                Platform Policy
              </h3>
              <div className="grid gap-4 md:grid-cols-3 text-sm text-gray-700">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="font-semibold text-gray-900 uppercase text-xs tracking-wide mb-1">
                    Cancellation
                  </div>
                  <p>{platformPolicy.cancellation}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="font-semibold text-gray-900 uppercase text-xs tracking-wide mb-1">
                    House Rules
                  </div>
                  <p>{platformPolicy.rules}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="font-semibold text-gray-900 uppercase text-xs tracking-wide mb-1">
                    Support & Reports
                  </div>
                  <p>{platformPolicy.reports}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative">
              <button
                onClick={() => setShowShareModal(null)}
                className="absolute top-2 right-4 text-xl text-gray-400 hover:text-gold-500"
              >
                ×
              </button>
              <div className="text-center mb-6">
                <FaShareAlt className="text-4xl text-gold-400 mx-auto mb-2" />
                <h3 className="text-xl font-bold">Share {showShareModal.title}</h3>
                <p className="text-gray-500 text-sm">Choose how you'd like to share</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleShare(showShareModal, 'copy')}
                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 transition"
                >
                  <FaCopy className="text-gray-400" />
                  <span className="text-sm">Copy Link</span>
                </button>
                <button
                  onClick={() => handleShare(showShareModal, 'facebook')}
                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-blue-50 transition"
                >
                  <FaFacebook className="text-blue-500" />
                  <span className="text-sm">Facebook</span>
                </button>
                <button
                  onClick={() => handleShare(showShareModal, 'twitter')}
                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-blue-50 transition"
                >
                  <FaTwitter className="text-blue-400" />
                  <span className="text-sm">Twitter</span>
                </button>
                <button
                  onClick={() => handleShare(showShareModal, 'instagram')}
                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gold-50 transition"
                >
                  <FaInstagram className="text-gold-500" />
                  <span className="text-sm">Instagram</span>
                </button>
                <button
                  onClick={() => handleShare(showShareModal, 'whatsapp')}
                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-green-50 transition"
                >
                  <FaWhatsapp className="text-green-500" />
                  <span className="text-sm">WhatsApp</span>
                </button>
                <button
                  onClick={() => handleShare(showShareModal, 'telegram')}
                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-blue-50 transition"
                >
                  <FaTelegram className="text-blue-500" />
                  <span className="text-sm">Telegram</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Booking Share Modal */}
        {showBookingShareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative">
              <button
                onClick={() => setShowBookingShareModal(null)}
                className="absolute top-2 right-4 text-xl text-gray-400 hover:text-gold-500"
              >
                ×
              </button>
              <div className="text-center mb-6">
                <FaShareAlt className="text-4xl text-blue-400 mx-auto mb-2" />
                <h3 className="text-xl font-bold">Share Your Booking</h3>
                <p className="text-gray-500 text-sm">Let others know about your amazing stay!</p>
              </div>

              {/* Booking Preview */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <img src={showBookingShareModal.img} alt={showBookingShareModal.title} className="w-16 h-16 rounded-lg object-cover" />
                  <div className="flex-1">
                    <div className="font-semibold">{showBookingShareModal.title}</div>
                    <div className="text-sm text-gray-500">{showBookingShareModal.location}</div>
                    <div className="text-xs text-gray-400">
                      {showBookingShareModal.checkIn} to {showBookingShareModal.checkOut}
                    </div>
                    <div className="text-sm font-semibold text-gold-600">
                      ₱{showBookingShareModal.price?.toLocaleString()}/night
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleBookingShare(showBookingShareModal, 'copy')}
                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 transition"
                >
                  <FaCopy className="text-gray-400" />
                  <span className="text-sm">Copy Link</span>
                </button>
                <button
                  onClick={() => handleBookingShare(showBookingShareModal, 'facebook')}
                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-blue-50 transition"
                >
                  <FaFacebook className="text-blue-500" />
                  <span className="text-sm">Facebook</span>
                </button>
                <button
                  onClick={() => handleBookingShare(showBookingShareModal, 'twitter')}
                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-blue-50 transition"
                >
                  <FaTwitter className="text-blue-400" />
                  <span className="text-sm">Twitter</span>
                </button>
                <button
                  onClick={() => handleBookingShare(showBookingShareModal, 'instagram')}
                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gold-50 transition"
                >
                  <FaInstagram className="text-gold-500" />
                  <span className="text-sm">Instagram</span>
                </button>
                <button
                  onClick={() => handleBookingShare(showBookingShareModal, 'whatsapp')}
                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-green-50 transition"
                >
                  <FaWhatsapp className="text-green-500" />
                  <span className="text-sm">WhatsApp</span>
                </button>
                <button
                  onClick={() => handleBookingShare(showBookingShareModal, 'telegram')}
                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-blue-50 transition"
                >
                  <FaTelegram className="text-blue-500" />
                  <span className="text-sm">Telegram</span>
                </button>
              </div>

              <div className="mt-6 text-center">
                <p className="text-xs text-gray-400">
                  Share your booking experience with friends and family!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Booking Modal */}
        {showBookingModal && selectedListing && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg p-4 md:p-8 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowBookingModal(false)}
                className="absolute top-2 right-4 text-xl text-gray-400 hover:text-gold-500"
              >
                ×
              </button>
              
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-2xl font-bold">Book {selectedListing.title}</h3>
                  {selectedListing.category && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      selectedListing.category === 'Experience' ? 'bg-purple-100 text-purple-700' :
                      selectedListing.category === 'Service' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {selectedListing.category}
                    </span>
                  )}
                </div>
                <p className="text-gray-500">
                  {selectedListing.category === 'Experience' 
                    ? 'Book your experience date and time'
                    : selectedListing.category === 'Service'
                    ? 'Schedule your service appointment'
                    : 'Complete your booking details'}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Left side - Listing details */}
                <div>
                  <div className="relative overflow-hidden rounded-xl aspect-[4/3] bg-gray-100 mb-4">
                    <img src={selectedListing.img} alt={selectedListing.title} className="h-full w-full object-cover" />
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white bg-black/50 px-2 py-1 rounded-full text-xs">
                      <FaStar className="text-yellow-300" /> {renderReviewsRating(selectedListing)}
                    </div>
                    <div className="absolute bottom-3 right-3 bg-white/80 text-xs px-2 py-1 rounded-full font-medium">
                      {selectedListing.calendar || 'Available'}
                    </div>
                  </div>
                  {(selectedListing?.coordinates?.lat && selectedListing?.coordinates?.lng) || (selectedListing?.location || selectedListing?.title) ? (
                    <div className="mb-4">
                      <div className="overflow-hidden rounded-xl border">
                        <iframe
                          title={`map-${selectedListing.id}`}
                          src={
                            selectedListing?.coordinates?.lat && selectedListing?.coordinates?.lng
                              ? `https://www.google.com/maps?q=${encodeURIComponent(selectedListing.coordinates.lat)},${encodeURIComponent(selectedListing.coordinates.lng)}&z=14&output=embed`
                              : `https://www.google.com/maps?q=${encodeURIComponent(`${selectedListing?.title || ''} ${selectedListing?.location || ''}`.trim())}&z=14&output=embed`
                          }
                          className="w-full h-40"
                          loading="lazy"
                          allowFullScreen
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <div className="font-semibold text-lg">{selectedListing.title}</div>
                    <div className="text-gray-500">{selectedListing.location} • {selectedListing.category}</div>
                    <div className="text-sm text-gray-400">Hosted by {selectedListing.host}</div>
                    <div className="flex items-center gap-1">
                      {(selectedListing?.amenities || []).slice(0, 4).map((amenity, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                          {amenity}
                        </span>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600">
                      {selectedListing.category === "Experience" ? (
                        <>
                          {getListingDuration(selectedListing) && (
                            <div className="flex flex-col items-center justify-center bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-center min-w-[120px]">
                              <span className="text-[11px] uppercase tracking-wide text-gray-400">Duration</span>
                              <span className="font-semibold text-gray-800 text-sm">{getListingDuration(selectedListing)}</span>
                            </div>
                          )}
                          {getListingGroupSize(selectedListing) && (
                            <div className="flex flex-col items-center justify-center bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-center min-w-[120px]">
                              <span className="text-[11px] uppercase tracking-wide text-gray-400">Group Size</span>
                              <span className="font-semibold text-gray-800 text-sm">
                                {getListingGroupSize(selectedListing)} {getListingGroupSize(selectedListing) === 1 ? "person" : "people"}
                              </span>
                            </div>
                          )}
                        </>
                      ) : selectedListing.category === "Service" ? (
                        <>
                          {getListingServiceType(selectedListing) && (
                            <div className="flex flex-col items-center justify-center bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-center min-w-[120px]">
                              <span className="text-[11px] uppercase tracking-wide text-gray-400">Service Type</span>
                              <span className="font-semibold text-gray-800 text-sm">
                                {getListingServiceType(selectedListing)}
                              </span>
                            </div>
                          )}
                          {getListingDuration(selectedListing) && (
                            <div className="flex flex-col items-center justify-center bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-center min-w-[120px]">
                              <span className="text-[11px] uppercase tracking-wide text-gray-400">Duration</span>
                              <span className="font-semibold text-gray-800 text-sm">
                                {getListingDuration(selectedListing)}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                            <FaUsers className="text-gray-500" />
                            <div>
                              <div className="font-semibold text-gray-800 text-sm">
                                {getListingGuestCapacity(selectedListing)} {getListingGuestCapacity(selectedListing) === 1 ? "Guest" : "Guests"}
                              </div>
                              <div className="text-[11px] uppercase tracking-wide text-gray-400">Max Capacity</div>
                            </div>
                          </div>
                          {getListingBedrooms(selectedListing) && (
                            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 min-w-[120px]">
                              <FaBed className="text-gray-500" />
                              <div>
                                <div className="font-semibold text-gray-800 text-sm">
                                  {getListingBedrooms(selectedListing)} {getListingBedrooms(selectedListing) === 1 ? "Bedroom" : "Bedrooms"}
                                </div>
                                <div className="text-[11px] uppercase tracking-wide text-gray-400">Sleeping</div>
                              </div>
                            </div>
                          )}
                          {getListingBathrooms(selectedListing) !== null && (
                            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 min-w-[120px]">
                              <FaShower className="text-gray-500" />
                              <div>
                                <div className="font-semibold text-gray-800 text-sm">
                                  {getListingBathrooms(selectedListing)} {getListingBathrooms(selectedListing) === 1 ? "Bathroom" : "Bathrooms"}
                                </div>
                                <div className="text-[11px] uppercase tracking-wide text-gray-400">Bath</div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side - Booking form */}
                <div className="space-y-4">
                  {/* Booked dates warning */}
                  {getBookedDatesForListing(selectedListing.id).length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                      <div className="flex items-start gap-2">
                        <FaExclamationTriangle className="text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-semibold text-yellow-800 mb-1">Some dates are unavailable</div>
                          <div className="text-yellow-700 text-xs mb-2">
                            This property has existing bookings. Avoid these date ranges:
                          </div>
                          <div className="space-y-1">
                            {getBookedRanges(selectedListing.id).map((range, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs text-yellow-800">
                                <FaCalendarAlt className="text-yellow-600" />
                                <span className="font-medium">
                                  {range.displayCheckIn || new Date(range.checkIn).toLocaleDateString()} - {range.displayCheckOut || new Date(range.checkOut).toLocaleDateString()}
                                </span>
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                  Booked
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold mb-2">Select Dates</label>
                    <DateRangePicker
                      checkIn={bookingDates.checkIn}
                      checkOut={bookingDates.checkOut}
                      onChange={(dates) => setBookingDates(dates)}
                      minDate={new Date().toISOString().split('T')[0]}
                      bookedDates={selectedListing ? getBookedDatesForListing(selectedListing.id) : []}
                      bookedRanges={selectedListing ? getBookedRanges(selectedListing.id) : []}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Guests</label>
                    {selectedListing.category === "Experience" ? (
                      <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700">
                        Maximum group size:{" "}
                        <span className="font-semibold text-gray-900">
                          {getListingGroupSize(selectedListing) || getListingGuestCapacity(selectedListing)}{" "}
                          {(getListingGroupSize(selectedListing) || getListingGuestCapacity(selectedListing)) === 1 ? "person" : "people"}
                        </span>
                  </div>
                    ) : selectedListing.category === "Service" ? (
                      <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700">
                        Service type:{" "}
                        <span className="font-semibold text-gray-900">
                          {getListingServiceType(selectedListing) || "General"}
                        </span>
                      </div>
                    ) : (
                      <div className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700">
                        This listing is configured for up to{" "}
                        <span className="font-semibold text-gray-900">
                          {getListingGuestCapacity(selectedListing)}{" "}
                          {getListingGuestCapacity(selectedListing) === 1 ? "guest" : "guests"}
                        </span>.
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Wishlist (Optional)</label>
                    <textarea
                      value={bookingNotes}
                      onChange={(e) => setBookingNotes(e.target.value)}
                      placeholder="Any special requests or notes for your stay..."
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold-500 h-20 resize-none"
                    />
                  </div>

                  {/* Coupon Section */}
                  <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-4 border border-pink-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FaGift className="text-pink-500 text-lg" />
                        <span className="font-semibold text-gray-800">Have a coupon?</span>
                      </div>
                      {myCoupons.length > 0 && (
                        <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded-full font-medium">
                          {myCoupons.length} available
                        </span>
                      )}
                    </div>
                    
                    {appliedCoupon ? (
                      <div className="bg-white rounded-lg p-3 border-2 border-pink-300">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-pink-600">{appliedCoupon.discount}% OFF</span>
                              <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-medium">
                                {appliedCoupon.couponCode}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600">{appliedCoupon.couponName}</p>
                          </div>
                          <button
                            onClick={handleRemoveCoupon}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            <FaTimes />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowRewardsModal(true)}
                        className="w-full bg-white border-2 border-dashed border-pink-300 rounded-lg px-4 py-3 text-sm text-gray-600 hover:border-pink-400 hover:bg-pink-50 transition flex items-center justify-center gap-2"
                      >
                        <FaGift className="text-pink-500" />
                        {myCoupons.length > 0 ? 'Select a coupon' : 'No coupons available yet'}
                      </button>
                    )}
                  </div>

                  {/* Booking Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="font-semibold mb-2">Booking Summary</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>
                          {selectedListing.category === 'Experience' 
                            ? `₱${(selectedListing.pricePerNight || selectedListing.price || 0).toLocaleString()} per experience`
                            : selectedListing.category === 'Service'
                            ? `₱${(selectedListing.pricePerNight || selectedListing.price || 0).toLocaleString()} per service`
                            : `₱${(selectedListing.pricePerNight || 0).toLocaleString()} × ${bookingDates.checkIn && bookingDates.checkOut ? Math.ceil((new Date(bookingDates.checkOut) - new Date(bookingDates.checkIn)) / (1000 * 60 * 60 * 24)) : 0} nights`}
                        </span>
                        <span>₱{calculateSubtotal().toLocaleString()}</span>
                      </div>
                      {appliedCoupon && (
                        <div className="flex justify-between text-pink-600 font-medium">
                          <span>Discount ({appliedCoupon.discount}%)</span>
                          <span>-₱{calculateDiscount().toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Service fee</span>
                        <span>₱{Math.round(calculateBookingTotal() * 0.1).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-1">
                        <span>Total</span>
                        <span className={appliedCoupon ? 'text-pink-600' : ''}>
                          ₱{(calculateBookingTotal() + Math.round(calculateBookingTotal() * 0.1)).toLocaleString()}
                        </span>
                      </div>
                      {appliedCoupon && (
                        <div className="text-xs text-green-600 font-medium flex items-center gap-1 justify-end">
                          <FaGift />
                          You saved ₱{calculateDiscount().toLocaleString()}!
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowBookingModal(false)}
                      className="flex-1 border border-gray-300 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmBooking}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition font-semibold flex items-center justify-center gap-2 shadow-md"
                    >
                      <FaCreditCard className="text-lg" />
                      Pay with PayPal
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* My Rewards Modal */}
        {showRewardsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-6 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                      <FaGift className="text-white text-xl" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">My Rewards</h3>
                      <p className="text-sm text-gray-600">Use your coupons to save on bookings</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowRewardsModal(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition"
                  >
                    <FaTimes className="text-gray-600 text-xl" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg p-4">
                    <p className="text-sm font-medium text-pink-700">Available Coupons</p>
                    <p className="text-3xl font-bold text-pink-900">{myCoupons.length}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                    <p className="text-sm font-medium text-purple-700">Total Bookings</p>
                    <p className="text-3xl font-bold text-purple-900">{bookings.length}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-700">Potential Savings</p>
                    <p className="text-3xl font-bold text-green-900">
                      {Math.max(...myCoupons.map(c => c.discount), 0)}%
                    </p>
                  </div>
                </div>

                {/* How to Earn More */}
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <FaGift className="text-blue-600" />
                    How to Earn More Rewards
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Complete more bookings to unlock better discount tiers</li>
                    <li>• Hosts automatically give you coupons based on your booking history</li>
                    <li>• Higher booking counts = Better discounts!</li>
                  </ul>
                </div>

                {/* Coupons List */}
                {myCoupons.length > 0 ? (
                  <div className="space-y-4">
                    <h4 className="font-bold text-lg text-gray-900">Your Available Coupons</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myCoupons.map((coupon) => (
                        <div 
                          key={coupon.id}
                          className="border-2 border-pink-200 rounded-xl p-5 bg-gradient-to-br from-white to-pink-50 hover:shadow-lg transition cursor-pointer"
                          onClick={() => showBookingModal && handleApplyCoupon(coupon)}
                        >
                          {/* Discount Badge */}
                          <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg p-4 mb-4">
                            <div className="text-center">
                              <p className="text-4xl font-bold">{coupon.discount}%</p>
                              <p className="text-sm">OFF</p>
                            </div>
                          </div>

                          {/* Coupon Details */}
                          <div className="space-y-2">
                            <h5 className="font-bold text-lg text-gray-900">{coupon.couponName}</h5>
                            <p className="text-sm text-gray-600">{coupon.description}</p>
                            
                            <div className="bg-white rounded-lg p-3 border">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-gray-500">Coupon Code</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(coupon.couponCode);
                                    alert('Code copied!');
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-700"
                                >
                                  <FaCopy className="inline mr-1" />
                                  Copy
                                </button>
                              </div>
                              <p className="font-mono font-bold text-purple-600 text-center text-lg">
                                {coupon.couponCode}
                              </p>
                            </div>

                            <div className="flex items-center justify-between text-xs text-gray-600">
                              <span className="flex items-center gap-1">
                                <FaClock />
                                Valid until: {new Date(coupon.validUntil).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}
                              </span>
                            </div>

                            <div className="text-xs text-gray-500">
                              From: <span className="font-semibold">{coupon.guestEmail?.split('@')[0] || 'Host'}</span>
                            </div>
                          </div>

                          {/* Apply Button */}
                          {showBookingModal && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApplyCoupon(coupon);
                              }}
                              className="w-full mt-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-3 rounded-lg hover:from-pink-600 hover:to-purple-600 transition font-semibold flex items-center justify-center gap-2"
                            >
                              <FaGift />
                              Apply to Booking
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FaGift className="text-6xl mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold mb-2 text-gray-700">No Rewards Yet</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Complete more bookings to earn discount coupons from hosts!
                    </p>
                    <div className="bg-purple-50 rounded-lg p-4 max-w-md mx-auto">
                      <p className="text-sm text-purple-800">
                        <strong>Tip:</strong> Many hosts give automatic rewards after your 1st, 3rd, and 5th bookings!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-gray-50 border-t p-4">
                <button
                  onClick={() => setShowRewardsModal(false)}
                  className="w-full bg-gray-800 text-white px-6 py-3 rounded-lg hover:bg-gray-900 transition font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Booking Confirmation Modal */}
        {showBookingConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative text-center">
              <button
                onClick={handleCloseBookingConfirmation}
                className="absolute top-2 right-4 text-xl text-gray-400 hover:text-gold-500"
              >
                ×
              </button>
              
              <div className="mb-6">
                <div className="w-16 h-16 bg-gold-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaThumbsUp className="text-2xl text-gold-500" />
                </div>
                <h3 className="text-2xl font-bold text-gold-600 mb-2">Booking Confirmed!</h3>
                <p className="text-gray-500">Your booking has been successfully processed.</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                <div className="font-semibold mb-2">Booking Details</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Property:</span>
                    <span className="font-medium">{bookings?.[0]?.title || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Check-in:</span>
                    <span className="font-medium">{bookings?.[0]?.checkIn || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Check-out:</span>
                    <span className="font-medium">{bookings?.[0]?.checkOut || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Guests:</span>
                    <span className="font-medium">{bookings?.[0]?.guests || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-1">
                    <span>Total:</span>
                    <span>₱{bookings?.[0]?.total?.toLocaleString() || '0'}</span>
                  </div>
                </div>
              </div>

              {/* After Stay Rating Reminder */}
              <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-6 mb-6 text-left relative overflow-hidden">
                {/* Decorative background stars */}
                <div className="absolute -right-2 -top-2 text-yellow-200 opacity-20 transform rotate-12">
                  <FaStar className="text-6xl" />
                </div>
                <div className="absolute -left-2 -bottom-2 text-yellow-200 opacity-20 transform -rotate-12">
                  <FaStar className="text-6xl" />
                </div>
                
                <div className="relative">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-yellow-400 p-2 rounded-full">
                      <FaStar className="text-2xl text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-yellow-800">Don't Forget to Rate Your Stay!</h4>
                      <div className="text-yellow-700">Your review helps the community</div>
                    </div>
                  </div>
                  
                  <div className="pl-12">
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-white text-sm">1</div>
                        <span className="text-yellow-700">Complete your stay</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-white text-sm">2</div>
                        <span className="text-yellow-700">Share your experience</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-white text-sm">3</div>
                        <span className="text-yellow-700">Help others discover great stays</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-lg text-yellow-400">
                      <FaStar />
                      <FaStar />
                      <FaStar />
                      <FaStar />
                      <FaStar />
                      <span className="text-sm text-yellow-600 ml-2">Rate 1-5 stars</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center mt-4">
              <button
                onClick={handleCloseBookingConfirmation}
                className="bg-gold-500 text-white font-semibold px-6 py-3 rounded-lg hover:bg-red-600 transition w-48 text-center"
              >
                Close
              </button>
              </div>
            </div>
          </div>
        )}

        {/* PayPal Payment Modal */}
        {showPayPalPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative">
              <button
                onClick={() => setShowPayPalPayment(false)}
                className="absolute top-2 right-4 text-xl text-gray-400 hover:text-blue-500"
              >
                ×
              </button>
              
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaCreditCard className="text-2xl text-blue-500" />
                </div>
                <h3 className="text-xl font-bold">PayPal Payment</h3>
                <p className="text-gray-500">Complete your booking payment</p>
                <div className="text-2xl font-bold text-blue-600 mt-2">₱{paymentAmount.toLocaleString()}</div>
              </div>

              <div className="mb-6">
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="text-sm text-gray-600 mb-2">Payment Details</div>
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span className="font-semibold">₱{paymentAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Currency:</span>
                    <span className="font-semibold">PHP</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Method:</span>
                    <span className="font-semibold">PayPal</span>
                  </div>
                </div>
              </div>

              {/* PayPal Button Container */}
              <div id="paypal-button-container" className="mb-4">
                <div className="text-center text-gray-500 text-sm py-4">
                  Loading PayPal buttons...
                </div>
              </div>

              {/* Wallet Payment Button */}
              <div className="mt-2 text-center">
                <button
                  onClick={async () => {
                    // Check if wallet has sufficient balance
                    if (!checkPayPalBalance(paymentAmount)) {
                      return; // checkPayPalBalance already shows alert
                    }

                    try {
                      // Deduct from wallet balance
                      const newBalance = paypalBalance - paymentAmount;
                      setPaypalBalance(newBalance);
                      await savePayPalBalance(newBalance);

                      // Generate transaction ID
                      const transactionId = 'WALLET_' + Date.now();

                      // Save transaction to history
                      await saveTransaction({
                        type: 'Booking Payment',
                        amount: -paymentAmount,
                        currency: 'PHP',
                        transactionId: transactionId,
                        balanceBefore: paypalBalance,
                        balanceAfter: newBalance,
                        status: 'Completed',
                        description: selectedListing ? `Payment for ${selectedListing.title}` : 'Booking Payment',
                        listingTitle: selectedListing?.title || '',
                        checkIn: bookingDates.checkIn,
                        checkOut: bookingDates.checkOut
                      });

                      // Close payment modal
                      setShowPayPalPayment(false);

                      // Process booking after successful wallet payment
                      await processBookingAfterPayment(transactionId);

                      // Show success alert
                      showAlert('success', 'Payment successful!', '', [
                        `Transaction ID: ${transactionId}`,
                        `Amount: ₱${paymentAmount.toLocaleString()} PHP`,
                        `New Balance: ₱${newBalance.toLocaleString()} PHP`
                      ]);
                    } catch (error) {
                      console.error('Error processing wallet payment:', error);
                      showAlert('error', 'Payment Failed', 'There was an error processing your wallet payment.', [
                        'Please try again',
                        'If the problem persists, contact support'
                      ]);
                    }
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition mr-2"
                >
                  💳 Wallet (₱{paymentAmount.toLocaleString()})
                </button>
              </div>

              <div className="text-center mt-4">
                <p className="text-xs text-gray-400">
                  Secure payment powered by PayPal
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  PayPal buttons may take a moment to load
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Messages Modal */}
        {showMessages && selectedHost && (
          <Messages
            isOpen={showMessages}
            onClose={() => {
              setShowMessages(false);
              setSelectedHost(null);
              setSelectedProperty(null);
            }}
            currentUser={auth.currentUser}
            otherUser={selectedHost}
            userType="guest"
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
            userType="guest"
          />
        )}

        {/* Transaction History Modal */}
        {showTransactionHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FaHistory className="text-3xl" />
                    <div>
                      <h3 className="text-2xl font-bold">Transaction History</h3>
                      <p className="text-blue-50 text-sm mt-1">{transactions.length} transactions</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowTransactionHistory(false)}
                    className="text-white hover:text-gray-200 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Transaction List */}
              <div className="flex-1 overflow-y-auto p-6">
                {transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <FaHistory className="text-6xl text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No transactions yet</p>
                    <p className="text-gray-400 text-sm mt-2">Your transaction history will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {transactions.map((transaction, index) => (
                      <div
                        key={transaction.id || index}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4 flex-1">
                            {/* Icon */}
                            <div className={`p-3 rounded-full ${
                              transaction.type === 'Cash-In'
                                ? 'bg-green-100 text-green-600'
                                : transaction.type === 'Booking Payment'
                                ? 'bg-blue-100 text-blue-600'
                                : transaction.type === 'Refund'
                                ? 'bg-orange-100 text-orange-600'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {transaction.type === 'Cash-In' ? (
                                <FaWallet className="text-xl" />
                              ) : transaction.type === 'Booking Payment' ? (
                                <FaCreditCard className="text-xl" />
                              ) : transaction.type === 'Refund' ? (
                                <FaHistory className="text-xl" />
                              ) : (
                                <FaHistory className="text-xl" />
                              )}
                            </div>

                            {/* Details */}
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className="font-bold text-gray-900">{transaction.type}</h4>
                                  <p className="text-sm text-gray-600">{transaction.description}</p>
                                  {transaction.listingTitle && (
                                    <p className="text-xs text-gray-500 mt-1">📍 {transaction.listingTitle}</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className={`text-xl font-bold ${
                                    (Number(transaction.amount) || 0) > 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {(Number(transaction.amount) || 0) > 0 ? '+' : ''}₱{Math.abs(Number(transaction.amount) || 0).toLocaleString()} PHP
                                  </div>
                                </div>
                              </div>

                              {/* Transaction Info */}
                              <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                                <div className="bg-gray-50 p-2 rounded">
                                  <span className="text-gray-500">Transaction ID:</span>
                                  <p className="font-mono font-semibold text-gray-700 truncate">{transaction.transactionId}</p>
                                </div>
                                <div className="bg-gray-50 p-2 rounded">
                                  <span className="text-gray-500">Date:</span>
                                  <p className="font-semibold text-gray-700">
                                    {new Date(transaction.createdAt).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                                {transaction.checkIn && (
                                  <div className="bg-gray-50 p-2 rounded">
                                    <span className="text-gray-500">Check-in:</span>
                                    <p className="font-semibold text-gray-700">{transaction.checkIn}</p>
                                  </div>
                                )}
                                {transaction.checkOut && (
                                  <div className="bg-gray-50 p-2 rounded">
                                    <span className="text-gray-500">Check-out:</span>
                                    <p className="font-semibold text-gray-700">{transaction.checkOut}</p>
                                  </div>
                                )}
                                {transaction.balanceAfter !== undefined && transaction.balanceAfter !== null && (
                                  <div className="bg-gray-50 p-2 rounded">
                                    <span className="text-gray-500">Balance After:</span>
                                    <p className="font-semibold text-gray-700">₱{Number(transaction.balanceAfter || 0).toLocaleString()}</p>
                                  </div>
                                )}
                                {transaction.balanceBefore !== undefined && transaction.balanceBefore !== null && (
                                  <div className="bg-gray-50 p-2 rounded">
                                    <span className="text-gray-500">Balance Before:</span>
                                    <p className="font-semibold text-gray-700">₱{Number(transaction.balanceBefore || 0).toLocaleString()}</p>
                                  </div>
                                )}
                                <div className="bg-gray-50 p-2 rounded">
                                  <span className="text-gray-500">Status:</span>
                                  <p className={`font-semibold inline-flex items-center ${
                                    transaction.status === 'Completed' ? 'text-green-600' : 'text-yellow-600'
                                  }`}>
                                    {transaction.status}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 bg-gray-50 border-t">
                <button
                  onClick={() => setShowTransactionHistory(false)}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Alert Modal */}
        {showCustomAlert && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden animate-fadeIn">
              {/* Header with Icon */}
              <div className={`p-6 ${
                customAlertData.type === 'success' 
                  ? 'bg-gradient-to-r from-gold-500 to-gold-600' 
                  : customAlertData.type === 'error'
                  ? 'bg-gradient-to-r from-red-500 to-red-600'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600'
              } text-white`}>
                <div className="flex items-center gap-4">
                  <div className="bg-white bg-opacity-20 p-3 rounded-full">
                    {customAlertData.type === 'success' ? (
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : customAlertData.type === 'error' ? (
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold">{customAlertData.title}</h3>
                    {customAlertData.message && (
                      <p className="text-white text-opacity-90 mt-1">{customAlertData.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Details */}
              {customAlertData.details && customAlertData.details.length > 0 && (
                <div className="p-6 bg-gray-50">
                  <div className="space-y-3">
                    {customAlertData.details.map((detail, index) => (
                      <div key={index} className="flex items-start gap-3 bg-white p-3 rounded-lg shadow-sm">
                        <div className={`mt-0.5 ${
                          customAlertData.type === 'success' 
                            ? 'text-gold-600' 
                            : customAlertData.type === 'error'
                            ? 'text-red-600'
                            : 'text-blue-600'
                        }`}>
                          {customAlertData.type === 'success' ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <p className="text-gray-700 flex-1 font-medium">{detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Button */}
              <div className="p-6 bg-white">
                <button
                  onClick={() => setShowCustomAlert(false)}
                  className={`w-full py-3 px-6 rounded-lg font-bold text-white transition shadow-lg ${
                    customAlertData.type === 'success'
                      ? 'bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700'
                      : customAlertData.type === 'error'
                      ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                  }`}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
       
      </div>
    </div>
    
  );
}

export default GuestPage;
