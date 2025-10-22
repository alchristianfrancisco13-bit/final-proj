import { useState, useEffect, useRef } from "react";
import emailjs from '@emailjs/browser';
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { EMAILJS_CONFIG, OTP_CONFIG, FIRESTORE_COLLECTIONS } from "./config";

function OTPVerification({ email, role, onVerificationSuccess, onBack }) {
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const [otpInitialized, setOtpInitialized] = useState(false);
  const [lastEmailSent, setLastEmailSent] = useState(0);
  const initializationRef = useRef(false);

  // Generate 6-digit OTP
  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Send OTP via EmailJS
  const sendOTP = async (otpCode) => {
    try {
      // Prevent sending emails too frequently (minimum 5 seconds between emails)
      const now = Date.now();
      if (now - lastEmailSent < 5000) {
        console.log('Email sending throttled - too frequent');
        return false;
      }

      console.log('OTPVerification: Sending OTP email to', email, 'with code', otpCode);

      // Calculate expiry time (15 minutes from now)
      const expiryTime = new Date(Date.now() + 15 * 60 * 1000);
      const formattedTime = expiryTime.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });

      const templateParams = {
        to_email: email,
        passcode: otpCode,
        time: formattedTime,
        user_email: email,
      };

      await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID,
        templateParams,
        EMAILJS_CONFIG.PUBLIC_KEY
      );

      console.log('OTPVerification: Email sent successfully to', email);
      setLastEmailSent(now); // Update last email sent time
      return true;
    } catch (error) {
      console.error('Error sending OTP:', error);
      return false;
    }
  };

  // Save OTP to Firestore
  const saveOTPToFirestore = async (otpCode) => {
    try {
      const otpData = {
        email: email,
        otp: otpCode,
        role: role,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes to match template
        verified: false
      };

      await setDoc(doc(db, FIRESTORE_COLLECTIONS.OTP_VERIFICATIONS, email), otpData);
      return true;
    } catch (error) {
      console.error('Error saving OTP to Firestore:', error);
      return false;
    }
  };

  // Verify OTP
  const verifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const otpDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.OTP_VERIFICATIONS, email));
      
      if (!otpDoc.exists()) {
        setError("OTP not found. Please request a new one.");
        setIsLoading(false);
        return;
      }

      const otpData = otpDoc.data();
      
      // Check if OTP has expired
      if (new Date() > otpData.expiresAt.toDate()) {
        setError("OTP has expired. Please request a new one.");
        setIsLoading(false);
        return;
      }

      // Check if OTP matches
      if (otpData.otp !== otp) {
        setError("Invalid OTP. Please try again.");
        setIsLoading(false);
        return;
      }

      // Mark OTP as verified
      await setDoc(doc(db, FIRESTORE_COLLECTIONS.OTP_VERIFICATIONS, email), {
        ...otpData,
        verified: true,
        verifiedAt: new Date()
      }, { merge: true });

      // Call success callback
      onVerificationSuccess();
      
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setError("An error occurred while verifying OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const resendOTP = async () => {
    // Prevent multiple simultaneous requests
    if (isLoading) return;
    
    setIsLoading(true);
    setError("");

    const newOtp = generateOTP();
    setGeneratedOtp(newOtp);

    const emailSent = await sendOTP(newOtp);
    const savedToFirestore = await saveOTPToFirestore(newOtp);

    if (emailSent && savedToFirestore) {
      setTimeLeft(15 * 60);
      setCanResend(false);
      alert("New OTP has been sent to your email!");
    } else {
      setError("Failed to send OTP. Please wait a moment and try again.");
    }

    setIsLoading(false);
  };

  // Initial OTP generation and sending - only run once per component mount
  useEffect(() => {
    // Prevent duplicate OTP generation using ref (survives React Strict Mode)
    if (initializationRef.current) {
      return;
    }

    const initializeOTP = async () => {
      console.log('OTPVerification: Initializing OTP for', email);
      initializationRef.current = true; // Mark as initialized immediately
      setIsLoading(true);
      setOtpInitialized(true);
      
      const newOtp = generateOTP();
      setGeneratedOtp(newOtp);

      const emailSent = await sendOTP(newOtp);
      const savedToFirestore = await saveOTPToFirestore(newOtp);

      if (!emailSent || !savedToFirestore) {
        setError("Failed to send OTP. Please wait a moment and try again.");
        initializationRef.current = false; // Reset if failed so user can try again
        setOtpInitialized(false);
      }

      setIsLoading(false);
    };

    initializeOTP();
  }, []); // Empty dependency array - only run once on mount

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#f8f6f1] via-[#e9e7e1] to-[#d1cfc7]"
      style={{
        backgroundImage: "url('https://i.pinimg.com/1200x/c4/9d/ef/c49defa16fd398e0e27d19473c179886.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}
    >
      <div className="bg-white/40 shadow-2xl p-10 rounded-3xl w-[410px] flex flex-col items-center border border-[#e0c98d]">
        {/* Logo */}
        <div className="bg-gradient-to-r from-[#bfa14a] to-[#2d3a4e] rounded-full p-4 mb-6 shadow-lg">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h2 className="text-3xl font-bold mb-1 text-[#2d3a4e] tracking-tight font-serif">Verify Your Email</h2>
        <p className="mb-7 text-[#bfa14a] text-base font-medium text-center">
          We've sent a 6-digit verification code to<br />
          <span className="font-semibold text-[#2d3a4e]">{email}</span><br />
          <span className="text-sm text-[#6b7280] mt-2 block">This code will be valid for 15 minutes</span>
        </p>

        {error && (
          <div className="w-full mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="w-full mb-4">
          <label className="block text-[#2d3a4e] font-semibold mb-1">Enter Verification Code</label>
          <div className="flex items-center border border-[#e0c98d] rounded-lg px-3 bg-[#f8f6f1]">
            <svg className="w-5 h-5 text-[#bfa14a] mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <input
              type="text"
              placeholder="Enter 6-digit code"
              className="bg-transparent outline-none py-2 w-full text-[#2d3a4e] text-center text-lg tracking-widest"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength="6"
            />
          </div>
        </div>

        <button
          onClick={verifyOTP}
          disabled={isLoading || otp.length !== 6}
          className="bg-gradient-to-r from-[#bfa14a] to-[#2d3a4e] hover:from-[#cbb76b] hover:to-[#1e2533] disabled:from-gray-400 disabled:to-gray-500 text-white font-bold px-8 py-2 rounded-lg w-full shadow-md transition-all duration-200 tracking-wide text-lg mb-4"
        >
          {isLoading ? "Verifying..." : "Verify Email"}
        </button>

        <div className="text-center">
          {timeLeft > 0 ? (
            <p className="text-sm text-[#2d3a4e] mb-2">
              Resend code in {formatTime(timeLeft)}
            </p>
          ) : (
            <button
              onClick={resendOTP}
              disabled={isLoading}
              className="text-[#bfa14a] font-semibold hover:underline text-sm mb-2"
            >
              Resend Code
            </button>
          )}
        </div>

        <button
          onClick={onBack}
          className="text-[#2d3a4e] font-medium hover:underline text-sm mt-2"
        >
          ← Back to Registration
        </button>
      </div>
    </div>
  );
}

export default OTPVerification;
