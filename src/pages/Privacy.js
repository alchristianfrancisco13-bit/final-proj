import React from 'react';
import BackToHome from '../components/BackToHome';
import { useEffect } from 'react';

function Privacy() {

  useEffect(() => {
          document.title = "Guest Dashboard - StayHub";
        }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f6f1] via-[#e9e7e1] to-[#d1cfc7] py-16 px-4 sm:px-6 lg:px-8">
      <BackToHome />
      <div className="max-w-4xl mx-auto bg-white/80 rounded-2xl shadow-xl p-8">
        <h1 className="text-4xl font-bold text-[#2d3a4e] mb-8 text-center">Privacy Policy</h1>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-[#bfa14a] mb-4">1. Information We Collect</h2>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-[#2d3a4e]">1.1 Personal Information</h3>
              <p className="text-gray-700">We collect information that you provide directly to us, including:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Name and contact information</li>
                <li>Payment information</li>
                <li>Communication preferences</li>
                <li>Profile information</li>
                <li>Booking history</li>
              </ul>

              <h3 className="text-xl font-semibold text-[#2d3a4e]">1.2 Automatically Collected Information</h3>
              <p className="text-gray-700">When you use our platform, we automatically collect:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Device information</li>
                <li>Log data</li>
                <li>Usage information</li>
                <li>Location data</li>
                <li>Cookies and similar technologies</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#bfa14a] mb-4">2. How We Use Your Information</h2>
            <p className="text-gray-700">We use the collected information to:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-4">
              <li>Process your bookings and payments</li>
              <li>Provide customer support</li>
              <li>Send notifications about your bookings</li>
              <li>Improve our services</li>
              <li>Ensure platform security</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#bfa14a] mb-4">3. Information Sharing</h2>
            <p className="text-gray-700">
              We may share your information with:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-4">
              <li>Property hosts (limited to booking-related information)</li>
              <li>Service providers who assist our operations</li>
              <li>Legal authorities when required by law</li>
            </ul>
            <p className="mt-4 text-gray-700">
              We never sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#bfa14a] mb-4">4. Data Security</h2>
            <p className="text-gray-700">
              We implement appropriate security measures to protect your information, including:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-4">
              <li>Encryption of sensitive data</li>
              <li>Regular security assessments</li>
              <li>Access controls and authentication</li>
              <li>Secure data storage</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#bfa14a] mb-4">5. Your Rights</h2>
            <p className="text-gray-700">You have the right to:</p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-4">
              <li>Access your personal information</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your information</li>
              <li>Object to processing of your information</li>
              <li>Withdraw consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#bfa14a] mb-4">6. Cookies</h2>
            <p className="text-gray-700">
              We use cookies and similar tracking technologies to:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-4">
              <li>Remember your preferences</li>
              <li>Understand how you use our platform</li>
              <li>Improve our services</li>
              <li>Provide personalized experiences</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#bfa14a] mb-4">7. Contact Us</h2>
            <p className="text-gray-700">
              If you have questions about this Privacy Policy, please contact our Privacy Officer at:{" "}
              <a href="mailto:privacy@bookingsystem.com" className="text-[#bfa14a] hover:underline">
                privacy@bookingsystem.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-8 text-sm text-gray-600">
          <p>Last updated: October 7, 2025</p>
          <p className="mt-2">
            This privacy policy is subject to change. We will notify you of any changes by posting the new policy on this page.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Privacy;