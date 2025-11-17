export const buildOtpEmailTemplate = ({
  recipientName = "",
  otpCode = "",
  expiresAt = "",
  supportEmail = "support@stayhub.example",
  brandName = "StayHub",
  appUrl = "https://stayhub.example.com"
} = {}) => {
  const safeRecipient =
    typeof recipientName === "string" && recipientName.trim().length > 0
      ? recipientName.trim()
      : "there";

  const safeOtp =
    typeof otpCode === "string" && otpCode.trim().length > 0 ? otpCode.trim() : "000000";

  const safeExpiry =
    typeof expiresAt === "string" && expiresAt.trim().length > 0
      ? expiresAt.trim()
      : "15 minutes from now";

  const safeSupport =
    typeof supportEmail === "string" && supportEmail.trim().length > 0
      ? supportEmail.trim()
      : "support@stayhub.example";

  const safeBrand =
    typeof brandName === "string" && brandName.trim().length > 0
      ? brandName.trim()
      : "StayHub";

  let safeAppUrl = "https://stayhub.example.com";
  if (typeof appUrl === "string" && appUrl.trim().length > 0) {
    safeAppUrl = appUrl.trim();
  } else if (typeof window !== "undefined" && window.location) {
    safeAppUrl = window.location.origin;
  }

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeBrand} Verification Code</title>
    <style>
      body {
        font-family: "Segoe UI", Arial, sans-serif;
        background-color: #f7f8fc;
        margin: 0;
        padding: 0;
        color: #1f2933;
      }
      .email-wrapper {
        width: 100%;
        background: linear-gradient(180deg, #101725 0%, #1b2a38 100%);
        padding: 40px 0;
      }
      .container {
        max-width: 480px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(15, 23, 42, 0.25);
      }
      .header {
        background: linear-gradient(135deg, #1b2a38 0%, #2c3e50 100%);
        padding: 32px;
        text-align: left;
        color: #ffffff;
      }
      .header h1 {
        margin: 12px 0 0;
        font-size: 22px;
        letter-spacing: 0.5px;
      }
      .header p {
        margin: 6px 0 0;
        font-size: 12px;
        opacity: 0.7;
        text-transform: uppercase;
        letter-spacing: 1.2px;
      }
      .content {
        padding: 32px;
      }
      .content h2 {
        margin: 0 0 16px;
        font-size: 24px;
        color: #101725;
      }
      .content p {
        margin: 0 0 16px;
        line-height: 1.6;
        font-size: 15px;
        color: #4c5664;
      }
      .otp {
        margin: 32px 0;
        padding: 18px 0;
        font-size: 34px;
        font-weight: 700;
        letter-spacing: 12px;
        text-align: center;
        background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
        border-radius: 12px;
        color: #1d4ed8;
      }
      .meta {
        background-color: #f9fafc;
        border-radius: 12px;
        padding: 16px 20px;
        margin-bottom: 24px;
        font-size: 13px;
        color: #4c5664;
      }
      .meta strong {
        display: block;
        color: #1f2933;
        margin-bottom: 4px;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .button {
        display: inline-block;
        margin: 10px 0 24px;
        padding: 14px 28px;
        background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
        color: #ffffff;
        text-decoration: none;
        border-radius: 10px;
        font-weight: 600;
        letter-spacing: 0.3px;
      }
      .footer {
        background-color: #f7f8fc;
        padding: 24px 32px;
        font-size: 12px;
        color: #6b7280;
        text-align: center;
      }
      .footer a {
        color: #2563eb;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <div class="email-wrapper">
      <div class="container">
        <div class="header">
          <p>Security Verification</p>
          <h1>Your Verification Code</h1>
        </div>
        <div class="content">
          <h2>Hello, ${safeRecipient} 👋</h2>
          <p>
            Use the one-time password below to securely finish signing in to your
            ${safeBrand} account.
          </p>
          <div class="otp">${safeOtp}</div>
          <div class="meta">
            <strong>Expires</strong>
            ${safeExpiry}
          </div>
          <div class="meta">
            <strong>Security Notice</strong>
            Never share this code with anyone. ${safeBrand} will never ask for your
            password, OTP, or any sensitive information over email, phone, or chat.
            If you didn’t request this code, you can safely ignore this email.
          </div>
          <a class="button" href="${safeAppUrl}" target="_blank" rel="noopener noreferrer" data-mce-href="${safeAppUrl}">
            Return to ${safeBrand}
          </a>
          <p style="margin-top: 32px;">
            Need help? Contact our support team at
            <a href="mailto:${safeSupport}">${safeSupport}</a>.
          </p>
          <p style="margin: 0;">
            Thanks for choosing <strong>${safeBrand}</strong> for your travel needs!
          </p>
        </div>
        <div class="footer">
          © ${new Date().getFullYear()} ${safeBrand}. All rights reserved.
        </div>
      </div>
    </div>
  </body>
</html>
  `.trim();
};

export const buildBookingConfirmationTemplate = ({
  guestName = "",
  bookingId = "",
  listingTitle = "",
  listingImage = "",
  checkIn = "",
  checkOut = "",
  guests = 1,
  location = "",
  totalAmount = 0,
  serviceFee = 0,
  subtotal = 0,
  guestEmail = "",
  supportEmail = "support@stayhub.example",
  brandName = "StayHub",
  appUrl = "https://stayhub.example.com"
} = {}) => {
  const safeGuestName = typeof guestName === "string" && guestName.trim().length > 0
    ? guestName.trim()
    : "Guest";

  const safeBookingId = typeof bookingId === "string" && bookingId.trim().length > 0
    ? bookingId.trim()
    : "N/A";

  const safeListingTitle = typeof listingTitle === "string" && listingTitle.trim().length > 0
    ? listingTitle.trim()
    : "Your Booking";

  const safeListingImage = typeof listingImage === "string" && listingImage.trim().length > 0
    ? listingImage.trim()
    : "https://images.unsplash.com/photo-1505691924083-fb6d2ee58f58?q=80&w=1200&auto=format&fit=crop";

  const safeCheckIn = checkIn ? (typeof checkIn === "string" ? checkIn : new Date(checkIn).toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })) : "TBD";

  const safeCheckOut = checkOut ? (typeof checkOut === "string" ? checkOut : new Date(checkOut).toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })) : "TBD";

  const safeLocation = typeof location === "string" && location.trim().length > 0
    ? location.trim()
    : "";

  const safeGuests = typeof guests === "number" ? guests : parseInt(guests) || 1;
  const safeTotal = typeof totalAmount === "number" ? totalAmount : parseFloat(totalAmount) || 0;
  const safeServiceFee = typeof serviceFee === "number" ? serviceFee : parseFloat(serviceFee) || 0;
  const safeSubtotal = typeof subtotal === "number" ? subtotal : parseFloat(subtotal) || 0;

  const safeSupport = typeof supportEmail === "string" && supportEmail.trim().length > 0
    ? supportEmail.trim()
    : "support@stayhub.example";

  const safeBrand = typeof brandName === "string" && brandName.trim().length > 0
    ? brandName.trim()
    : "StayHub";

  let safeAppUrl = "https://stayhub.example.com";
  if (typeof appUrl === "string" && appUrl.trim().length > 0) {
    safeAppUrl = appUrl.trim();
  } else if (typeof window !== "undefined" && window.location) {
    safeAppUrl = window.location.origin;
  }

  return `
<div style="font-family: system-ui, sans-serif, Arial; font-size: 14px; color: #333; padding: 14px 8px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: auto; background-color: #fff">
    <div style="border-top: 6px solid #1e88e5; padding: 16px">
      <a style="text-decoration: none; outline: none; margin-right: 8px; vertical-align: middle" href="${safeAppUrl}" target="_blank">
        <span style="font-size: 24px; font-weight: bold; color: #1e88e5; vertical-align: middle">${safeBrand}</span>
      </a>
      <span style="font-size: 16px; vertical-align: middle; border-left: 1px solid #333; padding-left: 8px;">
        <strong>Booking Confirmed</strong>
      </span>
    </div>
    <div style="padding: 0 16px">
      <p style="margin: 16px 0; font-size: 15px; line-height: 1.6;">
        Thank you for your booking! Below are your reservation details.
      </p>
      <div style="text-align: left; font-size: 14px; padding-bottom: 4px; border-bottom: 2px solid #333; margin: 20px 0;">
        <strong>Booking Reference: ${safeBookingId}</strong>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 12px">
        <tr>
          <td style="padding: 8px 0"><strong>Name:</strong></td>
          <td style="text-align: right">${safeGuestName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0"><strong>Service:</strong></td>
          <td style="text-align: right">${safeListingTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0"><strong>Check-in Date:</strong></td>
          <td style="text-align: right">${safeCheckIn}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0"><strong>Check-out Date:</strong></td>
          <td style="text-align: right">${safeCheckOut}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0"><strong>Guests:</strong></td>
          <td style="text-align: right">${safeGuests} ${safeGuests === 1 ? 'guest' : 'guests'}</td>
        </tr>
        ${safeLocation ? `
        <tr>
          <td style="padding: 8px 0"><strong>Location:</strong></td>
          <td style="text-align: right">${safeLocation}</td>
        </tr>
        ` : ''}
      </table>

      <div style="padding: 24px 0">
        <div style="border-top: 2px solid #333"></div>
      </div>

      <table style="border-collapse: collapse; width: 100%; text-align: right; margin-bottom: 20px;">
        <tr>
          <td style="width: 60%"></td>
          <td style="padding: 8px; text-align: left;">Subtotal</td>
          <td style="padding: 8px; white-space: nowrap;">₱${safeSubtotal.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="width: 60%"></td>
          <td style="padding: 8px; text-align: left;">Service Fee</td>
          <td style="padding: 8px; white-space: nowrap;">₱${safeServiceFee.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="width: 60%"></td>
          <td style="border-top: 2px solid #333; padding: 16px 8px; text-align: left;">
            <strong style="white-space: nowrap;">Total Amount</strong>
          </td>
          <td style="padding: 16px 8px; border-top: 2px solid #333; white-space: nowrap;">
            <strong>₱${safeTotal.toLocaleString()}</strong>
          </td>
        </tr>
      </table>

      <p style="margin: 20px 0; font-size: 14px; line-height: 1.6;">
        If you have questions or need to make changes, feel free to contact us anytime.
      </p>
    </div>
  </div>
  <div style="max-width: 600px; margin: auto; padding: 16px 0;">
    <p style="color: #999; font-size: 12px; margin: 0;">
      This email was sent to ${guestEmail || 'your email'}<br />
      Thank you for booking with us.
    </p>
  </div>
</div>
  `.trim();
};

export const buildCancellationConfirmationTemplate = ({
  guestName = "",
  bookingId = "",
  listingTitle = "",
  checkIn = "",
  checkOut = "",
  guests = 1,
  location = "",
  cancellationDate = "",
  refundAmount = 0,
  guestEmail = "",
  supportEmail = "support@stayhub.example",
  brandName = "StayHub",
  appUrl = "https://stayhub.example.com"
} = {}) => {
  const safeGuestName = typeof guestName === "string" && guestName.trim().length > 0
    ? guestName.trim()
    : "Valued Guest";

  const safeBookingId = typeof bookingId === "string" && bookingId.trim().length > 0
    ? bookingId.trim()
    : "N/A";

  const safeListingTitle = typeof listingTitle === "string" && listingTitle.trim().length > 0
    ? listingTitle.trim()
    : "Your Booking";

  const safeCheckIn = checkIn ? (typeof checkIn === "string" ? checkIn : new Date(checkIn).toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })) : "TBD";

  const safeCheckOut = checkOut ? (typeof checkOut === "string" ? checkOut : new Date(checkOut).toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })) : "TBD";

  const safeLocation = typeof location === "string" && location.trim().length > 0
    ? location.trim()
    : "";

  const safeGuests = typeof guests === "number" ? guests : parseInt(guests) || 1;
  const safeRefundAmount = typeof refundAmount === "number" ? refundAmount : parseFloat(refundAmount) || 0;

  const safeCancellationDate = cancellationDate ? (typeof cancellationDate === "string" ? cancellationDate : new Date(cancellationDate).toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })) : new Date().toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const safeSupport = typeof supportEmail === "string" && supportEmail.trim().length > 0
    ? supportEmail.trim()
    : "support@stayhub.example";

  const safeBrand = typeof brandName === "string" && brandName.trim().length > 0
    ? brandName.trim()
    : "StayHub";

  let safeAppUrl = "https://stayhub.example.com";
  if (typeof appUrl === "string" && appUrl.trim().length > 0) {
    safeAppUrl = appUrl.trim();
  } else if (typeof window !== "undefined" && window.location) {
    safeAppUrl = window.location.origin;
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cancellation Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f8f8;">
  <div style="max-width: 650px; margin: 40px auto; background-color: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #d4af37 0%, #f4d03f 100%); padding: 40px 32px; text-align: center; border-radius: 0;">
      <div style="margin-bottom: 16px;">
        <span style="font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: 1px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">${safeBrand}</span>
      </div>
      <div style="height: 2px; width: 80px; background-color: #ffffff; margin: 20px auto;"></div>
      <p style="color: #ffffff; font-size: 18px; margin: 0; font-weight: 500; letter-spacing: 0.5px;">BOOKING CANCELLATION CONFIRMED</p>
    </div>

    <!-- Content -->
    <div style="padding: 40px 32px;">
      <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.7; color: #333333;">
        Dear ${safeGuestName},
      </p>
      <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.7; color: #333333;">
        We confirm that your booking has been successfully cancelled as requested. While we're sorry to see your plans change, we understand and hope to have the pleasure of serving you in the future.
      </p>

      <!-- Booking Reference -->
      <div style="background: linear-gradient(135deg, #d4af37 0%, #f4d03f 100%); padding: 16px 24px; margin: 32px 0; border-radius: 4px;">
        <p style="margin: 0; color: #ffffff; font-size: 14px; font-weight: 600; letter-spacing: 0.5px;">CANCELLED BOOKING REFERENCE</p>
        <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 1px;">${safeBookingId}</p>
      </div>

      <!-- Reservation Details -->
      <div style="border: 2px solid #d4af37; border-radius: 4px; padding: 24px; margin: 32px 0;">
        <h2 style="margin: 0 0 20px 0; color: #d4af37; font-size: 18px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">Cancelled Booking Details</h2>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e8e8e8;">
              <span style="color: #666666; font-size: 14px; font-weight: 600;">Guest Name</span>
            </td>
            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #e8e8e8;">
              <span style="color: #333333; font-size: 15px; font-weight: 500;">${safeGuestName}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e8e8e8;">
              <span style="color: #666666; font-size: 14px; font-weight: 600;">Accommodation</span>
            </td>
            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #e8e8e8;">
              <span style="color: #333333; font-size: 15px; font-weight: 500;">${safeListingTitle}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e8e8e8;">
              <span style="color: #666666; font-size: 14px; font-weight: 600;">Original Check-in</span>
            </td>
            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #e8e8e8;">
              <span style="color: #333333; font-size: 15px; font-weight: 500;">${safeCheckIn}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e8e8e8;">
              <span style="color: #666666; font-size: 14px; font-weight: 600;">Original Check-out</span>
            </td>
            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #e8e8e8;">
              <span style="color: #333333; font-size: 15px; font-weight: 500;">${safeCheckOut}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e8e8e8;">
              <span style="color: #666666; font-size: 14px; font-weight: 600;">Number of Guests</span>
            </td>
            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #e8e8e8;">
              <span style="color: #333333; font-size: 15px; font-weight: 500;">${safeGuests}</span>
            </td>
          </tr>
          ${safeLocation ? `
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e8e8e8;">
              <span style="color: #666666; font-size: 14px; font-weight: 600;">Location</span>
            </td>
            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #e8e8e8;">
              <span style="color: #333333; font-size: 15px; font-weight: 500;">${safeLocation}</span>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 12px 0;">
              <span style="color: #666666; font-size: 14px; font-weight: 600;">Cancellation Date</span>
            </td>
            <td style="padding: 12px 0; text-align: right;">
              <span style="color: #333333; font-size: 15px; font-weight: 500;">${safeCancellationDate}</span>
            </td>
          </tr>
        </table>
      </div>

      <!-- Refund Summary -->
      <div style="background-color: #fafafa; padding: 24px; border-radius: 4px; margin: 32px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0;">
              <span style="color: #d4af37; font-size: 16px; font-weight: 700; letter-spacing: 0.5px;">REFUND AMOUNT</span>
            </td>
            <td style="padding: 12px 0; text-align: right;">
              <span style="color: #d4af37; font-size: 24px; font-weight: 700;">₱${safeRefundAmount.toLocaleString()}</span>
            </td>
          </tr>
        </table>
      </div>

      <p style="margin: 32px 0 0 0; font-size: 15px; line-height: 1.7; color: #333333;">
        Should you have any questions regarding this cancellation or require further assistance, our dedicated team is available 24/7 to serve you.
      </p>
      <p style="margin: 16px 0 0 0; font-size: 15px; line-height: 1.7; color: #333333;">
        We hope to welcome you back soon.
      </p>
      <p style="margin: 16px 0 0 0; font-size: 15px; line-height: 1.7; color: #333333;">
        Warm regards,<br>
        <strong style="color: #d4af37;">The ${safeBrand} Team</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #2c2c2c; padding: 32px; text-align: center; color: #ffffff;">
      <div style="margin-bottom: 16px;">
        <span style="font-size: 24px; font-weight: 700; color: #d4af37; letter-spacing: 1px;">${safeBrand}</span>
      </div>
      <div style="height: 1px; width: 60px; background-color: #d4af37; margin: 16px auto;"></div>
      <p style="margin: 16px 0 8px 0; font-size: 13px; color: #cccccc; line-height: 1.6;">
        This confirmation was sent to <strong style="color: #d4af37;">${guestEmail || 'your email'}</strong>
      </p>
      <p style="margin: 0; font-size: 12px; color: #999999; line-height: 1.6;">
        © 2024 ${safeBrand}. All rights reserved.<br>
        Premium Accommodations · Exceptional Service
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

export const buildBookingDeclinedTemplate = ({
  guestName = "",
  bookingId = "",
  listingTitle = "",
  checkIn = "",
  checkOut = "",
  guests = 1,
  location = "",
  guestEmail = "",
  supportEmail = "support@stayhub.example",
  brandName = "StayHub",
  appUrl = "https://stayhub.example.com"
} = {}) => {
  const safeGuestName = typeof guestName === "string" && guestName.trim().length > 0
    ? guestName.trim()
    : "Valued Guest";

  const safeBookingId = typeof bookingId === "string" && bookingId.trim().length > 0
    ? bookingId.trim()
    : "N/A";

  const safeListingTitle = typeof listingTitle === "string" && listingTitle.trim().length > 0
    ? listingTitle.trim()
    : "Your Booking";

  const safeCheckIn = checkIn ? (typeof checkIn === "string" ? checkIn : new Date(checkIn).toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })) : "TBD";

  const safeCheckOut = checkOut ? (typeof checkOut === "string" ? checkOut : new Date(checkOut).toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })) : "TBD";

  const safeLocation = typeof location === "string" && location.trim().length > 0
    ? location.trim()
    : "";

  const safeGuests = typeof guests === "number" ? guests : parseInt(guests) || 1;

  const safeSupport = typeof supportEmail === "string" && supportEmail.trim().length > 0
    ? supportEmail.trim()
    : "support@stayhub.example";

  const safeBrand = typeof brandName === "string" && brandName.trim().length > 0
    ? brandName.trim()
    : "StayHub";

  let safeAppUrl = "https://stayhub.example.com";
  if (typeof appUrl === "string" && appUrl.trim().length > 0) {
    safeAppUrl = appUrl.trim();
  } else if (typeof window !== "undefined" && window.location) {
    safeAppUrl = window.location.origin;
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Declined</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f8f8;">
  <div style="max-width: 650px; margin: 40px auto; background-color: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #d4af37 0%, #f4d03f 100%); padding: 40px 32px; text-align: center; border-radius: 0;">
      <div style="margin-bottom: 16px;">
        <span style="font-size: 32px; font-weight: 700; color: #ffffff; letter-spacing: 1px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">${safeBrand}</span>
      </div>
      <div style="height: 2px; width: 80px; background-color: #ffffff; margin: 20px auto;"></div>
      <p style="color: #ffffff; font-size: 18px; margin: 0; font-weight: 500; letter-spacing: 0.5px;">BOOKING REQUEST UPDATE</p>
    </div>

    <!-- Content -->
    <div style="padding: 40px 32px;">
      <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.7; color: #333333;">
        Dear ${safeGuestName},
      </p>
      <p style="margin: 0 0 32px 0; font-size: 16px; line-height: 1.7; color: #333333;">
        Thank you for your interest in booking with ${safeBrand}. We regret to inform you that we are unable to accommodate your booking request at this time.
      </p>

      <!-- Booking Reference -->
      <div style="background: linear-gradient(135deg, #d4af37 0%, #f4d03f 100%); padding: 16px 24px; margin: 32px 0; border-radius: 4px;">
        <p style="margin: 0; color: #ffffff; font-size: 14px; font-weight: 600; letter-spacing: 0.5px;">BOOKING REFERENCE</p>
        <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 1px;">${safeBookingId}</p>
      </div>

      <!-- Booking Details -->
      <div style="border: 2px solid #d4af37; border-radius: 4px; padding: 24px; margin: 32px 0;">
        <h2 style="margin: 0 0 20px 0; color: #d4af37; font-size: 18px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">Booking Request Details</h2>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e8e8e8;">
              <span style="color: #666666; font-size: 14px; font-weight: 600;">Guest Name</span>
            </td>
            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #e8e8e8;">
              <span style="color: #333333; font-size: 15px; font-weight: 500;">${safeGuestName}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e8e8e8;">
              <span style="color: #666666; font-size: 14px; font-weight: 600;">Accommodation</span>
            </td>
            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #e8e8e8;">
              <span style="color: #333333; font-size: 15px; font-weight: 500;">${safeListingTitle}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e8e8e8;">
              <span style="color: #666666; font-size: 14px; font-weight: 600;">Requested Check-in</span>
            </td>
            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #e8e8e8;">
              <span style="color: #333333; font-size: 15px; font-weight: 500;">${safeCheckIn}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e8e8e8;">
              <span style="color: #666666; font-size: 14px; font-weight: 600;">Requested Check-out</span>
            </td>
            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #e8e8e8;">
              <span style="color: #333333; font-size: 15px; font-weight: 500;">${safeCheckOut}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e8e8e8;">
              <span style="color: #666666; font-size: 14px; font-weight: 600;">Number of Guests</span>
            </td>
            <td style="padding: 12px 0; text-align: right; border-bottom: 1px solid #e8e8e8;">
              <span style="color: #333333; font-size: 15px; font-weight: 500;">${safeGuests}</span>
            </td>
          </tr>
          ${safeLocation ? `
          <tr>
            <td style="padding: 12px 0;">
              <span style="color: #666666; font-size: 14px; font-weight: 600;">Location</span>
            </td>
            <td style="padding: 12px 0; text-align: right;">
              <span style="color: #333333; font-size: 15px; font-weight: 500;">${safeLocation}</span>
            </td>
          </tr>
          ` : ''}
        </table>
      </div>

      <p style="margin: 32px 0 0 0; font-size: 15px; line-height: 1.7; color: #333333;">
        We understand this may be disappointing, and we sincerely apologize for any inconvenience this may cause. We would be happy to assist you in finding alternative dates or accommodations that may better suit your needs.
      </p>
      <p style="margin: 16px 0 0 0; font-size: 15px; line-height: 1.7; color: #333333;">
        Please feel free to contact us if you have any questions or would like to explore other options. Our dedicated team is available 24/7 to assist you.
      </p>
      <p style="margin: 16px 0 0 0; font-size: 15px; line-height: 1.7; color: #333333;">
        We hope to have the opportunity to serve you in the future.
      </p>
      <p style="margin: 16px 0 0 0; font-size: 15px; line-height: 1.7; color: #333333;">
        Warm regards,<br>
        <strong style="color: #d4af37;">The ${safeBrand} Team</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #2c2c2c; padding: 32px; text-align: center; color: #ffffff;">
      <div style="margin-bottom: 16px;">
        <span style="font-size: 24px; font-weight: 700; color: #d4af37; letter-spacing: 1px;">${safeBrand}</span>
      </div>
      <div style="height: 1px; width: 60px; background-color: #d4af37; margin: 16px auto;"></div>
      <p style="margin: 16px 0 8px 0; font-size: 13px; color: #cccccc; line-height: 1.6;">
        This notification was sent to <strong style="color: #d4af37;">${guestEmail || 'your email'}</strong>
      </p>
      <p style="margin: 0; font-size: 12px; color: #999999; line-height: 1.6;">
        © 2024 ${safeBrand}. All rights reserved.<br>
        Premium Accommodations · Exceptional Service
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

export default {
  buildOtpEmailTemplate,
  buildBookingConfirmationTemplate,
  buildCancellationConfirmationTemplate,
  buildBookingDeclinedTemplate,
};

