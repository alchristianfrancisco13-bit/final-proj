import { useState, useEffect, useRef } from "react";
import {FaMoneyBillWave,FaChartBar,FaFileAlt,FaSignOutAlt,FaGavel,FaCheck,FaTimes,FaClock,FaUser,FaCalendarAlt,FaChevronLeft,FaChevronRight,FaGift,FaStar,FaCheckCircle,FaTimesCircle} from "react-icons/fa";
import adminlogo from "./adminlogo.webp";
// ✅ Toastify imports
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// ✅ PDF + FileSaver imports
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { signOut } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, setDoc, getDoc, onSnapshot, collection, query, orderBy, limit, serverTimestamp, addDoc, runTransaction, getDocs, updateDoc, where, deleteDoc } from "firebase/firestore";
import { PAYPAL_CONFIG } from "./config";
import { 
  initializeAdminWallet, 
  getAdminWallet, 
  getAdminAnalytics,
  calculatePayPalFees,
  processBookingAdminFee,
  trackCashInRevenue,
  getAdminTransactionHistory,
  getFeeStructure
} from "./utils/adminWallet";
// ✅ Chart.js imports
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Filler
} from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Filler
);

// Date Range Calendar Component
const DateRangeCalendar = ({ startDate, endDate, onChange }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectingStart, setSelectingStart] = useState(true);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  const formatDate = (year, month, day) => {
    const date = new Date(year, month, day);
    return date.toISOString().split('T')[0];
  };

  const handleDateClick = (day) => {
    const dateStr = formatDate(currentYear, currentMonth, day);
    
    if (selectingStart || !startDate) {
      // Selecting start date
      onChange({ startDate: dateStr, endDate: "" });
      setSelectingStart(false);
    } else {
      // Selecting end date
      if (new Date(dateStr) >= new Date(startDate)) {
        onChange({ startDate, endDate: dateStr });
        setSelectingStart(true);
      } else {
        // If clicked date is before start date, make it the new start date
        onChange({ startDate: dateStr, endDate: "" });
        setSelectingStart(false);
      }
    }
  };

  const isDateInRange = (day) => {
    if (!startDate) return false;
    const dateStr = formatDate(currentYear, currentMonth, day);
    const date = new Date(dateStr);
    const start = new Date(startDate);
    
    if (endDate) {
      const end = new Date(endDate);
      return date >= start && date <= end;
    }
    return dateStr === startDate;
  };

  const isStartDate = (day) => {
    if (!startDate) return false;
    return formatDate(currentYear, currentMonth, day) === startDate;
  };

  const isEndDate = (day) => {
    if (!endDate) return false;
    return formatDate(currentYear, currentMonth, day) === endDate;
  };

  const isToday = (day) => {
    const today = new Date();
    return currentYear === today.getFullYear() && 
           currentMonth === today.getMonth() && 
           day === today.getDate();
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
  const days = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  return (
    <div className="border-2 border-gray-200 rounded-xl p-4 bg-white shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-red-50 rounded-lg transition-all hover:scale-110"
          type="button"
        >
          <FaChevronLeft className="text-gray-600 hover:text-red-500" />
        </button>
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-lg text-gray-800">
            {monthNames[currentMonth]} {currentYear}
          </h3>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-xs font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
            type="button"
          >
            Today
          </button>
        </div>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-red-50 rounded-lg transition-all hover:scale-110"
          type="button"
        >
          <FaChevronRight className="text-gray-600 hover:text-red-500" />
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (day === null) {
            return <div key={index} className="aspect-square"></div>;
          }

          const inRange = isDateInRange(day);
          const isStart = isStartDate(day);
          const isEnd = isEndDate(day);
          const today = isToday(day);

          return (
            <button
              key={day}
              type="button"
              onClick={() => handleDateClick(day)}
              className={`
                aspect-square rounded-lg text-sm font-medium transition-all
                ${isStart || isEnd
                  ? 'bg-red-500 text-white shadow-lg scale-105 z-10'
                  : inRange
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : today
                  ? 'bg-blue-50 text-blue-700 border-2 border-blue-300 hover:bg-blue-100'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }
                hover:scale-105 active:scale-95
              `}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Instructions */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-600 text-center">
          {selectingStart || !startDate
            ? "Click a date to select start date"
            : "Click a date to select end date"}
        </p>
      </div>
    </div>
  );
};

// Month Picker Component for Monthly Reports (kept for backward compatibility)
const ReportDateRangePicker = ({ startDate, endDate, onChange }) => {
  const [viewMode, setViewMode] = useState('year'); // 'year' or 'month'
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);

  useEffect(() => {
    if (startDate) {
      const start = new Date(startDate);
      setSelectedMonth(start.getMonth());
      setSelectedYear(start.getFullYear());
      setCurrentYear(start.getFullYear());
    }
  }, [startDate, endDate]);

  const handleYearClick = (year) => {
    setCurrentYear(year);
    setViewMode('month');
  };

  const handleMonthClick = (month) => {
    const year = currentYear;
    // Get first day of the month
    const firstDay = new Date(year, month, 1);
    // Get last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    const startDateStr = firstDay.toISOString().split('T')[0];
    const endDateStr = lastDay.toISOString().split('T')[0];

    setSelectedMonth(month);
    setSelectedYear(year);
    onChange({ startDate: startDateStr, endDate: endDateStr });
  };

  const handleFullYearClick = () => {
    const year = currentYear;
    // Get first day of the year
    const firstDay = new Date(year, 0, 1);
    // Get last day of the year
    const lastDay = new Date(year, 11, 31);
    
    const startDateStr = firstDay.toISOString().split('T')[0];
    const endDateStr = lastDay.toISOString().split('T')[0];

    setSelectedMonth(null);
    setSelectedYear(year);
    onChange({ startDate: startDateStr, endDate: endDateStr });
  };

  const isFullYearSelected = () => {
    if (!startDate || !endDate) return false;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start.getFullYear() === currentYear && 
           start.getMonth() === 0 && start.getDate() === 1 &&
           end.getMonth() === 11 && end.getDate() === 31;
  };

  const isMonthSelected = (month, year) => {
    return selectedMonth === month && selectedYear === year;
  };

  const prevYear = () => {
    setCurrentYear(currentYear - 1);
  };

  const nextYear = () => {
    setCurrentYear(currentYear + 1);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setViewMode('month');
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  // Generate years (current year ± 10 years)
  const generateYears = () => {
    const years = [];
    const current = new Date().getFullYear();
    for (let i = current - 10; i <= current + 2; i++) {
      years.push(i);
    }
    return years;
  };

  return (
    <div className="border-2 border-gray-200 rounded-xl p-5 bg-gradient-to-br from-white to-gray-50 shadow-lg">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-4">
        {viewMode === 'year' ? (
          <>
            <button
              onClick={() => setCurrentYear(currentYear - 12)}
              className="p-2 hover:bg-red-50 rounded-lg transition-all hover:scale-110 active:scale-95"
              type="button"
              title="Previous years"
            >
              <FaChevronLeft className="text-gray-600 hover:text-red-500" />
            </button>
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-lg text-gray-800">
                Select Year
              </h3>
              <button
                onClick={goToToday}
                className="px-3 py-1 text-xs font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                type="button"
                title="Go to current year"
              >
                Today
              </button>
            </div>
            <button
              onClick={() => setCurrentYear(currentYear + 12)}
              className="p-2 hover:bg-red-50 rounded-lg transition-all hover:scale-110 active:scale-95"
              type="button"
              title="Next years"
            >
              <FaChevronRight className="text-gray-600 hover:text-red-500" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setViewMode('year')}
              className="p-2 hover:bg-red-50 rounded-lg transition-all hover:scale-110 active:scale-95"
              type="button"
              title="Back to years"
            >
              <FaChevronLeft className="text-gray-600 hover:text-red-500" />
            </button>
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-lg text-gray-800">
                {currentYear}
              </h3>
              <button
                onClick={goToToday}
                className="px-3 py-1 text-xs font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                type="button"
                title="Go to current month"
              >
                Today
              </button>
            </div>
            <button
              onClick={nextYear}
              className="p-2 hover:bg-red-50 rounded-lg transition-all hover:scale-110 active:scale-95"
              type="button"
              title="Next year"
            >
              <FaChevronRight className="text-gray-600 hover:text-red-500" />
            </button>
          </>
        )}
      </div>

      {/* Year or Month grid */}
      {viewMode === 'year' ? (
        <div className="grid grid-cols-4 gap-3">
          {generateYears().map((year) => {
            const isCurrentYear = year === new Date().getFullYear();
            return (
              <button
                key={year}
                type="button"
                onClick={() => handleYearClick(year)}
                className={`
                  p-4 rounded-lg text-sm font-semibold transition-all duration-200
                  ${isCurrentYear 
                    ? 'bg-red-500 text-white shadow-lg ring-2 ring-red-400' 
                    : 'bg-white text-gray-700 hover:bg-red-50 hover:text-red-600 hover:scale-105 border border-gray-200'
                  }
                  active:scale-95
                `}
              >
                {year}
              </button>
            );
          })}
        </div>
      ) : (
        <div>
          {/* Full Year Option */}
          <div className="mb-3">
            <button
              type="button"
              onClick={handleFullYearClick}
              className={`
                w-full p-3 rounded-lg text-sm font-bold transition-all duration-200
                ${isFullYearSelected()
                  ? 'bg-red-500 text-white shadow-lg scale-105 z-10'
                  : 'bg-gradient-to-r from-blue-50 to-purple-50 text-gray-700 hover:from-blue-100 hover:to-purple-100 hover:text-red-600 hover:scale-102 border-2 border-blue-200'
                }
                active:scale-95
              `}
            >
              📅 Select Full Year ({currentYear})
            </button>
          </div>
          
          {/* Monthly Options */}
          <div className="grid grid-cols-3 gap-3">
            {monthNames.map((month, index) => {
              const isSelected = isMonthSelected(index, currentYear);
              const isCurrentMonth = currentYear === new Date().getFullYear() && index === new Date().getMonth();

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleMonthClick(index)}
                  className={`
                    p-4 rounded-lg text-sm font-semibold transition-all duration-200
                    ${isSelected
                      ? 'bg-red-500 text-white shadow-lg scale-105 z-10'
                      : 'bg-white text-gray-700 hover:bg-red-50 hover:text-red-600 hover:scale-105 border border-gray-200'
                    }
                    ${isCurrentMonth && !isSelected ? 'ring-2 ring-red-400' : ''}
                    active:scale-95
                  `}
                >
                  {fullMonthNames[index]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Status and selected dates display */}
      <div className="mt-5 pt-4 border-t-2 border-gray-200">
        {/* Status indicator */}
        <div className="mb-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
          {!startDate || !endDate ? (
            <div className="flex items-center gap-2 text-blue-700">
              <FaCalendarAlt className="text-blue-500" />
              <span className="font-semibold text-sm">Select a year, then choose a month or full year for your report</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-700">
              <FaCheck className="text-green-500" />
              <span className="font-semibold text-sm">
                {isFullYearSelected() ? 'Full year selected for report!' : 'Month selected for report!'}
              </span>
            </div>
          )}
        </div>

        {/* Selected period display */}
        {(startDate && endDate) && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="flex-1">
                {isFullYearSelected() ? (
                  <>
                    <span className="text-xs text-gray-500 font-medium">Selected Year:</span>
                    <p className="text-sm font-bold text-gray-800">
                      Full Year {selectedYear || currentYear}
                    </p>
                  </>
                ) : selectedMonth !== null && selectedYear !== null ? (
                  <>
                    <span className="text-xs text-gray-500 font-medium">Selected Month:</span>
                    <p className="text-sm font-bold text-gray-800">
                      {fullMonthNames[selectedMonth]} {selectedYear}
                    </p>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-gray-500 font-medium">Selected Date Range:</span>
                    <p className="text-sm font-bold text-gray-800">
                      {startDate} to {endDate}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-3 flex items-center gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-lg bg-red-500"></div>
            <span>Selected month</span>
          </div>
        </div>
      </div>
    </div>
  );
};

function AdminPage({ onLogout }) {
  const [serviceFee, setServiceFee] = useState(10);
  const [adminWallet, setAdminWallet] = useState({
    balance: 0,
    totalEarnings: 0,
    paypalBalance: 0,
  });
  const [adminTransactions, setAdminTransactions] = useState([]);
  const [hostGuestTransactions, setHostGuestTransactions] = useState([]);
  const [bookingTransactions, setBookingTransactions] = useState([]);
  const [report, setReport] = useState("");
  const [analytics, setAnalytics] = useState({
    bookings: 0,
    pendingBookings: 0,
    bookingRevenue: 0,
    commissionRevenue: 0,
  });
  const [adminAnalytics, setAdminAnalytics] = useState(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isProcessingWithdraw, setIsProcessingWithdraw] = useState(false);
  const [adminPaypalEmail, setAdminPaypalEmail] = useState("");
  const paypalWithdrawRef = useRef(null);
  const [platformPolicy, setPlatformPolicy] = useState({
    cancellation: "24-hour free cancellation",
    rules: "No smoking, No pets, No parties",
    reports: "Monthly summary",
    bookingRules: "Guests must provide valid identification. Booking confirmation is required 24 hours before check-in.",
    withdrawalRules: "Hosts can withdraw earnings once per week. Minimum withdrawal amount is PHP 500. Processing time is 3-5 business days.",
    pointsRules: "Hosts earn 50 points per approved booking. Points can be redeemed for cash at 10 points = PHP 1. Points expire after 1 year.",
    couponsRules: "Coupons can only be used once per booking. Discounts cannot be combined. Valid only for bookings made through the platform."
  });
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [simulatePayPalPayout, setSimulatePayPalPayout] = useState(false); // Set to false to process real PayPal payouts (default: false for actual payouts)
  const [reportDateRange, setReportDateRange] = useState({
    startDate: "",
    endDate: ""
  });
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [pendingReportAction, setPendingReportAction] = useState(null); // Store the report generation function to call

  const pesoToUsd = (amount) => {
    if (!amount || Number.isNaN(amount)) return 0;
    return Number((amount / 56).toFixed(2));
  };

  // Initialize Admin PayPal Account with sandbox account
  const initializeAdminPayPalAccount = async () => {
    try {
      const adminWalletRef = doc(db, "adminWallet", "earnings");
      const walletSnap = await getDoc(adminWalletRef);
      
      // Always use the correct admin PayPal email
      const adminPayPalEmail = "gabennewell79@gmail.com";
      const initialPayPalBalance = 50000; // PHP 50,000 from sandbox account
      
      // Always update PayPal email to ensure it's correct, and set balance if not set
      if (!walletSnap.exists()) {
        // Create new wallet document
        await setDoc(adminWalletRef, {
          balance: 0,
          totalEarnings: 0,
          paypalBalance: initialPayPalBalance,
          paypalEmail: adminPayPalEmail,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });
        console.log('✅ Admin PayPal account created:', {
          email: adminPayPalEmail,
          balance: initialPayPalBalance
        });
        setAdminPaypalEmail(adminPayPalEmail);
        toast.success(`Admin PayPal account initialized: ${adminPayPalEmail} (Balance: ₱${initialPayPalBalance.toLocaleString()})`, {
          position: "top-right",
          autoClose: 5000,
        });
      } else {
        // Update existing wallet - always set correct email
        const currentData = walletSnap.data();
        const needsUpdate = currentData.paypalEmail !== adminPayPalEmail;
        const currentBalance = Number(currentData.paypalBalance || 0);
        
        // If balance is 0 or not set, initialize it to match PayPal sandbox
        const balanceToUse = currentBalance > 0 ? currentBalance : initialPayPalBalance;
        
        if (needsUpdate || currentBalance === 0) {
          await setDoc(adminWalletRef, {
            balance: currentData.balance || 0,
            totalEarnings: currentData.totalEarnings || 0,
            paypalBalance: balanceToUse,
            paypalEmail: adminPayPalEmail, // Always set to correct email
            updatedAt: serverTimestamp(),
            createdAt: currentData.createdAt || serverTimestamp()
          }, { merge: true });
          
          console.log('✅ Admin PayPal account updated:', {
            email: adminPayPalEmail,
            balance: balanceToUse
          });
          setAdminPaypalEmail(adminPayPalEmail);
          
          if (currentBalance === 0) {
            toast.info(`Admin PayPal balance initialized to ₱${balanceToUse.toLocaleString()} (matching PayPal Sandbox account)`, {
              position: "top-right",
              autoClose: 4000,
            });
          } else {
            toast.info(`Admin PayPal email updated to: ${adminPayPalEmail}`, {
              position: "top-right",
              autoClose: 3000,
            });
          }
        } else {
          setAdminPaypalEmail(adminPayPalEmail);
        }
      }
    } catch (error) {
      console.error('❌ Error initializing admin PayPal account:', error);
      toast.error(`Failed to initialize PayPal account: ${error.message}`, {
        position: "top-right",
      });
    }
  };

  // Sync Admin PayPal Balance (manual sync button) - Allows manual update to match PayPal sandbox
  const syncAdminPayPalBalance = async () => {
    try {
      const adminWalletRef = doc(db, "adminWallet", "earnings");
      const walletSnap = await getDoc(adminWalletRef);
      
      // Always use the correct admin PayPal email
      const adminPayPalEmail = "gabennewell79@gmail.com";
      
      if (!walletSnap.exists()) {
        await initializeAdminPayPalAccount();
        return;
      }
      
      const currentData = walletSnap.data();
      const currentBalance = Number(currentData.paypalBalance || 0);
      
      // Ask user to input the current balance from PayPal sandbox account
      const newBalanceInput = window.prompt(
        `Current balance in dashboard: ₱${currentBalance.toLocaleString()}\n\n` +
        `Enter the current balance from your PayPal Sandbox account (${adminPayPalEmail}):\n` +
        `(Enter amount in PHP, e.g., 50000)`,
        currentBalance.toString()
      );
      
      if (newBalanceInput === null) {
        // User cancelled
        return;
      }
      
      const newBalance = parseFloat(newBalanceInput);
      
      if (isNaN(newBalance) || newBalance < 0) {
        toast.error("Please enter a valid balance amount (positive number).", {
          position: "top-right",
        });
        return;
      }
      
      // Update balance to match what user entered (from PayPal sandbox)
      await updateDoc(adminWalletRef, {
        paypalEmail: adminPayPalEmail,
        paypalBalance: newBalance,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setAdminPaypalEmail(adminPayPalEmail);
      
      toast.success(`✅ Balance updated to match PayPal Sandbox account!\nEmail: ${adminPayPalEmail}\nNew Balance: ₱${newBalance.toLocaleString()}`, {
        position: "top-right",
        autoClose: 5000,
      });
    } catch (error) {
      console.error('❌ Error syncing admin PayPal balance:', error);
      toast.error(`Failed to sync PayPal balance: ${error.message}`, {
        position: "top-right",
      });
    }
  };

  // Functions with toast + docx
  const handleSetServiceFee = async () => {
    const parsed = Number(serviceFee);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
      toast.error("Please enter a valid service fee between 0 and 100.", {
        position: "top-right",
      });
      return;
    }

    try {
      const configRef = doc(db, "adminSettings", "config");
      await setDoc(
        configRef,
        {
          serviceFee: parsed,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      toast.success(`Service fee updated to ${parsed}%`, {
        position: "top-right",
      });
    } catch (error) {
      console.error("Failed to update service fee:", error);
      toast.error("Failed to update service fee. Please try again.", {
        position: "top-right",
      });
    }
  };

  // Helper functions for report generation
  const formatDate = (dateValue) => {
    if (!dateValue) return "N/A";
    const date = dateValue?.toDate 
      ? dateValue.toDate() 
      : dateValue 
      ? new Date(dateValue) 
      : new Date();
    return !isNaN(date.getTime()) 
      ? date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "N/A";
  };

  // Helper function to check if a date is within the selected range
  const isDateInRange = (dateValue, startDate, endDate) => {
    if (!startDate && !endDate) return true; // No filter applied
    
    const date = dateValue?.toDate 
      ? dateValue.toDate() 
      : dateValue 
      ? new Date(dateValue) 
      : null;
    
    if (!date || isNaN(date.getTime())) return false;
    
    // Normalize dates to start of day for comparison
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (checkDate < start) return false;
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (checkDate > end) return false;
    }
    
    return true;
  };

  // Filter transactions by date range
  const filterTransactionsByDateRange = (transactions, startDate, endDate) => {
    if (!startDate && !endDate) return transactions;
    return transactions.filter(tx => {
      const txDate = tx.date || tx.createdAt || tx.timestamp || tx.requestedAt;
      return isDateInRange(txDate, startDate, endDate);
    });
  };

  // Filter bookings by date range
  const filterBookingsByDateRange = (bookings, startDate, endDate) => {
    if (!startDate && !endDate) return bookings;
    return bookings.filter(booking => {
      const bookingDate = booking.createdAt || booking.bookingDate || booking.date;
      return isDateInRange(bookingDate, startDate, endDate);
    });
  };

  // Helper class to mimic Paragraph API for backward compatibility
  class Paragraph {
    constructor(textOrOptions) {
      if (typeof textOrOptions === 'string') {
        // Direct string - use as is, ensure it's clean
        this.text = textOrOptions.replace(/&/g, '');
        this.bold = false;
        this.italic = false;
        this.size = 12;
      } else if (textOrOptions) {
        let extractedText = '';
        
        if (textOrOptions.children && textOrOptions.children.length > 0) {
          // Extract text from children - combine all text nodes
          for (const child of textOrOptions.children) {
            if (child && typeof child === 'object') {
              // Handle TextRun objects
              if (child.text !== undefined && child.text !== null) {
                const childText = String(child.text).replace(/&/g, '');
                extractedText += childText;
              }
            }
          }
          // Fallback to direct text property
          if (!extractedText && textOrOptions.text !== undefined && textOrOptions.text !== null) {
            extractedText = String(textOrOptions.text).replace(/&/g, '');
          }
          this.bold = textOrOptions.children[0]?.bold || textOrOptions.bold || false;
          this.italic = textOrOptions.children[0]?.italics || textOrOptions.italics || false;
          this.size = textOrOptions.children[0]?.size ? textOrOptions.children[0].size / 2 : (textOrOptions.size ? textOrOptions.size / 2 : 12);
        } else {
          // Direct text property
          if (textOrOptions.text !== undefined && textOrOptions.text !== null) {
            extractedText = String(textOrOptions.text).replace(/&/g, '');
          }
          this.bold = textOrOptions.bold || false;
          this.italic = textOrOptions.italics || textOrOptions.italic || false;
          this.size = textOrOptions.size ? textOrOptions.size / 2 : 12;
        }
        
        // Store text as plain string, ensure no "&" characters
        this.text = extractedText.replace(/&/g, '');
      } else {
        this.text = '';
        this.bold = false;
        this.italic = false;
        this.size = 12;
      }
    }
  }

  class TextRun {
    constructor(options) {
      // Ensure text is a proper string
      this.text = String(options?.text || '');
      this.bold = options?.bold || false;
      this.italic = options?.italics || false;
      this.size = options?.size ? options.size / 2 : 12;
    }
  }

  // Helper functions for PDF report generation
  const addSectionHeader = (title, content) => {
    // Remove emojis and special characters that might cause encoding issues
    const cleanTitle = String(title).replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
    content.push(new Paragraph(" "));
    content.push(new Paragraph({
        children: [
          new TextRun({
            text: cleanTitle,
            bold: true,
            size: 26,
          }),
        ],
    }));
    content.push(new Paragraph(" "));
  };

  const addSubsection = (title, content) => {
    // Remove emojis and special characters that might cause encoding issues
    const cleanTitle = String(title).replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
    content.push(new Paragraph({
        children: [
          new TextRun({
            text: cleanTitle,
            bold: true,
            size: 22,
          }),
        ],
    }));
  };

  // Helper function to replace peso sign with PHP
  const replacePesoSign = (text) => {
    if (typeof text !== 'string') {
      text = String(text);
    }
    return text.replace(/₱/g, 'PHP ');
  };

  const generateReportDocument = async (reportName, reportContent, categoryName) => {
    try {
    const now = new Date();
    const timestamp = now.toLocaleString();
      
      // Create PDF document
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const tableWidth = pageWidth - (margin * 2);

      // Add title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text(reportName, margin, 20);
      
      // Add date
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated: ${timestamp}`, margin, 28);
      
      let startY = 35;

      // Process content - can be text or table
      for (const item of reportContent) {
        // Check if item is a table
        if (item.type === 'table' && item.headers && item.rows) {
          // Replace peso sign in headers
          const cleanHeaders = item.headers.map(h => replacePesoSign(h));
          // Replace peso sign in rows
          const cleanRows = item.rows.map(row => 
            row.map(cell => replacePesoSign(cell))
          );
          
          // Calculate available width for table
          const availableWidth = pageWidth - (margin * 2);
          
          // Process columnStyles - convert 'auto' to undefined and validate widths
          let columnStyles = item.columnStyles || {};
          let hasAutoWidth = false;
          let totalFixedWidth = 0;
          
          // Check if any column uses 'auto' or if widths exceed available space
          Object.keys(columnStyles).forEach(key => {
            const style = columnStyles[key];
            if (style.cellWidth === 'auto' || style.cellWidth === undefined) {
              hasAutoWidth = true;
              delete style.cellWidth; // Remove to let autoTable calculate
            } else if (typeof style.cellWidth === 'number') {
              totalFixedWidth += style.cellWidth;
            }
          });
          
          // If total fixed width exceeds available width, use auto sizing
          if (totalFixedWidth > availableWidth) {
            // Convert all to auto
            Object.keys(columnStyles).forEach(key => {
              if (columnStyles[key].cellWidth) {
                delete columnStyles[key].cellWidth;
              }
            });
            hasAutoWidth = true;
          }
          
          autoTable(pdf, {
            head: [cleanHeaders],
            body: cleanRows,
            startY: startY,
            margin: { left: margin, right: margin },
            tableWidth: availableWidth,
            styles: {
              fontSize: 7,
              cellPadding: 2,
              overflow: 'linebreak',
              cellWidth: 'wrap',
              halign: 'left',
              valign: 'middle',
              lineWidth: 0.1
            },
            headStyles: {
              fillColor: [220, 53, 69], // Red color
              textColor: 255,
              fontStyle: 'bold',
              halign: 'center',
              fontSize: 8
            },
            columnStyles: columnStyles,
            didDrawPage: (data) => {
              startY = data.cursor.y + 10;
            },
            // Enable text wrapping and prevent overflow
            didParseCell: (data) => {
              // Ensure text is properly formatted for wrapping
              if (data.cell.text) {
                // Convert to array if it's a string
                if (typeof data.cell.text === 'string') {
                  data.cell.text = [data.cell.text];
                }
                // Truncate very long single words to prevent overflow
                if (Array.isArray(data.cell.text)) {
                  data.cell.text = data.cell.text.map(line => {
                    const text = String(line);
                    // If a single word/line is extremely long, truncate it
                    if (text.length > 40) {
                      return text.substring(0, 37) + '...';
                    }
                    return text;
                  });
                }
              }
            }
          });
          startY = pdf.lastAutoTable.finalY + 10;
        } 
        // Check if item is text
        else if (item.type === 'text') {
          pdf.setFontSize(item.fontSize || 12);
          pdf.setFont('helvetica', item.bold ? 'bold' : item.italic ? 'italic' : 'normal');
          
          const text = replacePesoSign(String(item.text || '')).replace(/&/g, '');
          if (text && text.trim()) {
            const lines = pdf.splitTextToSize(text, tableWidth);
            pdf.text(lines, margin, startY);
            startY += (lines.length * 5) + 5;
          }
        }
        // Check if item is spacing
        else if (item.type === 'spacing') {
          startY += item.value || 5;
        }
        // Check if item is separator
        else if (item.type === 'separator') {
          pdf.setLineWidth(0.5);
          pdf.line(margin, startY, pageWidth - margin, startY);
          startY += 5;
        }
        // Check if item is section header
        else if (item.type === 'section') {
          startY += 5;
          pdf.setFontSize(16);
          pdf.setFont('helvetica', 'bold');
          const title = replacePesoSign(String(item.text || '')).replace(/&/g, '').replace(/[\u{1F300}-\u{1F9FF}]/gu, '');
          pdf.text(title, margin, startY);
          startY += 10;
        }
      }

      // Add footer
      const pageCount = pdf.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.text(
          `Generated by StayHub Admin Dashboard on ${timestamp} - Page ${i} of ${pageCount}`,
          margin,
          pageHeight - 10
        );
      }

      // Save PDF
      const fileName = `${categoryName || reportName.replace(/\s+/g, "_")}_${now.toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast.success(`${categoryName || reportName} report generated and downloaded as PDF!`, {
        position: "top-right",
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(`Failed to generate report: ${error.message}`, {
        position: "top-right",
      });
    }
  };

  // Generate Executive Summary Report
  const handleGenerateExecutiveSummary = async () => {
    try {
      const now = new Date();
      const timestamp = now.toLocaleString();
      const reportName = report || "Executive Summary Report";
      const { startDate, endDate } = reportDateRange;
      
      // Filter transactions and bookings by date range
      const filteredAdminTransactions = filterTransactionsByDateRange(adminTransactions, startDate, endDate);
      const filteredBookings = filterBookingsByDateRange(bookingTransactions, startDate, endDate);
      
      // Calculate filtered analytics
      const filteredBookingRevenue = filteredBookings.reduce((sum, booking) => {
        const amount = Number(booking.amount || booking.total || 0);
      return sum + amount;
    }, 0);
      
      const filteredCommissionRevenue = filteredAdminTransactions
        .filter(t => (Number(t.amount) || 0) > 0)
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
      const bookingRevenueText = `₱${Number(filteredBookingRevenue || 0).toLocaleString()}`;
      const commissionRevenueText = `₱${Number(filteredCommissionRevenue || 0).toLocaleString()}`;
      const walletBalanceText = `₱${Number(adminWallet.paypalBalance || 0).toLocaleString()}`;
      const totalEarningsText = `₱${Number(adminWallet.totalEarnings || 0).toLocaleString()}`;
      
      const filteredBookingsCount = filteredBookings.length;
      const filteredPendingBookings = filteredBookings.filter(b => b.status === "PendingApproval" || b.status === "pending").length;

    const reportChildren = [
            new Paragraph({
              children: [
                new TextRun({
            text: reportName,
                  bold: true,
            size: 32,
                }),
              ],
            }),
            new Paragraph({
              text: `Generated on: ${timestamp}`,
              italics: true,
              size: 20,
            }),
            new Paragraph(" "),
      new Paragraph("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"),
    ];

    addSectionHeader("📊 EXECUTIVE SUMMARY", reportChildren);
    
    // Add date range info if selected
    if (startDate || endDate) {
      reportChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Date Range: ${startDate || "All"} to ${endDate || "All"}`,
              italics: true,
              size: 20,
            }),
          ],
        }),
        new Paragraph(" ")
      );
    }
    
    reportChildren.push(
      new Paragraph(`Total Bookings: ${filteredBookingsCount}`),
      new Paragraph(`Pending Bookings: ${filteredPendingBookings}`),
      new Paragraph(`Gross Booking Revenue: ${bookingRevenueText}`),
      new Paragraph(`Net Admin Commission: ${commissionRevenueText}`),
      new Paragraph(`Total Earnings: ${totalEarningsText}`),
      new Paragraph(`Current PayPal Balance: ${walletBalanceText}`),
      new Paragraph(" ")
    );

      await generateReportDocument(reportName, reportChildren, "Executive_Summary");
    } catch (error) {
      console.error('Error generating executive summary:', error);
      toast.error(`Failed to generate executive summary: ${error.message}`, {
        position: "top-right",
      });
    }
  };

  // Generate Analytics Report
  const handleGenerateAnalytics = async () => {
    try {
      const now = new Date();
      const timestamp = now.toLocaleString();
      const reportName = report || "Analytics Report";
      const { startDate, endDate } = reportDateRange;
      
      // Filter data by date range
      const filteredBookings = filterBookingsByDateRange(bookingTransactions, startDate, endDate);
      const filteredAdminTransactions = filterTransactionsByDateRange(adminTransactions, startDate, endDate);
      
      const reportChildren = [
      new Paragraph({
        children: [
          new TextRun({
            text: reportName,
            bold: true,
            size: 32,
          }),
        ],
      }),
      new Paragraph({
        text: `Generated on: ${timestamp}`,
        italics: true,
        size: 20,
      }),
            new Paragraph(" "),
      new Paragraph("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"),
    ];

    addSectionHeader("📈 ANALYTICS & PERFORMANCE", reportChildren);
    
    if (adminAnalytics) {
      addSubsection("Revenue Analytics", reportChildren);
      reportChildren.push(
        new Paragraph(`Total Revenue: ₱${Number(adminAnalytics.totalRevenue || 0).toLocaleString()}`),
        new Paragraph(`Commission Revenue: ₱${Number(adminAnalytics.commissionRevenue || 0).toLocaleString()}`),
        new Paragraph(`Cancellation Fees: ₱${Number(adminAnalytics.cancellationFees || 0).toLocaleString()}`),
        new Paragraph(" ")
      );
    }

    addSubsection("Booking Statistics", reportChildren);
    reportChildren.push(
      new Paragraph(`Total Bookings: ${analytics.bookings}`),
      new Paragraph(`Pending Approvals: ${analytics.pendingBookings}`),
      new Paragraph(`Completed Bookings: ${analytics.bookings - analytics.pendingBookings}`),
      new Paragraph(" ")
    );

      await generateReportDocument(reportName, reportChildren, "Analytics");
    } catch (error) {
      console.error('Error generating analytics report:', error);
      toast.error(`Failed to generate analytics report: ${error.message}`, {
        position: "top-right",
      });
    }
  };

  // Generate Financial Report
  const handleGenerateFinancialReport = async () => {
    try {
      const now = new Date();
      const timestamp = now.toLocaleString();
      const reportName = report || "Financial Report";
      const { startDate, endDate } = reportDateRange;
      
      // Filter transactions by date range
      const filteredAdminTransactions = filterTransactionsByDateRange(adminTransactions, startDate, endDate);
      
      const reportContent = [];
    
    // Add date range info if selected
    if (startDate || endDate) {
        reportContent.push({
          type: 'text',
              text: `Date Range: ${startDate || "All"} to ${endDate || "All"}`,
          fontSize: 10,
          italic: true
        });
        reportContent.push({ type: 'spacing', value: 5 });
    }
    
    const withdrawals = filteredAdminTransactions.filter(t => 
      t.type === "withdrawal" || 
      (t.type && t.type.toLowerCase().includes("withdrawal")) ||
      (Number(t.amount) || 0) < 0
    );
    const totalWithdrawals = withdrawals.reduce((sum, t) => {
      const amount = Math.abs(Number(t.amount) || 0);
      return sum + amount;
    }, 0);

    const commissions = adminTransactions.filter(t => {
      const amount = Number(t.amount) || 0;
      return amount > 0 && (
        t.type === "commission" || 
        (t.type && t.type.toLowerCase().includes("commission"))
      );
    });
    const totalCommissions = commissions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const cancellations = adminTransactions.filter(t => {
      const amount = Number(t.amount) || 0;
      return amount > 0 && (
        t.type === "cancellation-fee" || 
        (t.type && t.type.toLowerCase().includes("cancellation"))
      );
    });
    const totalCancellationFees = cancellations.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const walletBalance = Number(adminWallet.paypalBalance || 0);
      const totalEarnings = Number(adminWallet.totalEarnings || 0);

      // Financial Summary Section
      reportContent.push({
        type: 'section',
        text: 'FINANCIAL SUMMARY'
      });

      // Income Table
      reportContent.push({
        type: 'table',
        headers: ['Item', 'Amount'],
        rows: [
          ['Total Commissions', `₱${totalCommissions.toLocaleString()}`],
          ['Cancellation Fees', `₱${totalCancellationFees.toLocaleString()}`],
          ['Total Income', `₱${(totalCommissions + totalCancellationFees).toLocaleString()}`]
        ],
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 50, halign: 'right' }
        }
      });
      reportContent.push({ type: 'spacing', value: 10 });

      // Expenses Table
      reportContent.push({
        type: 'table',
        headers: ['Item', 'Amount / Count'],
        rows: [
          ['Total Withdrawals/Payouts', `₱${totalWithdrawals.toLocaleString()}`],
          ['Number of Withdrawal Requests', withdrawals.length.toString()]
        ],
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 50, halign: 'right' }
        }
      });
      reportContent.push({ type: 'spacing', value: 10 });

      // Wallet Status Table
      reportContent.push({
        type: 'table',
        headers: ['Item', 'Amount'],
        rows: [
          ['PayPal Balance', `₱${walletBalance.toLocaleString()}`],
          ['Total Earnings (All Time)', `₱${totalEarnings.toLocaleString()}`]
        ],
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 50, halign: 'right' }
        }
      });
      reportContent.push({ type: 'spacing', value: 10 });

      // Booking Status Breakdown
      reportContent.push({
        type: 'section',
        text: 'BOOKING STATUS BREAKDOWN'
      });
      
      // Get all bookings (not just transactions) for status breakdown
      const bookingsRef = collection(db, "bookings");
      const allBookingsSnapshot = await getDocs(bookingsRef);
      const allBookings = allBookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter bookings by date range
      const filteredBookingsForStatus = allBookings.filter(booking => {
        if (!startDate && !endDate) return true;
        const bookingDate = booking.createdAt?.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt || booking.bookingDate);
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (bookingDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (bookingDate > end) return false;
        }
        return true;
      });
      
      // Categorize bookings by status
      const completedBookings = filteredBookingsForStatus.filter(b => 
        b.status === "Completed" || b.status === "completed" || 
        (b.status !== "PendingApproval" && b.status !== "pending" && 
         b.status !== "CancelledByGuest" && b.status !== "Cancelled" && 
         b.status !== "CancelledByHost")
      );
      const canceledBookings = filteredBookingsForStatus.filter(b => 
        b.status === "CancelledByGuest" || b.status === "Cancelled" || b.status === "CancelledByHost"
      );
      const pendingBookings = filteredBookingsForStatus.filter(b => 
        b.status === "PendingApproval" || b.status === "pending"
      );
      
      // Calculate totals for each status
      const completedTotal = completedBookings.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
      const canceledTotal = canceledBookings.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
      const pendingTotal = pendingBookings.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
      
      reportContent.push({
        type: 'table',
        headers: ['Status', 'Count', 'Total Amount'],
        rows: [
          ['Completed', completedBookings.length.toString(), `₱${completedTotal.toLocaleString()}`],
          ['Canceled', canceledBookings.length.toString(), `₱${canceledTotal.toLocaleString()}`],
          ['Pending', pendingBookings.length.toString(), `₱${pendingTotal.toLocaleString()}`],
          ['Total', filteredBookingsForStatus.length.toString(), `₱${(completedTotal + canceledTotal + pendingTotal).toLocaleString()}`]
        ],
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 50, halign: 'right' }
        }
      });

      await generateReportDocument(reportName, reportContent, "Financial_Report");
    } catch (error) {
      console.error('Error generating financial report:', error);
      toast.error(`Failed to generate financial report: ${error.message}`, {
        position: "top-right",
      });
    }
  };

  // Generate User Report
  const handleGenerateUserReport = async () => {
    try {
      const now = new Date();
      const timestamp = now.toLocaleString();
      const reportName = report || "User Report";
      const { startDate, endDate } = reportDateRange;
      
      // Fetch all users from Firestore
      const usersRef = collection(db, "users");
      const usersSnapshot = await getDocs(usersRef);
      const allUsers = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Fetch user roles
      const userRolesRef = collection(db, "userRoles");
      const rolesSnapshot = await getDocs(userRolesRef);
      const userRoles = {};
      rolesSnapshot.docs.forEach(doc => {
        userRoles[doc.id] = doc.data().role;
      });

      // Categorize users
      const hosts = allUsers.filter(u => userRoles[u.id] === "host" || u.role === "host");
      const guests = allUsers.filter(u => userRoles[u.id] === "guest" || u.role === "guest");
      const admins = allUsers.filter(u => userRoles[u.id] === "admin" || u.role === "admin");

      // Get bookings for activity analysis
      const filteredBookings = filterBookingsByDateRange(bookingTransactions, startDate, endDate);
      
      // Get all bookings for status breakdown
      const bookingsRef = collection(db, "bookings");
      const allBookingsSnapshot = await getDocs(bookingsRef);
      const allBookings = allBookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter bookings by date range
      const filteredBookingsForStatus = allBookings.filter(booking => {
        if (!startDate && !endDate) return true;
        const bookingDate = booking.createdAt?.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt || booking.bookingDate);
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (bookingDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (bookingDate > end) return false;
        }
        return true;
      });
      
      const reportContent = [];

      // Add date range info
      if (startDate || endDate) {
        reportContent.push({
          type: 'text',
          text: `Date Range: ${startDate || "All"} to ${endDate || "All"}`,
          fontSize: 10,
          italic: true
        });
        reportContent.push({ type: 'spacing', value: 5 });
      }

      // User Statistics Summary Table
      reportContent.push({
        type: 'section',
        text: 'USER STATISTICS'
      });
      reportContent.push({
        type: 'table',
        headers: ['Category', 'Count'],
        rows: [
          ['Total Users', allUsers.length.toString()],
          ['Hosts', hosts.length.toString()],
          ['Guests', guests.length.toString()],
          ['Admins', admins.length.toString()]
        ],
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 40, halign: 'center' }
        }
      });
      reportContent.push({ type: 'spacing', value: 10 });

      // Host Details Table
      reportContent.push({
        type: 'section',
        text: 'HOST DETAILS'
      });
      if (hosts.length > 0) {
        const hostRows = hosts.slice(0, 100).map((host, index) => {
          const hostBookings = filteredBookings.filter(b => b.hostId === host.id);
          const hostEarnings = hostBookings.reduce((sum, b) => sum + (Number(b.amount || b.total || 0)), 0);
          return [
            (index + 1).toString(),
            String(host.name || host.email || host.id || 'N/A'),
            String(host.email || 'N/A'),
            hostBookings.length.toString(),
            `₱${hostEarnings.toLocaleString()}`
          ];
        });
        
        reportContent.push({
          type: 'table',
          headers: ['#', 'Name', 'Email', 'Bookings', 'Earnings'],
          rows: hostRows,
          columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 40 },
            2: { cellWidth: 50 },
            3: { cellWidth: 25, halign: 'center' },
            4: { cellWidth: 40, halign: 'right' }
          }
        });
        
        if (hosts.length > 100) {
          reportContent.push({
            type: 'text',
            text: `... and ${hosts.length - 100} more hosts`,
            fontSize: 10,
            italic: true
          });
        }
      } else {
        reportContent.push({
          type: 'text',
          text: 'No hosts found.',
          fontSize: 10
        });
      }
      reportContent.push({ type: 'spacing', value: 10 });

      // Guest Details Table
      reportContent.push({
        type: 'section',
        text: 'GUEST DETAILS'
      });
      if (guests.length > 0) {
        const guestRows = guests.slice(0, 100).map((guest, index) => {
          const guestBookings = filteredBookings.filter(b => b.guestId === guest.id);
          const guestSpending = guestBookings.reduce((sum, b) => sum + (Number(b.amount || b.total || 0)), 0);
          return [
            (index + 1).toString(),
            String(guest.name || guest.email || guest.id || 'N/A'),
            String(guest.email || 'N/A'),
            guestBookings.length.toString(),
            `₱${guestSpending.toLocaleString()}`
          ];
        });
        
        reportContent.push({
          type: 'table',
          headers: ['#', 'Name', 'Email', 'Bookings', 'Total Spent'],
          rows: guestRows,
          columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 40 },
            2: { cellWidth: 50 },
            3: { cellWidth: 25, halign: 'center' },
            4: { cellWidth: 40, halign: 'right' }
          }
        });
        
        if (guests.length > 100) {
          reportContent.push({
            type: 'text',
            text: `... and ${guests.length - 100} more guests`,
            fontSize: 10,
            italic: true
          });
        }
      } else {
        reportContent.push({
          type: 'text',
          text: 'No guests found.',
          fontSize: 10
        });
      }
      reportContent.push({ type: 'spacing', value: 10 });

      // Booking Status Breakdown
      reportContent.push({
        type: 'section',
        text: 'BOOKING STATUS BREAKDOWN'
      });
      
      // Categorize bookings by status
      const completedBookings = filteredBookingsForStatus.filter(b => 
        b.status === "Completed" || b.status === "completed" || 
        (b.status !== "PendingApproval" && b.status !== "pending" && 
         b.status !== "CancelledByGuest" && b.status !== "Cancelled" && 
         b.status !== "CancelledByHost")
      );
      const canceledBookings = filteredBookingsForStatus.filter(b => 
        b.status === "CancelledByGuest" || b.status === "Cancelled" || b.status === "CancelledByHost"
      );
      const pendingBookings = filteredBookingsForStatus.filter(b => 
        b.status === "PendingApproval" || b.status === "pending"
      );
      
      // Calculate totals for each status
      const completedTotal = completedBookings.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
      const canceledTotal = canceledBookings.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
      const pendingTotal = pendingBookings.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
      
      reportContent.push({
        type: 'table',
        headers: ['Status', 'Count', 'Total Amount'],
        rows: [
          ['Completed', completedBookings.length.toString(), `₱${completedTotal.toLocaleString()}`],
          ['Canceled', canceledBookings.length.toString(), `₱${canceledTotal.toLocaleString()}`],
          ['Pending', pendingBookings.length.toString(), `₱${pendingTotal.toLocaleString()}`],
          ['Total', filteredBookingsForStatus.length.toString(), `₱${(completedTotal + canceledTotal + pendingTotal).toLocaleString()}`]
        ],
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 50, halign: 'right' }
        }
      });

      await generateReportDocument(reportName, reportContent, "User_Report");
    } catch (error) {
      console.error('Error generating user report:', error);
      toast.error(`Failed to generate user report: ${error.message}`, {
        position: "top-right",
      });
    }
  };

  // Generate Listing Performance Report
  const handleGenerateListingPerformanceReport = async () => {
    try {
      const now = new Date();
      const timestamp = now.toLocaleString();
      const reportName = report || "Listing Performance Report";
      const { startDate, endDate } = reportDateRange;
      
      // Fetch all listings from Firestore
      const listingsRef = collection(db, "listings");
      const listingsSnapshot = await getDocs(listingsRef);
      const allListings = listingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get bookings for performance analysis
      const filteredBookings = filterBookingsByDateRange(bookingTransactions, startDate, endDate);
      
      // Get all bookings for status breakdown
      const bookingsRef = collection(db, "bookings");
      const allBookingsSnapshot = await getDocs(bookingsRef);
      const allBookings = allBookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter bookings by date range
      const filteredBookingsForStatus = allBookings.filter(booking => {
        if (!startDate && !endDate) return true;
        const bookingDate = booking.createdAt?.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt || booking.bookingDate);
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (bookingDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (bookingDate > end) return false;
        }
        return true;
      });
      
      // Calculate performance metrics for each listing
      const listingPerformance = allListings.map(listing => {
        const listingBookings = filteredBookings.filter(b => b.listingId === listing.id);
        const revenue = listingBookings.reduce((sum, b) => sum + (Number(b.amount || b.total || 0)), 0);
        const avgRating = listing.rating || 0;
        const reviewCount = listing.reviews?.length || 0;
        
        return {
          ...listing,
          bookings: listingBookings.length,
          revenue,
          avgRating,
          reviewCount
        };
      });

      // Sort by revenue (descending)
      listingPerformance.sort((a, b) => b.revenue - a.revenue);

      // Summary statistics
      const totalRevenue = listingPerformance.reduce((sum, l) => sum + l.revenue, 0);
      const avgBookingsPerListing = listingPerformance.length > 0 
        ? (listingPerformance.reduce((sum, l) => sum + l.bookings, 0) / listingPerformance.length).toFixed(2)
        : 0;
      const listingsWithBookings = listingPerformance.filter(l => l.bookings > 0).length;
      
      const reportContent = [];

      // Add date range info
      if (startDate || endDate) {
        reportContent.push({
          type: 'text',
          text: `Date Range: ${startDate || "All"} to ${endDate || "All"}`,
          fontSize: 10,
          italic: true
        });
        reportContent.push({ type: 'spacing', value: 5 });
      }

      // Summary Statistics Table
      reportContent.push({
        type: 'section',
        text: 'LISTING PERFORMANCE SUMMARY'
      });
      reportContent.push({
        type: 'table',
        headers: ['Metric', 'Value'],
        rows: [
          ['Total Listings', allListings.length.toString()],
          ['Total Bookings (Period)', filteredBookings.length.toString()]
        ],
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 50, halign: 'center' }
        }
      });
      reportContent.push({ type: 'spacing', value: 10 });

      // Top Performing Listings Table
      reportContent.push({
        type: 'section',
        text: 'TOP PERFORMING LISTINGS'
      });
      if (listingPerformance.length > 0) {
        const listingRows = listingPerformance.slice(0, 100).map((listing, index) => {
          return [
            (index + 1).toString(),
            String(listing.title || "Untitled Listing").substring(0, 30),
            String(listing.location || "N/A").substring(0, 25),
            `₱${Number(listing.price || 0).toLocaleString()}`,
            listing.bookings.toString(),
            `₱${listing.revenue.toLocaleString()}`,
            `${listing.avgRating.toFixed(1)}/5`,
            listing.reviewCount.toString()
          ];
        });
        
        reportContent.push({
          type: 'table',
          headers: ['#', 'Title', 'Location', 'Price/Night', 'Bookings', 'Revenue', 'Rating', 'Reviews'],
          rows: listingRows,
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 35 },
            2: { cellWidth: 30 },
            3: { cellWidth: 25, halign: 'right' },
            4: { cellWidth: 20, halign: 'center' },
            5: { cellWidth: 30, halign: 'right' },
            6: { cellWidth: 20, halign: 'center' },
            7: { cellWidth: 20, halign: 'center' }
          }
        });
        
        if (listingPerformance.length > 100) {
          reportContent.push({
            type: 'text',
            text: `... and ${listingPerformance.length - 100} more listings`,
            fontSize: 10,
            italic: true
          });
        }
      } else {
        reportContent.push({
          type: 'text',
          text: 'No listings found.',
          fontSize: 10
        });
      }
      reportContent.push({ type: 'spacing', value: 10 });

      // Summary Statistics Table
      reportContent.push({
        type: 'section',
        text: 'SUMMARY STATISTICS'
      });
      reportContent.push({
        type: 'table',
        headers: ['Metric', 'Value'],
        rows: [
          ['Total Revenue (All Listings)', `₱${totalRevenue.toLocaleString()}`],
          ['Average Bookings per Listing', avgBookingsPerListing],
          ['Listings with Bookings', `${listingsWithBookings} out of ${listingPerformance.length}`]
        ],
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 50, halign: 'right' }
        }
      });
      reportContent.push({ type: 'spacing', value: 10 });

      // Booking Status Breakdown
      reportContent.push({
        type: 'section',
        text: 'BOOKING STATUS BREAKDOWN'
      });
      
      // Categorize bookings by status
      const completedBookings = filteredBookingsForStatus.filter(b => 
        b.status === "Completed" || b.status === "completed" || 
        (b.status !== "PendingApproval" && b.status !== "pending" && 
         b.status !== "CancelledByGuest" && b.status !== "Cancelled" && 
         b.status !== "CancelledByHost")
      );
      const canceledBookings = filteredBookingsForStatus.filter(b => 
        b.status === "CancelledByGuest" || b.status === "Cancelled" || b.status === "CancelledByHost"
      );
      const pendingBookings = filteredBookingsForStatus.filter(b => 
        b.status === "PendingApproval" || b.status === "pending"
      );
      
      // Calculate totals for each status
      const completedTotal = completedBookings.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
      const canceledTotal = canceledBookings.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
      const pendingTotal = pendingBookings.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
      
      reportContent.push({
        type: 'table',
        headers: ['Status', 'Count', 'Total Amount'],
        rows: [
          ['Completed', completedBookings.length.toString(), `₱${completedTotal.toLocaleString()}`],
          ['Canceled', canceledBookings.length.toString(), `₱${canceledTotal.toLocaleString()}`],
          ['Pending', pendingBookings.length.toString(), `₱${pendingTotal.toLocaleString()}`],
          ['Total', filteredBookingsForStatus.length.toString(), `₱${(completedTotal + canceledTotal + pendingTotal).toLocaleString()}`]
        ],
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 50, halign: 'right' }
        }
      });

      await generateReportDocument(reportName, reportContent, "Listing_Performance_Report");
    } catch (error) {
      console.error('Error generating listing performance report:', error);
      toast.error(`Failed to generate listing performance report: ${error.message}`, {
        position: "top-right",
      });
    }
  };

  // Generate Booking Status Report (Completed, Cancelled, or Pending)
  const handleGenerateBookingStatusReport = async (statusType) => {
    try {
      const statusLabels = {
        'completed': 'Completed',
        'cancelled': 'Cancelled',
        'pending': 'Pending'
      };
      const statusLabel = statusLabels[statusType] || statusType;
      const reportName = `${statusLabel} Bookings Report`;
      const { startDate, endDate } = reportDateRange;
      
      // Get all bookings from Firestore
      const bookingsRef = collection(db, "bookings");
      const allBookingsSnapshot = await getDocs(bookingsRef);
      const allBookings = allBookingsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter bookings by date range
      let filteredBookings = allBookings.filter(booking => {
        if (!startDate && !endDate) return true;
        const bookingDate = booking.createdAt?.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt || booking.bookingDate);
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (bookingDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (bookingDate > end) return false;
        }
        return true;
      });
      
      // Filter by status
      let statusFilteredBookings = [];
      if (statusType === 'completed') {
        statusFilteredBookings = filteredBookings.filter(b => 
          b.status === "Completed" || b.status === "completed" || 
          (b.status !== "PendingApproval" && b.status !== "pending" && 
           b.status !== "CancelledByGuest" && b.status !== "Cancelled" && 
           b.status !== "CancelledByHost")
        );
      } else if (statusType === 'cancelled') {
        statusFilteredBookings = filteredBookings.filter(b => 
          b.status === "CancelledByGuest" || b.status === "Cancelled" || b.status === "CancelledByHost"
        );
      } else if (statusType === 'pending') {
        statusFilteredBookings = filteredBookings.filter(b => 
          b.status === "PendingApproval" || b.status === "pending"
        );
      }
      
      // Get user data for bookings
      const bookingsWithUserData = await Promise.all(
        statusFilteredBookings.map(async (booking) => {
          let guestName = "Unknown Guest";
          let hostName = "Unknown Host";
          let guestEmail = "N/A";
          let hostEmail = "N/A";

          if (booking.guestId) {
            try {
              const guestDoc = await getDoc(doc(db, "users", booking.guestId));
              if (guestDoc.exists()) {
                const guestData = guestDoc.data();
                guestName = guestData.name || guestData.email || "Unknown Guest";
                guestEmail = guestData.email || "N/A";
              }
            } catch (error) {
              console.error("Error fetching guest data:", error);
            }
          }

          if (booking.hostId) {
            try {
              const hostDoc = await getDoc(doc(db, "users", booking.hostId));
              if (hostDoc.exists()) {
                const hostData = hostDoc.data();
                hostName = hostData.name || hostData.email || "Unknown Host";
                hostEmail = hostData.email || "N/A";
              }
            } catch (error) {
              console.error("Error fetching host data:", error);
            }
          }

          return {
            ...booking,
            guestName,
            hostName,
            guestEmail,
            hostEmail
          };
        })
      );
      
      const reportContent = [];
      
      // Add date range info if selected
      if (startDate || endDate) {
        reportContent.push({
          type: 'text',
          text: `Date Range: ${startDate || "All"} to ${endDate || "All"}`,
          fontSize: 10,
          italic: true
        });
        reportContent.push({ type: 'spacing', value: 5 });
      }
      
      // Summary Section
      reportContent.push({
        type: 'section',
        text: `${statusLabel.toUpperCase()} BOOKINGS SUMMARY`
      });
      
      const totalAmount = statusFilteredBookings.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
      const totalCount = statusFilteredBookings.length;
      
      reportContent.push({
        type: 'table',
        headers: ['Metric', 'Value'],
        rows: [
          [`Total ${statusLabel} Bookings`, totalCount.toString()],
          [`Total Amount`, `PHP ${totalAmount.toLocaleString()}`]
        ],
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 50, halign: 'right' }
        }
      });
      reportContent.push({ type: 'spacing', value: 10 });
      
      // Bookings Details Table
      reportContent.push({
        type: 'section',
        text: `${statusLabel.toUpperCase()} BOOKINGS DETAILS`
      });
      
      if (bookingsWithUserData.length > 0) {
        const bookingRows = bookingsWithUserData.map((booking, index) => {
          const bookingDate = booking.createdAt?.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt || booking.bookingDate);
          const formattedDate = bookingDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
          
          return [
            (index + 1).toString(),
            String(booking.title || "Untitled Booking"),
            String(booking.guestName),
            String(booking.hostName),
            formattedDate,
            String(booking.checkIn || "N/A"),
            String(booking.checkOut || "N/A"),
            `PHP ${(Number(booking.total) || 0).toLocaleString()}`,
            String(booking.status || statusLabel)
          ];
        });
        
        reportContent.push({
          type: 'table',
          headers: ['#', 'Listing Title', 'Guest', 'Host', 'Booking Date', 'Check-In', 'Check-Out', 'Amount', 'Status'],
          rows: bookingRows,
          columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 'auto', halign: 'left' },
            2: { cellWidth: 'auto', halign: 'left' },
            3: { cellWidth: 'auto', halign: 'left' },
            4: { cellWidth: 'auto', halign: 'center' },
            5: { cellWidth: 'auto', halign: 'center' },
            6: { cellWidth: 'auto', halign: 'center' },
            7: { cellWidth: 'auto', halign: 'right' },
            8: { cellWidth: 'auto', halign: 'center' }
          }
        });
      } else {
        reportContent.push({
          type: 'text',
          text: `No ${statusLabel.toLowerCase()} bookings found for the selected date range.`,
          fontSize: 10
        });
      }

      await generateReportDocument(reportName, reportContent, `${statusLabel}_Bookings_Report`);
      
      toast.success(`${statusLabel} bookings report generated successfully!`, {
        position: "top-right",
      });
    } catch (error) {
      console.error(`Error generating ${statusType} bookings report:`, error);
      toast.error(`Failed to generate ${statusType} bookings report: ${error.message}`, {
        position: "top-right",
      });
    }
  };

  // Generate Transactions Report (REMOVED - keeping for reference but not used)
  const handleGenerateTransactions = async () => {
    try {
      const now = new Date();
      const timestamp = now.toLocaleString();
      const reportName = report || "Transactions Report";
      const { startDate, endDate } = reportDateRange;
      
      // Filter transactions by date range
      const filteredAdminTransactions = filterTransactionsByDateRange(adminTransactions, startDate, endDate);
      const filteredHostGuestTransactions = filterTransactionsByDateRange(hostGuestTransactions, startDate, endDate);
      
      const reportChildren = [
        new Paragraph({
        children: [
          new TextRun({
            text: reportName,
          bold: true,
            size: 32,
          }),
        ],
      }),
      new Paragraph({
        text: `Generated on: ${timestamp}`,
        italics: true,
        size: 20,
      }),
      new Paragraph(" "),
      new Paragraph("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"),
    ];

    // Add date range info if selected
    if (startDate || endDate) {
      reportChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Date Range: ${startDate || "All"} to ${endDate || "All"}`,
              italics: true,
              size: 20,
            }),
          ],
        }),
        new Paragraph(" ")
      );
    }
    
    // Admin Transactions
    addSectionHeader("💳 ADMIN TRANSACTIONS", reportChildren);
    
    if (filteredAdminTransactions.length > 0) {
      const withdrawals = filteredAdminTransactions.filter(t => 
        t.type === "withdrawal" || 
        (t.type && t.type.toLowerCase().includes("withdrawal")) ||
        (Number(t.amount) || 0) < 0
      );

      const transactionGroups = {
        commissions: adminTransactions.filter(t => {
          const amount = Number(t.amount) || 0;
          return amount > 0 && (
            t.type === "commission" || 
            (t.type && t.type.toLowerCase().includes("commission"))
          );
        }),
        cancellations: adminTransactions.filter(t => {
          const amount = Number(t.amount) || 0;
          return amount > 0 && (
            t.type === "cancellation-fee" || 
            (t.type && t.type.toLowerCase().includes("cancellation"))
          );
        }),
        withdrawals: withdrawals,
        other: adminTransactions.filter(t => {
          const amount = Number(t.amount) || 0;
          const type = (t.type || '').toLowerCase();
          return !(
            type.includes("commission") || 
            type.includes("cancellation") || 
            type.includes("withdrawal") ||
            amount < 0
          );
        })
      };

      if (transactionGroups.commissions.length > 0) {
        addSubsection("Commission Transactions", reportChildren);
        transactionGroups.commissions.slice(0, 50).forEach((tx, index) => {
          const amount = Number(tx.amount) || 0;
          reportChildren.push(
            new Paragraph(`${index + 1}. ${formatDate(tx.date)} - ${tx.description || tx.type || "Commission"}`),
            new Paragraph(`   Amount: ₱${amount.toLocaleString()} | Status: ${tx.status || "completed"}`),
            new Paragraph(" ")
          );
        });
        if (transactionGroups.commissions.length > 50) {
          reportChildren.push(
            new Paragraph(`... and ${transactionGroups.commissions.length - 50} more commission transactions`),
            new Paragraph(" ")
          );
        }
      }

      if (transactionGroups.cancellations.length > 0) {
        addSubsection("Cancellation Fee Transactions", reportChildren);
        transactionGroups.cancellations.slice(0, 50).forEach((tx, index) => {
          const amount = Number(tx.amount) || 0;
          reportChildren.push(
            new Paragraph(`${index + 1}. ${formatDate(tx.date)} - ${tx.description || tx.type || "Cancellation Fee"}`),
            new Paragraph(`   Amount: ₱${amount.toLocaleString()} | Status: ${tx.status || "completed"}`),
            new Paragraph(" ")
          );
        });
        if (transactionGroups.cancellations.length > 50) {
          reportChildren.push(
            new Paragraph(`... and ${transactionGroups.cancellations.length - 50} more cancellation transactions`),
            new Paragraph(" ")
          );
        }
      }

      if (transactionGroups.withdrawals.length > 0) {
        addSubsection("Withdrawal/Payout Transactions", reportChildren);
        transactionGroups.withdrawals.slice(0, 50).forEach((tx, index) => {
          const amount = Math.abs(Number(tx.amount) || 0);
        reportChildren.push(
            new Paragraph(`${index + 1}. ${formatDate(tx.date)} - ${tx.description || tx.type || "Withdrawal"}`),
            new Paragraph(`   Amount: ₱${amount.toLocaleString()} | Status: ${tx.status || "completed"}`),
          new Paragraph(" ")
        );
      });
        if (transactionGroups.withdrawals.length > 50) {
          reportChildren.push(
            new Paragraph(`... and ${transactionGroups.withdrawals.length - 50} more withdrawal transactions`),
            new Paragraph(" ")
          );
        }
      }

      if (transactionGroups.other.length > 0) {
        addSubsection("Other Transactions", reportChildren);
        transactionGroups.other.slice(0, 30).forEach((tx, index) => {
          const amount = Number(tx.amount) || 0;
          reportChildren.push(
            new Paragraph(`${index + 1}. ${formatDate(tx.date)} - ${tx.description || tx.type || "Transaction"}`),
            new Paragraph(`   Amount: ₱${amount.toLocaleString()} | Status: ${tx.status || "completed"}`),
            new Paragraph(" ")
          );
        });
        if (transactionGroups.other.length > 30) {
          reportChildren.push(
            new Paragraph(`... and ${transactionGroups.other.length - 30} more transactions`),
            new Paragraph(" ")
          );
        }
      }
    } else {
      reportChildren.push(
        new Paragraph("No admin transactions recorded in this period."),
        new Paragraph(" ")
      );
    }

    // Host & Guest Transactions
    addSectionHeader("👥 HOST & GUEST TRANSACTIONS", reportChildren);
    
    if (filteredHostGuestTransactions.length > 0) {
      const hostTransactions = filteredHostGuestTransactions.filter(t => t.userRole === "host");
      const guestTransactions = filteredHostGuestTransactions.filter(t => t.userRole === "guest");

      if (hostTransactions.length > 0) {
        addSubsection("Host Transactions", reportChildren);
        reportChildren.push(
          new Paragraph(`Total Host Transactions: ${hostTransactions.length}`)
        );
        
        const hostEarnings = hostTransactions
          .filter(t => (Number(t.amount) || 0) > 0)
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        const hostWithdrawals = hostTransactions
          .filter(t => (Number(t.amount) || 0) < 0)
          .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

        reportChildren.push(
          new Paragraph(`Total Host Earnings: ₱${hostEarnings.toLocaleString()}`),
          new Paragraph(`Total Host Withdrawals: ₱${hostWithdrawals.toLocaleString()}`),
          new Paragraph(" ")
        );

        hostTransactions.slice(0, 30).forEach((tx, index) => {
          const amount = Number(tx.amount) || 0;
          reportChildren.push(
            new Paragraph(`${index + 1}. ${formatDate(tx.date)} - ${tx.userName || "Host"}`),
            new Paragraph(`   ${tx.displayType || tx.type || "Transaction"}: ₱${Math.abs(amount).toLocaleString()} | Status: ${tx.status || "completed"}`),
            new Paragraph(" ")
          );
        });
        if (hostTransactions.length > 30) {
          reportChildren.push(
            new Paragraph(`... and ${hostTransactions.length - 30} more host transactions`),
            new Paragraph(" ")
          );
        }
      }

      if (guestTransactions.length > 0) {
        addSubsection("Guest Transactions", reportChildren);
        reportChildren.push(
          new Paragraph(`Total Guest Transactions: ${guestTransactions.length}`)
        );
        
        const guestPayments = guestTransactions
          .filter(t => (Number(t.amount) || 0) < 0)
          .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
        const guestRefunds = guestTransactions
          .filter(t => (Number(t.amount) || 0) > 0 && (t.type || '').toLowerCase().includes("refund"))
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        reportChildren.push(
          new Paragraph(`Total Guest Payments: ₱${guestPayments.toLocaleString()}`),
          new Paragraph(`Total Guest Refunds: ₱${guestRefunds.toLocaleString()}`),
          new Paragraph(" ")
        );

        guestTransactions.slice(0, 30).forEach((tx, index) => {
          const amount = Number(tx.amount) || 0;
          reportChildren.push(
            new Paragraph(`${index + 1}. ${formatDate(tx.date)} - ${tx.userName || "Guest"}`),
            new Paragraph(`   ${tx.displayType || tx.type || "Transaction"}: ₱${Math.abs(amount).toLocaleString()} | Status: ${tx.status || "completed"}`),
            new Paragraph(" ")
          );
        });
        if (guestTransactions.length > 30) {
          reportChildren.push(
            new Paragraph(`... and ${guestTransactions.length - 30} more guest transactions`),
            new Paragraph(" ")
          );
        }
      }
    } else {
      reportChildren.push(
        new Paragraph("No host or guest transactions recorded in this period."),
        new Paragraph(" ")
      );
    }

      await generateReportDocument(reportName, reportChildren, "Transactions");
    } catch (error) {
      console.error('Error generating transactions report:', error);
      toast.error(`Failed to generate transactions report: ${error.message}`, {
        position: "top-right",
      });
    }
  };

  // Generate Withdrawals Report
  const handleGenerateWithdrawals = async () => {
    try {
      const now = new Date();
      const timestamp = now.toLocaleString();
      const reportName = report || "Withdrawals Report";
      const { startDate, endDate } = reportDateRange;
      
      // Filter withdrawal requests by date range
      const filteredWithdrawalRequests = filterTransactionsByDateRange(withdrawalRequests, startDate, endDate);
      
      const reportChildren = [
      new Paragraph({
        children: [
          new TextRun({
            text: reportName,
            bold: true,
            size: 32,
          }),
        ],
      }),
      new Paragraph({
        text: `Generated on: ${timestamp}`,
        italics: true,
        size: 20,
      }),
      new Paragraph(" "),
      new Paragraph("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"),
    ];

    addSectionHeader("💸 WITHDRAWAL REQUESTS", reportChildren);
    
    // Add date range info if selected
    if (startDate || endDate) {
      reportChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Date Range: ${startDate || "All"} to ${endDate || "All"}`,
              italics: true,
              size: 20,
            }),
          ],
        }),
        new Paragraph(" ")
      );
    }
    
    if (filteredWithdrawalRequests.length > 0) {
      const pending = filteredWithdrawalRequests.filter(w => w.status === "pending");
      const approved = filteredWithdrawalRequests.filter(w => w.status === "approved");
      const rejected = filteredWithdrawalRequests.filter(w => w.status === "rejected");

      reportChildren.push(
        new Paragraph(`Total Withdrawal Requests: ${filteredWithdrawalRequests.length}`),
        new Paragraph(`Pending: ${pending.length} | Approved: ${approved.length} | Rejected: ${rejected.length}`),
        new Paragraph(" ")
      );

      if (pending.length > 0) {
        addSubsection("Pending Requests", reportChildren);
        pending.forEach((req, index) => {
          const amount = Number(req.amount) || 0;
          reportChildren.push(
            new Paragraph(`${index + 1}. ${formatDate(req.createdAt)} - ${req.hostName || "Host"}`),
            new Paragraph(`   Amount: ₱${amount.toLocaleString()} | PayPal: ${req.paypalEmail || "N/A"}`),
            new Paragraph(" ")
          );
        });
      }

      if (approved.length > 0) {
        addSubsection("Approved Requests", reportChildren);
        approved.forEach((req, index) => {
          const amount = Number(req.amount) || 0;
          reportChildren.push(
            new Paragraph(`${index + 1}. ${formatDate(req.approvedAt || req.createdAt)} - ${req.hostName || "Host"}`),
            new Paragraph(`   Amount: ₱${amount.toLocaleString()} | PayPal: ${req.paypalEmail || "N/A"}`),
            new Paragraph(" ")
          );
        });
      }

      if (rejected.length > 0) {
        addSubsection("Rejected Requests", reportChildren);
        rejected.forEach((req, index) => {
          const amount = Number(req.amount) || 0;
          reportChildren.push(
            new Paragraph(`${index + 1}. ${formatDate(req.rejectedAt || req.createdAt)} - ${req.hostName || "Host"}`),
            new Paragraph(`   Amount: ₱${amount.toLocaleString()} | PayPal: ${req.paypalEmail || "N/A"}`),
            new Paragraph(" ")
          );
        });
      }
    } else {
      reportChildren.push(
        new Paragraph("No withdrawal requests recorded in this period."),
        new Paragraph(" ")
      );
    }

      await generateReportDocument(reportName, reportChildren, "Withdrawals");
    } catch (error) {
      console.error('Error generating withdrawals report:', error);
      toast.error(`Failed to generate withdrawals report: ${error.message}`, {
      position: "top-right",
    });
    }
  };

  // Generate Platform Settings Report
  const handleGeneratePlatformSettings = async () => {
    try {
      const now = new Date();
      const timestamp = now.toLocaleString();
      const reportName = report || "Platform Settings Report";
      
      const reportChildren = [
      new Paragraph({
        children: [
          new TextRun({
            text: reportName,
            bold: true,
            size: 32,
          }),
        ],
      }),
      new Paragraph({
        text: `Generated on: ${timestamp}`,
        italics: true,
        size: 20,
      }),
      new Paragraph(" "),
      new Paragraph("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"),
    ];

    addSectionHeader("⚙️ PLATFORM SETTINGS", reportChildren);
    
    reportChildren.push(
      new Paragraph(`Service Fee: ${serviceFee}%`),
      new Paragraph(`Cancellation Policy: ${platformPolicy.cancellation || "N/A"}`),
      new Paragraph(`Platform Rules: ${platformPolicy.rules || "N/A"}`),
      new Paragraph(`Report Settings: ${platformPolicy.reports || "N/A"}`),
      new Paragraph(" ")
    );

      await generateReportDocument(reportName, reportChildren, "Platform_Settings");
    } catch (error) {
      console.error('Error generating platform settings report:', error);
      toast.error(`Failed to generate platform settings report: ${error.message}`, {
        position: "top-right",
      });
    }
  };

  // Generate Full Report (All Categories)
  const handleGenerateReport = async () => {
    try {
      const now = new Date();
      const timestamp = now.toLocaleString();
      const reportName = report || "Platform Report";
      const { startDate, endDate } = reportDateRange;
      
      // Filter all data by date range
      const filteredAdminTransactions = filterTransactionsByDateRange(adminTransactions, startDate, endDate);
      const filteredHostGuestTransactions = filterTransactionsByDateRange(hostGuestTransactions, startDate, endDate);
      const filteredBookings = filterBookingsByDateRange(bookingTransactions, startDate, endDate);
      const filteredWithdrawalRequests = filterTransactionsByDateRange(withdrawalRequests, startDate, endDate);

    // Build report children
    const reportChildren = [
      // Title
      new Paragraph({
        children: [
          new TextRun({
            text: reportName,
            bold: true,
            size: 32,
          }),
        ],
      }),
      new Paragraph({
        text: `Generated on: ${timestamp}`,
        italics: true,
        size: 20,
      }),
      new Paragraph(" "),
      new Paragraph("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"),
    ];

    // ============================================
    // 1. EXECUTIVE SUMMARY
    // ============================================
    addSectionHeader("📊 EXECUTIVE SUMMARY", reportChildren);
    
    // Add date range info if selected
    if (startDate || endDate) {
      reportChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Date Range: ${startDate || "All"} to ${endDate || "All"}`,
              italics: true,
              size: 20,
            }),
          ],
        }),
        new Paragraph(" ")
      );
    }
    
    // Calculate filtered analytics
    const filteredBookingRevenue = filteredBookings.reduce((sum, booking) => {
      const amount = Number(booking.amount || booking.total || 0);
      return sum + amount;
    }, 0);
    
    const filteredCommissionRevenue = filteredAdminTransactions
      .filter(t => (Number(t.amount) || 0) > 0)
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    
    const bookingRevenueText = `₱${Number(filteredBookingRevenue || 0).toLocaleString()}`;
    const commissionRevenueText = `₱${Number(filteredCommissionRevenue || 0).toLocaleString()}`;
    const walletBalanceText = `₱${Number(adminWallet.paypalBalance || 0).toLocaleString()}`;
    const totalEarningsText = `₱${Number(adminWallet.totalEarnings || 0).toLocaleString()}`;
    
    const filteredBookingsCount = filteredBookings.length;
    const filteredPendingBookings = filteredBookings.filter(b => b.status === "PendingApproval" || b.status === "pending").length;

    reportChildren.push(
      new Paragraph(`Total Bookings: ${filteredBookingsCount}`),
      new Paragraph(`Pending Bookings: ${filteredPendingBookings}`),
      new Paragraph(`Gross Booking Revenue: ${bookingRevenueText}`),
      new Paragraph(`Net Admin Commission: ${commissionRevenueText}`),
      new Paragraph(`Total Earnings: ${totalEarningsText}`),
      new Paragraph(`Current PayPal Balance: ${walletBalanceText}`),
      new Paragraph(" ")
    );

    // ============================================
    // 2. ANALYTICS & PERFORMANCE
    // ============================================
    addSectionHeader("📈 ANALYTICS & PERFORMANCE", reportChildren);
    
    // Calculate filtered revenue
    const filteredCommissions = filteredAdminTransactions
      .filter(t => (Number(t.amount) || 0) > 0 && (t.type || '').toLowerCase().includes("commission"));
    const filteredCancellations = filteredAdminTransactions
      .filter(t => (Number(t.amount) || 0) > 0 && (t.type || '').toLowerCase().includes("cancellation"));
    
    const totalFilteredCommissions = filteredCommissions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const totalFilteredCancellationFees = filteredCancellations.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const totalFilteredRevenue = totalFilteredCommissions + totalFilteredCancellationFees;
    
    if (totalFilteredRevenue > 0 || (!startDate && !endDate)) {
      addSubsection("Revenue Analytics", reportChildren);
      reportChildren.push(
        new Paragraph(`Total Revenue: ₱${totalFilteredRevenue.toLocaleString()}`),
        new Paragraph(`Commission Revenue: ₱${totalFilteredCommissions.toLocaleString()}`),
        new Paragraph(`Cancellation Fees: ₱${totalFilteredCancellationFees.toLocaleString()}`),
        new Paragraph(" ")
      );
    }

    addSubsection("Booking Statistics", reportChildren);
    reportChildren.push(
      new Paragraph(`Total Bookings: ${filteredBookingsCount}`),
      new Paragraph(`Pending Approvals: ${filteredPendingBookings}`),
      new Paragraph(`Completed Bookings: ${filteredBookingsCount - filteredPendingBookings}`),
      new Paragraph(" ")
    );

    // ============================================
    // 3. FINANCIAL SUMMARY
    // ============================================
    addSectionHeader("💰 FINANCIAL SUMMARY", reportChildren);
    
    // Calculate totals from filtered transactions
    const withdrawals = filteredAdminTransactions.filter(t => 
      t.type === "withdrawal" || 
      (t.type && t.type.toLowerCase().includes("withdrawal")) ||
      (Number(t.amount) || 0) < 0
    );
    const totalWithdrawals = withdrawals.reduce((sum, t) => {
      const amount = Math.abs(Number(t.amount) || 0);
      return sum + amount;
    }, 0);

    const commissions = filteredAdminTransactions.filter(t => {
      const amount = Number(t.amount) || 0;
      return amount > 0 && (
        t.type === "commission" || 
        (t.type && t.type.toLowerCase().includes("commission"))
        );
      });
    const totalCommissions = commissions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const cancellations = filteredAdminTransactions.filter(t => {
      const amount = Number(t.amount) || 0;
      return amount > 0 && (
        t.type === "cancellation-fee" || 
        (t.type && t.type.toLowerCase().includes("cancellation"))
      );
    });
    const totalCancellationFees = cancellations.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    addSubsection("Income", reportChildren);
    reportChildren.push(
      new Paragraph(`Total Commissions: ₱${totalCommissions.toLocaleString()}`),
      new Paragraph(`Cancellation Fees: ₱${totalCancellationFees.toLocaleString()}`),
      new Paragraph(`Total Income: ₱${(totalCommissions + totalCancellationFees).toLocaleString()}`),
      new Paragraph(" ")
    );

    addSubsection("Expenses", reportChildren);
    reportChildren.push(
      new Paragraph(`Total Withdrawals/Payouts: ₱${totalWithdrawals.toLocaleString()}`),
      new Paragraph(`Number of Withdrawal Requests: ${withdrawals.length}`),
      new Paragraph(" ")
    );

    addSubsection("Wallet Status", reportChildren);
    reportChildren.push(
      new Paragraph(`PayPal Balance: ${walletBalanceText}`),
      new Paragraph(`Total Earnings (All Time): ${totalEarningsText}`),
      new Paragraph(" ")
    );

    // ============================================
    // 4. ADMIN TRANSACTIONS
    // ============================================
    addSectionHeader("💳 ADMIN TRANSACTIONS", reportChildren);
    
    if (filteredAdminTransactions.length > 0) {
      // Group transactions by type
      const transactionGroups = {
        commissions: filteredAdminTransactions.filter(t => {
          const amount = Number(t.amount) || 0;
          return amount > 0 && (
            t.type === "commission" || 
            (t.type && t.type.toLowerCase().includes("commission"))
          );
        }),
        cancellations: adminTransactions.filter(t => {
          const amount = Number(t.amount) || 0;
          return amount > 0 && (
            t.type === "cancellation-fee" || 
            (t.type && t.type.toLowerCase().includes("cancellation"))
          );
        }),
        withdrawals: withdrawals,
        other: adminTransactions.filter(t => {
          const amount = Number(t.amount) || 0;
          const type = (t.type || '').toLowerCase();
          return !(
            type.includes("commission") || 
            type.includes("cancellation") || 
            type.includes("withdrawal") ||
            amount < 0
          );
        })
      };

      if (transactionGroups.commissions.length > 0) {
        addSubsection("Commission Transactions", reportChildren);
        transactionGroups.commissions.slice(0, 20).forEach((tx, index) => {
          const amount = Number(tx.amount) || 0;
          reportChildren.push(
            new Paragraph(`${index + 1}. ${formatDate(tx.date)} - ${tx.description || tx.type || "Commission"}`),
            new Paragraph(`   Amount: ₱${amount.toLocaleString()} | Status: ${tx.status || "completed"}`),
            new Paragraph(" ")
          );
        });
        if (transactionGroups.commissions.length > 20) {
          reportChildren.push(
            new Paragraph(`... and ${transactionGroups.commissions.length - 20} more commission transactions`),
            new Paragraph(" ")
          );
        }
      }

      if (transactionGroups.cancellations.length > 0) {
        addSubsection("Cancellation Fee Transactions", reportChildren);
        transactionGroups.cancellations.slice(0, 20).forEach((tx, index) => {
          const amount = Number(tx.amount) || 0;
          reportChildren.push(
            new Paragraph(`${index + 1}. ${formatDate(tx.date)} - ${tx.description || tx.type || "Cancellation Fee"}`),
            new Paragraph(`   Amount: ₱${amount.toLocaleString()} | Status: ${tx.status || "completed"}`),
            new Paragraph(" ")
          );
        });
        if (transactionGroups.cancellations.length > 20) {
          reportChildren.push(
            new Paragraph(`... and ${transactionGroups.cancellations.length - 20} more cancellation transactions`),
            new Paragraph(" ")
          );
        }
      }

      if (transactionGroups.withdrawals.length > 0) {
        addSubsection("Withdrawal/Payout Transactions", reportChildren);
        transactionGroups.withdrawals.slice(0, 20).forEach((tx, index) => {
          const amount = Math.abs(Number(tx.amount) || 0);
          reportChildren.push(
            new Paragraph(`${index + 1}. ${formatDate(tx.date)} - ${tx.description || tx.type || "Withdrawal"}`),
            new Paragraph(`   Amount: ₱${amount.toLocaleString()} | Status: ${tx.status || "completed"}`),
            new Paragraph(" ")
          );
        });
        if (transactionGroups.withdrawals.length > 20) {
          reportChildren.push(
            new Paragraph(`... and ${transactionGroups.withdrawals.length - 20} more withdrawal transactions`),
            new Paragraph(" ")
          );
        }
      }

      if (transactionGroups.other.length > 0) {
        addSubsection("Other Transactions", reportChildren);
        transactionGroups.other.slice(0, 10).forEach((tx, index) => {
          const amount = Number(tx.amount) || 0;
          reportChildren.push(
            new Paragraph(`${index + 1}. ${formatDate(tx.date)} - ${tx.description || tx.type || "Transaction"}`),
            new Paragraph(`   Amount: ₱${amount.toLocaleString()} | Status: ${tx.status || "completed"}`),
            new Paragraph(" ")
          );
        });
        if (transactionGroups.other.length > 10) {
          reportChildren.push(
            new Paragraph(`... and ${transactionGroups.other.length - 10} more transactions`),
            new Paragraph(" ")
          );
        }
      }
    } else {
      reportChildren.push(
        new Paragraph("No admin transactions recorded in this period."),
        new Paragraph(" ")
      );
    }

    // ============================================
    // 5. HOST & GUEST TRANSACTIONS
    // ============================================
    addSectionHeader("👥 HOST & GUEST TRANSACTIONS", reportChildren);
    
    if (filteredHostGuestTransactions.length > 0) {
      const hostTransactions = filteredHostGuestTransactions.filter(t => t.userRole === "host");
      const guestTransactions = filteredHostGuestTransactions.filter(t => t.userRole === "guest");

      if (hostTransactions.length > 0) {
        addSubsection("Host Transactions", reportChildren);
        reportChildren.push(
          new Paragraph(`Total Host Transactions: ${hostTransactions.length}`)
        );
        
        const hostEarnings = hostTransactions
          .filter(t => (Number(t.amount) || 0) > 0)
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        const hostWithdrawals = hostTransactions
          .filter(t => (Number(t.amount) || 0) < 0)
          .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

        reportChildren.push(
          new Paragraph(`Total Host Earnings: ₱${hostEarnings.toLocaleString()}`),
          new Paragraph(`Total Host Withdrawals: ₱${hostWithdrawals.toLocaleString()}`),
          new Paragraph(" ")
        );

        // Show sample transactions
        hostTransactions.slice(0, 10).forEach((tx, index) => {
          const amount = Number(tx.amount) || 0;
          reportChildren.push(
            new Paragraph(`${index + 1}. ${formatDate(tx.date)} - ${tx.userName || "Host"}`),
            new Paragraph(`   ${tx.displayType || tx.type || "Transaction"}: ₱${Math.abs(amount).toLocaleString()} | Status: ${tx.status || "completed"}`),
            new Paragraph(" ")
          );
        });
        if (hostTransactions.length > 10) {
          reportChildren.push(
            new Paragraph(`... and ${hostTransactions.length - 10} more host transactions`),
            new Paragraph(" ")
          );
        }
      }

      if (guestTransactions.length > 0) {
        addSubsection("Guest Transactions", reportChildren);
        reportChildren.push(
          new Paragraph(`Total Guest Transactions: ${guestTransactions.length}`)
        );
        
        const guestPayments = guestTransactions
          .filter(t => (Number(t.amount) || 0) < 0)
          .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
        const guestRefunds = guestTransactions
          .filter(t => (Number(t.amount) || 0) > 0 && (t.type || '').toLowerCase().includes("refund"))
          .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        reportChildren.push(
          new Paragraph(`Total Guest Payments: ₱${guestPayments.toLocaleString()}`),
          new Paragraph(`Total Guest Refunds: ₱${guestRefunds.toLocaleString()}`),
          new Paragraph(" ")
        );

        // Show sample transactions
        guestTransactions.slice(0, 10).forEach((tx, index) => {
          const amount = Number(tx.amount) || 0;
          reportChildren.push(
            new Paragraph(`${index + 1}. ${formatDate(tx.date)} - ${tx.userName || "Guest"}`),
            new Paragraph(`   ${tx.displayType || tx.type || "Transaction"}: ₱${Math.abs(amount).toLocaleString()} | Status: ${tx.status || "completed"}`),
            new Paragraph(" ")
          );
        });
        if (guestTransactions.length > 10) {
          reportChildren.push(
            new Paragraph(`... and ${guestTransactions.length - 10} more guest transactions`),
            new Paragraph(" ")
          );
        }
      }
    } else {
      reportChildren.push(
        new Paragraph("No host or guest transactions recorded in this period."),
        new Paragraph(" ")
      );
    }

    // ============================================
    // 6. WITHDRAWAL REQUESTS
    // ============================================
    addSectionHeader("💸 WITHDRAWAL REQUESTS", reportChildren);
    
    if (filteredWithdrawalRequests.length > 0) {
      const pending = filteredWithdrawalRequests.filter(w => w.status === "pending");
      const approved = filteredWithdrawalRequests.filter(w => w.status === "approved");
      const rejected = filteredWithdrawalRequests.filter(w => w.status === "rejected");

      reportChildren.push(
        new Paragraph(`Total Withdrawal Requests: ${filteredWithdrawalRequests.length}`),
        new Paragraph(`Pending: ${pending.length} | Approved: ${approved.length} | Rejected: ${rejected.length}`),
        new Paragraph(" ")
      );

      if (pending.length > 0) {
        addSubsection("Pending Requests", reportChildren);
        pending.slice(0, 10).forEach((req, index) => {
          const amount = Number(req.amount) || 0;
          reportChildren.push(
            new Paragraph(`${index + 1}. ${formatDate(req.createdAt)} - ${req.hostName || "Host"}`),
            new Paragraph(`   Amount: ₱${amount.toLocaleString()} | PayPal: ${req.paypalEmail || "N/A"}`),
            new Paragraph(" ")
          );
        });
      }

      if (approved.length > 0) {
        addSubsection("Approved Requests", reportChildren);
        approved.slice(0, 10).forEach((req, index) => {
          const amount = Number(req.amount) || 0;
          reportChildren.push(
            new Paragraph(`${index + 1}. ${formatDate(req.approvedAt || req.createdAt)} - ${req.hostName || "Host"}`),
            new Paragraph(`   Amount: ₱${amount.toLocaleString()} | PayPal: ${req.paypalEmail || "N/A"}`),
            new Paragraph(" ")
          );
        });
      }
    } else {
      reportChildren.push(
        new Paragraph("No withdrawal requests recorded in this period."),
        new Paragraph(" ")
      );
    }

    // ============================================
    // 7. PLATFORM SETTINGS
    // ============================================
    addSectionHeader("⚙️ PLATFORM SETTINGS", reportChildren);
    
    reportChildren.push(
      new Paragraph(`Service Fee: ${serviceFee}%`),
      new Paragraph(`Cancellation Policy: ${platformPolicy.cancellation || "N/A"}`),
      new Paragraph(`Platform Rules: ${platformPolicy.rules || "N/A"}`),
      new Paragraph(" ")
    );

    await generateReportDocument(reportName, reportChildren, "Full_Report");
    } catch (error) {
      console.error('Error generating full report:', error);
      toast.error(`Failed to generate full report: ${error.message}`, {
      position: "top-right",
    });
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/";
  };

  useEffect(() => {
    document.title = "Admin Dashboard - StayHub";
    
    // Initialize admin wallet using utility function
    initializeAdminWallet().then(result => {
      if (result.success) {
        console.log('✅ Admin wallet initialized');
      }
    });
    
    // Real-time listener for admin wallet
    const adminWalletRef = doc(db, "adminWallet", "earnings");
    const unsubWallet = onSnapshot(adminWalletRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const walletUpdate = {
          balance: Number(data.balance) || 0,
          totalEarnings: Number(data.totalEarnings) || 0,
          paypalBalance: Number(data.paypalBalance) || 0,
          totalNetRevenue: Number(data.totalNetRevenue) || 0,
          totalPayPalFees: Number(data.totalPayPalFees) || 0,
          totalFees: Number(data.totalFees) || 0,
          totalCashOuts: Number(data.totalCashOuts) || 0,
        };
        
        console.log('📡 Firestore wallet update received:', walletUpdate);
        
        setAdminWallet(walletUpdate);
        
        // Always ensure correct PayPal email is set
        const correctPayPalEmail = "gabennewell79@gmail.com";
        if (data.paypalEmail && data.paypalEmail === correctPayPalEmail) {
          setAdminPaypalEmail(data.paypalEmail);
        } else {
          // If email is different or not set, update it
          setAdminPaypalEmail(correctPayPalEmail);
          // Update Firestore with correct email
          updateDoc(adminWalletRef, {
            paypalEmail: correctPayPalEmail,
            updatedAt: serverTimestamp()
          }, { merge: true }).catch(err => {
            console.error('Error updating PayPal email:', err);
          });
        }
        
        // Load analytics when wallet updates
        const analyticsResult = await getAdminAnalytics();
        if (analyticsResult.success) {
          setAdminAnalytics(analyticsResult.analytics);
        }
      } else {
        console.warn('⚠️ Admin wallet document does not exist in Firestore');
        // Initialize admin wallet with PayPal account if it doesn't exist
        initializeAdminPayPalAccount();
      }
    }, (error) => {
      console.error('❌ Error in wallet listener:', error);
    });

    // Real-time listener for admin transactions
    const transactionsRef = collection(db, "adminTransactions");
    const transactionsQuery = query(transactionsRef, orderBy("date", "desc"));
    const unsubTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      const transactions = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setAdminTransactions(transactions);

      // Calculate Net Admin Commission: Only sum positive transactions (revenue/commissions)
      // Exclude withdrawals (negative amounts) as those are payouts, not revenue
      const netCommission = transactions.reduce((sum, item) => {
        const amount = Number(item.amount) || 0;
        const transactionType = (item.type || '').toLowerCase();
        
        // Only include positive amounts (revenue/commissions)
        // Exclude withdrawals and other negative transactions
        if (amount > 0) {
        return sum + amount;
        }
        
        // Also exclude withdrawals even if they might be positive (shouldn't happen, but safety check)
        if (transactionType === 'withdrawal' || transactionType === 'refund') {
          return sum; // Don't include withdrawals/refunds in commission calculation
        }
        
        return sum;
      }, 0);
      
      setAnalytics((prev) => ({
        ...prev,
        commissionRevenue: netCommission,
      }));
    });

    // Real-time listener for host and guest transactions
    const hostGuestTransactionsRef = collection(db, "transactions");
    const hostGuestTransactionsQuery = query(hostGuestTransactionsRef, orderBy("timestamp", "desc"), limit(100));
    const unsubHostGuestTransactions = onSnapshot(hostGuestTransactionsQuery, async (snapshot) => {
      const transactions = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const userId = data.userId;
          
          // Get user data to determine role
          let userRole = "guest";
          let userName = "Unknown User";
          if (userId) {
            try {
              const userDoc = await getDoc(doc(db, "users", userId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                userRole = userData.role || "guest";
                userName = userData.name || userData.email || "Unknown User";
              }
            } catch (error) {
              console.error("Error fetching user data:", error);
            }
          }

          // Format transaction for display
          const transactionType = data.type || "transaction";
          const amount = Number(data.amount) || 0;
          const currency = data.currency || "PHP";
          const isCashIn = transactionType.toLowerCase().includes("cash-in") || transactionType.toLowerCase().includes("payment");
          const isCashOut = transactionType.toLowerCase().includes("cash-out") || transactionType.toLowerCase().includes("withdrawal") || transactionType.toLowerCase().includes("refund");

          return {
            id: docSnap.id,
            ...data,
            userRole,
            userName,
            userType: userRole === "host" ? "Host" : "Guest",
            displayType: isCashIn ? "Cash-In" : isCashOut ? "Cash-Out" : transactionType,
            amount: currency === "USD" ? amount * 56 : amount, // Convert USD to PHP for display
            originalCurrency: currency,
            date: data.timestamp || data.createdAt || serverTimestamp(),
            status: data.status || "completed",
            description: data.description || `${userRole === "host" ? "Host" : "Guest"} ${transactionType}`,
          };
        })
      );
      setHostGuestTransactions(transactions);
    });

    // Ensure admin config exists and listen for updates
    const configRef = doc(db, "adminSettings", "config");
    const ensureConfig = async () => {
      try {
        const snap = await getDoc(configRef);
        if (!snap.exists()) {
          await setDoc(
            configRef,
            {
              serviceFee: 10,
              updatedAt: serverTimestamp(),
              createdAt: serverTimestamp(),
            },
            { merge: true }
          );
          setServiceFee(10);
        } else {
          const data = snap.data();
          if (typeof data.serviceFee === "number") {
            setServiceFee(data.serviceFee);
          }
        }
      } catch (error) {
        console.error("Error ensuring admin config:", error);
      }
    };
    ensureConfig();

    const unsubConfig = onSnapshot(configRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.serviceFee === "number") {
          setServiceFee(data.serviceFee);
        }
      }
    });

    // Load platform policy
    const loadPlatformPolicy = async () => {
      try {
        const policyRef = doc(db, "adminSettings", "platformPolicy");
        const policySnap = await getDoc(policyRef);
        if (policySnap.exists()) {
          const data = policySnap.data();
          setPlatformPolicy({
            cancellation: data.cancellation || "24-hour free cancellation",
            rules: data.rules || "No smoking, No pets, No parties",
            reports: data.reports || "Monthly summary",
            bookingRules: data.bookingRules || "Guests must provide valid identification. Booking confirmation is required 24 hours before check-in.",
            withdrawalRules: data.withdrawalRules || "Hosts can withdraw earnings once per week. Minimum withdrawal amount is PHP 500. Processing time is 3-5 business days.",
            pointsRules: data.pointsRules || "Hosts earn 50 points per approved booking. Points can be redeemed for cash at 10 points = PHP 1. Points expire after 1 year.",
            couponsRules: data.couponsRules || "Coupons can only be used once per booking. Discounts cannot be combined. Valid only for bookings made through the platform."
          });
        }
      } catch (error) {
        console.error("Error loading platform policy:", error);
      }
    };
    loadPlatformPolicy();

    // Listen to policy changes
    const policyRef = doc(db, "adminSettings", "platformPolicy");
    const unsubPolicy = onSnapshot(policyRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setPlatformPolicy({
          cancellation: data.cancellation || "24-hour free cancellation",
          rules: data.rules || "No smoking, No pets, No parties",
          reports: data.reports || "Monthly summary",
          bookingRules: data.bookingRules || "Guests must provide valid identification. Booking confirmation is required 24 hours before check-in.",
          withdrawalRules: data.withdrawalRules || "Hosts can withdraw earnings once per week. Minimum withdrawal amount is PHP 500. Processing time is 3-5 business days.",
          pointsRules: data.pointsRules || "Hosts earn 50 points per approved booking. Points can be redeemed for cash at 10 points = PHP 1. Points expire after 1 year.",
          couponsRules: data.couponsRules || "Coupons can only be used once per booking. Discounts cannot be combined. Valid only for bookings made through the platform."
        });
      }
    });

    // Real-time listener for bookings to compute analytics and create transaction entries
    const bookingsRef = collection(db, "bookings");
    const bookingsQuery = query(bookingsRef, orderBy("createdAt", "desc"), limit(200));
    const unsubBookings = onSnapshot(bookingsQuery, async (snapshot) => {
      const bookings = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      const totalBookings = bookings.length;
      const pending = bookings.filter((b) => b.status === "PendingApproval").length;
      const bookingRevenue = bookings.reduce((sum, booking) => {
        const amount = Number(booking.total) || 0;
        return sum + amount;
      }, 0);

      setAnalytics((prev) => ({
        ...prev,
        bookings: totalBookings,
        pendingBookings: pending,
        bookingRevenue,
      }));

      // Convert bookings to transaction entries
      const bookingTxns = await Promise.all(
        bookings.map(async (booking) => {
          // Get guest and host user data
          let guestName = "Unknown Guest";
          let hostName = "Unknown Host";

          if (booking.guestId) {
            try {
              const guestDoc = await getDoc(doc(db, "users", booking.guestId));
              if (guestDoc.exists()) {
                const guestData = guestDoc.data();
                guestName = guestData.name || guestData.email || "Unknown Guest";
              }
            } catch (error) {
              console.error("Error fetching guest data:", error);
            }
          }

          if (booking.hostId) {
            try {
              const hostDoc = await getDoc(doc(db, "users", booking.hostId));
              if (hostDoc.exists()) {
                const hostData = hostDoc.data();
                hostName = hostData.name || hostData.email || "Unknown Host";
              }
            } catch (error) {
              console.error("Error fetching host data:", error);
            }
          }

          const bookingAmount = Number(booking.total) || 0;
          const isCancelled = booking.status === "CancelledByGuest" || booking.status === "Cancelled";
          const isPending = booking.status === "PendingApproval";

          // For cancellations, admin receives 25% share (positive amount)
          if (isCancelled) {
            const adminShare = bookingAmount * 0.25; // 25% of original total
            return {
              id: `booking-${booking.id}-cancel`,
              source: "booking",
              type: "cancellation-fee",
              displayType: "Cancellation Share (25%)",
              amount: adminShare, // Positive - admin receives 25%
              date: booking.cancelledAt || booking.updatedAt || booking.createdAt || serverTimestamp(),
              status: "completed",
              description: `25% Cancellation share: ${booking.title || "Booking"}`,
              bookingId: booking.id,
              guestName,
              hostName,
              guestId: booking.guestId,
              hostId: booking.hostId,
              listingTitle: booking.title || "",
              checkIn: booking.checkIn,
              checkOut: booking.checkOut,
              refundAmount: booking.refundAmount || bookingAmount * 0.5,
            };
          }

          return {
            id: `booking-${booking.id}`,
            source: "booking",
            type: isPending ? "Pending Booking" : "Booking Payment",
            displayType: "Booking Payment",
            amount: bookingAmount, // Full booking amount for admin view
            date: booking.createdAt || booking.bookingDate || serverTimestamp(),
            status: isPending ? "pending" : booking.paymentStatus || "completed",
            description: `Booking payment: ${booking.title || "Booking"}`,
            bookingId: booking.id,
            guestName,
            hostName,
            guestId: booking.guestId,
            hostId: booking.hostId,
            listingTitle: booking.title || "",
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
          };
        })
      );

      setBookingTransactions(bookingTxns);
    });

    // Real-time listener for listings to compute best/lowest reviews
    const listingsRef = collection(db, "listings");
    const unsubListings = onSnapshot(listingsRef, (snapshot) => {
      // Historic best/worst review data is not actionable for admin; omit rating stats.
    });

    // Subscribe to withdrawal requests
    const withdrawalRequestsRef = collection(db, "withdrawalRequests");
    // Try to query with orderBy, but fallback to simple query if index doesn't exist
    let withdrawalRequestsQuery;
    try {
      withdrawalRequestsQuery = query(withdrawalRequestsRef, orderBy("requestedAt", "desc"));
    } catch (error) {
      console.warn('⚠️ Could not use orderBy for withdrawal requests, using simple query:', error);
      withdrawalRequestsQuery = query(withdrawalRequestsRef);
    }
    
    const unsubWithdrawalRequests = onSnapshot(withdrawalRequestsQuery, (snapshot) => {
      const requests = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      
      // Sort manually if orderBy failed
      requests.sort((a, b) => {
        const aTime = a.requestedAt?.toDate?.() || a.createdAt?.toDate?.() || new Date(a.requestedAt || a.createdAt || 0);
        const bTime = b.requestedAt?.toDate?.() || b.createdAt?.toDate?.() || new Date(b.requestedAt || b.createdAt || 0);
        return bTime - aTime;
      });
      
      console.log('📋 Withdrawal requests loaded:', requests.length, requests);
      setWithdrawalRequests(requests);
    }, (error) => {
      console.error('❌ Error loading withdrawal requests:', error);
      // Try fallback query without orderBy
      const fallbackQuery = query(withdrawalRequestsRef);
      onSnapshot(fallbackQuery, (snapshot) => {
        const requests = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        console.log('📋 Withdrawal requests loaded (fallback):', requests.length);
      setWithdrawalRequests(requests);
      });
    });

    return () => {
      unsubWallet();
      unsubTransactions();
      unsubHostGuestTransactions();
      unsubConfig();
      unsubBookings();
      unsubListings();
      unsubPolicy();
      unsubWithdrawalRequests();
    };
  }, []);

  // Process PayPal Payout (Sandbox)
  // Helper function to get sender account info (for debugging/instructions)
  const getSenderAccountInfo = async () => {
    try {
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
        return null;
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Try to get account info (this might not be available in all PayPal API versions)
      try {
        const accountResponse = await fetch(
          `${PAYPAL_CONFIG.API_BASE_URL}/v1/identity/oauth2/userinfo?schema=paypalv1.1`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (accountResponse.ok) {
          const accountData = await accountResponse.json();
          return accountData;
        }
      } catch (e) {
        // Account info endpoint might not be available
        console.log('Account info endpoint not available');
      }

      return { accessToken };
    } catch (error) {
      console.error('Error getting sender account info:', error);
      return null;
    }
  };

  const processPayPalPayout = async (paypalEmail, amountPHP) => {
    try {
      // Use PHP directly (no conversion needed)
      const amount = parseFloat(amountPHP.toFixed(2));
      
      console.log('💰 Processing PayPal payout:', {
        recipient: paypalEmail,
        amount: `₱${amount.toLocaleString()} PHP`,
        currency: 'PHP',
        clientId: PAYPAL_CONFIG.CLIENT_ID.substring(0, 10) + '...',
        senderAccount: 'gabennewell79@gmail.com',
        note: 'Using PHP currency for payout'
      });
      
      // Validate PHP amount
      if (amount <= 0 || amount < 0.01) {
        throw new Error(`Invalid amount: ₱${amount}. Minimum payout is ₱0.01 PHP.`);
      }
      
      if (amount > 1000000) {
        console.warn('⚠️ Large payout amount:', amount, 'PHP. Make sure sender account has sufficient PHP balance.');
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
      console.log('✅ PayPal access token obtained');

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
              sender_batch_id: `PAYOUT-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              email_subject: 'You have received a payout from StayHub',
              email_message: `You have received a payout of ₱${amountPHP.toLocaleString()} PHP from StayHub.`,
            },
            items: [
              {
                recipient_type: 'EMAIL',
                amount: {
                  value: amount.toFixed(2),
                  currency: 'PHP',
                },
                receiver: paypalEmail,
                note: `Withdrawal payout from StayHub - ₱${amount.toLocaleString()}`,
                sender_item_id: `PAYOUT-${Date.now()}`,
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
      
      console.log('📦 PayPal payout response:', JSON.stringify(payoutData, null, 2));

      // Safely extract payout data with fallbacks
      const batchHeader = payoutData.batch_header || {};
      const items = payoutData.items || [];
      const firstItem = items[0] || {};
      
      const payoutBatchId = batchHeader.payout_batch_id || `PAYOUT-${Date.now()}`;
      const payoutItemId = firstItem.payout_item_id || firstItem.payout_item?.payout_item_id || `ITEM-${Date.now()}`;
      const status = batchHeader.batch_status || 'PENDING';

      return {
        success: true,
        payoutBatchId: payoutBatchId,
        payoutItemId: payoutItemId,
        status: status,
        fullResponse: payoutData
      };
    } catch (error) {
      console.error('PayPal Payout Error:', error);
      throw new Error(error.message || 'Failed to process PayPal payout');
    }
  };

  // Approve withdrawal request
  const handleApproveWithdrawal = async (request) => {
    try {
      console.log('🔵 Starting withdrawal approval process:', {
        requestId: request.id,
        hostId: request.hostId,
        amount: request.amount,
        paypalEmail: request.paypalEmail,
        simulateMode: simulatePayPalPayout,
        fullRequest: request
      });
      
      // Validate request data
      if (!request || !request.id) {
        toast.error("Invalid withdrawal request. Please refresh the page and try again.");
        console.error('❌ Invalid request object:', request);
        return;
      }
      
      if (!request.hostId) {
        toast.error("Host ID is missing from withdrawal request.");
        console.error('❌ Missing hostId:', request);
        return;
      }
      
      if (!request.amount || request.amount <= 0) {
        toast.error("Invalid withdrawal amount.");
        console.error('❌ Invalid amount:', request.amount);
        return;
      }

      const requestRef = doc(db, "withdrawalRequests", request.id);
      
      // Get host's PayPal email - check request first, then fallback to user document
      let hostPayPalEmail = request.paypalEmail;
      
      if (!hostPayPalEmail || !hostPayPalEmail.includes("@")) {
        // Try to get PayPal email from host user document
        console.log('⚠️ PayPal email not in request, fetching from host user document...');
        const hostUserRef = doc(db, "users", request.hostId);
        const hostUserSnap = await getDoc(hostUserRef);
        
        if (hostUserSnap.exists()) {
          const hostUserData = hostUserSnap.data();
          hostPayPalEmail = hostUserData.paypalEmail || hostUserData.email;
          console.log('📧 Found host PayPal email from user document:', hostPayPalEmail);
        }
      }

      // Validate PayPal email
      if (!hostPayPalEmail || !hostPayPalEmail.includes("@")) {
        console.error('❌ Validation failed: PayPal email missing');
        toast.error("Host PayPal email is required for withdrawal. Please ensure the host has set their PayPal email.");
        return;
      }

      console.log('✅ Using host PayPal email for payout:', hostPayPalEmail);
      
      // Get host's current wallet balance from dashboard metrics
      const hostMetricsRef = doc(db, "dashboardMetrics", request.hostId);
      const hostMetricsSnap = await getDoc(hostMetricsRef);
      
      if (!hostMetricsSnap.exists()) {
        console.error('❌ Host metrics not found for hostId:', request.hostId);
        toast.error("Host metrics not found. Cannot process withdrawal.");
        return;
      }
      
      const hostMetrics = hostMetricsSnap.data();
      const currentBalance = Number(hostMetrics.totalEarnings || 0);
      const withdrawalAmount = Number(request.amount || 0);
      
      console.log('📊 Balance check:', {
        currentBalance,
        withdrawalAmount,
        sufficient: currentBalance >= withdrawalAmount
      });
      
      if (withdrawalAmount > currentBalance) {
        console.error('❌ Insufficient balance:', {
          currentBalance,
          withdrawalAmount,
          shortfall: withdrawalAmount - currentBalance
        });
        toast.error(`Host has insufficient balance for this withdrawal. Current balance: ₱${currentBalance.toLocaleString()}, Requested: ₱${withdrawalAmount.toLocaleString()}`);
        return;
      }

      // Process PayPal payout
      let payoutResult = null;
      
      // If simulate mode is enabled (for testing), skip actual PayPal payout
      if (simulatePayPalPayout) {
        console.log("✅ Simulating PayPal payout (test mode)");
        payoutResult = {
          success: true,
          payoutBatchId: `SIM-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          payoutItemId: `SIM-ITEM-${Date.now()}`,
          status: 'PENDING',
          simulated: true
        };
        console.log('✅ Payout simulation result:', payoutResult);
        toast.info("PayPal payout simulated (test mode). In production, this would process a real payout.", {
          position: "top-right",
          autoClose: 5000,
        });
      } else {
        console.log("🌐 Processing REAL PayPal payout...");
        try {
          // Send to host's PayPal email
          payoutResult = await processPayPalPayout(hostPayPalEmail, withdrawalAmount);
          console.log('✅ PayPal payout successful to host:', hostPayPalEmail, payoutResult);
        } catch (payoutError) {
          console.error("❌ PayPal payout error:", payoutError);
          
          // Provide helpful error messages based on error type
          let errorMessage = payoutError.message;
          let detailedMessage = '';
          
          if (errorMessage.includes('sufficient funds') || errorMessage.includes('insufficient')) {
            detailedMessage = `PayPal Sandbox SENDER account has insufficient PHP funds.

Sender Account: gabennewell79@gmail.com
Required: ₱${withdrawalAmount.toLocaleString()} PHP
Your balance: PHP 251,762.72

IMPORTANT: 
- PayPal Sandbox Payouts API now uses PHP currency
- Your sender account needs PHP balance
- The recipient account (${hostPayPalEmail}) balance doesn't matter

To fix:
1. Log in to PayPal Sandbox: https://sandbox.paypal.com
2. Use account: gabennewell79@gmail.com
3. Add PHP funds to this account
4. Minimum needed: ₱${withdrawalAmount.toLocaleString()} PHP
5. Or enable "Simulate PayPal Payout" mode for testing without real funds`;
            
            errorMessage = 'PayPal Sandbox SENDER account has insufficient funds. Check console for details.';
            console.error('PayPal Payout Error Details:', detailedMessage);
            
            // Show detailed instructions for adding funds to sender account
            const instructions = `To use ACTUAL PayPal payouts, you need to add PHP funds to the SENDER account.

IMPORTANT:
- The SENDER account is the PayPal account linked to your CLIENT_ID/SECRET
- The recipient account (${hostPayPalEmail}) balance doesn't matter
- Funds come FROM the sender account TO the recipient account
- PayPal Payouts API now uses PHP currency

How to find and fund the SENDER account:
1. Go to PayPal Developer Dashboard: https://developer.paypal.com/
2. Log in and go to "My Apps & Credentials"
3. Find the app with CLIENT_ID: ${PAYPAL_CONFIG.CLIENT_ID.substring(0, 20)}...
4. The sender account is the PayPal account that created this app (gabennewell79@gmail.com)
5. Log in to PayPal Sandbox (https://sandbox.paypal.com) with that account
6. Add PHP funds to that sender account

OR use Simulation Mode for testing (no funds needed).`;

            console.log('📋 Instructions for actual PayPal payout:', instructions);
            
            // Offer to switch to simulation mode automatically
            const useSimulation = window.confirm(
              'PayPal Sandbox SENDER account has insufficient PHP funds.\n\n' +
              'Sender Account: gabennewell79@gmail.com\n' +
              'Required: ₱' + withdrawalAmount.toLocaleString() + ' PHP\n' +
              'Your balance: PHP 251,762.72\n\n' +
              'To fix:\n' +
              '1. Log in to https://sandbox.paypal.com\n' +
              '2. Use account: gabennewell79@gmail.com\n' +
              '3. Add PHP funds to this account\n' +
              '4. Minimum needed: ₱' + withdrawalAmount.toLocaleString() + ' PHP\n\n' +
              'Recipient: ' + hostPayPalEmail + '\n' +
              '(This account balance does NOT matter)\n\n' +
              'OR use Simulation Mode for testing (no funds needed).\n\n' +
              'Click OK to use Simulation Mode now, or Cancel to keep Real PayPal Mode.'
            );
            
            if (useSimulation) {
              console.log('🔄 Switching to simulation mode and retrying...');
              setSimulatePayPalPayout(true);
              // Retry with simulation mode
              payoutResult = {
                success: true,
                payoutBatchId: `SIM-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                payoutItemId: `SIM-ITEM-${Date.now()}`,
                status: 'PENDING',
                simulated: true
              };
              console.log('✅ Payout simulation result:', payoutResult);
              toast.info("Switched to Simulation Mode. Withdrawal will be approved without actual PayPal payout.", {
                position: "top-right",
                autoClose: 5000,
              });
            } else {
              toast.error(`PayPal payout failed: ${errorMessage}\n\nCheck console for detailed instructions on how to add funds to the SENDER account.`, {
                position: "top-right",
                autoClose: 10000,
              });
              return;
            }
          } else if (errorMessage.includes('invalid email') || errorMessage.includes('receiver')) {
            errorMessage = `Invalid PayPal email: ${hostPayPalEmail}. Verify it's a valid PayPal Sandbox account.`;
            toast.error(`PayPal payout failed: ${errorMessage}`, {
              position: "top-right",
              autoClose: 8000,
            });
            return;
          } else {
            toast.error(`PayPal payout failed: ${errorMessage}`, {
              position: "top-right",
              autoClose: 8000,
            });
            return;
          }
        }
      }
      
      // Update withdrawal request status
      console.log('💾 Updating withdrawal request status to approved...');
      try {
        await updateDoc(requestRef, {
          status: 'approved',
          approvedAt: serverTimestamp(),
          approvedBy: auth.currentUser?.uid || 'admin',
          payoutBatchId: payoutResult.payoutBatchId,
          payoutItemId: payoutResult.payoutItemId,
          payoutStatus: payoutResult.status,
          paypalEmail: hostPayPalEmail, // Ensure PayPal email is saved
          updatedAt: serverTimestamp()
        });
        console.log('✅ Withdrawal request status updated to approved');
      } catch (firestoreError) {
        console.error('❌ Firestore error updating withdrawal request:', firestoreError);
        toast.error(`Failed to update withdrawal request: ${firestoreError.message}`, {
          position: "top-right",
        });
        return;
      }
      
      // Deduct from host's earnings
      console.log('💾 Deducting from host earnings...');
      try {
        await updateDoc(hostMetricsRef, {
          totalEarnings: currentBalance - withdrawalAmount,
          updatedAt: serverTimestamp()
        });
        console.log('✅ Host earnings deducted successfully');
      } catch (firestoreError) {
        console.error('❌ Firestore error deducting host earnings:', firestoreError);
        toast.error(`Failed to deduct host earnings: ${firestoreError.message}`, {
          position: "top-right",
        });
        return;
      }
      
      // Update host PayPal balance (add to host's PayPal balance in Firestore)
      console.log('💾 Updating host PayPal balance...');
      try {
        await runTransaction(db, async (tx) => {
          // Add to host PayPal balance
          const hostUserRef = doc(db, "users", request.hostId);
          const hostUserSnap = await tx.get(hostUserRef);
          
          if (hostUserSnap.exists()) {
            const hostUserData = hostUserSnap.data();
            const currentHostPayPalBalance = Number(hostUserData.paypalBalance || 0);
            const newHostPayPalBalance = currentHostPayPalBalance + withdrawalAmount;
            
            tx.update(hostUserRef, {
              paypalBalance: newHostPayPalBalance,
              updatedAt: serverTimestamp()
            });
            
            console.log('✅ Host PayPal balance added:', {
              before: currentHostPayPalBalance,
              after: newHostPayPalBalance,
              amount: withdrawalAmount,
              hostEmail: hostPayPalEmail
            });
          } else {
            // If host user document doesn't exist, create it with PayPal balance
            tx.set(hostUserRef, {
              paypalBalance: withdrawalAmount,
              updatedAt: serverTimestamp()
            }, { merge: true });
            console.log('✅ Host user document created with PayPal balance:', withdrawalAmount);
          }
        });
        
        console.log('✅ Host PayPal balance updated successfully');
      } catch (paypalBalanceError) {
        console.error('❌ Firestore error updating host PayPal balance:', paypalBalanceError);
        toast.error(`Failed to update host PayPal balance: ${paypalBalanceError.message}`, {
          position: "top-right",
        });
        return;
      }
      
      // Delete old host withdrawal transaction if exists
      console.log('🗑️ Checking for old host withdrawal transactions...');
      try {
        const transactionsRef = collection(db, "transactions");
        const oldTransactionsQuery = query(
          transactionsRef,
          where("userId", "==", request.hostId),
          where("withdrawalRequestId", "==", request.id),
          where("type", "==", "withdrawal")
        );
        const oldTransactionsSnap = await getDocs(oldTransactionsQuery);
        
        if (!oldTransactionsSnap.empty) {
          console.log(`🗑️ Found ${oldTransactionsSnap.size} old withdrawal transaction(s), deleting...`);
          const deletePromises = oldTransactionsSnap.docs.map(docSnap => deleteDoc(docSnap.ref));
          await Promise.all(deletePromises);
          console.log('✅ Old host withdrawal transactions deleted');
        }
      } catch (deleteError) {
        console.warn('⚠️ Error deleting old transactions (continuing anyway):', deleteError);
        // Continue even if deletion fails
      }
      
      // Create new transaction record for host withdrawal
      console.log('💾 Creating new host withdrawal transaction record...');
      try {
        const transactionsRef = collection(db, "transactions");
        await addDoc(transactionsRef, {
          userId: request.hostId,
          type: 'withdrawal',
          amount: -withdrawalAmount, // Negative for withdrawal
          description: payoutResult.simulated 
            ? `Withdrawal from admin to PayPal: ${hostPayPalEmail} (Approved - Simulated)`
            : `Withdrawal from admin to PayPal: ${hostPayPalEmail} (Approved)`,
          method: 'PayPal',
          paypalEmail: hostPayPalEmail,
          payoutBatchId: payoutResult.payoutBatchId,
          payoutItemId: payoutResult.payoutItemId,
          withdrawalRequestId: request.id,
          fromAdmin: true, // Mark as withdrawal from admin
          status: 'completed',
          date: serverTimestamp(),
          createdAt: new Date().toISOString()
        });
        console.log('✅ New host withdrawal transaction record created');
      } catch (firestoreError) {
        console.error('❌ Firestore error creating host transaction:', firestoreError);
        toast.error(`Failed to create transaction record: ${firestoreError.message}`, {
          position: "top-right",
        });
        return;
      }
      
      // Create admin transaction record for withdrawal processing
      console.log('💾 Creating admin transaction record...');
      try {
        const adminTransactionsRef = collection(db, "adminTransactions");
        await addDoc(adminTransactionsRef, {
          type: 'withdrawal',
          amount: -withdrawalAmount, // Negative for admin (money processed out)
          description: payoutResult.simulated
            ? `Host withdrawal processed (Simulated): ${request.hostName || 'Host'} - PayPal: ${hostPayPalEmail}`
            : `Host withdrawal processed: ${request.hostName || 'Host'} - PayPal: ${hostPayPalEmail}`,
          hostId: request.hostId,
          hostName: request.hostName,
          method: 'PayPal',
          paypalEmail: hostPayPalEmail,
          payoutBatchId: payoutResult.payoutBatchId,
          payoutItemId: payoutResult.payoutItemId,
          withdrawalRequestId: request.id,
          status: 'completed',
          date: serverTimestamp(),
          createdAt: new Date().toISOString()
        });
        console.log('✅ Admin transaction record created');
      } catch (firestoreError) {
        console.error('❌ Firestore error creating admin transaction:', firestoreError);
        toast.error(`Failed to create admin transaction record: ${firestoreError.message}`, {
          position: "top-right",
        });
        return;
      }
      
      console.log('✅ Withdrawal approval completed successfully!');
      const successMessage = payoutResult.simulated
        ? `Withdrawal request of ₱${withdrawalAmount.toLocaleString()} approved (Simulated). Amount sent from admin PayPal to host PayPal: ${hostPayPalEmail}`
        : `Withdrawal request of ₱${withdrawalAmount.toLocaleString()} approved! Amount sent from admin PayPal account to host PayPal account (${hostPayPalEmail}).`;

      toast.success(successMessage, {
        position: "top-right",
        autoClose: 6000,
      });
    } catch (error) {
      console.error("❌ Error approving withdrawal:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      toast.error(`Failed to approve withdrawal: ${error.message || 'Unknown error'}. Check console for details.`, {
        position: "top-right",
        autoClose: 8000,
      });
    }
  };

  // Reject withdrawal request
  const handleRejectWithdrawal = async (request) => {
    const reason = prompt("Please provide a reason for rejection (optional):");
    
    try {
      const requestRef = doc(db, "withdrawalRequests", request.id);
      
      await updateDoc(requestRef, {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectedBy: auth.currentUser?.uid || 'admin',
        rejectionReason: reason || 'No reason provided',
        updatedAt: serverTimestamp()
      });
      
      toast.success("Withdrawal request rejected.", {
        position: "top-right",
      });
    } catch (error) {
      console.error("Error rejecting withdrawal:", error);
      toast.error("Failed to reject withdrawal. Please try again.", {
        position: "top-right",
      });
    }
  };

  // Save platform policy
  const handleSavePolicy = async () => {
    try {
      const policyRef = doc(db, "adminSettings", "platformPolicy");
      await setDoc(
        policyRef,
        {
          cancellation: platformPolicy.cancellation,
          rules: platformPolicy.rules,
          reports: platformPolicy.reports,
          bookingRules: platformPolicy.bookingRules,
          withdrawalRules: platformPolicy.withdrawalRules,
          pointsRules: platformPolicy.pointsRules,
          couponsRules: platformPolicy.couponsRules,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      toast.success("Platform policy saved successfully!", {
        position: "top-right",
      });
    } catch (error) {
      console.error("Failed to save platform policy:", error);
      toast.error("Failed to save platform policy. Please try again.", {
        position: "top-right",
      });
    }
  };

  // Generate PDF for platform policy
  const handlePrintPolicyPDF = () => {
    try {
      const now = new Date();
      const timestamp = now.toLocaleString();
      
      // Create PDF document
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPos = 20;

      // Add title with underline
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Platform Policy & Compliance', margin, yPos);
      yPos += 3;
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      // Add date
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated: ${timestamp}`, margin, yPos);
      yPos += 12;

      // Helper function to clean text
      const cleanText = (text) => {
        if (typeof text !== 'string') {
          text = String(text);
        }
        return text.replace(/&/g, '').trim() || 'N/A';
      };

      // Create table data
      const tableData = [
        ['CANCELLATION POLICY', cleanText(platformPolicy.cancellation)],
        ['HOUSE RULES', cleanText(platformPolicy.rules)],
        ['SUPPORT & REPORTS', cleanText(platformPolicy.reports)],
        ['BOOKING RULES', cleanText(platformPolicy.bookingRules)],
        ['WITHDRAWAL RULES', cleanText(platformPolicy.withdrawalRules)],
        ['POINTS RULES', cleanText(platformPolicy.pointsRules)],
        ['COUPONS RULES', cleanText(platformPolicy.couponsRules)]
      ];

      // Add table
      autoTable(pdf, {
        head: [['Policy Type', 'Details']],
        body: tableData,
        startY: yPos,
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 10,
          cellPadding: 5,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        headStyles: {
          fillColor: [220, 53, 69], // Red color
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 60, fontStyle: 'bold', fillColor: [245, 245, 245] },
          1: { cellWidth: 'auto' }
        },
        alternateRowStyles: {
          fillColor: [255, 255, 255]
        }
      });

      yPos = pdf.lastAutoTable.finalY + 15;

      // Add additional information section
      if (yPos > pageHeight - 30) {
        pdf.addPage();
        yPos = 20;
      }

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Additional Information', margin, yPos);
      yPos += 8;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const infoText = 'These policies are displayed to all guests on the StayHub platform. Please ensure all policies are clear, fair, and comply with local regulations.';
      const infoLines = pdf.splitTextToSize(infoText, pageWidth - (margin * 2));
      pdf.text(infoLines, margin, yPos);

      // Add footer
      const pageCount = pdf.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.text(
          `Generated by StayHub Admin Dashboard on ${timestamp} - Page ${i} of ${pageCount}`,
          margin,
          pageHeight - 10
        );
      }

      // Save PDF
      const fileName = `Platform_Policy_${now.toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast.success("Platform policy PDF generated successfully!", {
        position: "top-right",
      });
    } catch (error) {
      console.error("Failed to generate policy PDF:", error);
      toast.error("Failed to generate PDF. Please try again.", {
        position: "top-right",
      });
    }
  };

  const renderPayPalWithdrawButtons = () => {
    try {
      if (typeof window === "undefined" || !window.paypal || !paypalWithdrawRef.current) {
        console.warn("PayPal SDK not ready or ref not available");
        return;
      }
      
      const amountNumber = Number(withdrawAmount);
      if (!amountNumber || Number.isNaN(amountNumber)) {
        console.warn("Invalid withdrawal amount");
        return;
      }

      paypalWithdrawRef.current.innerHTML = "";
      const usdValue = Math.max(1, pesoToUsd(amountNumber));

      try {
        window.paypal
          .Buttons({
            style: {
              layout: "vertical",
              color: "gold",
              shape: "pill",
            },
            createOrder: (_data, actions) => {
              try {
                return actions.order.create({
                  purchase_units: [
                    {
                      amount: {
                        value: usdValue.toFixed(2),
                        currency_code: PAYPAL_CONFIG.CURRENCY,
                      },
                      description: `Admin wallet withdrawal ₱${amountNumber.toLocaleString()}`,
                    },
                  ],
                });
              } catch (error) {
                console.error("Error creating PayPal order:", error);
                throw error;
              }
            },
            onApprove: async (_data, actions) => {
              try {
                setIsProcessingWithdraw(true);
                // For withdrawal, we use Payouts API directly (not PayPal button payment)
                // The PayPal button is just for UI - we'll process withdrawal via Payouts API
                // This ensures wallet balance DECREASES and PayPal balance INCREASES
                await finalizeWithdrawal(amountNumber, "");
              } catch (error) {
                console.error("❌ PayPal withdrawal error:", error);
                toast.error(`PayPal withdrawal failed: ${error.message || "Please try again."}`);
                setIsProcessingWithdraw(false);
              }
            },
            onError: (err) => {
              // Suppress generic "Script error" messages (often CORS/network related)
              if (err && err.message && err.message.includes('Script error')) {
                console.warn("PayPal SDK script error (likely CORS/network related):", err);
                // Don't show alert for generic script errors
              } else {
                console.error("PayPal withdrawal error:", err);
                toast.error("PayPal returned an error. Please try again.");
              }
            },
            onCancel: () => {
              toast.info("Withdrawal cancelled.");
            },
          })
          .render(paypalWithdrawRef.current);
      } catch (renderError) {
        console.error("Error rendering PayPal buttons:", renderError);
        // Suppress generic script errors
        if (!renderError.message || !renderError.message.includes('Script error')) {
          toast.error("Failed to initialize PayPal buttons. Please refresh and try again.");
        }
      }
    } catch (error) {
      console.error("Error in renderPayPalWithdrawButtons:", error);
      // Suppress generic script errors
      if (!error.message || !error.message.includes('Script error')) {
        toast.error("An error occurred. Please try again.");
      }
    }
  };

  const finalizeWithdrawal = async (amountNumber, paypalOrderId = "") => {
    try {
      // Get current wallet data
      const walletRef = doc(db, "adminWallet", "earnings");
      const walletSnap = await getDoc(walletRef);
      
      if (!walletSnap.exists()) {
        throw new Error("Admin wallet not found.");
      }
      
      const data = walletSnap.data();
      const currentBalance = Number(data.balance) || 0;
      const adminEmail = data.paypalEmail || adminPaypalEmail || "";
      
      // Validate wallet balance
      if (amountNumber > currentBalance) {
        throw new Error(`Insufficient wallet balance. Current balance: ₱${currentBalance.toLocaleString()}`);
      }
      
      // Validate PayPal email
      if (!adminEmail || !adminEmail.includes("@")) {
        throw new Error("Please set your PayPal email address in the admin wallet settings.");
      }
      
      console.log('💰 Processing admin withdrawal:', {
        amountPHP: amountNumber,
        adminPayPalEmail: adminEmail,
        currentWalletBalance: currentBalance,
        paypalOrderId: paypalOrderId || 'N/A',
        note: 'If PayPal order ID present, payment processed via PayPal button. Otherwise, uses Payouts API.'
      });
      
      // Process PayPal payout (send money TO admin's PayPal account)
      // For withdrawal: wallet balance DECREASES, PayPal balance INCREASES
      let payoutResult = null;
      
      if (!simulatePayPalPayout) {
        try {
          // Use PayPal Payouts API to send money FROM sender account TO admin's PayPal account
          // This will INCREASE the admin's PayPal Sandbox balance
          payoutResult = await processPayPalPayout(adminEmail, amountNumber);
          console.log('✅ PayPal payout successful:', payoutResult);
        } catch (payoutError) {
          console.error('❌ PayPal payout error:', payoutError);
          
          // Check if it's an insufficient funds error
          if (payoutError.message && payoutError.message.includes('sufficient funds')) {
            const useSimulation = window.confirm(
              'PayPal Sandbox SENDER account has insufficient funds.\n\n' +
              'To use ACTUAL PayPal payouts:\n' +
              '1. Log in to PayPal Developer Dashboard\n' +
              '2. Find the account linked to your CLIENT_ID/SECRET (SENDER account)\n' +
              '3. Add funds to that SENDER account\n' +
              '4. Try again\n\n' +
              'OR use Simulation Mode for testing (no funds needed).\n\n' +
              'Click OK to use Simulation Mode now, or Cancel to keep Real PayPal Mode.'
            );
            
            if (useSimulation) {
              console.log('🔄 Switching to simulation mode...');
              setSimulatePayPalPayout(true);
              payoutResult = {
                success: true,
                payoutBatchId: `SIM-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                payoutItemId: `SIM-ITEM-${Date.now()}`,
                status: 'PENDING',
                simulated: true
              };
            } else {
              throw new Error(`PayPal payout failed: ${payoutError.message}`);
            }
          } else {
            throw payoutError;
          }
        }
      } else {
        // Simulation mode
        payoutResult = {
          success: true,
          payoutBatchId: `SIM-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          payoutItemId: `SIM-ITEM-${Date.now()}`,
          status: 'PENDING',
          simulated: true
        };
        console.log('✅ Withdrawal simulation result:', payoutResult);
      }
      
      // Deduct from wallet balance (money goes FROM wallet TO PayPal)
      // For withdrawal: wallet balance always DECREASES
      await runTransaction(db, async (tx) => {
        const walletRef = doc(db, "adminWallet", "earnings");
        const walletSnap = await tx.get(walletRef);
        if (!walletSnap.exists()) {
          throw new Error("Admin wallet not found.");
        }
        const walletData = walletSnap.data();
        const walletBalance = Number(walletData.balance) || 0;
        
        // Validate sufficient balance
        if (amountNumber > walletBalance) {
          throw new Error("Insufficient wallet balance.");
        }
        
        // Deduct from wallet balance (money FROM wallet TO PayPal via Payouts API)
        tx.update(walletRef, {
          balance: walletBalance - amountNumber, // DECREASE wallet balance
          lastUpdated: serverTimestamp(),
        });
      });

      // Create transaction record (withdrawal always)
      await addDoc(collection(db, "adminTransactions"), {
        type: "withdrawal",
        method: "PayPal",
        amount: -amountNumber, // Negative because money goes OUT of wallet
        description: payoutResult?.simulated 
          ? `Admin withdrawal to PayPal: ${adminEmail} (Simulated - Payout ID: ${payoutResult?.payoutBatchId || 'N/A'})`
          : `Admin withdrawal to PayPal: ${adminEmail} (Payout ID: ${payoutResult?.payoutBatchId || 'N/A'})`,
        status: "completed",
        date: serverTimestamp(),
        paypalEmail: adminEmail || null,
        payoutBatchId: payoutResult?.payoutBatchId || null,
        payoutItemId: payoutResult?.payoutItemId || null,
        simulated: payoutResult?.simulated || false,
      });

      // Update local state (decrease wallet balance)
      setAdminWallet((prev) => ({
        ...prev,
        balance: Math.max(0, (prev.balance || 0) - amountNumber), // DECREASE wallet balance
      }));

      const successMessage = payoutResult?.simulated
        ? `Successfully withdrew ₱${amountNumber.toLocaleString()} (Simulated - No actual PayPal payout)`
        : `Successfully withdrew ₱${amountNumber.toLocaleString()} to PayPal: ${adminEmail}. Your PayPal Sandbox balance has increased.`;
      
      toast.success(successMessage, {
        position: "top-right",
        autoClose: 5000,
      });
      
      console.log('✅ Withdrawal processed:', {
        amountPHP: amountNumber,
        oldWalletBalance: currentBalance,
        newWalletBalance: currentBalance - amountNumber,
        adminPayPalEmail: adminEmail,
        payoutResult: payoutResult?.payoutBatchId,
        simulated: payoutResult?.simulated,
        note: 'Wallet balance decreased, PayPal Sandbox balance increased'
      });
      
      setWithdrawAmount("");
      setShowWithdrawModal(false);
    } catch (error) {
      console.error("❌ Withdrawal error:", error);
      toast.error(error.message || "Withdrawal failed. Please try again.", {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setIsProcessingWithdraw(false);
      if (paypalWithdrawRef.current) {
        paypalWithdrawRef.current.innerHTML = "";
      }
    }
  };

  useEffect(() => {
    if (!showWithdrawModal) return;
    const amountNumber = Number(withdrawAmount);
    if (!amountNumber || Number.isNaN(amountNumber) || amountNumber <= 0) return;
    if (amountNumber > (adminWallet.balance || 0)) return;

    const existingScript = document.querySelector('script[data-paypal-sdk="admin-withdraw"]');

    const initializeButtons = () => {
      if (typeof window.paypal !== "undefined") {
        renderPayPalWithdrawButtons();
      }
    };

    if (existingScript) {
      if (existingScript.dataset.loaded === "true") {
        initializeButtons();
      } else {
        const onLoad = () => {
          existingScript.dataset.loaded = "true";
          initializeButtons();
        };
        existingScript.addEventListener("load", onLoad, { once: true });
        return () => existingScript.removeEventListener("load", onLoad);
      }
    } else {
      const script = document.createElement("script");
      script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CONFIG.CLIENT_ID}&currency=${PAYPAL_CONFIG.CURRENCY}`;
      script.async = true;
      script.dataset.paypalSdk = "admin-withdraw";
      script.onload = () => {
        script.dataset.loaded = "true";
        initializeButtons();
      };
      script.onerror = (error) => {
        // Suppress generic "Script error" messages (often CORS/network related)
        if (error && error.message && error.message.includes('Script error')) {
          console.warn("PayPal SDK script error (likely CORS/network related):", error);
          // Don't show alert for generic script errors - they're usually not actionable
        } else {
          console.error("Failed to load PayPal SDK:", error);
          toast.error("Failed to load PayPal. Please refresh and try again.");
        }
      };
      
      // Add global error handler to catch unhandled script errors
      const originalErrorHandler = window.onerror;
      window.onerror = (message, source, lineno, colno, error) => {
        // Suppress generic "Script error" messages
        if (message && typeof message === 'string' && message.includes('Script error')) {
          console.warn("Suppressed generic script error (likely CORS/network related)");
          return true; // Suppress the error
        }
        // Let other errors through
        if (originalErrorHandler) {
          return originalErrorHandler(message, source, lineno, colno, error);
        }
        return false;
      };
      document.body.appendChild(script);
    }

    return () => {
      if (paypalWithdrawRef.current) {
        paypalWithdrawRef.current.innerHTML = "";
      }
    };
  }, [showWithdrawModal, withdrawAmount, adminWallet.balance]);

  const closeWithdrawModal = () => {
    setShowWithdrawModal(false);
    setWithdrawAmount("");
    setIsProcessingWithdraw(false);
    if (paypalWithdrawRef.current) {
      paypalWithdrawRef.current.innerHTML = "";
    }
  };

  const isWithdrawValid = (() => {
    const amount = Number(withdrawAmount);
    if (!amount || Number.isNaN(amount)) return false;
    // Check against wallet balance (money comes FROM wallet)
    return amount > 0 && amount <= (adminWallet.balance || 0);
  })();

  const approxUsd = isWithdrawValid ? Math.max(1, pesoToUsd(Number(withdrawAmount))) : 0;

  // Prepare chart data
  const prepareBookingStatusData = () => {
    const statusCounts = {
      'Pending Approval': 0,
      'Upcoming': 0,
      'Completed': 0,
      'Declined': 0,
      'Cancelled': 0
    };

    bookingTransactions.forEach(booking => {
      const status = booking.status || 'Unknown';
      if (status === 'PendingApproval' || status === 'pending') {
        statusCounts['Pending Approval']++;
      } else if (status === 'Upcoming' || status === 'upcoming') {
        statusCounts['Upcoming']++;
      } else if (status === 'Completed' || status === 'completed') {
        statusCounts['Completed']++;
      } else if (status === 'Declined' || status === 'declined') {
        statusCounts['Declined']++;
      } else if (status === 'CancelledByGuest' || status === 'cancelled') {
        statusCounts['Cancelled']++;
      }
    });

    return {
      labels: Object.keys(statusCounts),
      datasets: [{
        label: 'Bookings',
        data: Object.values(statusCounts),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(153, 102, 255, 0.8)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(153, 102, 255, 1)'
        ],
        borderWidth: 2
      }]
    };
  };

  const prepareRevenueBreakdownData = () => {
    const bookingRevenue = Number(analytics.bookingRevenue || 0);
    const commissionRevenue = Number(analytics.commissionRevenue || 0);
    const totalRevenue = bookingRevenue + commissionRevenue;

    return {
      labels: ['Gross Booking Revenue', 'Net Admin Commission'],
      datasets: [{
        label: 'Revenue (₱)',
        data: [bookingRevenue, commissionRevenue],
        backgroundColor: [
          'rgba(75, 192, 192, 0.8)',
          'rgba(255, 159, 64, 0.8)'
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 159, 64, 1)'
        ],
        borderWidth: 2
      }]
    };
  };

  const prepareMonthlyRevenueData = () => {
    const monthlyData = {};
    const last6Months = [];
    
    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      last6Months.push(monthKey);
      monthlyData[monthKey] = { revenue: 0, commission: 0 };
    }

    // Process booking transactions
    bookingTransactions.forEach(booking => {
      const bookingDate = booking.createdAt?.toDate ? booking.createdAt.toDate() : 
                         booking.createdAt ? new Date(booking.createdAt) : 
                         booking.date ? new Date(booking.date) : new Date();
      const monthKey = bookingDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].revenue += Number(booking.amount || booking.total || 0);
      }
    });

    // Process admin transactions (commissions)
    adminTransactions.forEach(transaction => {
      const txDate = transaction.date?.toDate ? transaction.date.toDate() : 
                    transaction.date ? new Date(transaction.date) : 
                    transaction.createdAt?.toDate ? transaction.createdAt.toDate() :
                    transaction.createdAt ? new Date(transaction.createdAt) : new Date();
      const monthKey = txDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (monthlyData[monthKey] && Number(transaction.amount || 0) > 0) {
        monthlyData[monthKey].commission += Number(transaction.amount || 0);
      }
    });

    return {
      labels: last6Months,
      datasets: [
        {
          label: 'Gross Revenue (₱)',
          data: last6Months.map(month => monthlyData[month].revenue),
          backgroundColor: 'rgba(75, 192, 192, 0.8)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 2
        },
        {
          label: 'Commission (₱)',
          data: last6Months.map(month => monthlyData[month].commission),
          backgroundColor: 'rgba(255, 159, 64, 0.8)',
          borderColor: 'rgba(255, 159, 64, 1)',
          borderWidth: 2
        }
      ]
    };
  };

  const prepareBookingTrendData = () => {
    const monthlyBookings = {};
    const last6Months = [];
    
    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      last6Months.push(monthKey);
      monthlyBookings[monthKey] = 0;
    }

    // Count bookings per month
    bookingTransactions.forEach(booking => {
      const bookingDate = booking.createdAt?.toDate ? booking.createdAt.toDate() : 
                         booking.createdAt ? new Date(booking.createdAt) : 
                         booking.date ? new Date(booking.date) : new Date();
      const monthKey = bookingDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (monthlyBookings[monthKey] !== undefined) {
        monthlyBookings[monthKey]++;
      }
    });

    return {
      labels: last6Months,
      datasets: [{
        label: 'Number of Bookings',
        data: last6Months.map(month => monthlyBookings[month]),
        fill: true,
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 2,
        tension: 0.4,
        pointBackgroundColor: 'rgba(54, 162, 235, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5
      }]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              // Check if it's a revenue chart (contains "Revenue" or "Commission" in label)
              if (label.includes('Revenue') || label.includes('Commission')) {
              label += '₱' + Number(context.parsed.y).toLocaleString();
              } else {
                label += Number(context.parsed.y).toLocaleString();
              }
            } else {
              label += context.parsed;
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            // Format y-axis labels for revenue charts
            if (value >= 1000) {
              return '₱' + (value / 1000).toFixed(1) + 'k';
            }
            return '₱' + value;
          }
        }
      }
    }
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            const value = context.parsed || context.raw;
            // Check if it's a revenue pie chart
            if (context.chart.data.labels && 
                (context.chart.data.labels.includes('Gross Booking Revenue') || 
                 context.chart.data.labels.includes('Net Admin Commission'))) {
              label += '₱' + Number(value).toLocaleString();
            } else {
              label += value;
            }
            return label;
          }
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-100 via-pink-100 to-yellow-100 py-4 md:py-10 px-3 md:px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
          <div className="flex items-center gap-3">
            <img
              src={adminlogo}
              alt="Admin Logo"
              className="w-10 h-10 md:w-12 md:h-12 rounded-full shadow flex-shrink-0"
            />
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-red-700">
                Admin Dashboard
              </h1>
              <p className="text-sm md:text-base text-gray-500">Platform overview and management</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="bg-white/80 px-4 md:px-6 py-2 rounded-xl shadow text-red-600 font-bold text-sm md:text-lg">
              Welcome, Admin
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 border border-red-200 px-3 md:px-4 py-2 rounded-xl hover:shadow hover:bg-red-50 text-red-600 font-medium text-sm md:text-base"
            >
              <FaSignOutAlt className="text-red-500" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>


        {/* Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-10">
          <div className="bg-white rounded-xl shadow p-6 flex items-center gap-4">
            <FaChartBar className="text-3xl text-pink-400" />
            <div>
              <div className="text-2xl font-bold">{analytics.bookings}</div>
              <div className="text-gray-500 text-sm">Total Bookings</div>
              <div className="text-xs text-gray-400 mt-1">
                {analytics.pendingBookings} pending approval
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex items-center gap-4">
            <FaChartBar className="text-3xl text-green-400" />
            <div>
              <div className="text-2xl font-bold">
                ₱{Number(analytics.bookingRevenue || 0).toLocaleString()}
              </div>
              <div className="text-gray-500 text-sm">Gross Booking Revenue</div>
              <div className="text-xs text-gray-400 mt-1">Lifetime total</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex items-center gap-4">
            <FaChartBar className="text-3xl text-yellow-400" />
            <div>
              <div className="text-2xl font-bold">
                ₱{Number(analytics.commissionRevenue || 0).toLocaleString()}
              </div>
              <div className="text-gray-500 text-sm">Net Admin Commission</div>
              <div className="text-xs text-gray-400 mt-1">From all transactions</div>
            </div>
          </div>
        </div>

        {/* Withdrawal Requests Section */}
        {withdrawalRequests.filter(r => r.status === 'pending').length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 md:mb-8 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FaClock className="text-yellow-600" />
                Pending Withdrawal Requests
              </h2>
              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simulatePayPalPayout}
                    onChange={(e) => setSimulatePayPalPayout(e.target.checked)}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">
                    Simulate PayPal Payout (Test Mode)
                  </span>
                </label>
                {!simulatePayPalPayout && (
                  <a
                    href="https://developer.paypal.com/dashboard/applications/sandbox"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-200 transition flex items-center gap-1"
                    title="Open PayPal Developer Dashboard to find your sender account"
                  >
                    🔗 Find SENDER Account
                  </a>
                )}
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                  {withdrawalRequests.filter(r => r.status === 'pending').length} pending
                </span>
              </div>
            </div>
            {simulatePayPalPayout ? (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Test Mode Enabled:</strong> PayPal payouts are being SIMULATED. No actual money will be sent to PayPal accounts. 
                  <br />
                  <strong>To send real money:</strong> Uncheck "Simulate PayPal Payout (Test Mode)" above and ensure your PayPal Sandbox account has sufficient funds.
                </p>
              </div>
            ) : (
              <div className="mb-4 p-3 bg-green-50 border border-green-300 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>✅ Live PayPal Mode:</strong> Withdrawals will process actual PayPal payouts. 
                  <br />
                  <strong>⚠️ Important:</strong> Make sure your PayPal Sandbox <strong>SENDER account</strong> (the account linked to your CLIENT_ID/SECRET) has sufficient funds. 
                  The recipient account balance doesn't matter - funds come from the sender account.
                  <br />
                  <strong>📋 To find your SENDER account:</strong> Go to <a href="https://developer.paypal.com/" target="_blank" rel="noopener noreferrer" className="underline">PayPal Developer Dashboard</a> → My Apps & Credentials → Find the app with your CLIENT_ID → That account is your sender account.
                </p>
              </div>
            )}
            <div className="space-y-3">
              {withdrawalRequests
                .filter(r => r.status === 'pending')
                .map((request) => (
                  <div key={request.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FaUser className="text-gray-400" />
                          <span className="font-semibold text-gray-900">{request.hostName || 'Host'}</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 mb-1">₱{request.amount?.toLocaleString()}</p>
                        <p className="text-sm text-gray-600 mb-1">Method: {request.method || 'PayPal'}</p>
                        {request.paypalEmail && (
                          <p className="text-sm text-blue-600 mb-1">PayPal: {request.paypalEmail}</p>
                        )}
                        <p className="text-xs text-gray-500">
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
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleApproveWithdrawal(request)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold flex items-center gap-2"
                        >
                          <FaCheck />
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectWithdrawal(request)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold flex items-center gap-2"
                        >
                          <FaTimes />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Left: Management */}
          <div className="space-y-8">
            {/* Service Fee */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center gap-2 mb-3">
                <FaMoneyBillWave className="text-xl text-red-400" />
                <span className="font-semibold text-lg">
                  Service Fee from Hosts
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={serviceFee}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") {
                      setServiceFee("");
                    } else {
                      setServiceFee(Number(value));
                    }
                  }}
                  className="border rounded px-2 py-1 w-20"
                  placeholder="Fee %"
                />
                <button
                  onClick={handleSetServiceFee}
                  className="bg-red-400 text-white px-3 py-1 rounded hover:bg-red-500"
                >
                  Set Fee
                </button>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                Set and manage platform service fees.
              </p>
            </div>
            {/* Policy & Compliance */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <FaGavel className="text-2xl text-red-500" />
                  <span className="font-bold text-xl text-gray-800">Platform Policy & Compliance</span>
                </div>
              </div>
              
              <div className="space-y-5">
                {/* Cancellation Policy */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">
                    <FaClock className="inline mr-2 text-red-500" />
                    Cancellation Policy
                  </label>
                  <textarea
                    value={platformPolicy.cancellation}
                    onChange={(e) => setPlatformPolicy({ ...platformPolicy, cancellation: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none"
                    rows="3"
                    placeholder="e.g., 24-hour free cancellation"
                  />
                </div>

                {/* House Rules */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">
                    <FaGavel className="inline mr-2 text-red-500" />
                    House Rules
                  </label>
                  <textarea
                    value={platformPolicy.rules}
                    onChange={(e) => setPlatformPolicy({ ...platformPolicy, rules: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none"
                    rows="3"
                    placeholder="e.g., No smoking, No pets, No parties"
                  />
                </div>

                {/* Support & Reports */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">
                    <FaFileAlt className="inline mr-2 text-red-500" />
                    Support & Reports
                  </label>
                  <textarea
                    value={platformPolicy.reports}
                    onChange={(e) => setPlatformPolicy({ ...platformPolicy, reports: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none"
                    rows="3"
                    placeholder="e.g., Monthly summary"
                  />
                </div>

                {/* Booking Rules */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">
                    <FaCalendarAlt className="inline mr-2 text-red-500" />
                    Booking Rules
                  </label>
                  <textarea
                    value={platformPolicy.bookingRules}
                    onChange={(e) => setPlatformPolicy({ ...platformPolicy, bookingRules: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none"
                    rows="3"
                    placeholder="e.g., Guests must provide valid identification. Booking confirmation is required 24 hours before check-in."
                  />
                </div>

                {/* Withdrawal Rules */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">
                    <FaMoneyBillWave className="inline mr-2 text-red-500" />
                    Withdrawal Rules (Host)
                  </label>
                  <textarea
                    value={platformPolicy.withdrawalRules}
                    onChange={(e) => setPlatformPolicy({ ...platformPolicy, withdrawalRules: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none"
                    rows="3"
                    placeholder="e.g., Hosts can withdraw earnings once per week. Minimum withdrawal amount is PHP 500. Processing time is 3-5 business days."
                  />
                </div>

                {/* Points Rules */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">
                    <FaStar className="inline mr-2 text-red-500" />
                    Points Rules
                  </label>
                  <textarea
                    value={platformPolicy.pointsRules}
                    onChange={(e) => setPlatformPolicy({ ...platformPolicy, pointsRules: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none"
                    rows="3"
                    placeholder="e.g., Hosts earn 50 points per approved booking. Points can be redeemed for cash at 10 points = PHP 1. Points expire after 1 year."
                  />
                </div>

                {/* Coupons Rules */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <label className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wide">
                    <FaGift className="inline mr-2 text-red-500" />
                    Coupons Rules
                  </label>
                  <textarea
                    value={platformPolicy.couponsRules}
                    onChange={(e) => setPlatformPolicy({ ...platformPolicy, couponsRules: e.target.value })}
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none"
                    rows="3"
                    placeholder="e.g., Coupons can only be used once per booking. Discounts cannot be combined. Valid only for bookings made through the platform."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSavePolicy}
                    className="flex-1 bg-red-500 text-white px-4 py-3 rounded-lg hover:bg-red-600 transition-all font-semibold shadow-md hover:shadow-lg transform hover:scale-105 flex items-center justify-center gap-2"
                >
                    <FaCheck className="text-sm" />
                  Save Policy
                </button>
                  <button
                    onClick={handlePrintPolicyPDF}
                    className="flex-1 bg-gray-700 text-white px-4 py-3 rounded-lg hover:bg-gray-800 transition-all font-semibold shadow-md hover:shadow-lg transform hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <FaFileAlt className="text-sm" />
                    Print PDF
                </button>
              </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-gray-600 text-xs flex items-center gap-2">
                  <FaGavel className="text-red-500" />
                  <span>These policies will be displayed to all guests on the platform. Make sure to save changes before generating PDF.</span>
                </p>
              </div>
            </div>

            {/* Generate Reports */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <FaFileAlt className="text-xl text-red-400" />
                <span className="font-semibold text-lg">Generate Reports</span>
              </div>
              
              <div className="mb-3">
                <input
                  type="text"
                  value={report}
                  onChange={(e) => setReport(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="Optional: Custom Report Name"
                />
              </div>

              {/* Date Range Selection for Reports */}
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <FaCalendarAlt className="inline mr-1" /> Select Year and Month for Report (Optional)
                </label>
                
                <ReportDateRangePicker
                  startDate={reportDateRange.startDate}
                  endDate={reportDateRange.endDate}
                  onChange={(dates) => setReportDateRange(dates)}
                />

                {(reportDateRange.startDate || reportDateRange.endDate) && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-semibold text-blue-800 mb-1">Selected Date Range:</p>
                    <p className="text-sm text-blue-700">
                      <span className="font-medium">From:</span> {reportDateRange.startDate || "Not set"} | 
                      <span className="font-medium ml-2">To:</span> {reportDateRange.endDate || "Not set"}
                    </p>
                  <button
                    onClick={() => setReportDateRange({ startDate: "", endDate: "" })}
                      className="mt-2 px-3 py-1 text-xs font-semibold bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-all"
                  >
                    Clear Selection
                  </button>
                  </div>
                )}
                {!reportDateRange.startDate && !reportDateRange.endDate && (
                  <p className="text-xs text-gray-500 mt-2 italic">
                    💡 Tip: Leave empty to include all data in your reports. Select a year, then choose a month for your monthly report.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleGenerateFinancialReport}
                  className="w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all shadow-md hover:shadow-lg text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <FaMoneyBillWave /> Financial Report
                </button>
                
                <button
                  onClick={handleGenerateUserReport}
                  className="w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all shadow-md hover:shadow-lg text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <FaUser /> User Report
                </button>
                
                <button
                  onClick={handleGenerateListingPerformanceReport}
                  className="w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all shadow-md hover:shadow-lg text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <FaChartBar /> Listing Performance Report
                </button>
              </div>

              {/* Booking Status Reports */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                  Booking Status Reports
                </h3>
                <div className="space-y-2">
                <button
                    onClick={() => handleGenerateBookingStatusReport('completed')}
                    className="w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-all shadow-md hover:shadow-lg text-sm font-semibold flex items-center justify-center gap-2"
                >
                    <FaCheckCircle /> Completed Bookings Report
                </button>
                
                <button
                    onClick={() => handleGenerateBookingStatusReport('cancelled')}
                    className="w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all shadow-md hover:shadow-lg text-sm font-semibold flex items-center justify-center gap-2"
                >
                    <FaTimesCircle /> Cancelled Bookings Report
                </button>
                
                <button
                    onClick={() => handleGenerateBookingStatusReport('pending')}
                    className="w-full bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-all shadow-md hover:shadow-lg text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <FaClock /> Pending Bookings Report
                </button>
                </div>
              </div>
              
              <p className="text-gray-500 text-xs mt-3">
                Generate reports in PDF format. Select a date range to filter data or leave empty to include all data.
              </p>
            </div>
          </div>

          {/* Right: Payments & Analytics */}
          <div className="space-y-8">
            {/* Analytics */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center gap-2 mb-3">
                <FaChartBar className="text-xl text-red-400" />
                <span className="font-semibold text-lg">
                  Analytics Snapshot
                </span>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Total bookings</span>
                  <span className="font-semibold text-gray-800">{analytics.bookings}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pending approvals</span>
                  <span className="font-semibold text-gray-800">{analytics.pendingBookings}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gross booking revenue</span>
                  <span className="font-semibold text-gray-800">
                    ₱{Number(analytics.bookingRevenue || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Net commission</span>
                  <span className="font-semibold text-gray-800">
                    ₱{Number(analytics.commissionRevenue || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col border-t border-dashed pt-2 mt-2 text-xs text-gray-500">
                  <span>Keep approving bookings to boost the numbers above.</span>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="space-y-6">
              {/* Booking Status Pie Chart */}
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FaChartBar className="text-xl text-blue-400" />
                  <span className="font-semibold text-lg">Booking Status Distribution</span>
                </div>
                <div className="h-64">
                  <Pie 
                    data={prepareBookingStatusData()} 
                    options={pieChartOptions}
                  />
                </div>
              </div>

              {/* Revenue Breakdown Pie Chart */}
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FaMoneyBillWave className="text-xl text-green-400" />
                  <span className="font-semibold text-lg">Revenue Breakdown</span>
                </div>
                <div className="h-64">
                  <Pie 
                    data={prepareRevenueBreakdownData()} 
                    options={pieChartOptions}
                  />
                </div>
              </div>

              {/* Monthly Revenue Bar Chart */}
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FaChartBar className="text-xl text-purple-400" />
                  <span className="font-semibold text-lg">Monthly Revenue Trends (Last 6 Months)</span>
                </div>
                <div className="h-64">
                  <Bar 
                    data={prepareMonthlyRevenueData()} 
                    options={chartOptions}
                  />
                </div>
              </div>

              {/* Booking Trends Line Chart */}
              <div className="bg-white rounded-xl shadow p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FaChartBar className="text-xl text-orange-400" />
                  <span className="font-semibold text-lg">Booking Trends (Last 6 Months)</span>
                </div>
                <div className="h-64">
                  <Line 
                    data={prepareBookingTrendData()} 
                    options={chartOptions}
                  />
                </div>
              </div>
            </div>

            {/* Admin Transaction History */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center gap-2 mb-3">
                <FaMoneyBillWave className="text-xl text-green-400" />
                <span className="font-semibold text-lg">Transaction History</span>
              </div>
              <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-lg border border-green-100">
                <table className="min-w-full text-xs md:text-sm">
                  <thead className="sticky top-0 bg-green-100 text-left">
                    <tr>
                      <th className="px-2 md:px-3 py-2">Date</th>
                      <th className="px-2 md:px-3 py-2">Type</th>
                      <th className="px-2 md:px-3 py-2 hidden md:table-cell">Details</th>
                      <th className="px-2 md:px-3 py-2">Amount</th>
                      <th className="px-2 md:px-3 py-2 hidden sm:table-cell">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Combine and sort all transactions
                      // Note: Host withdrawals are now included in adminTransactions when approved
                      const allTransactions = [
                        ...adminTransactions.map(t => ({ ...t, source: 'admin' })),
                        ...hostGuestTransactions.map(t => ({ ...t, source: 'user' })),
                        ...bookingTransactions.map(t => ({ ...t, source: 'booking' }))
                      ].sort((a, b) => {
                        const dateA = a.date?.toDate ? a.date.toDate() : a.date ? new Date(a.date) : new Date(0);
                        const dateB = b.date?.toDate ? b.date.toDate() : b.date ? new Date(b.date) : new Date(0);
                        return dateB - dateA; // Most recent first
                      });

                      if (allTransactions.length > 0) {
                        return allTransactions.map((t) => (
                          <tr key={`${t.source}-${t.id}`} className="border-b hover:bg-green-50/40 transition">
                            <td className="px-2 md:px-3 py-2 text-xs text-gray-600">
                              {(() => {
                                if (!t.date) return "N/A";
                                const raw = t.date?.toDate ? t.date.toDate() : t.date ? new Date(t.date) : new Date();
                                if (Number.isNaN(raw?.getTime?.())) return "N/A";
                                return `${raw.toLocaleDateString()} ${raw.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
                              })()}
                          </td>
                            <td className="px-2 md:px-3 py-2 capitalize text-gray-700 text-xs">
                              {t.source === 'admin' 
                                ? (t.type || "commission")
                                : t.source === 'booking'
                                ? (t.displayType || t.type || "Booking")
                                : `${t.userType || "User"} - ${t.displayType || t.type || "transaction"}`
                              }
                            </td>
                            <td className="px-2 md:px-3 py-2 text-xs text-gray-600 whitespace-pre-line hidden md:table-cell">
                              {t.source === 'admin'
                                ? (t.description || t.bookingId || "—")
                                : t.source === 'booking'
                                ? `${t.guestName || "Guest"} → ${t.hostName || "Host"}: ${t.description || t.listingTitle || "—"}`
                                : `${t.userName || "Unknown"} - ${t.description || t.displayType || "—"}`
                              }
                            </td>
                            <td className="px-2 md:px-3 py-2 font-bold text-xs md:text-sm">
                              {(() => {
                                const amountValue = Number(t.amount) || 0;
                                const formatted = `₱${Math.abs(amountValue).toLocaleString()}`;
                                const isPositive = amountValue >= 0;
                                return (
                                  <span className={isPositive ? "text-green-600" : "text-red-600"}>
                                    {isPositive ? "+" : "-"}
                                    {formatted}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-2 md:px-3 py-2 hidden sm:table-cell">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                t.status === 'completed' || t.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {t.status || 'completed'}
                              </span>
                          </td>
                        </tr>
                        ));
                      } else {
                        return (
                      <tr>
                            <td colSpan="5" className="px-2 md:px-3 py-6 text-center text-gray-500 text-xs md:text-sm">
                          No transactions yet
                        </td>
                      </tr>
                        );
                      }
                    })()}
                  </tbody>
                </table>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                Includes admin commissions, booking payments, cancellations, host and guest cash-in/cash-out transactions, and all platform payouts.
              </p>
            </div>

              </div>
        </div>
      </div>


      {/* ✅ Toast container */}
      <ToastContainer />

      
      
    </div>
  );
}

export default AdminPage;
