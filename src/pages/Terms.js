import React from 'react';
import BackToHome from '../components/BackToHome';
import { useEffect } from 'react';

function Terms() {

  useEffect(() => {
          document.title = "Guest Dashboard - StayHub";
        }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f6f1] via-[#e9e7e1] to-[#d1cfc7] py-16 px-4 sm:px-6 lg:px-8">
      <BackToHome />
      <div className="max-w-4xl mx-auto bg-white/80 rounded-2xl shadow-xl p-8">
        <h1 className="text-4xl font-bold text-[#2d3a4e] mb-8 text-center">Terms and Conditions</h1>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-[#bfa14a] mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700">
              By accessing and using this booking system, you accept and agree to be bound by the terms and provision of this agreement. 
              Additionally, when using this platform's services, you shall be subject to any posted guidelines or rules applicable to such services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#bfa14a] mb-4">2. User Accounts</h2>
            <div className="space-y-4">
              <p className="text-gray-700">
                To use certain features of the platform, you must register for an account. You agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Provide accurate and complete information</li>
                <li>Maintain and update your account information</li>
                <li>Maintain the security of your account</li>
                <li>Accept responsibility for all activities that occur under your account</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#bfa14a] mb-4">3. Booking and Cancellation</h2>
            <div className="space-y-4">
              <p className="text-gray-700">
                All bookings are subject to availability and confirmation. Cancellation policies vary by property and are clearly displayed before booking.
              </p>
              <h3 className="text-xl font-semibold text-[#2d3a4e]">3.1 Booking Process</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Bookings are confirmed only after payment is processed</li>
                <li>Property details and pricing are subject to change</li>
                <li>Special requests are not guaranteed</li>
              </ul>
              <h3 className="text-xl font-semibold text-[#2d3a4e]">3.2 Cancellations</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Refund amounts depend on the property's cancellation policy</li>
                <li>Cancellation must be made through the platform</li>
                <li>Force majeure conditions may affect cancellation terms</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#bfa14a] mb-4">4. Payment Terms</h2>
            <div className="space-y-4">
              <p className="text-gray-700">
                All payments are processed securely through our platform. We accept various payment methods including credit cards and PayPal.
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>All prices are displayed in the selected currency</li>
                <li>Additional fees may apply (cleaning, service fees, etc.)</li>
                <li>Payment information is encrypted and securely stored</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#bfa14a] mb-4">5. User Conduct</h2>
            <p className="text-gray-700">
              Users agree not to engage in any activities that:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-4">
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe on others' rights</li>
              <li>Interfere with the platform's operation</li>
              <li>Contain false or misleading information</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#bfa14a] mb-4">6. Liability Limitations</h2>
            <p className="text-gray-700">
              The platform shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mt-4">
              <li>Use or inability to use the service</li>
              <li>Unauthorized access to user data</li>
              <li>Statements or conduct of third parties</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[#bfa14a] mb-4">7. Contact Information</h2>
            <p className="text-gray-700">
              For questions about these terms, please contact us at:{" "}
              <a href="mailto:legal@bookingsystem.com" className="text-[#bfa14a] hover:underline">
                legal@bookingsystem.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-8 text-sm text-gray-600">
          <p>Last updated: October 7, 2025</p>
        </div>
      </div>
    </div>
  );
}

export default Terms;