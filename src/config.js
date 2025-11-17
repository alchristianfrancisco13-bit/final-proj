// EmailJS Configuration - OTP (Original Account)
export const EMAILJS_CONFIG = {
  SERVICE_ID: "service_123",
  TEMPLATE_ID: "template_xaxp5pe", // OTP Template
  PUBLIC_KEY: "fjZyn4MuFbAAE6L7T",
  SUPPORT_EMAIL: "support@stayhub.example",
  BRAND_NAME: "StayHub",
  BRAND_TAGLINE: "Home stays & experiences",
  APP_URL: "final-proj-ed41d.web.app"
};

// EmailJS Configuration - Booking Confirmation (New Account)
export const EMAILJS_BOOKING_CONFIG = {
  SERVICE_ID: "service_qnqofvf", // Gmail Service
  TEMPLATE_ID: "template_hk3ides", // Booking Confirmation Template
  PUBLIC_KEY: "SZxl6JNNQ0Pq1XL8d", // New EmailJS Public Key
  SUPPORT_EMAIL: "support@stayhub.example",
  BRAND_NAME: "StayHub",
  BRAND_TAGLINE: "Home stays & experiences",
  APP_URL: "final-proj-ed41d.web.app"
};

// EmailJS Configuration - Cancellation Confirmation (Same Account as Booking)
export const EMAILJS_CANCELLATION_CONFIG = {
  SERVICE_ID: "service_qnqofvf", // Gmail Service (same as booking)
  TEMPLATE_ID: "template_ymhj5zp", // Cancellation Template
  PUBLIC_KEY: "SZxl6JNNQ0Pq1XL8d", // Same Public Key
  SUPPORT_EMAIL: "support@stayhub.example",
  BRAND_NAME: "StayHub",
  BRAND_TAGLINE: "Home stays & experiences",
  APP_URL: "final-proj-ed41d.web.app"
};

// EmailJS Configuration - Booking Declined (Same Account as Booking)
export const EMAILJS_DECLINED_CONFIG = {
  SERVICE_ID: "service_123", // Gmail Service (same as booking)
  TEMPLATE_ID: "template_la7tnz5", // Booking Declined Template
  PUBLIC_KEY: "fjZyn4MuFbAAE6L7T", // Same Public Key
  SUPPORT_EMAIL: "support@stayhub.example",
  BRAND_NAME: "StayHub",
  BRAND_TAGLINE: "Home stays & experiences",
  APP_URL: "final-proj-ed41d.web.app"
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
  // SECRET should be stored server-side only! This is for reference.
  // In production, use environment variables on your server
  SECRET: "EFHTAxrdIcLlvSA3a368L09iP4YdWG4RHU6WoFwtWhsKSO3A_qe2Virs5SRKwHWft081hYCJd8bbi8HU",
  CURRENCY: "PHP", // Using PHP currency for payouts
  SANDBOX: true, // Set to false for production
  API_BASE_URL: "https://api.sandbox.paypal.com" // Use https://api.paypal.com for production
};
