import React from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';

function BackToHome() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const handleBackToHome = () => {
    if (user) {
      // Get user role from local storage since we're not using context
      const isGuest = localStorage.getItem('guestProfile');
      const isHost = localStorage.getItem('hostProfile');
      const isAdmin = localStorage.getItem('adminProfile');

      if (isGuest) navigate('/guest');
      else if (isHost) navigate('/host');
      else if (isAdmin) navigate('/admin');
      else navigate('/');
    } else {
      navigate('/');
    }
  };

  return (
    <button
      onClick={handleBackToHome}
      className="fixed top-4 left-4 bg-gradient-to-r from-[#bfa14a] to-[#2d3a4e] text-white px-6 py-2 rounded-lg shadow-md hover:from-[#cbb76b] hover:to-[#1e2533] transition-all duration-200 flex items-center gap-2"
    >
      <svg 
        className="w-5 h-5" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M10 19l-7-7m0 0l7-7m-7 7h18" 
        />
      </svg>
      Back to Home
    </button>
  );
}

export default BackToHome;