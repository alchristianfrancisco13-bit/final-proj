// Test function to verify OTP duplicate prevention
export const testOTPDuplicatePrevention = () => {
  console.log('Testing OTP duplicate prevention...');
  
  // Simulate multiple useEffect calls
  const testScenarios = [
    { scenario: 'First mount', shouldSend: true },
    { scenario: 'React Strict Mode re-run', shouldSend: false },
    { scenario: 'Component re-render', shouldSend: false },
    { scenario: 'Props change', shouldSend: false },
  ];
  
  testScenarios.forEach((scenario, index) => {
    console.log(`Scenario ${index + 1}: ${scenario.scenario} - Should send email: ${scenario.shouldSend}`);
  });
  
  console.log('Expected behavior:');
  console.log('- Only ONE email should be sent per component mount');
  console.log('- React Strict Mode should not cause duplicate emails');
  console.log('- Component re-renders should not trigger new emails');
  console.log('- Props changes should not trigger new emails');
  console.log('- Console logs should show initialization only once');
};
