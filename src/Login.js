import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetStatus, setResetStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Login - StayHub";
  }, []);

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      setResetStatus("Please enter your email address");
      return;
    }
    
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setResetStatus("Password reset email sent! Please check your inbox.");
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetStatus("");
      }, 3000);
    } catch (error) {
      setResetStatus(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedUser = userCredential.user;

      console.log("User logged in:", loggedUser.uid);

      const userDoc = await getDoc(doc(db, "users", loggedUser.uid));
      if (userDoc.exists()) {
        const savedRole = userDoc.data().role;
        console.log("User role from Firestore:", savedRole);

        alert(`Login successful as ${savedRole}`);
        
        setTimeout(() => {
          if (savedRole === "guest") {
            console.log("Navigating to guest page");
            navigate("/guest");
          }
          if (savedRole === "host") {
            console.log("Navigating to host page");
            navigate("/host");
          }
          if (savedRole === "admin") {
            console.log("Navigating to admin page");
            console.log("Current URL before navigation:", window.location.href);
            
            navigate("/admin");
            console.log("Navigate function called for admin");
            
            setTimeout(() => {
              console.log("Current URL after navigate:", window.location.href);
              if (window.location.pathname !== "/admin") {
                console.log("Navigate didn't work, trying window.location.href");
                window.location.href = "/admin";
              }
            }, 500);
          }
        }, 100);
      } else {
        console.log("No user document found in Firestore");
        alert("No role found for this user!");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert(error.message);
    }
  };

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
        <source src="https://cdn.pixabay.com/video/2023/02/17/151054-800027519_large.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Dark Overlay para mas readable ang form */}
      <div className="absolute top-0 left-0 w-full h-full bg-black/30"></div>

      {/* Login Form - with higher z-index */}
      <div className="relative z-10 bg-white/50 backdrop-blur-sm shadow-2xl p-10 rounded-3xl w-[410px] flex flex-col items-center border border-[#e0c98d]">
        {/* StayHub Logo */}
        <div className="mb-6">
          <img src="logo_stay_hub1.png" alt="StayHub" className="h-20 w-auto" />
        </div>
        <h2 className="text-3xl font-bold mb-1 text-[#2d3a4e] tracking-tight font-serif">Login</h2>
        <p className="mb-7 text-[#bfa14a] text-base font-medium">Sign in to manage your stay</p>
        
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

        <div className="w-full mb-2">
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
        
        <div className="w-full flex justify-between items-center mb-6">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="remember"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-[#e0c98d] text-[#bfa14a] focus:ring-[#bfa14a]"
            />
            <label htmlFor="remember" className="ml-2 text-sm text-[#2d3a4e]">
              Remember me
            </label>
          </div>
          <button
            onClick={() => {
              setShowForgotPassword(true);
              setResetEmail(email);
            }}
            className="text-sm text-[#bfa14a] hover:underline"
          >
            Forgot Password?
          </button>
        </div>

        <button
          onClick={login}
          className="bg-gradient-to-r from-[#bfa14a] to-[#2d3a4e] hover:from-[#cbb76b] hover:to-[#1e2533] text-white font-bold px-8 py-2 rounded-lg w-full shadow-md transition-all duration-200 tracking-wide text-lg"
        >
          Sign In
        </button>

        <div className="w-full flex items-center my-6">
          <div className="flex-1 border-t border-[#e0c98d]"></div>
          <span className="px-4 text-sm text-[#2d3a4e]">Or continue with</span>
          <div className="flex-1 border-t border-[#e0c98d]"></div>
        </div>

        <button
          onClick={async () => {
            try {
              const provider = new GoogleAuthProvider();
              provider.setCustomParameters({
                prompt: 'select_account'
              });
              const result = await signInWithPopup(auth, provider);
              const user = result.user;
              
              const userDoc = await getDoc(doc(db, "users", user.uid));
              
              if (!userDoc.exists()) {
                await setDoc(doc(db, "users", user.uid), {
                  email: user.email,
                  role: "guest",
                  name: user.displayName,
                  createdAt: new Date().toISOString()
                });
                
                alert("Welcome to StayHub! You've been registered as a guest.");
                navigate("/guest");
              } else {
                const savedRole = userDoc.data().role;
                alert(`Login successful as ${savedRole}`);
                if (savedRole === "guest") navigate("/guest");
                if (savedRole === "host") navigate("/host");
                if (savedRole === "admin") navigate("/admin");
              }
            } catch (error) {
              alert(error.message);
            }
          }}
          className="w-full flex items-center justify-center gap-2 border border-[#e0c98d] rounded-lg py-2 px-4 text-[#2d3a4e] hover:bg-[#f8f6f1] transition-colors duration-200"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C8.36,19.27 5,16.25 5,12C5,7.9 8.2,4.73 12.2,4.73C15.29,4.73 17.1,6.7 17.1,6.7L19,4.72C19,4.72 16.56,2 12.1,2C6.42,2 2.03,6.8 2.03,12C2.03,17.05 6.16,22 12.25,22C17.6,22 21.5,18.33 21.5,12.91C21.5,11.76 21.35,11.1 21.35,11.1Z"
            />
          </svg>
          Google
        </button>

        <p className="mt-7 text-sm text-[#2d3a4e]">
          Don't have an account?{" "}
          <span
            className="text-[#bfa14a] font-semibold cursor-pointer hover:underline"
            onClick={() => navigate("/register")}
          >
            Register
          </span>
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[90%] max-w-md relative">
            <button
              onClick={() => {
                setShowForgotPassword(false);
                setResetStatus("");
              }}
              className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
            <h3 className="text-xl font-bold mb-4 text-[#2d3a4e]">Reset Password</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter your email address and we'll send you instructions to reset your password.
            </p>
            
            {resetStatus && (
              <div className={`p-3 rounded-lg mb-4 text-sm ${
                resetStatus.includes("sent") 
                  ? "bg-green-100 text-green-700" 
                  : "bg-red-100 text-red-700"
              }`}>
                {resetStatus}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-[#2d3a4e] font-semibold mb-1">Email</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full border border-[#e0c98d] rounded-lg px-3 py-2 bg-[#f8f6f1]"
              />
            </div>

            <button
              onClick={handleForgotPassword}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#bfa14a] to-[#2d3a4e] hover:from-[#cbb76b] hover:to-[#1e2533] disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-2 rounded-lg shadow-md transition-all duration-200"
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;