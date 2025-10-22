import React from 'react';
import BackToHome from '../components/BackToHome';
import { useEffect } from 'react';

function HelpCenter() {

  useEffect(() => {
          document.title = "Guest Dashboard - StayHub";
        }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f6f1] via-[#e9e7e1] to-[#d1cfc7] py-16 px-4 sm:px-6 lg:px-8">
      <BackToHome />
      <div className="max-w-4xl mx-auto bg-white/80 rounded-2xl shadow-xl p-8">
        <h1 className="text-4xl font-bold text-[#2d3a4e] mb-8 text-center">Help Center</h1>

        {/* Quick Help Section */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-[#bfa14a] mb-6">Common Questions</h2>
          <div className="space-y-6">
            <details className="bg-white/50 rounded-lg p-4 shadow">
              <summary className="font-semibold text-[#2d3a4e] cursor-pointer">How do I make a booking?</summary>
              <div className="mt-4 pl-4 text-gray-700">
                <ol className="list-decimal space-y-2">
                  <li>Search for your desired location and dates</li>
                  <li>Browse available properties and select one</li>
                  <li>Review property details and pricing</li>
                  <li>Click "Book Now" and follow the payment process</li>
                  <li>Wait for host confirmation</li>
                </ol>
              </div>
            </details>

            <details className="bg-white/50 rounded-lg p-4 shadow">
              <summary className="font-semibold text-[#2d3a4e] cursor-pointer">How do I cancel a booking?</summary>
              <div className="mt-4 pl-4 text-gray-700">
                <p>To cancel a booking:</p>
                <ol className="list-decimal space-y-2 mt-2">
                  <li>Go to "My Bookings" in your account</li>
                  <li>Select the booking you wish to cancel</li>
                  <li>Click "Cancel Booking"</li>
                  <li>Review cancellation policy and confirm</li>
                </ol>
                <p className="mt-2 text-sm text-red-600">Note: Refund amount depends on the property's cancellation policy.</p>
              </div>
            </details>

            <details className="bg-white/50 rounded-lg p-4 shadow">
              <summary className="font-semibold text-[#2d3a4e] cursor-pointer">How do I become a host?</summary>
              <div className="mt-4 pl-4 text-gray-700">
                <ol className="list-decimal space-y-2">
                  <li>Register an account</li>
                  <li>Select "Become a Host" option</li>
                  <li>Complete your profile verification</li>
                  <li>Add your property details and photos</li>
                  <li>Set your pricing and availability</li>
                  <li>Submit for review</li>
                </ol>
              </div>
            </details>
          </div>
        </section>

        {/* Support Channels */}
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-[#bfa14a] mb-6">Contact Support</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/50 p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold text-[#2d3a4e] mb-2">Email Support</h3>
              <p className="text-gray-700 mb-4">24/7 response within 24 hours</p>
              <a href="mailto:support@bookingsystem.com" className="text-[#bfa14a] hover:underline">
                support@bookingsystem.com
              </a>
            </div>
            <div className="bg-white/50 p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold text-[#2d3a4e] mb-2">Phone Support</h3>
              <p className="text-gray-700 mb-4">Available Mon-Fri, 9AM-6PM</p>
              <a href="tel:+1234567890" className="text-[#bfa14a] hover:underline">
                +1 (234) 567-890
              </a>
            </div>
          </div>
        </section>

        {/* Emergency Support */}
        <section>
          <h2 className="text-2xl font-semibold text-[#bfa14a] mb-4">Emergency Support</h2>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-red-700 mb-2">24/7 Emergency Hotline</h3>
            <p className="text-gray-700 mb-4">
              For urgent situations requiring immediate assistance during your stay.
            </p>
            <a href="tel:+1234567899" className="text-red-700 font-bold hover:underline">
              Emergency: +1 (234) 567-899
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

export default HelpCenter;