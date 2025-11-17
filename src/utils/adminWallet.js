import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    addDoc,
    query,
    orderBy,
    limit,
    where,
    getDocs,
    serverTimestamp,
    increment,
    runTransaction
} from "firebase/firestore";
import { db } from "../firebase";
import { PAYPAL_CONFIG } from "../config";

// Admin wallet ID (consistent with current system)
const ADMIN_WALLET_ID = "earnings";

// PayPal fee configuration
const PAYPAL_FEE_CONFIG = {
    defaultFeePercentage: 3.4, // 3.4% PayPal fee
    defaultFixedFee: 15 // ₱15 fixed fee (PHP)
};

// Initialize admin wallet (compatible with current system)
export async function initializeAdminWallet() {
    try {
        const adminWalletRef = doc(db, "adminWallet", ADMIN_WALLET_ID);
        const adminWalletDoc = await getDoc(adminWalletRef);
        
        if (!adminWalletDoc.exists()) {
            // Create new admin wallet with all fields
            await setDoc(adminWalletRef, {
                balance: 0,
                totalEarnings: 0,
                totalNetRevenue: 0,
                totalPayPalFees: 0,
                totalFees: 0,
                totalCashOuts: 0,
                paypalBalance: 0,
                paypalEmail: "gabennewell79@gmail.com",
                currency: "PHP",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                isActive: true
            });
        } else {
            // Migrate existing wallet to include new fields if they don't exist
            const data = adminWalletDoc.data();
            const needsUpdate = !data.hasOwnProperty('totalNetRevenue') || 
                               !data.hasOwnProperty('totalPayPalFees') ||
                               !data.hasOwnProperty('totalCashOuts');
            
            if (needsUpdate) {
                await updateDoc(adminWalletRef, {
                    totalNetRevenue: data.totalNetRevenue || 0,
                    totalPayPalFees: data.totalPayPalFees || 0,
                    totalCashOuts: data.totalCashOuts || 0,
                    updatedAt: serverTimestamp()
                });
            }
        }
        
        return { success: true };
    } catch (error) {
        console.error("Error initializing admin wallet:", error);
        return { success: false, error: error.message };
    }
}

// Get admin wallet data
export async function getAdminWallet() {
    try {
        const adminWalletRef = doc(db, "adminWallet", ADMIN_WALLET_ID);
        const adminWalletDoc = await getDoc(adminWalletRef);
        
        if (!adminWalletDoc.exists()) {
            await initializeAdminWallet();
            return {
                balance: 0,
                totalEarnings: 0,
                totalNetRevenue: 0,
                totalPayPalFees: 0,
                totalFees: 0,
                totalCashOuts: 0,
                paypalBalance: 0,
                currency: "PHP"
            };
        }
        
        const data = adminWalletDoc.data();
        return {
            balance: data.balance || 0,
            totalEarnings: data.totalEarnings || 0,
            totalNetRevenue: data.totalNetRevenue || 0,
            totalPayPalFees: data.totalPayPalFees || 0,
            totalFees: data.totalFees || 0,
            totalCashOuts: data.totalCashOuts || 0,
            paypalBalance: data.paypalBalance || 0,
            paypalEmail: data.paypalEmail || "gabennewell79@gmail.com",
            currency: data.currency || "PHP",
            isActive: data.isActive !== false
        };
    } catch (error) {
        console.error("Error getting admin wallet:", error);
        return { 
            balance: 0, 
            totalEarnings: 0, 
            totalNetRevenue: 0, 
            totalPayPalFees: 0, 
            totalFees: 0, 
            totalCashOuts: 0,
            paypalBalance: 0,
            currency: "PHP", 
            error: error.message 
        };
    }
}

// Calculate PayPal fees for transactions
export function calculatePayPalFees(amount) {
    if (!amount || amount <= 0) {
        return {
            grossAmount: 0,
            paypalFee: 0,
            netAmount: 0
        };
    }
    
    const grossAmount = parseFloat(amount);
    // Convert PHP to USD for PayPal fee calculation (PayPal uses USD)
    const amountUSD = grossAmount / 56; // Assuming 56 PHP = 1 USD
    
    // Calculate PayPal fee: percentage + fixed fee (in USD)
    const percentageFee = (amountUSD * PAYPAL_FEE_CONFIG.defaultFeePercentage) / 100;
    const fixedFeeUSD = PAYPAL_FEE_CONFIG.defaultFixedFee / 56; // Convert fixed fee to USD
    const totalPayPalFeeUSD = percentageFee + fixedFeeUSD;
    
    // Convert back to PHP
    const totalPayPalFee = totalPayPalFeeUSD * 56;
    const netAmount = grossAmount - totalPayPalFee;
    
    return {
        grossAmount: grossAmount,
        paypalFee: parseFloat(totalPayPalFee.toFixed(2)),
        netAmount: parseFloat(Math.max(0, netAmount).toFixed(2)),
        feePercentage: PAYPAL_FEE_CONFIG.defaultFeePercentage,
        fixedFee: PAYPAL_FEE_CONFIG.defaultFixedFee
    };
}

// Process admin fee from booking payments
export async function processBookingAdminFee(amount, description, metadata = {}) {
    try {
        // Ensure admin wallet exists
        await initializeAdminWallet();
        
        console.log('=== BOOKING ADMIN FEE PROCESSING ===');
        console.log(`Service fee amount: ₱${amount}`);
        console.log('==================================');
        
        // Create admin transaction record
        const adminTransactionRef = await addDoc(collection(db, "adminTransactions"), {
            type: "booking_admin_fee",
            amount: parseFloat(amount),
            description: description || `Booking admin fee - ₱${amount}`,
            status: "completed",
            createdAt: serverTimestamp(),
            currency: "PHP",
            metadata: {
                ...metadata,
                feeType: 'booking_admin_fee'
            }
        });
        
        // Update admin wallet balance
        const adminWalletRef = doc(db, "adminWallet", ADMIN_WALLET_ID);
        await updateDoc(adminWalletRef, {
            balance: increment(parseFloat(amount)),
            totalEarnings: increment(parseFloat(amount)),
            totalFees: increment(parseFloat(amount)),
            updatedAt: serverTimestamp()
        });
        
        return {
            success: true,
            transactionId: adminTransactionRef.id,
            amount: parseFloat(amount)
        };
    } catch (error) {
        console.error("Error processing booking admin fee:", error);
        return { success: false, error: error.message };
    }
}

// Track admin revenue from user cash-in (for analytics)
export async function trackCashInRevenue(userCashInAmount, userTransactionId, userId) {
    try {
        // Calculate PayPal fees for tracking purposes
        const paypalFeeCalculation = calculatePayPalFees(userCashInAmount);
        
        console.log('=== ADMIN CASH-IN TRACKING ===');
        console.log(`User paid: ₱${userCashInAmount}`);
        console.log(`User credited: ₱${userCashInAmount} (full amount)`);
        console.log(`PayPal fees: ₱${paypalFeeCalculation.paypalFee}`);
        console.log('=============================');
        
        // Create tracking record
        const adminTransactionRef = await addDoc(collection(db, "adminTransactions"), {
            type: "cash_in_tracking",
            amount: userCashInAmount,
            feeAmount: 0,
            paypalFeeAmount: paypalFeeCalculation.paypalFee,
            sourceTransactionId: userTransactionId,
            sourceUserId: userId,
            description: `Cash-in tracking - ₱${userCashInAmount}`,
            status: "completed",
            createdAt: serverTimestamp(),
            currency: "PHP",
            metadata: {
                originalAmount: userCashInAmount,
                paypalFeePercentage: paypalFeeCalculation.feePercentage,
                paypalFixedFee: paypalFeeCalculation.fixedFee,
                paypalTotalFee: paypalFeeCalculation.paypalFee
            }
        });
        
        // Track revenue in admin wallet
        const adminWalletRef = doc(db, "adminWallet", ADMIN_WALLET_ID);
        await updateDoc(adminWalletRef, {
            totalEarnings: increment(userCashInAmount),
            totalPayPalFees: increment(paypalFeeCalculation.paypalFee),
            totalNetRevenue: increment(paypalFeeCalculation.netAmount),
            updatedAt: serverTimestamp()
        });
        
        return {
            success: true,
            paypalNetAmount: paypalFeeCalculation.netAmount,
            paypalFeeAmount: paypalFeeCalculation.paypalFee,
            adminTransactionId: adminTransactionRef.id
        };
    } catch (error) {
        console.error("Error tracking cash-in revenue:", error);
        return { success: false, error: error.message };
    }
}

// Get admin transaction history with pagination
export async function getAdminTransactionHistory(page = 1, limitCount = 10) {
    try {
        const transactionsRef = collection(db, "adminTransactions");
        const q = query(
            transactionsRef,
            orderBy("createdAt", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        const allTransactions = [];
        
        querySnapshot.forEach((doc) => {
            allTransactions.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Calculate pagination
        const totalTransactions = allTransactions.length;
        const totalPages = Math.ceil(totalTransactions / limitCount);
        const startIndex = (page - 1) * limitCount;
        const endIndex = startIndex + limitCount;
        const transactions = allTransactions.slice(startIndex, endIndex);
        
        return {
            success: true,
            transactions,
            pagination: {
                currentPage: page,
                totalPages,
                totalTransactions,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            },
            allTransactions
        };
    } catch (error) {
        console.error("Error getting admin transaction history:", error);
        return {
            success: false,
            error: error.message,
            transactions: [],
            allTransactions: [],
            pagination: {
                currentPage: page,
                totalPages: 0,
                totalTransactions: 0,
                hasNextPage: false,
                hasPrevPage: false
            }
        };
    }
}

// Get comprehensive admin analytics
export async function getAdminAnalytics() {
    try {
        const adminWallet = await getAdminWallet();
        
        // Get transaction counts
        const transactionsRef = collection(db, "adminTransactions");
        
        // Get booking admin fee count
        const bookingFeeQuery = query(transactionsRef, where("type", "==", "booking_admin_fee"));
        const bookingFeeSnapshot = await getDocs(bookingFeeQuery);
        
        // Get cash-in tracking count
        const cashInQuery = query(transactionsRef, where("type", "==", "cash_in_tracking"));
        const cashInSnapshot = await getDocs(cashInQuery);
        
        // Get withdrawal count
        const withdrawalQuery = query(transactionsRef, where("type", "==", "withdrawal"));
        const withdrawalSnapshot = await getDocs(withdrawalQuery);
        
        // Get recent transactions for trend analysis
        const recentQuery = query(
            transactionsRef,
            orderBy("createdAt", "desc"),
            limit(30)
        );
        const recentSnapshot = await getDocs(recentQuery);
        
        let recentBookingRevenue = 0;
        let recentCashInVolume = 0;
        let recentWithdrawals = 0;
        
        recentSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.type === "booking_admin_fee") {
                recentBookingRevenue += data.amount || 0;
            } else if (data.type === "cash_in_tracking") {
                recentCashInVolume += data.amount || 0;
            } else if (data.type === "withdrawal") {
                recentWithdrawals += Math.abs(data.amount || 0);
            }
        });
        
        return {
            success: true,
            analytics: {
                // Wallet balances
                currentBalance: adminWallet.balance,
                totalEarnings: adminWallet.totalEarnings,
                totalNetRevenue: adminWallet.totalNetRevenue,
                totalPayPalFees: adminWallet.totalPayPalFees,
                totalFees: adminWallet.totalFees,
                totalCashOuts: adminWallet.totalCashOuts,
                paypalBalance: adminWallet.paypalBalance,
                
                // Transaction counts
                bookingFeeTransactionCount: bookingFeeSnapshot.size,
                cashInTransactionCount: cashInSnapshot.size,
                withdrawalCount: withdrawalSnapshot.size,
                
                // Recent activity (30 days)
                recentBookingRevenue30Days: recentBookingRevenue,
                recentCashInVolume30Days: recentCashInVolume,
                recentWithdrawals30Days: recentWithdrawals,
                
                // Account information
                paypalEmail: adminWallet.paypalEmail,
                
                // Financial summary
                netProfit: adminWallet.totalFees,
                paypalFeeImpact: adminWallet.totalPayPalFees,
                platformRevenue: adminWallet.totalFees
            }
        };
    } catch (error) {
        console.error("Error getting admin analytics:", error);
        return { success: false, error: error.message };
    }
}

// Get fee structure
export function getFeeStructure() {
    return {
        paypalFeePercentage: PAYPAL_FEE_CONFIG.defaultFeePercentage,
        paypalFixedFee: PAYPAL_FEE_CONFIG.defaultFixedFee,
        currency: "PHP"
    };
}

