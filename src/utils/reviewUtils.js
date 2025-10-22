// Utility functions for handling reviews and ratings

// Convert a review object to a format safe for storage and display
export const convertReviewToSafeFormat = (reviewData) => {
  if (!reviewData) return null;
  
  return {
    ratingValue: Number(reviewData.rating) || 0,
    reviewText: String(reviewData.review || ''),
    guestName: String(reviewData.guestName || ''),
    guestAvatar: String(reviewData.guestAvatar || ''),
    date: String(reviewData.date || new Date().toISOString()),
    bookingId: String(reviewData.bookingId || ''),
  };
};

// Calculate average rating from review objects
export const calculateAverageRating = (reviews) => {
  if (!Array.isArray(reviews) || reviews.length === 0) return 0;
  
  const total = reviews.reduce((sum, review) => {
    return sum + (Number(review.ratingValue) || 0);
  }, 0);
  
  return Number((total / reviews.length).toFixed(1));
};

// Format rating for display
export const formatRatingForDisplay = (ratingValue) => {
  if (typeof ratingValue === 'number') {
    return ratingValue.toFixed(1);
  }
  return 'New';
};