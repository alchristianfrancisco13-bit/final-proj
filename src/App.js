import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Login from "./Login";
import Register from "./Register";
import GuestPage from "./GuestPage";
import HostPage from "./HostPage";
import AdminPage from "./AdminPage";
import ProtectedRoute from "./ProtectedRoute";
import About from "./pages/About";
import HelpCenter from "./pages/HelpCenter";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Footer from "./components/Footer";


function App() {
  
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auth state persistence
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser ? "User logged in" : "User logged out");
      
      if (firebaseUser) {
        // User is signed in, get their role from Firestore
        try {
          console.log("Fetching user data for:", firebaseUser.uid);
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("User data from Firestore:", userData);
            setUser(firebaseUser);
            setUserRole(userData.role);
            console.log("User role set to:", userData.role);
          } else {
            console.log("User document not found in Firestore");
            // User document doesn't exist, sign them out
            await signOut(auth);
            setUser(null);
            setUserRole(null);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser(null);
          setUserRole(null);
        }
      } else {
        // User is signed out
        console.log("User signed out, clearing state");
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Logout function
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserRole(null);
      // Clear any local storage data
      localStorage.removeItem("guestProfile");
      localStorage.removeItem("hostProfile");
      localStorage.removeItem("adminProfile");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Show loading screen while checking auth state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#f8f6f1] via-[#e9e7e1] to-[#d1cfc7]">
        <div className="bg-white/40 shadow-2xl p-10 rounded-3xl flex flex-col items-center border border-[#e0c98d]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#bfa14a] mb-4"></div>
          <h2 className="text-xl font-bold text-[#2d3a4e]">Loading...</h2>
          <p className="text-[#bfa14a] text-sm">Checking authentication status</p>
        </div>
      </div>
    );
  }

  // Debug current state
  console.log("App render - Current state:", {
    user: user ? "logged in" : "not logged in",
    userRole,
    loading
  });

  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <div className="flex-grow">
          <Routes>
            <Route 
              path="/" 
              element={
                user ? (
                  userRole === "guest" ? <Navigate to="/guest" replace /> :
                  userRole === "host" ? <Navigate to="/host" replace /> :
                  userRole === "admin" ? <Navigate to="/admin" replace /> :
                  <Login />
                ) : (
                  <Login />
                )
              } 
            />
            <Route path="/register" element={<Register />} />
            <Route
              path="/guest"
              element={
                <ProtectedRoute user={user} allowedRole="guest" userRole={userRole}>
                  <GuestPage onLogout={handleLogout} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/host"
              element={
                <ProtectedRoute user={user} allowedRole="host" userRole={userRole}>
                  <HostPage onLogout={handleLogout} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute user={user} allowedRole="admin" userRole={userRole}>
                  <AdminPage onLogout={handleLogout} />
                </ProtectedRoute>
              }
            />
            
            {/* Test route for debugging */}
            <Route
              path="/admin-test"
              element={
                <div className="min-h-screen bg-green-100 flex items-center justify-center">
                  <div className="bg-white p-8 rounded-lg shadow-lg">
                    <h1 className="text-2xl font-bold text-green-600">Admin Test Page</h1>
                    <p className="text-gray-600">This is a test route to verify routing works</p>
                    <p className="text-gray-600">Current user: {user ? "Logged in" : "Not logged in"}</p>
                    <p className="text-gray-600">User role: {userRole || "None"}</p>
                    <button 
                      onClick={() => window.history.back()}
                      className="mt-4 bg-green-500 text-white px-4 py-2 rounded"
                    >
                      Go Back
                    </button>
                    <button 
                      onClick={() => window.location.href = "/admin"}
                      className="mt-2 bg-blue-500 text-white px-4 py-2 rounded ml-2"
                    >
                      Try Admin Page
                    </button>
                  </div>
                </div>
              }
            />

            {/* Public pages */}
            <Route path="/about" element={<About />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
