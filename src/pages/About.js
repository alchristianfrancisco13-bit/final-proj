import React from 'react';
import BackToHome from '../components/BackToHome';
import { useEffect } from 'react';

function About() {

    useEffect(() => {
        document.title = "Guest Dashboard - StayHub";
      }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f6f1] via-[#e9e7e1] to-[#d1cfc7] py-16 px-4 sm:px-6 lg:px-8">
      <BackToHome />
      <div className="max-w-4xl mx-auto bg-white/80 rounded-2xl shadow-xl p-8">
        <h1 className="text-4xl font-bold text-[#2d3a4e] mb-8 text-center">About Our Booking System</h1>
        
        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-[#bfa14a] mb-4">Our Story</h2>
          <p className="text-gray-700 mb-4">
            Founded in 2023, our booking system has revolutionized the way people find and book their perfect accommodations. 
            We believe in creating seamless connections between hosts and guests, making the booking process as smooth as possible.
          </p>
          <p className="text-gray-700">
            Our platform serves thousands of users across the country, facilitating memorable stays and extraordinary experiences.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-[#bfa14a] mb-4">Our Mission</h2>
          <p className="text-gray-700">
            We are committed to providing a reliable, secure, and user-friendly platform that connects property owners with guests 
            seeking quality accommodations. Our goal is to make the booking process transparent, efficient, and enjoyable for everyone involved.
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-2xl font-semibold text-[#bfa14a] mb-4">What Sets Us Apart</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/50 p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold text-[#2d3a4e] mb-2">Secure Platform</h3>
              <p className="text-gray-700">State-of-the-art security measures to protect your data and transactions.</p>
            </div>
            <div className="bg-white/50 p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold text-[#2d3a4e] mb-2">User-Friendly</h3>
              <p className="text-gray-700">Intuitive interface designed for seamless booking experience.</p>
            </div>
            <div className="bg-white/50 p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold text-[#2d3a4e] mb-2">24/7 Support</h3>
              <p className="text-gray-700">Round-the-clock assistance for hosts and guests.</p>
            </div>
            <div className="bg-white/50 p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold text-[#2d3a4e] mb-2">Verified Listings</h3>
              <p className="text-gray-700">Quality assurance for all property listings.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[#bfa14a] mb-4">Contact Us</h2>
          <p className="text-gray-700">
            Have questions or feedback? We'd love to hear from you. Reach out to our support team at 
            <a href="mailto:support@bookingsystem.com" className="text-[#bfa14a] hover:underline ml-1">
              support@bookingsystem.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}

export default About;