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
  onSnapshot
} from "firebase/firestore";
import { initializeDashboardMetrics, updateDashboardMetrics, incrementDashboardMetrics } from './utils/dashboardMetrics';
import { db, auth } from "./firebase";
import { 
  FaHome, FaClipboardList, FaSave, FaImages, FaEnvelope, FaCalendarAlt, FaChartPie, 
  FaWallet, FaUser, FaGift, FaSignOutAlt, FaPlus, FaEdit, FaTrash, FaStar, FaTag, 
  FaPhone, FaSms, FaMailBulk, FaCreditCard, FaGavel, FaComments, FaClock, 
  FaMoneyBillWave, FaCog, FaEye, FaToggleOn, FaToggleOff, FaCheckCircle, FaTimes,
  FaChevronRight, FaChevronLeft, FaGlobe, FaHeart, FaShareAlt, FaLocationMarker,
  FaBed, FaBath, FaUsers, FaSwimmingPool, FaWifi, FaCar, FaUtensils, FaTv,
  FaShower, FaLock, FaFire, FaSnowflake, FaUmbrella, FaTree, FaMapMarkerAlt,
  FaSearch, FaFilter, FaSortAmountUp, FaThumbsUp, FaExclamationTriangle,
  FaDownload, FaUpload, FaBell, FaCog as FaSettings, FaChartBar, FaHistory,
  FaCalendarCheck, FaComments as FaMessage, FaCopy, FaCamera, FaTag as FaPriceTag,
  FaPercentage, FaQrcode, FaMobile, FaDesktop, FaTablet
} from "react-icons/fa";
import Messages from "./components/Messages";
import ChatList from "./components/ChatList";

function HostPage({ onLogout }) {

useEffect(() => {
  document.title = "Host Dashboard - StayHub";
}, []);

  // Active tab state for navigation
  const [activeTab, setActiveTab] = useState("overview");


  // Enhanced states for functional checklist
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [selectedListingReviews, setSelectedListingReviews] = useState(null);
  
  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [showChatList, setShowChatList] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [recentChats, setRecentChats] = useState([]);

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

    // Subscribe to bookings updates
    const unsubBookings = onSnapshot(bookingsQuery, (snapshot) => {
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

    // Cleanup
    return () => {
      unsubListings();
      unsubBookings();
      unsubDashboard();
    };
  }, []);
  const [dashboard, setDashboard] = useState({
    today: 0,
    upcoming: 0,
    totalEarnings: 0,
    hostRating: 4.7,
    averageRating: 4.8,
    occupancyRate: 87,
    responseRate: 98,
    responseTime: "<1hr",
    cancellationRate: 3,
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
  const [hostPoints, setHostPoints] = useState(1500);
  const [coupons, setCoupons] = useState([
    { id: "C-001", name: "New Host Welcome", discount: 20, code: "WELCOME20", validUntil: "2024-12-31" },
    { id: "C-002", name: "Early Bird Special", discount: 15, code: "EARLYBIRD15", validUntil: "2024-10-31" }
  ]);
  const [paymentMethods, setPaymentMethods] = useState([
    { id: "P-001", type: "GCash", account: "0923-456-7890", status: "Active" },
    { id: "P-002", type: "PayMaya", account: "host@paymaya.com", status: "Active" },
    { id: "P-003", type: "Bank Transfer", account: "BPI - 1234567890", status: "Active" },
    { id: "P-004", type: "PayPal", account: "host@paypal.com", status: "Active" }
  ]);
  const [showPayPalPayment, setShowPayPalPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);

  // Functional checklist implementations
  

  // 2. Save as draft functionality
  const handleSaveDraft = (listingId) => {
    setListings(listings.map(l => 
      l.id === listingId ? { ...l, status: "Draft", updatedAt: new Date().toISOString() } : l
    ));
    alert("Listing saved as draft!");
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

  // Toggle listing status (Active/Draft)
  const handleToggleListingStatus = (listingId) => {
    setListings(listings.map(l => 
      l.id === listingId 
        ? { ...l, status: l.status === 'Active' ? 'Draft' : 'Active' }
        : l
    ));
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
      uid: booking.guestId,
      displayName: booking.guestName || 'Guest',
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
    setSelectedGuest(otherUser);
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
        where('participants', 'array-contains', auth.currentUser.uid),
        orderBy('updatedAt', 'desc')
      );
      const unsub = onSnapshot(qChats, (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRecentChats(items);
      });
      return () => unsub();
    } catch (e) {
      // ignore
    }
  }, [auth.currentUser?.uid]);

  // 6. Dashboard Today & Upcoming
  const updateDashboard = () => {
    const todayBookings = listings.filter(l => 
      new Date(l.createdAt).toDateString() === new Date().toDateString()
    ).length;
    
    const upcomingBookings = Math.floor(Math.random() * 10) + 3;
    
    setDashboard(prev => ({
      ...prev,
      today: todayBookings,
      upcoming: upcomingBookings
    }));
  };

  // 7. Receiving Payment Methods
  const handlePaymentMethods = () => {
    alert("Payment Methods Configured:\n" + 
      paymentMethods.map(p => `• ${p.type}: ${p.account} (${p.status})`).join('\n'));
  };

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
    alert(`Points & Rewards:\nCurrent Points: ${hostPoints}\nAvailable Coupons: ${coupons.length}\nEarnings: ₱${dashboard.totalEarnings.toLocaleString()}`);
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

  // Save to localStorage and update profile when auth changes
  useEffect(() => {
    if (auth.currentUser?.uid) {
      localStorage.setItem("hostListings", JSON.stringify(listings));
      localStorage.setItem(`hostProfile_${auth.currentUser.uid}`, JSON.stringify({
        ...profile,
        email: auth.currentUser.email // Always ensure email matches auth
      }));
    }
  }, [listings, profile]);

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

  return (
<div className="min-h-screen bg-gradient-to-br from-yellow-50 via-amber-50 to-white py-10 px-2 overflow-x-hidden">
      <div className="max-w-6xl mx-auto relative">
        {/* Airbnb-style Header */}
        <div className="bg-white shadow-sm rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            {/* Logo and Navigation */}
            <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xl">H</span>
                </div>
            <div>
                  <h1 className="text-2xl font-bold text-gray-900">Host Dashboard</h1>
                  <p className="text-sm text-gray-500">Welcome back, {profile.name}</p>
            </div>
          </div>
              
              {/* Navigation Tabs */}
              <div className="hidden lg:flex items-center gap-6">
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

            {/* User Profile and Actions */}
          <div className="flex items-center gap-4">
              <button className="relative p-2 rounded-full hover:bg-gray-100 transition">
                <FaBell className="text-gray-600" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>
              <button onClick={() => setShowAccountSettings(true)} className="p-2 rounded-full hover:bg-gray-100 transition">
                <FaSettings className="text-gray-600" />
              </button>
              <div className="flex items-center gap-3 bg-gray-50 rounded-full px-4 py-2">
                <img 
                  src={profile.avatar || "https://images.unsplash.com/photo-1494790108755-2616b612b786?q=80&w=100&auto=format&fit=crop"}
                  alt="Profile"
                  className="w-8 h-8 rounded-full"
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
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                    <p className="text-sm font-medium text-gray-600">Average Rating</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboard.averageRating || "4.8"}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <FaStar className="text-yellow-400" />
                      Excellent host
                    </p>
                  </div>
                  <FaStar className="text-3xl text-blue-500" />
            </div>
          </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
            <div>
                    <p className="text-sm font-medium text-gray-600">Occupancy Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboard.occupancyRate || "87"}%</p>
                    <p className="text-sm text-purple-600 flex items-center gap-1">
                      Optimal performance
                    </p>
                  </div>
                  <FaChartPie className="text-3xl text-purple-500" />
            </div>
          </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-pink-500">
                <div className="flex items-center justify-between">
            <div>
                    <p className="text-sm font-medium text-gray-600">Response Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboard.responseRate || "98"}%</p>
                    <p className="text-sm text-yellow-700 flex items-center gap-1">
                      <FaMessage />
                      {dashboard.responseTime || "<1hr"}
                    </p>
                  </div>
                  <FaComments className="text-3xl text-pink-500" />
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
                        <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                              <span className="text-yellow-700 font-semibold text-sm">
                                {booking.guestName && booking.guestName !== 'Guest User' ? booking.guestName.split(' ')[0][0] : 
                                 booking.guestEmail ? booking.guestEmail.split('@')[0][0].toUpperCase() : 'G'}
                              </span>
          </div>
            <div>
                              <p className="font-medium text-sm">
                                {booking.guestName && booking.guestName !== 'Guest User' ? booking.guestName : 
                                 booking.guestEmail ? booking.guestEmail.split('@')[0] : 'Guest'}
                              </p>
                              <p className="text-xs text-gray-500">{booking.title}</p>
                        </div>
                      </div>
                      <div className="text-right">
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
                  <button 
                    onClick={() => handlePayPalPayment(1000)}
                    className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                  >
                    <FaCreditCard className="text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">PayPal Payment</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Listings Tab */}
        {activeTab === "listings" && (
          <div className="space-y-6">
            {/* Listings Header */}
            <div className="flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">My Listings</h2>
                <p className="text-gray-600">Manage your properties and hosting experience</p>
              </div>
              <button 
                onClick={() => setShowAddListing(true)}
                className="bg-yellow-400 text-white px-6 py-3 rounded-lg hover:bg-pink-600 transition flex items-center gap-2"
              >
                <FaPlus />
                Add New Listing
              </button>
            </div>

            {/* Listings Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {listings.map((listing) => (
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

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Listings & Actions */}
          <div className="space-y-8">

            {/* Add Listing */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center gap-2 mb-3">
                <FaHome className="text-xl text-blue-400" />
                <span className="font-semibold text-lg">Add Listing</span>
              </div>
              <div className="flex gap-2 mb-3">
              <button
                  onClick={() => setShowAddListing(true)}
                className="bg-blue-400 text-white px-3 py-1 rounded hover:bg-blue-500"
              >
                  <FaPlus className="inline mr-1" />Add New Listing
                </button>
                <button onClick={() => alert("Choose hosting category:\n• Home - Private residences\n• Experience - Activities & tours\n• Service - Professional services")} className="bg-purple-400 text-white px-3 py-1 rounded hover:bg-purple-500">
                  <FaTag className="inline mr-1" />Categories
              </button>
              </div>
              <p className="text-gray-500 text-sm">
                Categorize your hosting (Home, Experience, Service).
              </p>
            </div>

            {/* Enhanced Listings */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center gap-2 mb-3">
                <FaClipboardList className="text-xl text-blue-400" />
                <span className="font-semibold text-lg">Your Listings</span>
              </div>
              <div className="space-y-3">
                {listings.map((l) => (
                  <div key={l.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{l.title}</span>
                      <span className={`px-2 py-1 rounded text-xs ${l.status === "Draft" ? "bg-yellow-100 text-yellow-600" : "bg-green-100 text-green-600"}`}>
                      {l.status}
                    </span>
                    </div>
                    <div className="text-sm text-gray-500 mb-2">
                      {l.category} • ₱{l.price} • Rating: {l.rating}
                      {l.discount > 0 && <span className="text-red-500 ml-2">({l.discount}% OFF)</span>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleSaveDraft(l.id)} className="bg-yellow-400 text-white px-2 py-1 rounded text-xs hover:bg-yellow-500">
                        <FaSave className="inline mr-1" />Save Draft
                      </button>
                      <button onClick={() => alert(`Edit ${l.title}:\nRating: ${l.rating}\nDiscount: ${l.discount}%\nPromo: ${l.promo}`)} className="bg-blue-400 text-white px-2 py-1 rounded text-xs hover:bg-blue-500">
                        <FaEdit className="inline mr-1" />Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-gray-500 text-sm mt-3">
                Add, edit, or save your listings as draft. Manage ratings, discounts, and promos.
              </p>
            </div>
          </div>
          {/* Right: Messages, Calendar, Payments, Profile */}
          <div className="space-y-8">

            {/* Message History (persistent) */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FaComments className="text-blue-500" />
                  <span className="font-semibold">Message History</span>
                </div>
                <button onClick={handleOpenChatList} className="text-sm text-blue-600 hover:underline">Open Messages</button>
              </div>
              {recentChats.length === 0 ? (
                <div className="text-gray-500 text-sm">No conversations yet.</div>
              ) : (
                <div className="divide-y rounded-lg border">
                  {recentChats.slice(0,6).map((chat) => {
                    const otherId = (chat.participants || []).find((id) => id !== auth.currentUser?.uid);
                    const otherUser = {
                      uid: otherId,
                      displayName: chat.participantNames?.[otherId] || 'User',
                      email: chat.participantEmails?.[otherId] || 'user@example.com'
                    };
                    return (
                      <button
                        key={chat.id}
                        onClick={() => handleSelectChat(otherUser, chat.propertyInfo || null)}
                        className="w-full text-left p-3 hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="truncate">
                            <div className="font-medium truncate">{otherUser.displayName}</div>
                            {chat.propertyInfo?.name && (
                              <div className="text-xs text-blue-600 truncate">📍 {chat.propertyInfo.name}</div>
                            )}
                            <div className="text-sm text-gray-600 truncate">{chat.lastMessage || 'No messages yet'}</div>
                          </div>
                          <div className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                            {chat.lastMessageTime?.toDate?.()?.toLocaleString?.() || ''}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Payment Methods */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center gap-2 mb-3">
                <FaWallet className="text-xl text-blue-400" />
                <span className="font-semibold text-lg">Receiving Payment Methods</span>
              </div>
              <div className="space-y-2 mb-3">
                {paymentMethods.map(p => (
                  <div key={p.id} className="flex items-center justify-between border rounded p-2">
                    <div>
                      <span className="font-medium">{p.type}</span>
                      <div className="text-xs text-gray-500">{p.account}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${p.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={handlePaymentMethods}
                className="w-full bg-blue-400 text-white px-3 py-1 rounded hover:bg-blue-500 mb-2"
              >
                Manage Payments
              </button>
              <p className="text-gray-500 text-sm">
                Configure GCash, PayMaya, Bank Transfer, etc.
              </p>
            </div>

            {/* Account Settings */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center gap-2 mb-3">
                <FaUser className="text-xl text-blue-400" />
                <span className="font-semibold text-lg">Account Settings</span>
              </div>
              <div className="space-y-3">
                <div className="border rounded p-3">
                  <div className="font-medium flex items-center gap-2">
                    <FaUser className="text-blue-400" />
                    Profile
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{profile.name}</div>
                  <div className="text-xs text-gray-500">{profile.email}</div>
                </div>
                
                <div className="border rounded p-3">
                  <div className="font-medium flex items-center gap-2">
                    <FaClipboardList className="text-green-400" />
                    Bookings ({listings.length})
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Active: {listings.filter(l => l.status === 'Published').length}
                  </div>
                </div>
                
                <div className="border rounded p-3">
                  <div className="font-medium flex items-center gap-2">
                    <FaTag className="text-pink-400" />
                    Coupons ({coupons.length})
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    Available: {coupons.filter(c => new Date(c.validUntil) > new Date()).length}
              </div>
              </div>
              </div>
              
              <button
                onClick={handleAccountSettings}
                className="w-full mt-3 bg-blue-400 text-white px-3 py-1 rounded hover:bg-blue-500"
              >
                Manage Settings
              </button>
              <p className="text-gray-500 text-sm mt-1">
                Manage profile, bookings, and coupons.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Listing Modal */}
      {showEditListing && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl relative max-h-[80vh] overflow-y-auto my-8">
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
                  <label className="block text-sm font-semibold mb-2">Price (₱/night)</label>
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
                  placeholder="Enter location"
                />
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

              <div>
                <label className="block text-sm font-semibold mb-2">Description</label>
                <textarea
                  value={newListing.description}
                  onChange={(e) => setNewListing({...newListing, description: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 h-24 resize-none"
                  placeholder="Describe your listing... What makes it special?"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Amenities</label>
                <div className="space-y-2">
                  <textarea
                    value={Array.isArray(newListing.amenities) ? newListing.amenities.join(', ') : ''}
                    onChange={(e) => setNewListing({...newListing, amenities: e.target.value.split(',').map(item => item.trim())})}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 h-24 resize-none"
                    placeholder="Enter amenities separated by commas (e.g., Wifi, Parking, Kitchen, AC)"
                  />
                  <div className="flex flex-wrap gap-2">
                    {['Wifi', 'Parking', 'Kitchen', 'AC', 'TV', 'Pool', 'Gym', 'Beach Access', 'Hot Tub', 'BBQ'].map((amenity) => (
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
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-start justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl relative my-auto">
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
                  <label className="block text-sm font-semibold mb-2">Price (₱/night)</label>
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
                  placeholder="Enter location"
                />
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

              <div>
                <label className="block text-sm font-semibold mb-2">Description</label>
                <textarea
                  value={newListing.description}
                  onChange={(e) => setNewListing({...newListing, description: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 h-24 resize-none"
                  placeholder="Describe your listing... What makes it special?"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Amenities</label>
                <div className="space-y-2">
                  <textarea
                    value={Array.isArray(newListing.amenities) ? newListing.amenities.join(', ') : ''}
                    onChange={(e) => setNewListing({...newListing, amenities: e.target.value.split(',').map(item => item.trim())})}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 h-24 resize-none"
                    placeholder="Enter amenities separated by commas (e.g., Wifi, Parking, Kitchen, AC)"
                  />
                  <div className="flex flex-wrap gap-2">
                    {['Wifi', 'Parking', 'Kitchen', 'AC', 'TV', 'Pool', 'Gym', 'Beach Access', 'Hot Tub', 'BBQ'].map((amenity) => (
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
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-start justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl relative my-auto">
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
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-start justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl relative my-auto">
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
                  <div><strong>Level:</strong> Super Host</div>
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

      {/* PayPal Payment Modal */}
      {showPayPalPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-start justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md relative my-auto">
            <button
              onClick={() => setShowPayPalPayment(false)}
              className="sticky top-2 right-4 float-right text-xl text-gray-400 hover:text-blue-500"
            >
              ×
            </button>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaCreditCard className="text-2xl text-blue-500" />
              </div>
              <h3 className="text-xl font-bold">PayPal Payment</h3>
              <p className="text-gray-500">Complete your payment securely</p>
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
            <div id="paypal-button-container" className="mb-4"></div>

            <div className="text-center">
              <p className="text-xs text-gray-400">
                Secure payment powered by PayPal
              </p>
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
                      
                      {booking.notes && (
                        <div className="mt-3 p-3 bg-white rounded-lg">
                          <span className="text-gray-500 text-sm">Notes:</span>
                          <p className="text-sm text-gray-700 mt-1">{booking.notes}</p>
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
    </div>
  );
}

export default HostPage;
