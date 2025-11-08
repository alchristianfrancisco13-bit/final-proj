// EmailJS Configuration
export const EMAILJS_CONFIG = {
  SERVICE_ID: "service_123",
  TEMPLATE_ID: "template_xaxp5pe", 
  PUBLIC_KEY: "fjZyn4MuFbAAE6L7T"
};

// OTP Configuration
export const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRY_MINUTES: 15,
  EXPIRY_MS: 15 * 60 * 1000 // 15 minutes in milliseconds
};

// Firestore Collections
export const FIRESTORE_COLLECTIONS = {
  USERS: "users",
  OTP_VERIFICATIONS: "otp_verifications"
};

// PayPal configuration (Sandbox)
export const PAYPAL_CONFIG = {
  CLIENT_ID: "AX2UMlePiqsjclhBUK-_wsmwqERwuz7q95ishOYV5ndtBTQvpTRlIN8yAhLAZWv99GWvEjLbuzfZNKd4",
  CURRENCY: "USD" // PayPal Sandbox uses USD
};
