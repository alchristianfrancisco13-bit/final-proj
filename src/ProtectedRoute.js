import { Navigate, useLocation } from "react-router-dom";

function ProtectedRoute({ user, allowedRole, userRole, children }) {
  const location = useLocation();
  console.log("ProtectedRoute check:", {
    user: user ? "logged in" : "not logged in",
    userRole,
    allowedRole,
    access: user && userRole === allowedRole ? "ALLOWED" : "DENIED"
  });

  if (!user) {
    // ❌ Kung walang login, balik sa Auth page
    console.log("Access denied: No user logged in");

    try {
      const searchParams = new URLSearchParams(location.search || "");
      const listingId = searchParams.get("listingId");
      const bookingId = searchParams.get("bookingId");
      if (listingId && typeof window !== "undefined") {
        sessionStorage.setItem("sharedListingId", listingId);
      }
      if (bookingId && typeof window !== "undefined") {
        sessionStorage.setItem("sharedBookingId", bookingId);
      }
    } catch (error) {
      console.error("Failed to preserve shared link params:", error);
    }

    return <Navigate to="/" replace />;
  }

  // Normalize strings for comparison
  const normalizedUserRole = userRole?.toString().trim().toLowerCase();
  const normalizedAllowedRole = allowedRole?.toString().trim().toLowerCase();
  
  if (normalizedUserRole !== normalizedAllowedRole) {
    // ❌ Kung mali ang role, deny access
    console.log(`Access denied: User role '${userRole}' does not match required role '${allowedRole}'`);
    console.log("Detailed comparison:", {
      userRole: `"${userRole}"`,
      allowedRole: `"${allowedRole}"`,
      normalizedUserRole: `"${normalizedUserRole}"`,
      normalizedAllowedRole: `"${normalizedAllowedRole}"`,
      userRoleLength: userRole?.length,
      allowedRoleLength: allowedRole?.length,
      userRoleType: typeof userRole,
      allowedRoleType: typeof allowedRole,
      userRoleCharCodes: userRole?.split('').map(c => c.charCodeAt(0)),
      allowedRoleCharCodes: allowedRole?.split('').map(c => c.charCodeAt(0))
    });
    return <Navigate to="/" replace />;
  }

  // ✅ Kung tama, ipakita yung page
  console.log("Access granted to protected route");
  console.log("Rendering children for admin page");
  return children;
}

export default ProtectedRoute;
