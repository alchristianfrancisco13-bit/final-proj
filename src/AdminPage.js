import { useState, useEffect } from "react";
import {FaMoneyBillWave,FaChartBar,FaGavel,FaFileAlt,FaCreditCard,FaSignOutAlt} from "react-icons/fa";
import adminlogo from "./adminlogo.webp";
// ✅ Toastify imports
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// ✅ DOCX + FileSaver imports
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
} from "docx";
import { saveAs } from "file-saver";
import { signOut } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, setDoc, getDoc, onSnapshot, collection, query, orderBy, limit } from "firebase/firestore";

function AdminPage({ onLogout }) {
  useEffect(() => {
    document.title = "Admin Dashboard - StayHub";
    // Load policy from Firestore
    const fetchPolicy = async () => {
      try {
        const docSnap = await getDoc(doc(db, "admin", "policy"));
        if (docSnap.exists()) {
          setPolicy(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching policy:", error);
      }
    };
    fetchPolicy();

    // Real-time listener for admin wallet
    const adminWalletRef = doc(db, "adminWallet", "earnings");
    const unsubWallet = onSnapshot(adminWalletRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setAdminWallet({
          balance: data.balance || 0,
          totalEarnings: data.totalEarnings || 0
        });
      }
    });

    // Real-time listener for admin transactions
    const transactionsRef = collection(db, "adminTransactions");
    const transactionsQuery = query(transactionsRef, orderBy("date", "desc"), limit(10));
    const unsubTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAdminTransactions(transactions);
    });

    return () => {
      unsubWallet();
      unsubTransactions();
    };
  }, []);

  // States
  const [serviceFee, setServiceFee] = useState(10);
  const [adminWallet, setAdminWallet] = useState({
    balance: 0,
    totalEarnings: 0
  });
  const [adminTransactions, setAdminTransactions] = useState([]);
  const [report, setReport] = useState("");
  const [payments, setPayments] = useState([
    { id: "P-001", user: "Juan Dela Cruz", amount: 2500, status: "Pending" },
    { id: "P-002", user: "Maria Santos", amount: 1800, status: "Pending" },
  ]);
  const [analytics, setAnalytics] = useState({
    bestReviews: 4.9,
    lowestReviews: 2.1,
    bookings: 120,
  });
  const [policy, setPolicy] = useState({
    cancellation: "24-hour free cancellation",
    rules: "No smoking, No pets",
    reports: "Monthly summary",
  });

  // Modal state for update policy
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyMessage, setPolicyMessage] = useState("");

  // Modal state for analytics
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);

  // Functions with toast + docx
  const handleSetServiceFee = () => {
    toast.info(`Service fee set to: ${serviceFee}%`, { position: "top-right" });
  };

  const handleGenerateReport = async () => {
    const now = new Date();
    const timestamp = now.toLocaleString();

    // Create payment rows for the table
    const paymentRows = payments.map(
      (p) =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(p.id)] }),
            new TableCell({ children: [new Paragraph(p.user)] }),
            new TableCell({ children: [new Paragraph(`₱${p.amount}`)] }),
            new TableCell({ children: [new Paragraph(p.status)] }),
          ],
        })
    );

    // Build the document
    const docx = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: report || "Monthly Report",
                  bold: true,
                  size: 28,
                }),
              ],
            }),
            new Paragraph({
              text: `Generated on: ${timestamp}`,
              italics: true,
              size: 20,
            }),
            new Paragraph(" "),
            new Paragraph("📊 Platform Report"),
            new Paragraph(`Total Bookings: ${analytics.bookings}`),
            new Paragraph(`Best Reviews: ${analytics.bestReviews}`),
            new Paragraph(`Lowest Reviews: ${analytics.lowestReviews}`),
            new Paragraph(" "),
            new Paragraph("📜 Policy Overview:"),
            new Paragraph(`- Cancellation: ${policy.cancellation}`),
            new Paragraph(`- Rules: ${policy.rules}`),
            new Paragraph(`- Reports: ${policy.reports}`),
            new Paragraph(" "),
            new Paragraph({
              text: "💳 Payments Summary",
              bold: true,
              size: 24,
            }),
            // Table with headers + rows
            new Table({
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph("ID")] }),
                    new TableCell({ children: [new Paragraph("User")] }),
                    new TableCell({ children: [new Paragraph("Amount")] }),
                    new TableCell({ children: [new Paragraph("Status")] }),
                  ],
                }),
                ...paymentRows,
              ],
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(docx);
    saveAs(blob, `${report || "Monthly_Report"}.docx`);

    toast.success("Report generated and downloaded with payments table!", {
      position: "top-right",
    });
  };

  const handleConfirmPayment = (id) => {
    setPayments(
      payments.map((p) =>
        p.id === id ? { ...p, status: "Confirmed" } : p
      )
    );
    toast.success(`Payment ${id} confirmed!`, { position: "bottom-right" });
  };

  // Modal version for update policy
  const handleUpdatePolicy = async () => {
    // Save to Firestore
    await setDoc(doc(db, "admin", "policy"), policy);

    setPolicyMessage(
      `Policy Updated:\n\nCancellation: ${policy.cancellation}\nRules: ${policy.rules}\nReports: ${policy.reports}`
    );
    setShowPolicyModal(true);
  };

  // Modal version for view analytics
  const handleViewAnalytics = () => {
    setShowAnalyticsModal(true);
  };

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-100 via-pink-100 to-yellow-100 py-10 px-2">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <img
              src={adminlogo}
              alt="Admin Logo"
              className="w-12 h-12 rounded-full shadow"
            />
            <div>
              <h1 className="text-3xl font-extrabold text-red-700">
                Admin Dashboard
              </h1>
              <p className="text-gray-500">Platform overview and management</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white/80 px-6 py-2 rounded-xl shadow text-red-600 font-bold text-lg">
              Welcome, Admin
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 border border-red-200 px-4 py-2 rounded-xl hover:shadow hover:bg-red-50 text-red-600 font-medium"
            >
              <FaSignOutAlt className="text-red-500" />
              Logout
            </button>
          </div>
        </div>

        {/* Admin Wallet Card */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-8 text-white mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-green-100 text-sm font-medium mb-2">Admin Wallet Balance</p>
              <h3 className="text-4xl font-bold">₱{adminWallet.balance.toLocaleString()}</h3>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <FaMoneyBillWave className="text-3xl" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-green-100 text-xs mb-1">Total Earnings (5% Commission)</p>
              <p className="text-xl font-bold">₱{adminWallet.totalEarnings.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-green-100 text-xs mb-1">Recent Transactions</p>
              <p className="text-xl font-bold">{adminTransactions.length}</p>
            </div>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-xl shadow p-6 flex items-center gap-4">
            <FaChartBar className="text-3xl text-pink-400" />
            <div>
              <div className="text-2xl font-bold">{analytics.bookings}</div>
              <div className="text-gray-500 text-sm">Total Bookings</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex items-center gap-4">
            <FaChartBar className="text-3xl text-green-400" />
            <div>
              <div className="text-2xl font-bold">{analytics.bestReviews}</div>
              <div className="text-gray-500 text-sm">Best Review</div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 flex items-center gap-4">
            <FaChartBar className="text-3xl text-yellow-400" />
            <div>
              <div className="text-2xl font-bold">{analytics.lowestReviews}</div>
              <div className="text-gray-500 text-sm">Lowest Review</div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Management */}
          <div className="space-y-8">
            {/* Service Fee */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center gap-2 mb-3">
                <FaMoneyBillWave className="text-xl text-red-400" />
                <span className="font-semibold text-lg">
                  Service Fee from Hosts
                </span>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={serviceFee}
                  onChange={(e) => setServiceFee(e.target.value)}
                  className="border rounded px-2 py-1 w-20"
                  placeholder="Fee %"
                />
                <button
                  onClick={handleSetServiceFee}
                  className="bg-red-400 text-white px-3 py-1 rounded hover:bg-red-500"
                >
                  Set Fee
                </button>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                Set and manage platform service fees.
              </p>
            </div>
            {/* Policy & Compliance */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center gap-2 mb-3">
                <FaGavel className="text-xl text-red-400" />
                <span className="font-semibold text-lg">Policy & Compliance</span>
              </div>
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={policy.cancellation}
                  onChange={(e) =>
                    setPolicy({ ...policy, cancellation: e.target.value })
                  }
                  className="border rounded px-2 py-1"
                  placeholder="Cancellation Policy"
                />
                <input
                  type="text"
                  value={policy.rules}
                  onChange={(e) =>
                    setPolicy({ ...policy, rules: e.target.value })
                  }
                  className="border rounded px-2 py-1"
                  placeholder="Rules & Regulations"
                />
                <input
                  type="text"
                  value={policy.reports}
                  onChange={(e) =>
                    setPolicy({ ...policy, reports: e.target.value })
                  }
                  className="border rounded px-2 py-1"
                  placeholder="Reports"
                />
                <button
                  onClick={handleUpdatePolicy}
                  className="bg-red-400 text-white px-3 py-1 rounded hover:bg-red-500 mt-1"
                >
                  Update Policy
                </button>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                Manage cancellation rules, regulations, and reports.
              </p>
            </div>
            {/* Generate Reports */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center gap-2 mb-3">
                <FaFileAlt className="text-xl text-red-400" />
                <span className="font-semibold text-lg">Generate Reports</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={report}
                  onChange={(e) => setReport(e.target.value)}
                  className="border rounded px-2 py-1"
                  placeholder="Report Name"
                />
                <button
                  onClick={handleGenerateReport}
                  className="bg-red-400 text-white px-3 py-1 rounded hover:bg-red-500"
                >
                  Generate
                </button>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                Generate and download platform reports.
              </p>
            </div>
          </div>

          {/* Right: Payments & Analytics */}
          <div className="space-y-8">
            {/* Analytics */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center gap-2 mb-3">
                <FaChartBar className="text-xl text-red-400" />
                <span className="font-semibold text-lg">
                  Dashboards Analytics
                </span>
              </div>
              <button
                onClick={handleViewAnalytics}
                className="bg-red-400 text-white px-3 py-1 rounded hover:bg-red-500"
              >
                View Analytics
              </button>
              <p className="text-gray-500 text-sm mt-1">
                View best reviews, lowest reviews, list of bookings, etc.
              </p>
            </div>

            {/* Admin Commission Transactions */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center gap-2 mb-3">
                <FaMoneyBillWave className="text-xl text-green-400" />
                <span className="font-semibold text-lg">Commission Transactions</span>
              </div>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-green-100">
                    <tr>
                      <th className="px-2 py-1 text-left">Date</th>
                      <th className="px-2 py-1 text-left">Description</th>
                      <th className="px-2 py-1 text-left">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminTransactions.length > 0 ? (
                      adminTransactions.map((t) => (
                        <tr key={t.id} className="border-b">
                          <td className="px-2 py-1">
                            {t.date?.toDate ? new Date(t.date.toDate()).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-2 py-1 text-xs">{t.description}</td>
                          <td className="px-2 py-1 text-green-600 font-bold">
                            +₱{t.amount?.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="px-2 py-4 text-center text-gray-500">
                          No transactions yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                5% commission from each approved booking
              </p>
            </div>

            {/* Payment Methods */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center gap-2 mb-3">
                <FaCreditCard className="text-xl text-red-400" />
                <span className="font-semibold text-lg">Payment Methods</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-red-100">
                      <th className="px-2 py-1 text-left">ID</th>
                      <th className="px-2 py-1 text-left">User</th>
                      <th className="px-2 py-1 text-left">Amount</th>
                      <th className="px-2 py-1 text-left">Status</th>
                      <th className="px-2 py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b">
                        <td className="px-2 py-1">{p.id}</td>
                        <td className="px-2 py-1">{p.user}</td>
                        <td className="px-2 py-1">₱{p.amount}</td>
                        <td className="px-2 py-1">
                          <span
                            className={
                              p.status === "Confirmed"
                                ? "text-green-600 font-bold"
                                : "text-yellow-600"
                            }
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-2 py-1">
                          {p.status !== "Confirmed" && (
                            <button
                              onClick={() => handleConfirmPayment(p.id)}
                              className="bg-green-400 text-white px-2 py-1 rounded hover:bg-green-500 text-xs"
                            >
                              Confirm
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-gray-500 text-sm mt-1">
                Confirm, review, and manage payments.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal for Policy Update */}
      {showPolicyModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative">
            <button
              className="absolute top-3 right-3 text-2xl text-gray-400 hover:text-red-500"
              onClick={() => setShowPolicyModal(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-4 text-red-600">Policy Updated</h2>
            <pre className="whitespace-pre-line text-gray-700 mb-4">{policyMessage}</pre>
            <button
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-full font-bold w-full"
              onClick={() => setShowPolicyModal(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Modal for Analytics */}
      {showAnalyticsModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative">
            <button
              className="absolute top-3 right-3 text-2xl text-gray-400 hover:text-red-500"
              onClick={() => setShowAnalyticsModal(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-4 text-red-600">Analytics</h2>
            <div className="mb-4 space-y-2 text-gray-700 text-base">
              <div>
                <span className="font-semibold">Best Reviews:</span> {analytics.bestReviews}
              </div>
              <div>
                <span className="font-semibold">Lowest Reviews:</span> {analytics.lowestReviews}
              </div>
              <div>
                <span className="font-semibold">Total Bookings:</span> {analytics.bookings}
              </div>
            </div>
            <button
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-full font-bold w-full"
              onClick={() => setShowAnalyticsModal(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* ✅ Toast container */}
      <ToastContainer />

      
      
    </div>
  );
}

export default AdminPage;
