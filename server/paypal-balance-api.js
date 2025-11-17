/**
 * PayPal Balance API Server Endpoint
 * 
 * This is an example server-side endpoint to fetch PayPal account balance.
 * You need to set up a Node.js/Express server to use this.
 * 
 * Installation:
 * npm install express cors axios
 * 
 * Usage:
 * 1. Create a server.js file
 * 2. Copy this code
 * 3. Set up environment variables for PayPal credentials
 * 4. Run: node server.js
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// PayPal Sandbox API Configuration
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'AX2UMlePiqsjclhBUK-_wsmwqERwuz7q95ishOYV5ndtBTQvpTRlIN8yAhLAZWv99GWvEjLbuzfZNKd4';
const PAYPAL_SECRET = process.env.PAYPAL_SECRET || 'EFHTAxrdIcLlvSA3a368L09iP4YdWG4RHU6WoFwtWhsKSO3A_qe2Virs5SRKwHWft081hYCJd8bbi8HU';
const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || 'https://api.sandbox.paypal.com';

/**
 * Get PayPal OAuth Access Token
 */
async function getPayPalAccessToken() {
  try {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
    
    const response = await axios.post(
      `${PAYPAL_API_BASE}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting PayPal access token:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get PayPal Account Balance
 * Note: This requires the account to have granted permission via OAuth
 * For Sandbox testing, you may need to use a different approach
 */
async function getPayPalBalance(accessToken, email) {
  try {
    // Note: PayPal REST API doesn't directly provide account balance for personal accounts
    // You would need to use PayPal Identity API or Payouts API
    // This is a simplified example - you may need to adjust based on your use case
    
    // Option 1: If you have a business account, you can use the Payouts API
    // Option 2: Use PayPal Identity API to get user info (requires OAuth consent)
    // Option 3: Track balance via webhooks when transactions occur
    
    // For now, this is a placeholder that returns the balance from your database
    // You would need to implement the actual PayPal API call based on your account type
    
    console.log('Fetching balance for:', email);
    
    // Example: If using PayPal Identity API (requires user OAuth)
    // const response = await axios.get(
    //   `${PAYPAL_API_BASE}/v1/identity/oauth2/userinfo?schema=paypalv1.1`,
    //   {
    //     headers: {
    //       'Authorization': `Bearer ${accessToken}`,
    //       'Content-Type': 'application/json'
    //     }
    //   }
    // );
    
    // For Sandbox testing, you might want to:
    // 1. Use PayPal webhooks to track balance changes
    // 2. Store balance in your database when transactions occur
    // 3. Return the stored balance from your database
    
    // Placeholder response
    return {
      balance: 0, // Replace with actual balance from PayPal or your database
      currency: 'USD'
    };
  } catch (error) {
    console.error('Error getting PayPal balance:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * POST /api/paypal/get-balance
 * Endpoint to get PayPal account balance
 */
app.post('/api/paypal/get-balance', async (req, res) => {
  try {
    const { userId, email } = req.body;
    
    if (!userId || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId and email' 
      });
    }
    
    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();
    
    // Get balance (this is a placeholder - implement based on your needs)
    const balanceData = await getPayPalBalance(accessToken, email);
    
    res.json({
      success: true,
      balance: balanceData.balance,
      currency: balanceData.currency || 'USD'
    });
  } catch (error) {
    console.error('Error in /api/paypal/get-balance:', error);
    res.status(500).json({ 
      error: 'Failed to fetch PayPal balance',
      message: error.message 
    });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`PayPal Balance API server running on port ${PORT}`);
  console.log(`Endpoint: http://localhost:${PORT}/api/paypal/get-balance`);
});

module.exports = app;

