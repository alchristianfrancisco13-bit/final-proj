// Test function to verify EmailJS template variables
export const testEmailJSTemplate = () => {
  const testOTP = "123456";
  const testEmail = "test@example.com";
  
  // Calculate expiry time (15 minutes from now)
  const expiryTime = new Date(Date.now() + 15 * 60 * 1000);
  const formattedTime = expiryTime.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  const templateParams = {
    to_email: testEmail,
    passcode: testOTP,
    time: formattedTime,
    user_email: testEmail,
  };

  console.log('EmailJS Template Parameters:', templateParams);
  console.log('Expected template variables:');
  console.log('- {{to_email}}:', templateParams.to_email);
  console.log('- {{passcode}}:', templateParams.passcode);
  console.log('- {{time}}:', templateParams.time);
  
  return templateParams;
};
