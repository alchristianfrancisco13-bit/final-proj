import React from 'react';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="bg-[#2d3a4e] text-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-[#bfa14a]">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="hover:text-[#bfa14a] transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/help" className="hover:text-[#bfa14a] transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-[#bfa14a] transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-[#bfa14a] transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-[#bfa14a]">Contact</h3>
            <ul className="space-y-2">
              <li>Email: support@stayhub.com</li>
              <li>Phone: +1 (234) 567-890</li>
              <li>Address: 123 StayHub Street</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-[#bfa14a]">Follow Us</h3>
            <div className="flex space-x-6">
              <a href="#" className="hover:text-[#bfa14a] transition-colors text-2xl" title="Facebook">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.77,7.46H14.5V5.9c0-.86.72-1.58,1.58-1.58h2.7V0H14.5C11.14,0,8.45,2.69,8.45,6.03v1.43H5.5v4.01h3v11.54h6V11.47h3.28L18.77,7.46z"/>
                </svg>
              </a>
              <a href="#" className="hover:text-[#bfa14a] transition-colors text-2xl" title="X (Twitter)">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="#" className="hover:text-[#bfa14a] transition-colors text-2xl" title="Instagram">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-[#bfa14a]">Newsletter</h3>
            <p className="mb-4 text-sm">Subscribe for updates and special offers</p>
            <div className="flex">
              <input
                type="email"
                placeholder="Enter your email"
                className="px-3 py-2 bg-white text-gray-800 rounded-l-lg focus:outline-none flex-1"
              />
              <button className="bg-[#bfa14a] text-white px-4 py-2 rounded-r-lg hover:bg-[#a88d3d] transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              {/* Links */}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;