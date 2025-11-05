import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail, signOut } from "firebase/auth";
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import OTPVerification from "./OTPVerification";
import { FIRESTORE_COLLECTIONS } from "./config";

function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("guest");
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Register - StayHub";
  }, []);

  const validateForm = () => {
    if (!email || !password || !confirmPassword || !name || !phone) {
      setError("Please fill in all fields");
      return false;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return false;
    }
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters long");
      return false;
    }
    if (phone.trim().length < 10) {
      setError("Please enter a valid phone number");
      return false;
    }
    if (!acceptedTerms) {
      setError("Please accept the Terms and Conditions to continue");
      return false;
    }
    return true;
  };

  const startRegistration = async () => {
    setError("");
    if (validateForm()) {
      setIsLoading(true);
      try {
        const signInMethods = await fetchSignInMethodsForEmail(auth, email);
        if (signInMethods && signInMethods.length > 0) {
          setError("This email is already registered. Please use a different email or log in.");
          setIsLoading(false);
          return;
        }

        const usersRef = collection(db, FIRESTORE_COLLECTIONS.USERS);
        const emailQuery = await getDocs(query(usersRef, where('email', '==', email)));
        
        if (!emailQuery.empty) {
          setError("This email is already registered in our system. Please use a different email or log in.");
          setIsLoading(false);
          return;
        }

        setShowOTPVerification(true);
      } catch (error) {
        console.error("Error checking email existence:", error);
        setError("Failed to check email existence. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const completeRegistration = async (userInfo) => {
    setIsLoading(true);
    setError("");

    try {
      const otpDoc = await getDoc(doc(db, FIRESTORE_COLLECTIONS.OTP_VERIFICATIONS, email));
      
      if (!otpDoc.exists()) {
        setError("OTP verification not found. Please try again.");
        setIsLoading(false);
        return;
      }

      const otpData = otpDoc.data();
      if (!otpData.verified) {
        setError("Email not verified. Please complete OTP verification.");
        setIsLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;

      await setDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, newUser.uid), {
        email: newUser.email,
        name: userInfo.name.trim(),
        phone: userInfo.phone.trim(),
        role: userInfo.role,
        createdAt: new Date(),
        emailVerified: true,
        otpVerifiedAt: otpData.verifiedAt
      });

      await setDoc(doc(db, FIRESTORE_COLLECTIONS.OTP_VERIFICATIONS, email), {
        ...otpData,
        completed: true,
        completedAt: new Date()
      }, { merge: true });

      await signOut(auth);
      alert("Registration successful! Please log in with your email and password to continue.");
      navigate("/");
      
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const goBackToRegistration = () => {
    setShowOTPVerification(false);
    setError("");
  };

  if (showOTPVerification) {
    return (
      <OTPVerification
        email={email}
        role={role}
        name={name}
        phone={phone}
        onVerificationSuccess={completeRegistration}
        onBack={goBackToRegistration}
      />
    );
  }

  return (
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover"
      >
        <source src="https://cdn.pixabay.com/video/2024/02/29/202392-918066367_large.mp4" type="video/mp4" />
      </video>

      {/* Overlay for better readability */}
      <div className="absolute top-0 left-0 w-full h-full bg-black opacity-20"></div>

      {/* Content */}
      <div className="relative z-10 bg-white/40 backdrop-blur-sm shadow-2xl p-10 rounded-3xl w-[410px] flex flex-col items-center border border-[#e0c98d]">
        <div className="mb-6">
          <img src="logo_stay_hub1.png" alt="StayHub" className="h-20 w-auto" />
        </div>
        <h2 className="text-3xl font-bold mb-1 text-[#2d3a4e] tracking-tight font-serif">Create Account</h2>
        <p className="mb-7 text-[#bfa14a] text-base font-medium">Register to get started</p>
        
        {error && (
          <div className="w-full mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="w-full mb-4">
          <label className="block text-[#2d3a4e] font-semibold mb-1">Email</label>
          <div className="flex items-center border border-[#e0c98d] rounded-lg px-3 bg-[#f8f6f1]">
            <svg className="w-5 h-5 text-[#bfa14a] mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 12H8m8 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <input
              type="email"
              placeholder="Enter your email"
              className="bg-transparent outline-none py-2 w-full text-[#2d3a4e]"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="w-full mb-4">
          <label className="block text-[#2d3a4e] font-semibold mb-1">Password</label>
          <div className="flex items-center border border-[#e0c98d] rounded-lg px-3 bg-[#f8f6f1]">
            <svg className="w-5 h-5 text-[#bfa14a] mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-8 0v2" />
            </svg>
            <input
              type="password"
              placeholder="Enter your password"
              className="bg-transparent outline-none py-2 w-full text-[#2d3a4e]"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div className="w-full mb-4">
          <label className="block text-[#2d3a4e] font-semibold mb-1">Confirm Password</label>
          <div className="flex items-center border border-[#e0c98d] rounded-lg px-3 bg-[#f8f6f1]">
            <svg className="w-5 h-5 text-[#bfa14a] mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-8 0v2" />
            </svg>
            <input
              type="password"
              placeholder="Confirm your password"
              className="bg-transparent outline-none py-2 w-full text-[#2d3a4e]"
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>

        <div className="w-full mb-4">
          <label className="block text-[#2d3a4e] font-semibold mb-1">Full Name</label>
          <div className="flex items-center border border-[#e0c98d] rounded-lg px-3 bg-[#f8f6f1]">
            <svg className="w-5 h-5 text-[#bfa14a] mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <input
              type="text"
              placeholder="Enter your full name"
              className="bg-transparent outline-none py-2 w-full text-[#2d3a4e]"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        <div className="w-full mb-4">
          <label className="block text-[#2d3a4e] font-semibold mb-1">Phone Number</label>
          <div className="flex items-center border border-[#e0c98d] rounded-lg px-3 bg-[#f8f6f1]">
            <svg className="w-5 h-5 text-[#bfa14a] mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <input
              type="tel"
              placeholder="Enter your phone number"
              className="bg-transparent outline-none py-2 w-full text-[#2d3a4e]"
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="w-full mb-6">
          <label className="block text-[#2d3a4e] font-semibold mb-1">Select Role</label>
          <select
            className="border border-[#e0c98d] rounded-lg p-2 w-full bg-[#f8f6f1] text-[#2d3a4e]"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="guest">Guest</option>
            <option value="host">Host</option>
          </select>
        </div>

        <div className="w-full mb-4">
          <label className="flex items-start gap-2 text-[#2d3a4e] text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 h-4 w-4 accent-[#bfa14a] border-[#e0c98d] rounded"
            />
            <span>
              I agree to the{' '}
              <Link to="/terms" className="text-[#bfa14a] font-semibold hover:underline">
                Terms and Conditions
              </Link>
              {' '}and confirm that I have read the{' '}
              <Link to="/privacy" className="text-[#bfa14a] font-semibold hover:underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
        </div>

        <button
          onClick={startRegistration}
          disabled={isLoading || !acceptedTerms}
          className="bg-gradient-to-r from-[#bfa14a] to-[#2d3a4e] hover:from-[#cbb76b] hover:to-[#1e2533] disabled:from-gray-400 disabled:to-gray-500 text-white font-bold px-8 py-2 rounded-lg w-full shadow-md transition-all duration-200 tracking-wide text-lg"
        >
          {isLoading ? "Processing..." : "Send Verification Code"}
        </button>

        <p className="mt-7 text-sm text-[#2d3a4e]">
          Already have an account?{" "}
          <span
            className="text-[#bfa14a] font-semibold cursor-pointer hover:underline"
            onClick={() => navigate("/")}
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
}

export default Register;