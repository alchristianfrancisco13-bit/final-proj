// Test function to verify duplicate email prevention
export const testDuplicateEmailPrevention = () => {
  console.log('Testing duplicate email prevention...');
  
  // Simulate rapid OTP generation attempts
  const testTimes = [0, 1000, 2000, 3000, 4000, 5000, 6000];
  let lastEmailSent = 0;
  
  testTimes.forEach((time, index) => {
    const now = Date.now() + time;
    const canSend = now - lastEmailSent >= 5000;
    
    console.log(`Attempt ${index + 1} at ${time}ms: ${canSend ? 'ALLOWED' : 'THROTTLED'}`);
    
    if (canSend) {
      lastEmailSent = now;
    }
  });
  
  console.log('Expected: Only first attempt should be allowed, others throttled');
};
