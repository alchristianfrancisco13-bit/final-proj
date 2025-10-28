import { useState, useEffect } from "react";
import { 
  collection, addDoc, doc, updateDoc, getDocs, query, 
  where, onSnapshot, Timestamp, serverTimestamp, getDoc,
  increment, arrayUnion 
} from "firebase/firestore";
import { db, auth } from "./firebase";
import { 
  FaHeart, FaSearch, FaWallet, FaListAlt, FaUserCircle, FaStar, FaShareAlt, FaTrash, 
  FaRegCalendarAlt, FaRegCommentDots, FaCamera, FaSignOutAlt, FaFilter, FaMapMarkerAlt, 
  FaUsers, FaCalendarAlt, FaPhone, FaEnvelope, FaFacebook, FaTwitter, FaInstagram, 
  FaWhatsapp, FaTelegram, FaCopy, FaEye, FaEyeSlash, FaCog, FaBookmark, FaHistory,
  FaGift, FaThumbsUp, FaLocationArrow, FaWifi, FaCar, FaSwimmingPool, FaUtensils,
  FaTv, FaShower, FaBed, FaParking, FaLock, FaFire, FaSnowflake, FaUmbrella, FaCreditCard,
  FaKey, FaSpinner
} from "react-icons/fa";
import { updateEmail, sendEmailVerification, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { updateListingMetrics } from "./utils/listingMetrics";
import Messages from "./components/Messages";
import ChatList from "./components/ChatList";

function GuestPage({ onLogout }) {

  useEffect(() => {
    document.title = "Guest Dashboard - StayHub";
  }, []);

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
              email: userData.email || auth.currentUser?.email || "Loading..."
            }));
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
      where("status", "in", ["Upcoming", "Completed"]) // Only get real bookings
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

        // Determine booking status
        const checkInDate = new Date(booking.checkIn);
        checkInDate.setHours(0, 0, 0, 0);
        booking.status = checkInDate < currentDate ? "Completed" : "Upcoming";
        return booking;
      });

      // Sort by checkIn date, upcoming first
      bookingsData.sort((a, b) => {
        if (a.status === b.status) {
          return new Date(b.checkIn) - new Date(a.checkIn);
        }
        return a.status === "Upcoming" ? -1 : 1;
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
  const [search, setSearch] = useState("");
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
  const [showWishlist, setShowWishlist] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [guestCount, setGuestCount] = useState(2);
  const [dateFilter, setDateFilter] = useState("Any week");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [showShareModal, setShowShareModal] = useState(null);
  const [showBookingShareModal, setShowBookingShareModal] = useState(null);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [eWalletBalance, setEWalletBalance] = useState(15000);
  const [showEWallet, setShowEWallet] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [bookingDates, setBookingDates] = useState({ checkIn: '', checkOut: '' });
  const [bookingGuests, setBookingGuests] = useState(2);
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

  // Edit Profile Modal states
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({ ...profile });
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [emailChangeData, setEmailChangeData] = useState({ newEmail: "", password: "", verificationSent: false });
  const [emailChangeError, setEmailChangeError] = useState("");
  const [emailChangeLoading, setEmailChangeLoading] = useState(false);

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
        // Update Firestore
        await updateDoc(doc(db, "users", userId), {
          name: editProfileData.name,
          phone: editProfileData.phone,
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

  // Add to favorites
  const handleAddFavorite = (listing) => {
    if (!favorites.find((fav) => fav.id === listing.id)) {
      setFavorites([...favorites, listing]);
    }
  };

  const isFavorited = (id) => favorites.some((f) => f.id === id);

  const toggleFavorite = (listing) => {
    if (isFavorited(listing.id)) {
      handleRemoveFavorite(listing.id);
    } else {
      handleAddFavorite(listing);
    }
  };

  // Remove from favorites
  const handleRemoveFavorite = (id) => {
    setFavorites(favorites.filter((fav) => fav.id !== id));
  };

  // Handle opening the rating modal
  const handleOpenRating = (booking) => {
    setSelectedBookingToRate(booking);
    setRating(0);
    setReview("");
    setShowRatingModal(true);
  };

  // Handle submitting the rating
  const handleSubmitRating = async () => {
    if (!selectedBookingToRate || rating === 0) {
      alert("Please select a rating before submitting");
      return;
    }

    try {
      // Create a review object
      const reviewObj = {
        rating: rating,
        review: review,
        guestId: auth.currentUser.uid,
        guestName: profile.name,
        guestAvatar: profile.avatar,
        date: serverTimestamp(),
        bookingId: selectedBookingToRate.id
      };

      // Get the listing document from Firestore
      const listingRef = doc(db, "hostListings", selectedBookingToRate.listingId);
      const listingDoc = await getDoc(listingRef);

      if (listingDoc.exists()) {
        const listingData = listingDoc.data();
        const currentRating = listingData.rating || 0;
        const currentNumReviews = listingData.numReviews || 0;
        
        // Calculate new average rating
        const newNumReviews = currentNumReviews + 1;
        const newRating = ((currentRating * currentNumReviews) + rating) / newNumReviews;
        
        // Update the listing document
        await updateDoc(listingRef, {
          rating: parseFloat(newRating.toFixed(1)),
          numReviews: newNumReviews,
          reviews: arrayUnion(reviewObj),
          updatedAt: serverTimestamp()
        });

        // Update the booking document to mark as rated
        const bookingRef = doc(db, "bookings", selectedBookingToRate.id);
        await updateDoc(bookingRef, {
          hasRated: true,
          rating: rating,
          review: review,
          reviewDate: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Update local bookings state
        const updatedBookings = bookings.map(booking => {
          if (booking.id === selectedBookingToRate.id) {
            return {
              ...booking,
              hasRated: true,
              rating: rating,
              review: review
            };
          }
          return booking;
        });
        setBookings(updatedBookings);

        setShowRatingModal(false);
        setSelectedBookingToRate(null);
        setRating(0);
        setReview("");
        alert("Thank you for your rating!");
      } else {
        alert("Error: Could not find the listing to rate");
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      alert("Sorry, there was an error submitting your rating. Please try again.");
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

  // Simulate e-wallet payment
  const handlePay = () => {
    alert("Redirecting to e-wallet payment...");
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
    { 
      id: "L-001", 
      title: "Cozy Home in Tagaytay", 
      category: "Home", 
      img: "/images/cozy home.jpg", 
      location: "Tagaytay", 
      amenities: ["Wifi", "Parking", "Kitchen", "AC", "TV", "Shower"], 
      reviews: 4.8, 
      calendar: "Available", 
      pricePerNight: 2990,
      host: "Maria Santos",
      description: "Beautiful cozy home with stunning views of Taal Lake. Perfect for families and couples.",
      photos: [
        "/images/cozy home.jpg",
        "/images/cozy home.jpg",
        "/images/cozy home.jpg"
      ],
      coordinates: { lat: 14.1000, lng: 120.9333 }
    },
    { 
      id: "L-002", 
      title: "Beachfront Experience", 
      category: "Experience", 
      img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop", 
      location: "Batangas", 
      amenities: ["Pool", "Breakfast", "Beach Access", "Parking", "Wifi", "Restaurant"], 
      reviews: 4.5, 
      calendar: "Available", 
      pricePerNight: 4590,
      host: "Juan Dela Cruz",
      description: "Luxurious beachfront resort with private beach access and infinity pool.",
      photos: [
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=1200&auto=format&fit=crop"
      ],
      coordinates: { lat: 13.7563, lng: 121.0583 }
    },
    { 
      id: "L-003", 
      title: "City Service Apartment", 
      category: "Service", 
      img: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1200&auto=format&fit=crop", 
      location: "Makati", 
      amenities: ["AC", "Kitchen", "Wifi", "Parking", "Gym", "Concierge"], 
      reviews: 4.2, 
      calendar: "Few slots", 
      pricePerNight: 3490,
      host: "Anna Rodriguez",
      description: "Modern serviced apartment in the heart of Makati business district.",
      photos: [
        "https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1200&auto=format&fit=crop"
      ],
      coordinates: { lat: 14.5547, lng: 121.0244 }
    },
    { 
      id: "L-004", 
      title: "Mountain Cabin Retreat", 
      category: "Home", 
      img: "https://i.pinimg.com/1200x/3e/33/52/3e33528c3a3b29eda603176716c2de01.jpg", 
      location: "Baguio", 
      amenities: ["Fireplace", "Wifi", "Kitchen", "Parking", "Mountain View", "Hot Tub"], 
      reviews: 4.9, 
      calendar: "Available", 
      pricePerNight: 3990,
      host: "Carlos Mountain",
      description: "Cozy mountain cabin with fireplace and stunning mountain views.",
      photos: [
        "https://i.pinimg.com/1200x/3e/33/52/3e33528c3a3b29eda603176716c2de01.jpg",
        "https://i.pinimg.com/1200x/3e/33/52/3e33528c3a3b29eda603176716c2de01.jpg",
        "https://i.pinimg.com/1200x/3e/33/52/3e33528c3a3b29eda603176716c2de01.jpg"
      ],
      coordinates: { lat: 16.4023, lng: 120.5960 }
    },
    { 
      id: "L-005", 
      title: "Luxury Villa Experience", 
      category: "Experience", 
      img: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1200&auto=format&fit=crop", 
      location: "Boracay", 
      amenities: ["Private Pool", "Beach Access", "Butler Service", "Spa", "Restaurant", "Wifi"], 
      reviews: 4.7, 
      calendar: "Available", 
      pricePerNight: 8990,
      host: "Island Resorts",
      description: "Exclusive luxury villa with private pool and butler service.",
      photos: [
        "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=1200&auto=format&fit=crop"
      ],
      coordinates: { lat: 11.9674, lng: 121.9248 }
    },
    // Beach Properties
    { 
      id: "L-006", 
      title: "Oceanfront Beach House", 
      category: "Beach", 
      img: "https://i.pinimg.com/736x/ca/87/83/ca87837c7fb51bdccf04a3327b8a98a1.jpg", 
      location: "La Union", 
      amenities: ["Beach Access", "Ocean View", "Surfboard", "Wifi", "Kitchen", "Parking"], 
      reviews: 4.9, 
      calendar: "Available", 
      pricePerNight: 3990,
      host: "Surf Paradise",
      description: "Stunning beachfront house with direct ocean access and surf lessons included.",
      photos: [
        "https://i.pinimg.com/736x/ca/87/83/ca87837c7fb51bdccf04a3327b8a98a1.jpg",
        "https://i.pinimg.com/736x/ca/87/83/ca87837c7fb51bdccf04a3327b8a98a1.jpg",
        "https://i.pinimg.com/736x/ca/87/83/ca87837c7fb51bdccf04a3327b8a98a1.jpg"
      ],
      coordinates: { lat: 16.4023, lng: 120.5960 }
    },
    { 
      id: "L-007", 
      title: "Tropical Beach Resort", 
      category: "Beach", 
      img: "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?q=80&w=1200&auto=format&fit=crop", 
      location: "Palawan", 
      amenities: ["Private Beach", "Snorkeling", "Kayak", "Restaurant", "Spa", "Wifi"], 
      reviews: 4.8, 
      calendar: "Few slots", 
      pricePerNight: 5990,
      host: "Tropical Paradise",
      description: "Luxurious beach resort with private beach and water activities included.",
      photos: [
        "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=1200&auto=format&fit=crop"
      ],
      coordinates: { lat: 9.8349, lng: 118.7384 }
    },
    { 
      id: "L-008", 
      title: "Seaside Cottage", 
      category: "Beach", 
      img: "https://i.pinimg.com/1200x/8a/b9/a3/8ab9a3c7f732ecff6d44db67c94861c2.jpg", 
      location: "Siargao", 
      amenities: ["Beachfront", "Fishing", "Boat", "Wifi", "Kitchen", "AC"], 
      reviews: 4.6, 
      calendar: "Available", 
      pricePerNight: 3490,
      host: "Island Life",
      description: "Cozy seaside cottage perfect for fishing and island hopping adventures.",
      photos: [
        "https://i.pinimg.com/1200x/8a/b9/a3/8ab9a3c7f732ecff6d44db67c94861c2.jpg",
        "https://i.pinimg.com/1200x/8a/b9/a3/8ab9a3c7f732ecff6d44db67c94861c2.jpg",
        "https://i.pinimg.com/1200x/8a/b9/a3/8ab9a3c7f732ecff6d44db67c94861c2.jpg"
      ],
      coordinates: { lat: 9.9133, lng: 126.0519 }
    },
    // Countryside Properties
    { 
      id: "L-009", 
      title: "Farmhouse Retreat", 
      category: "Countryside", 
      img: "https://i.pinimg.com/1200x/07/2f/a6/072fa605a9deed3f4610ae555337c272.jpg", 
      location: "Baguio", 
      amenities: ["Farm Tour", "Fresh Produce", "Hiking", "Fireplace", "Wifi", "Parking"], 
      reviews: 4.8, 
      calendar: "Available", 
      pricePerNight: 2490,
      host: "Mountain Farm",
      description: "Authentic farmhouse experience with fresh organic produce and farm activities.",
      photos: [
        "https://i.pinimg.com/1200x/07/2f/a6/072fa605a9deed3f4610ae555337c272.jpg",
        "https://i.pinimg.com/1200x/07/2f/a6/072fa605a9deed3f4610ae555337c272.jpg",
        "https://i.pinimg.com/1200x/07/2f/a6/072fa605a9deed3f4610ae555337c272.jpg"
      ],
      coordinates: { lat: 16.4023, lng: 120.5960 }
    },
    { 
      id: "L-010", 
      title: "Vineyard Villa", 
      category: "Countryside", 
      img: "https://i.pinimg.com/1200x/f4/03/88/f4038843a473a2a1adb32d7d644654a8.jpg", 
      location: "Tagaytay", 
      amenities: ["Wine Tasting", "Vineyard Tour", "Garden", "Wifi", "Kitchen", "Parking"], 
      reviews: 4.7, 
      calendar: "Available", 
      pricePerNight: 4590,
      host: "Vineyard Estate",
      description: "Elegant villa in a working vineyard with wine tasting and vineyard tours.",
      photos: [
        "https://i.pinimg.com/1200x/f4/03/88/f4038843a473a2a1adb32d7d644654a8.jpg",
        "https://i.pinimg.com/1200x/f4/03/88/f4038843a473a2a1adb32d7d644654a8.jpg",
        "https://i.pinimg.com/1200x/f4/03/88/f4038843a473a2a1adb32d7d644654a8.jpg"
      ],
      coordinates: { lat: 14.1000, lng: 120.9333 }
    },
    { 
      id: "L-011", 
      title: "Rural Cabin", 
      category: "Countryside", 
      img: "https://i.pinimg.com/736x/2b/2b/70/2b2b70447b921a04ecc9653d47fef00a.jpg", 
      location: "Sagada", 
      amenities: ["Nature Hiking", "Cave Tour", "Bonfire", "Wifi", "Kitchen", "Hot Tub"], 
      reviews: 4.9, 
      calendar: "Few slots", 
      pricePerNight: 1990,
      host: "Mountain Guide",
      description: "Rustic cabin in the mountains with hiking trails and cave exploration.",
      photos: [
        "https://i.pinimg.com/736x/2b/2b/70/2b2b70447b921a04ecc9653d47fef00a.jpg",
        "https://i.pinimg.com/736x/2b/2b/70/2b2b70447b921a04ecc9653d47fef00a.jpg",
        "https://i.pinimg.com/736x/2b/2b/70/2b2b70447b921a04ecc9653d47fef00a.jpg"
      ],
      coordinates: { lat: 17.0833, lng: 120.9000 }
    },
    // City Properties
    { 
      id: "L-012", 
      title: "Modern City Loft", 
      category: "City", 
      img: "https://i.pinimg.com/1200x/35/9b/a2/359ba239412baf9e0132ee49bb4c2ff7.jpg", 
      location: "Makati", 
      amenities: ["City View", "Gym", "Concierge", "Wifi", "AC", "Parking"], 
      reviews: 4.5, 
      calendar: "Available", 
      pricePerNight: 2990,
      host: "Urban Living",
      description: "Stylish loft in the heart of Makati with stunning city views and modern amenities.",
      photos: [
        "https://i.pinimg.com/1200x/35/9b/a2/359ba239412baf9e0132ee49bb4c2ff7.jpg",
        "https://i.pinimg.com/1200x/35/9b/a2/359ba239412baf9e0132ee49bb4c2ff7.jpg",
        "https://i.pinimg.com/1200x/35/9b/a2/359ba239412baf9e0132ee49bb4c2ff7.jpg"
      ],
      coordinates: { lat: 14.5547, lng: 121.0244 }
    },
    { 
      id: "L-013", 
      title: "Business District Suite", 
      category: "City", 
      img: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=1200&auto=format&fit=crop", 
      location: "BGC", 
      amenities: ["Business Center", "Meeting Room", "Wifi", "AC", "Restaurant", "Parking"], 
      reviews: 4.6, 
      calendar: "Available", 
      pricePerNight: 3990,
      host: "Business Suites",
      description: "Professional suite in BGC perfect for business travelers with meeting facilities.",
      photos: [
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1200&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1200&auto=format&fit=crop"
      ],
      coordinates: { lat: 14.5547, lng: 121.0244 }
    },
    { 
      id: "L-014", 
      title: "Historic City Apartment", 
      category: "City", 
      img: "https://i.pinimg.com/1200x/fd/e6/b8/fde6b837c576c2a2d4dc890eb706d854.jpg", 
      location: "Intramuros", 
      amenities: ["Historic Area", "Museum Access", "Wifi", "AC", "Kitchen", "Parking"], 
      reviews: 4.4, 
      calendar: "Available", 
      pricePerNight: 2490,
      host: "Historic Manila",
      description: "Charming apartment in historic Intramuros with easy access to museums and landmarks.",
      photos: [
        "https://i.pinimg.com/1200x/fd/e6/b8/fde6b837c576c2a2d4dc890eb706d854.jpg",
        "https://i.pinimg.com/1200x/fd/e6/b8/fde6b837c576c2a2d4dc890eb706d854.jpg",
        "https://i.pinimg.com/1200x/fd/e6/b8/fde6b837c576c2a2d4dc890eb706d854.jpg"
      ],
      coordinates: { lat: 14.5906, lng: 120.9750 }
    },
    { 
      id: "L-015", 
      title: "Luxury Penthouse", 
      category: "City", 
      img: "https://i.pinimg.com/736x/9f/b4/d0/9fb4d0066f0feb655d18fdac51782843.jpg", 
      location: "Ortigas", 
      amenities: ["Skyline View", "Rooftop", "Butler", "Wifi", "AC", "Valet"], 
      reviews: 4.9, 
      calendar: "Few slots", 
      pricePerNight: 7990,
      host: "Luxury Living",
      description: "Exclusive penthouse with panoramic city views and premium services.",
      photos: [
        "https://i.pinimg.com/736x/9f/b4/d0/9fb4d0066f0feb655d18fdac51782843.jpg",
        "https://i.pinimg.com/736x/9f/b4/d0/9fb4d0066f0feb655d18fdac51782843.jpg",
        "https://i.pinimg.com/736x/9f/b4/d0/9fb4d0066f0feb655d18fdac51782843.jpg"
      ],
      coordinates: { lat: 14.5844, lng: 121.0563 }
    }
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
    let results = pool.filter(listing => {
      const matchesSearch = !search.trim() || 
        listing.title?.toLowerCase().includes(search.toLowerCase()) ||
        listing.location?.toLowerCase().includes(search.toLowerCase()) ||
        listing.category?.toLowerCase().includes(search.toLowerCase());
      
      const matchesCategory = activeCategory === "All" || listing.category === activeCategory;
      
      const matchesPrice = listing.pricePerNight >= priceRange[0] && listing.pricePerNight <= priceRange[1];
      
      const matchesAmenities = selectedAmenities.length === 0 || 
        selectedAmenities.every(amenity => listing.amenities.includes(amenity));
      
      return matchesSearch && matchesCategory && matchesPrice && matchesAmenities;
    });
    
    setSearchResults(results);
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
      
      const shareUrl = isBooking 
        ? `https://stayhub.com/booking/${item.id}`
        : `https://stayhub.com/listing/${item.id}`;
      
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
      const shareUrl = `https://stayhub.com/booking/${booking.id}`;
      
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

  // Enhanced e-wallet functionality
  const handleEWalletPayment = (amount) => {
    
    if (eWalletBalance >= amount) {
      setEWalletBalance(prev => prev - amount);
      alert(`Payment successful! Remaining balance: ₱${(eWalletBalance - amount).toLocaleString()}`);
    } else {
      alert("Insufficient balance! Please top up your e-wallet.");
    }
  };

  // Booking functionality
  const handleBookListing = (listing) => {
    setSelectedListing(listing);
    setShowBookingModal(true);
    
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
    if (!selectedListing || !bookingDates.checkIn || !bookingDates.checkOut) return 0;
    
    const checkIn = new Date(bookingDates.checkIn);
    const checkOut = new Date(bookingDates.checkOut);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    
    return nights * selectedListing.pricePerNight;
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

      if (checkOutDate <= checkInDate) {
        alert("Check-out date must be after check-in date.");
        return;
      }

      const daysDiff = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
      if (daysDiff > 30) {
        alert("Maximum stay duration is 30 days.");
        return;
      }
    } catch (error) {
      console.error("Date validation error:", error);
      alert("Invalid dates selected. Please try again.");
      return;
    }

    // Validate user and payment
    if (!auth.currentUser) {
      alert("You must be logged in to make a booking.");
      return;
    }

    const total = calculateBookingTotal();
    if (isNaN(total) || total <= 0) {
      alert("Invalid booking total. Please try again.");
      return;
    }

    if (eWalletBalance < total) {
      alert("Insufficient e-wallet balance. Please top up your account.");
      return;
    }

      try {
        console.log("Creating booking with listing:", selectedListing);

        // Add to bookings collection in Firestore first
        const bookingsRef = collection(db, "bookings");
        
        // Parse and validate dates
        const checkInDate = new Date(bookingDates.checkIn);
        const checkOutDate = new Date(bookingDates.checkOut);
        
        if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
          throw new Error("Invalid dates selected");
        }
        
        const now = new Date();
        const bookingData = {
          listingId: selectedListing.id,
          title: selectedListing.title,
          checkIn: checkInDate.toISOString().split('T')[0],
          checkOut: checkOutDate.toISOString().split('T')[0],
          status: "Upcoming",
          img: selectedListing.img || "",
          location: selectedListing.location,
          amenities: selectedListing.amenities || [],
          reviews: selectedListing.reviews || 0,
          price: selectedListing.pricePerNight || selectedListing.price || 0,
          host: selectedListing.host || "",
          guests: bookingGuests,
          notes: bookingNotes || "",
          total: total,
          paymentMethod: 'E-wallet',
          paymentStatus: 'completed',
          hasRated: false,
          guestId: auth.currentUser.uid,
          guestName: profile.name, // Add guest name from profile
          guestEmail: auth.currentUser.email, // Add guest email
          hostId: selectedListing.hostId || "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          bookingDate: serverTimestamp(), // Use Firestore timestamp for consistency
        };      console.log("Booking data prepared:", bookingData);

      // Add the booking to Firestore
      const newBookingRef = await addDoc(bookingsRef, bookingData);
      console.log("Booking added to Firestore with ID:", newBookingRef.id);

      // Update the booking with its ID
      await updateDoc(newBookingRef, {
        id: newBookingRef.id
      });

      // Add to local state with converted timestamps
      const localBooking = {
        ...bookingData,
        id: newBookingRef.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setBookings(prev => [localBooking, ...prev]);
      
      // Process payment
      setEWalletBalance(prev => prev - total);

      console.log("Updating listing metrics...");

      // Try to update the listing in Firestore
      try {
        // First check hostListings collection
        const hostListingRef = doc(db, "hostListings", selectedListing.id);
        const hostListingDoc = await getDoc(hostListingRef);

        if (hostListingDoc.exists()) {
          console.log("Updating host listing...");
          await updateDoc(hostListingRef, {
            bookingsCount: increment(1),
            lastBooked: serverTimestamp(),
            calendar: "Few slots"
          });
        } else {
          console.log("Updating regular listing...");
          // Try regular listings collection
          const regularListingRef = doc(db, "listings", selectedListing.id);
          await updateDoc(regularListingRef, {
            bookingsCount: increment(1),
            lastBooked: serverTimestamp(),
            calendar: "Few slots"
          });
        }

        // Update listing metrics
        await updateListingMetrics(selectedListing.id, {
          bookings: 1,
          revenue: total
        });

      } catch (listingError) {
        console.error("Error updating listing:", listingError);
        // Continue since booking is already saved
      }

      // Success! Show confirmation and reset
      console.log("Booking completed successfully!");
      setShowBookingModal(false);
      setShowBookingConfirmation(true);
      setBookingDates({ checkIn: '', checkOut: '' });
      setBookingGuests(2);
      setBookingNotes('');
      setSelectedListing(null);

    } catch (error) {
      console.error("Error processing booking:", error);
      alert("There was an error processing your booking. Please try again later.");
    }
  };

  const handleCloseBookingConfirmation = () => {
    setShowBookingConfirmation(false);
  };

  // Messaging functions
  const handleMessageHost = (listing) => {
    setSelectedHost({
      uid: listing.hostId || 'host_' + listing.id,
      displayName: listing.host || 'Host',
      email: 'host@stayhub.com'
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
    setSelectedHost(otherUser);
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
          window.paypal.Buttons({
            createOrder: (data, actions) => {
              console.log('Creating PayPal order...');
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
              console.log('PayPal approval received...');
              return actions.order.capture().then((details) => {
                console.log('Payment captured:', details);
                alert(`Payment completed! Transaction ID: ${details.id}`);
                setShowPayPalPayment(false);
                // Process booking after successful payment
                processBookingAfterPayment(details.id);
              });
            },
            onError: (err) => {
              console.error('PayPal error:', err);
              alert('Payment failed. Please try again.');
              setShowPayPalPayment(false);
            },
            onCancel: () => {
              console.log('PayPal payment cancelled');
              alert('Payment cancelled by user');
              setShowPayPalPayment(false);
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
            alert('Failed to load payment buttons. Please refresh and try again.');
            setShowPayPalPayment(false);
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

  // Process booking after successful PayPal payment
  const processBookingAfterPayment = (transactionId) => {
    if (!selectedListing || !bookingDates.checkIn || !bookingDates.checkOut) {
      alert("Booking information is missing. Please try again.");
      return;
    }

    const total = calculateBookingTotal();
    
    // Create new booking
    const newBooking = {
      id: `B-${Date.now()}`,
      title: selectedListing.title,
      date: bookingDates.checkIn,
      status: "Upcoming",
      img: selectedListing.img,
      location: selectedListing.location,
      amenities: selectedListing.amenities,
      reviews: selectedListing.reviews,
      price: selectedListing.pricePerNight,
      host: selectedListing.host,
      checkIn: bookingDates.checkIn,
      checkOut: bookingDates.checkOut,
      guests: bookingGuests,
      notes: bookingNotes,
      total: total,
      bookingDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'PayPal',
      transactionId: transactionId
    };

    // Add to bookings
    setBookings(prev => [newBooking, ...prev]);
    
    // Close modals
    setShowBookingModal(false);
    setShowBookingConfirmation(true);
    
    // Reset form
    setBookingDates({ checkIn: '', checkOut: '' });
    setBookingGuests(2);
    setBookingNotes('');
    setSelectedListing(null);
  };

  // Load PayPal SDK
  useEffect(() => {
    if (showPayPalPayment) {
      if (!window.paypal) {
        console.log('Loading PayPal SDK...');
        const script = document.createElement('script');
        script.src = 'https://www.paypal.com/sdk/js?client-id=YOUR_PAYPAL_CLIENT_ID&currency=PHP';
        script.async = true;
        script.onload = () => {
          console.log('PayPal SDK loaded');
          setTimeout(() => {
            try {
              initializePayPal();
            } catch (error) {
              console.error('PayPal initialization error:', error);
              alert('Failed to initialize payment. Please try again.');
              setShowPayPalPayment(false);
            }
          }, 200);
        };
        script.onerror = () => {
          console.error('Failed to load PayPal SDK');
          alert('Failed to load payment system. Please check your internet connection.');
          setShowPayPalPayment(false);
        };
        document.body.appendChild(script);
      } else {
        console.log('PayPal SDK already loaded, initializing...');
        setTimeout(() => {
          try {
            initializePayPal();
          } catch (error) {
            console.error('PayPal initialization error:', error);
            alert('Failed to initialize payment. Please try again.');
            setShowPayPalPayment(false);
          }
        }, 200);
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

  // Enhanced suggestions based on booking history
  const getEnhancedSuggestions = () => {
    // Get categories from valid bookings
    const bookedCategories = bookings.map(b => {
      // Safely find the listing using the ID pattern
      const listingId = b.listingId || (b.id ? b.id.split('-')[1] : null);
      if (!listingId) return null;
      
      // Look for the listing in searchResults
      const listing = searchResults.find(l => l.id === listingId);
      return listing ? listing.category : null;
    }).filter(Boolean); // Remove nulls
    
    // Get categories from favorites
    const favoriteCategories = favorites
      .map(f => f.category)
      .filter(Boolean); // Remove undefined categories
    
    // Get most preferred category
    const categoryCount = {};
    [...bookedCategories, ...favoriteCategories].forEach(cat => {
      if (cat) { // Only count valid categories
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      }
    });
    
    // Get preferred category or default to "All"
    const preferredCategory = Object.keys(categoryCount).length > 0
      ? Object.keys(categoryCount).reduce((a, b) => 
          categoryCount[a] > categoryCount[b] ? a : b)
      : "All";
    
    // Get suggestions from searchResults based on preferences
    const suggestions = searchResults.filter(listing => {
      if (!listing || !listing.id) return false; // Skip invalid listings
      
      // Check if not already booked
      const notBooked = !bookings.some(b => 
        b.listingId === listing.id || 
        (b.id && listing.id === b.id.split('-')[1])
      );
      
      // Check if not already favorited
      const notFavorited = !favorites.some(f => f.id === listing.id);
      
      // Check if matches preferred category or random selection
      const matchesPreference = preferredCategory === "All" ||
        listing.category === preferredCategory ||
        Math.random() > 0.7;
      
      return notBooked && notFavorited && matchesPreference;
    });
    
    // Return top 3 random suggestions
    return suggestions
      .sort(() => Math.random() - 0.5) // Shuffle
      .slice(0, 3);
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

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Airbnb-like Header */}
      <div className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4">
          <div className="h-20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src={profile.avatar}
                alt="avatar"
                className="w-10 h-10 rounded-full border object-cover"
              />
              <div className="hidden sm:block">
                <div className="text-sm text-gray-500">Signed in as</div>
                <div className="font-semibold">{profile.name}</div>
              </div>
            </div>
            <div className="flex-1 max-w-2xl">
              <div className="flex items-center rounded-full border shadow-sm px-3 py-2 gap-2">
                <FaSearch className="text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdvancedSearch()}
                  className="bg-transparent outline-none w-full text-sm"
                  placeholder={'Where to? Try "Tagaytay"'}
                />
                <button
                  onClick={handleAdvancedSearch}
                  className="bg-pink-500 text-white text-sm px-3 py-1 rounded-full hover:bg-pink-600 transition"
                >
                  Search
                </button>
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="p-2 rounded-full hover:bg-gray-100 transition"
                  title="Advanced Filters"
                >
                  <FaFilter className="text-gray-400" />
                </button>
              </div>
            </div>
            {/* <button
              onClick={handleOpenChatList}
              className="hidden sm:flex items-center gap-2 border px-3 py-2 rounded-full hover:shadow"
            >
              <FaRegCommentDots className="text-blue-500" />
              <span className="text-sm">Messages</span>
            </button> */}
            <button
              onClick={handleProfileEdit}
              className="hidden sm:flex items-center gap-2 border px-3 py-2 rounded-full hover:shadow"
            >
              <FaUserCircle className="text-pink-500" />
              <span className="text-sm">Edit Profile</span>
            </button>
            <button
              onClick={onLogout}
              className="hidden sm:flex items-center gap-2 border border-red-200 px-3 py-2 rounded-full hover:shadow hover:bg-red-50 text-red-600"
            >
              <FaSignOutAlt className="text-red-500" />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </div>
        {/* Categories bar */}
        <div className="border-t">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-3">
              {[
                "All",
                "Home",
                "Experience",
                "Service",
              ].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={
                    (activeCategory === cat
                      ? "text-pink-600 border-pink-500"
                      : "text-gray-600 border-transparent") +
                    " whitespace-nowrap border-b-2 pb-2 text-sm hover:text-pink-600"
                  }
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Enhanced Filter pills under search */}
        <div className="flex items-center gap-3 mb-6 overflow-x-auto no-scrollbar">
          <button 
            className="border rounded-full px-4 py-2 text-sm hover:shadow flex items-center gap-2"
            onClick={() => setDateFilter(dateFilter === "Any week" ? "This weekend" : "Any week")}
          >
            <FaCalendarAlt className="text-gray-400" />
            {dateFilter}
          </button>
          <button className="border rounded-full px-4 py-2 text-sm hover:shadow flex items-center gap-2">
            <FaMapMarkerAlt className="text-gray-400" />
            Anywhere
          </button>
          <button 
            className="border rounded-full px-4 py-2 text-sm hover:shadow flex items-center gap-2"
            onClick={() => setActiveCategory(activeCategory === "All" ? "Home" : "All")}
          >
            {activeCategory === "All" ? "Any type" : activeCategory}
          </button>
          <button 
            className="border rounded-full px-4 py-2 text-sm hover:shadow flex items-center gap-2"
            onClick={() => setGuestCount(guestCount === 2 ? 4 : 2)}
          >
            <FaUsers className="text-gray-400" />
            {guestCount} guests
          </button>
          <button 
            className="border rounded-full px-4 py-2 text-sm hover:shadow flex items-center gap-2"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            <FaFilter className="text-gray-400" />
            Filters
          </button>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="bg-gray-50 rounded-xl p-6 mb-6 border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Price Range */}
              <div>
                <label className="block text-sm font-semibold mb-2">Price Range</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm">₱{priceRange[0].toLocaleString()}</span>
                  <input
                    type="range"
                    min="0"
                    max="10000"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="flex-1"
                  />
                  <span className="text-sm">₱{priceRange[1].toLocaleString()}</span>
                </div>
              </div>

              {/* Amenities */}
              <div>
                <label className="block text-sm font-semibold mb-2">Amenities</label>
                <div className="grid grid-cols-2 gap-2">
                  {(availableAmenities || []).slice(0, 6).map((amenity) => (
                    <label key={amenity.name} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedAmenities.includes(amenity.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAmenities([...selectedAmenities, amenity.name]);
                          } else {
                            setSelectedAmenities(selectedAmenities.filter(a => a !== amenity.name));
                          }
                        }}
                        className="rounded"
                      />
                      <amenity.icon className="text-gray-400" />
                      {amenity.name}
                    </label>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <label className="block text-sm font-semibold mb-2">Quick Actions</label>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setPriceRange([0, 10000]);
                      setSelectedAmenities([]);
                      setActiveCategory("All");
                    }}
                    className="w-full text-sm text-pink-600 hover:text-pink-700 underline"
                  >
                    Clear all filters
                  </button>
                  <button
                    onClick={handleAdvancedSearch}
                    className="w-full bg-pink-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-pink-600 transition"
                  >
                    Apply Filters
                  </button>
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
                className="absolute top-2 right-4 text-xl text-gray-400 hover:text-pink-500"
              >
                ×
              </button>
              <div className="flex flex-col items-center mb-4">
                <div className="relative">
                  <img
                    src={editProfileData.avatar}
                    alt="avatar"
                    className="w-24 h-24 rounded-full border-4 border-pink-200 shadow object-cover"
                  />
                  <label className="absolute bottom-0 right-0 bg-pink-500 text-white rounded-full p-2 cursor-pointer hover:bg-pink-600 transition">
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
                className="bg-pink-500 text-white px-6 py-2 rounded-full shadow hover:bg-pink-600 transition w-full"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Enhanced Search Results */}
          {searchResults.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold">
                Search Results ({searchResults.length} found)
              </div>
              <button
                onClick={() => setSearchResults([])}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Clear results
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {searchResults.map((l) => (
                <div key={l.id} className="group">
                  <div className="relative overflow-hidden rounded-2xl aspect-[4/3] bg-gray-100">
                    <img src={l.img} alt={l.title} className="h-full w-full object-cover group-hover:scale-105 transition duration-300" />
                    <button
                      onClick={() => toggleFavorite(l)}
                      className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white shadow"
                      aria-label="Toggle favorite"
                    >
                      <FaHeart className={isFavorited(l.id) ? "text-pink-600" : "text-gray-400"} />
                    </button>
                    <button
                      onClick={() => setShowShareModal(l)}
                      className="absolute top-3 left-3 p-2 rounded-full bg-white/80 hover:bg-white shadow"
                      aria-label="Share"
                    >
                      <FaShareAlt className="text-gray-400" />
                    </button>
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white bg-black/50 px-2 py-1 rounded-full text-xs">
                      <FaStar className="text-yellow-300" /> {l.reviews || l.rating || "New"}
                    </div>
                    <div className="absolute bottom-3 right-3 bg-white/80 text-xs px-2 py-1 rounded-full">
                      {l.calendar}
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold truncate mr-2">{l.title}</div>
                      <div className="text-sm font-semibold">₱{l.pricePerNight?.toLocaleString?.() || "—"} <span className="text-gray-500 text-xs">night</span></div>
                    </div>
                    <div className="text-sm text-gray-500 truncate">{l.location} • {l.category}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Hosted by {l.host}
                  </div>
                    <div className="flex items-center gap-1 mt-1">
                      {l.amenities.slice(0, 3).map((amenity, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                          {amenity}
                        </span>
                      ))}
                      {l.amenities.length > 3 && (
                        <span className="text-xs text-gray-500">+{l.amenities.length - 3} more</span>
          )}
        </div>
                  <div className="flex gap-2 mt-3">
                    <button
                        onClick={() => handleBookListing(l)}
                        className="flex-1 bg-pink-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-pink-600 transition"
                    >
                        Book Now
                    </button>
                    <button
                        onClick={() => handleMessageHost(l)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition flex items-center gap-1"
                    >
                        <FaEnvelope className="text-xs" />
                        Message
                    </button>
                  </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enhanced Explore Grid */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold text-xl">Explore stays</div>
            <div className="text-sm text-gray-500">
              {searchResults.filter(l => activeCategory === "All" ? true : l.category === activeCategory).length} places
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* Display filtered search results */}
            {searchResults.filter((l) =>
              activeCategory === "All" ? true : l.category === activeCategory
            )
              .map((l) => (
                <div key={l.id} className="group cursor-pointer">
                  <div className="relative overflow-hidden rounded-2xl aspect-[4/3] bg-gray-100">
                    <img src={l.img} alt={l.title} className="h-full w-full object-cover group-hover:scale-105 transition duration-300" />
                    <button
                      onClick={() => toggleFavorite(l)}
                      className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white shadow"
                      aria-label="Toggle favorite"
                    >
                      <FaHeart className={isFavorited(l.id) ? "text-pink-600" : "text-gray-400"} />
                    </button>
                    <button
                      onClick={() => setShowShareModal(l)}
                      className="absolute top-3 left-3 p-2 rounded-full bg-white/80 hover:bg-white shadow"
                      aria-label="Share"
                    >
                      <FaShareAlt className="text-gray-400" />
                    </button>
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white bg-black/50 px-2 py-1 rounded-full text-xs">
                      <FaStar className="text-yellow-300" /> {l.reviews || l.rating || "New"}
                    </div>
                    <div className="absolute bottom-3 right-3 bg-white/80 text-xs px-2 py-1 rounded-full">
                      {l.calendar}
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold truncate mr-2">{l.title}</div>
                      <div className="text-sm font-semibold">₱{(l.pricePerNight || l.price)?.toLocaleString?.()} <span className="text-gray-500 text-xs">night</span></div>
                    </div>
                    <div className="text-sm text-gray-500 truncate">{l.location} • {l.category}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Hosted by {l.host}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {(l.amenities || []).slice(0, 3).map((amenity, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                          {amenity}
                        </span>
                      ))}
                      {(l.amenities || []).length > 3 && (
                        <span className="text-xs text-gray-500">+{(l.amenities || []).length - 3} more</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleBookListing(l)}
                      className="w-full mt-3 bg-pink-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-pink-600 transition"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Upcoming trips removed per user request */}

        {/* Wishlists from favorites - horizontal carousel */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-xl">Wishlists</div>
            <button onClick={handleShowWishlist} className="text-sm text-pink-600 underline">
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
        </div>

        {/* Main Grid: Favorites and Bookings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Favorites */}
          <div>
            <div className="font-bold text-lg mb-2 flex items-center gap-2">
              <FaHeart className="text-pink-400" /> Favorites
              <button
                onClick={handleShowWishlist}
                className="ml-auto text-xs text-pink-600 underline"
              >
                {showWishlist ? "Hide" : "Show"}
              </button>
            </div>
            {showWishlist && (
              <div className="space-y-4">
                {favorites.length === 0 && <div className="text-gray-400">No favorites yet.</div>}
                {favorites.map((fav) => (
                  <div key={fav.id} className="bg-white rounded-xl border p-3 flex items-center gap-3 hover:shadow-sm transition">
                    <img src={fav.img} alt={fav.title} className="w-14 h-14 rounded-lg object-cover" />
                    <div className="flex-1">
                      <div className="font-semibold">{fav.title}</div>
                    </div>
                    <button
                      onClick={() => handleRemoveFavorite(fav.id)}
                      className="text-red-400 hover:text-red-600"
                      title="Remove"
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bookings */}
          <div className="md:col-span-2">
            <div className="font-bold text-lg mb-2 flex items-center gap-2">
              <FaListAlt className="text-blue-400" /> Your Bookings
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {bookings.map((b) => (
                <div key={b.id} className="bg-white rounded-xl border hover:shadow-md transition-shadow duration-200">
                  <div className="p-4">
                    <div className="flex gap-3 items-start">
                      <img src={b.img} alt={b.title} className="w-20 h-20 rounded-lg object-cover" />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-lg">{b.title}</div>
                            <div className="text-sm text-gray-500 mb-1">
                              Check-in: {b.displayCheckIn} • Check-out: {b.displayCheckOut}
                            </div>
                            <div className="text-xs text-blue-500">
                              Booked on: {b.displayBookingDate}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">{b.location}</div>
                          </div>
                          <button
                            onClick={() => setShowBookingShareModal(b)}
                            className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                            title="Share Booking"
                          >
                            <FaShareAlt />
                          </button>
                        </div>
                        <div className="mt-2">
                          <span className={
                            b.status === "Upcoming" 
                              ? "bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm font-medium"
                              : "bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm"
                          }>
                            {b.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Rating Section - Moved outside the main content for more prominence */}
                  {b.status === "Completed" && !b.hasRated && (
                    <div className="border-t bg-yellow-50 p-4 mt-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <FaStar className="text-yellow-500" />
                          <div>
                            <div className="font-medium text-yellow-800">Rate Your Stay!</div>
                            <div className="text-sm text-yellow-700">Help others by sharing your experience</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleOpenRating(b)}
                          className="bg-yellow-400 text-white px-4 py-2 rounded-lg hover:bg-yellow-500 transition font-medium flex items-center gap-2 shadow-sm"
                        >
                          <FaStar /> Rate Now
                        </button>
                      </div>
                    </div>
                  )}
                  {b.status === "Completed" && b.hasRated && (
                    <div className="border-t bg-green-50 p-4 mt-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1 text-yellow-400">
                            {[...Array(b.rating)].map((_, i) => (
                              <FaStar key={i} />
                            ))}
                          </div>
                          <div className="text-green-700 font-medium">
                            Thank you for rating!
                          </div>
                        </div>
                        <button
                          onClick={() => handleViewBookingDetails(b)}
                          className="text-green-600 hover:text-green-700 text-sm font-medium"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  )}
                  {b.status === "Upcoming" && (
                    <div className="border-t p-4 bg-gray-50">
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                          Don't forget to rate after your stay!
                        </div>
                        <button
                          onClick={() => handleViewBookingDetails(b)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rating Modal */}
        {showRatingModal && selectedBookingToRate && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative">
              <button
                onClick={() => setShowRatingModal(false)}
                className="absolute top-2 right-4 text-xl text-gray-400 hover:text-pink-500"
              >
                ×
              </button>
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold">Rate Your Stay</h3>
                <p className="text-gray-500 text-sm mt-1">{selectedBookingToRate.title}</p>
              </div>
              <div className="space-y-4">
                <div className="flex justify-center">
                  <StarRating rating={rating} onRatingChange={setRating} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Your Review</label>
                  <textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    placeholder="Share your experience..."
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 h-32 resize-none"
                  />
                </div>
                <button
                  onClick={handleSubmitRating}
                  disabled={rating === 0}
                  className="w-full bg-pink-500 text-white px-4 py-3 rounded-lg hover:bg-pink-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Submit Rating
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
                className="absolute top-2 right-4 text-xl text-gray-400 hover:text-pink-500"
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
                    <FaStar /> {showBookingDetails.reviews}
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
                <FaRegCommentDots className="text-pink-400" />
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

        {/* Enhanced E-wallet */}
        <div className="mt-10">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <FaWallet className="text-3xl" />
            <div>
              <div className="text-xl font-bold">E-wallet</div>
                  <div className="text-sm opacity-90">Balance: ₱{eWalletBalance.toLocaleString()}</div>
                  <div className="text-xs opacity-75">Pay easily and securely</div>
                </div>
              </div>
              <div className="flex gap-2">
              <button
                  onClick={() => setShowEWallet(true)}
                  className="bg-white/20 backdrop-blur text-white px-4 py-2 rounded-full hover:bg-white/30 transition"
                >
                  Top Up
                </button>
                <button
                  onClick={() => handleEWalletPayment(2990)}
                  className="bg-white text-yellow-600 px-4 py-2 rounded-full hover:bg-gray-100 transition font-semibold"
              >
                Pay Now
              </button>
              </div>
            </div>
          </div>
        </div>

        {/* E-wallet Modal */}
        {showEWallet && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative">
              <button
                onClick={() => setShowEWallet(false)}
                className="absolute top-2 right-4 text-xl text-gray-400 hover:text-pink-500"
              >
                ×
              </button>
              <div className="text-center mb-6">
                <FaWallet className="text-4xl text-yellow-400 mx-auto mb-2" />
                <h3 className="text-xl font-bold">E-wallet</h3>
                <p className="text-gray-500">Current Balance: ₱{eWalletBalance.toLocaleString()}</p>
              </div>
              <div className="space-y-4">
                <button
                  onClick={() => setEWalletBalance(prev => prev + 1000)}
                  className="w-full bg-yellow-400 text-white px-4 py-3 rounded-lg hover:bg-yellow-500 transition"
                >
                  Add ₱1,000
                </button>
                <button
                  onClick={() => setEWalletBalance(prev => prev + 5000)}
                  className="w-full bg-yellow-400 text-white px-4 py-3 rounded-lg hover:bg-yellow-500 transition"
                >
                  Add ₱5,000
                </button>
                <button
                  onClick={() => setEWalletBalance(prev => prev + 10000)}
                  className="w-full bg-yellow-400 text-white px-4 py-3 rounded-lg hover:bg-yellow-500 transition"
                >
                  Add ₱10,000
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Account Settings */}
        <div className="mt-10">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <FaCog className="text-2xl text-pink-500" />
                <div>
                  <h3 className="text-xl font-bold">Account Settings</h3>
                  <p className="text-sm text-gray-500">Manage your profile, bookings, and preferences</p>
                </div>
              </div>
              <button
                onClick={() => setShowAccountSettings(!showAccountSettings)}
                className="text-pink-500 hover:text-pink-700 text-sm underline"
              >
                {showAccountSettings ? "Hide" : "Show"} Settings
              </button>
            </div>

            {showAccountSettings && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Section */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FaUserCircle className="text-pink-500" />
                    <span className="font-semibold">Profile</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{profile.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{profile.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium">{profile.phone}</span>
                    </div>
                    <button
                      onClick={handleProfileEdit}
                      className="w-full mt-3 bg-pink-500 text-white px-3 py-2 rounded-lg text-xs hover:bg-pink-600 transition"
                    >
                      Edit Profile
                    </button>
                  </div>
                </div>

                {/* Bookings Section */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FaHistory className="text-blue-500" />
                    <span className="font-semibold">Bookings</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total:</span>
                      <span className="font-medium">{bookings.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Upcoming:</span>
                      <span className="font-medium text-green-600">
                        {bookings.filter(b => b.status === "Upcoming").length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completed:</span>
                      <span className="font-medium text-gray-600">
                        {bookings.filter(b => b.status === "Completed").length}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowWishlist(false)}
                      className="w-full mt-3 bg-blue-500 text-white px-3 py-2 rounded-lg text-xs hover:bg-blue-600 transition"
                    >
                      View All Bookings
                    </button>
                  </div>
                </div>

                {/* Wishlist Section */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FaBookmark className="text-pink-500" />
                    <span className="font-semibold">Wishlist</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Saved:</span>
                      <span className="font-medium">{favorites.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Categories:</span>
                      <span className="font-medium">
                        {[...new Set(favorites.map(f => f.category))].length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Locations:</span>
                      <span className="font-medium">
                        {[...new Set(favorites.map(f => f.location))].length}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowWishlist(!showWishlist)}
                      className="w-full mt-3 bg-pink-500 text-white px-3 py-2 rounded-lg text-xs hover:bg-pink-600 transition"
                    >
                      {showWishlist ? "Hide" : "Show"} Wishlist
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Suggestions & Recommendations */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold text-lg text-pink-700 flex items-center gap-2">
              <FaGift className="text-pink-500" />
              Suggestions & Recommendations for You
            </div>
            <div className="text-sm text-gray-500">
              Based on your preferences
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {getEnhancedSuggestions().length === 0 && (
              <div className="col-span-3 text-center py-8">
                <FaThumbsUp className="text-4xl text-gray-300 mx-auto mb-2" />
                <div className="text-gray-400">No new suggestions at the moment.</div>
                <div className="text-sm text-gray-300">Try exploring different categories!</div>
              </div>
            )}
            {getEnhancedSuggestions().map((s) => (
              <div key={s.id} className="bg-white rounded-xl shadow hover:shadow-lg transition p-4 flex flex-col items-center group">
                <div className="relative">
                <img src={s.img} alt={s.title} className="w-24 h-24 rounded-lg object-cover mb-2" />
                  <button
                    onClick={() => toggleFavorite(s)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-white/80 hover:bg-white shadow"
                  >
                    <FaHeart className={isFavorited(s.id) ? "text-pink-600" : "text-gray-400"} />
                  </button>
                </div>
                <div className="font-bold text-center">{s.title}</div>
                <div className="text-xs text-gray-400 mb-1">{s.category} • {s.location}</div>
                <div className="flex items-center gap-1 text-yellow-500 mb-2">
                  <FaStar /> {s.reviews}
                </div>
                <div className="text-xs text-gray-500 mb-2 text-center">₱{s.pricePerNight?.toLocaleString?.()}/night</div>
                <div className="text-xs text-gray-500 mb-2 text-center">Amenities: {(s.amenities || []).slice(0, 2).join(", ")}</div>
                <button
                  onClick={() => handleAddFavorite(s)}
                  className="text-pink-500 hover:text-pink-700 text-xs flex items-center gap-1 group-hover:bg-pink-50 px-3 py-1 rounded-full transition"
                >
                  <FaHeart /> Add to Favorites
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative">
              <button
                onClick={() => setShowShareModal(null)}
                className="absolute top-2 right-4 text-xl text-gray-400 hover:text-pink-500"
              >
                ×
              </button>
              <div className="text-center mb-6">
                <FaShareAlt className="text-4xl text-pink-400 mx-auto mb-2" />
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
                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-pink-50 transition"
                >
                  <FaInstagram className="text-pink-500" />
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
                className="absolute top-2 right-4 text-xl text-gray-400 hover:text-pink-500"
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
                    <div className="text-sm font-semibold text-pink-600">
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
                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-pink-50 transition"
                >
                  <FaInstagram className="text-pink-500" />
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
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowBookingModal(false)}
                className="absolute top-2 right-4 text-xl text-gray-400 hover:text-pink-500"
              >
                ×
              </button>
              
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Book {selectedListing.title}</h3>
                <p className="text-gray-500">Complete your booking details</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left side - Listing details */}
                <div>
                  <div className="relative overflow-hidden rounded-xl aspect-[4/3] bg-gray-100 mb-4">
                    <img src={selectedListing.img} alt={selectedListing.title} className="h-full w-full object-cover" />
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white bg-black/50 px-2 py-1 rounded-full text-xs">
                      <FaStar className="text-yellow-300" /> {selectedListing.reviews}
                    </div>
                  </div>
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
                  </div>
                </div>

                {/* Right side - Booking form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Check-in Date</label>
                    <input
                      type="date"
                      value={bookingDates.checkIn}
                      onChange={(e) => setBookingDates(prev => ({ ...prev, checkIn: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Check-out Date</label>
                    <input
                      type="date"
                      value={bookingDates.checkOut}
                      onChange={(e) => setBookingDates(prev => ({ ...prev, checkOut: e.target.value }))}
                      min={bookingDates.checkIn || new Date().toISOString().split('T')[0]}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Number of Guests</label>
                    <select
                      value={bookingGuests}
                      onChange={(e) => setBookingGuests(parseInt(e.target.value))}
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                        <option key={num} value={num}>{num} {num === 1 ? 'guest' : 'guests'}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Special Requests (Optional)</label>
                    <textarea
                      value={bookingNotes}
                      onChange={(e) => setBookingNotes(e.target.value)}
                      placeholder="Any special requests or notes for your stay..."
                      className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 h-20 resize-none"
                    />
                  </div>

                  {/* Booking Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="font-semibold mb-2">Booking Summary</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>₱{(selectedListing.pricePerNight || 0).toLocaleString()} × {bookingDates.checkIn && bookingDates.checkOut ? Math.ceil((new Date(bookingDates.checkOut) - new Date(bookingDates.checkIn)) / (1000 * 60 * 60 * 24)) : 0} nights</span>
                        <span>₱{calculateBookingTotal().toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Service fee</span>
                        <span>₱{Math.round(calculateBookingTotal() * 0.1).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-semibold border-t pt-1">
                        <span>Total</span>
                        <span>₱{(calculateBookingTotal() + Math.round(calculateBookingTotal() * 0.1)).toLocaleString()}</span>
                      </div>
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
                      onClick={() => handlePayPalPayment(calculateBookingTotal() + Math.round(calculateBookingTotal() * 0.1))}
                      className="flex-1 bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition font-semibold flex items-center gap-2"
                    >
                      <FaCreditCard />
                      Pay with PayPal
                    </button>
                    <button
                      onClick={handleConfirmBooking}
                      className="flex-1 bg-pink-500 text-white px-4 py-3 rounded-lg hover:bg-pink-600 transition font-semibold"
                    >
                      Pay with E-wallet
                    </button>
                  </div>
                </div>
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
                className="absolute top-2 right-4 text-xl text-gray-400 hover:text-pink-500"
              >
                ×
              </button>
              
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaThumbsUp className="text-2xl text-green-500" />
                </div>
                <h3 className="text-2xl font-bold text-green-600 mb-2">Booking Confirmed!</h3>
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

              <div className="flex gap-3">
                <button
                  onClick={handleCloseBookingConfirmation}
                  className="flex-1 bg-pink-500 text-white px-4 py-3 rounded-lg hover:bg-pink-600 transition font-semibold"
                >
                  View All Bookings
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

              {/* Fallback button in case PayPal doesn't load */}
              <div className="mt-2 text-center">
                <button
                  onClick={() => {
                    alert(`Simulated PayPal payment: ₱${paymentAmount.toLocaleString()}`);
                    // Simulate the payment process
                    const simulatedTransactionId = 'PAYPAL_' + Date.now();
                    setShowPayPalPayment(false);
                    processBookingAfterPayment(simulatedTransactionId);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition mr-2"
                >
                  💳 Test Payment (₱{paymentAmount.toLocaleString()})
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
       
      </div>
    </div>
  );
}

export default GuestPage;
