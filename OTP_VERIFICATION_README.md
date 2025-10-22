# OTP Verification System

This system implements email-based OTP (One-Time Password) verification for user registration using EmailJS and Firebase Firestore.

## Features

- **Email OTP Verification**: Users receive a 6-digit OTP via email before completing registration
- **Firestore Integration**: OTP data is stored and managed in Firebase Firestore
- **Expiration Handling**: OTPs expire after 15 minutes for security
- **Resend Functionality**: Users can request a new OTP if needed
- **Real-time Timer**: Shows countdown timer for OTP expiration

## Configuration

The system uses the following EmailJS credentials:
- **Service ID**: `service_123`
- **Template ID**: `template_xaxp5pe`
- **Public Key**: `fjZyn4MuFbAAE6L7T`

### EmailJS Template Variables
The template uses the following variables that are automatically populated:
- `{{to_email}}` - Recipient's email address
- `{{passcode}}` - 6-digit OTP code
- `{{time}}` - Formatted expiry time (15 minutes from generation)

### Email Configuration (from EmailJS dashboard)
- **From Name**: "staynest"
- **From Email**: Uses default email address
- **Reply To**: "alchristianfrancisco13@gmail.com"
- **Subject**: "OTP AUTHENTICATION"

## Flow

1. **Registration Form**: User enters email, password, and role
2. **Form Validation**: Basic validation checks (email format, password length)
3. **OTP Generation**: 6-digit random OTP is generated
4. **Email Sending**: OTP is sent via EmailJS to user's email
5. **Firestore Storage**: OTP data is saved to Firestore with expiration
6. **OTP Verification**: User enters OTP received via email
7. **Verification Check**: System validates OTP against Firestore data
8. **Account Creation**: Firebase Auth account is created after successful verification
9. **User Data Storage**: User profile is saved to Firestore with verification status

## Firestore Collections

### `otp_verifications`
- **Document ID**: User's email address
- **Fields**:
  - `email`: User's email address
  - `otp`: 6-digit verification code
  - `role`: Selected user role (guest/host/admin)
  - `createdAt`: Timestamp when OTP was created
  - `expiresAt`: Timestamp when OTP expires (15 minutes)
  - `verified`: Boolean indicating if OTP was verified
  - `verifiedAt`: Timestamp when OTP was verified
  - `completed`: Boolean indicating if registration was completed
  - `completedAt`: Timestamp when registration was completed

### `users`
- **Document ID**: Firebase Auth UID
- **Fields**:
  - `email`: User's email address
  - `role`: User role (guest/host/admin)
  - `createdAt`: Account creation timestamp
  - `emailVerified`: Boolean indicating email was verified via OTP
  - `otpVerifiedAt`: Timestamp when OTP was verified

## Security Features

- **OTP Expiration**: OTPs automatically expire after 15 minutes
- **Single Use**: Each OTP can only be used once
- **Email Validation**: Only verified email addresses can complete registration
- **Rate Limiting**: Built-in timer prevents spam resend requests

## Components

- **Register.js**: Main registration form with OTP flow integration
- **OTPVerification.js**: OTP input and verification component
- **config.js**: Centralized configuration for EmailJS and OTP settings

## Usage

1. Navigate to `/register`
2. Fill in email, password, and select role
3. Click "Send Verification Code"
4. Check email for 6-digit OTP
5. Enter OTP in verification screen
6. Click "Verify Email" to complete registration
7. User is redirected to appropriate dashboard based on role
