// Your live Cloudflare Worker URL bridge
const CLOUDWATCH_API_URL = 'https://cris-backend-worker.s01683766.workers.dev';

// Default initial data including your test record (Ragh, mobile: 9876543210, amount: 6900)
let allCachedAccounts = [
  {
    id: "REF-2026-001",
    name: "Ragh",
    mobile: "9876543210",
    email: "ragh@example.com",
    amount: 6900,
    type: "credit",
    subject: "Initial Ledger Entry",
    who: "Self",
    how: "Cash/Direct",
    accountOpeningDate: "2026-09-15",
    timestamp: "2026-09-15 15:00:00",
    seconds: new Date().toISOString()
  }
];

// --- FORMAT VALIDATION HELPERS ---
function isValidMobile(mobile) {
  const mobileRegex = /^\d{10}$/; // Exactly 10 numerical digits
  return mobileRegex.test(String(mobile).trim());
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(String(email).trim());
}

// --- 1. LOAD DATA FROM CLOUDWATCH / COCKROACHDB BRIDGE ---
async function loadTerminalData() {
  try {
    const response = await fetch(`${CLOUDWATCH_API_URL}/?user_path=pray73`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': 'CRIS_SECURE_998877' 
      }
    });
    
    const result = await response.json();
    let accountsList = result.accounts || [];
    
    if (accountsList && accountsList.length > 0) {
      allCachedAccounts = accountsList.map((item, index) => {
        const now = new Date();
        return {
          id: item.id || item.refNo || `REF-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}-${index + 1}`,
          name: item.name || item.customerName || "Unknown",
          mobile: item.mobile || item.phone || "",
          email: item.email || "",
          amount: item.amount !== undefined ? item.amount : (item.balance || 0),
          type: item.type || "credit",
          subject: item.subject || "General Transaction",
          who: item.who || "Self",
          how: item.how || "Cash/Direct",
          accountOpeningDate: item.accountOpeningDate || now.toISOString().split('T')[0],
          timestamp: item.timestamp || now.toLocaleString(),
          seconds: item.seconds || now.toISOString()
        };
      });
    }
    
    console.log("Loaded records:", allCachedAccounts);
    
    if (typeof renderAccounts === 'function') {
      renderAccounts(allCachedAccounts);
    }
    return allCachedAccounts;
  } catch (err) {
    console.error("Error loading terminal data (using fallback):", err);
    if (typeof renderAccounts === 'function') {
      renderAccounts(allCachedAccounts);
    }
  }
}

// --- 2. SAVE DATA WITH STRICT FORMAT VALIDATION ---
async function saveTerminalData(newAccountEntry) {
  try {
    if (!isValidMobile(newAccountEntry.mobile)) {
      alert("Validation Error: Mobile number must be exactly 10 numerical digits.");
      return false;
    }

    if (newAccountEntry.email && !isValidEmail(newAccountEntry.email)) {
      alert("Validation Error: Please enter a valid email address format.");
      return false;
    }

    if (newAccountEntry.amount === undefined || isNaN(newAccountEntry.amount)) {
      alert("Validation Error: Amount must be a valid number.");
      return false;
    }

    allCachedAccounts.push(newAccountEntry);

    const response = await fetch(CLOUDWATCH_API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': 'CRIS_SECURE_998877' 
      },
      body: JSON.stringify({ 
        user_path: 'pray73',
        accounts: allCachedAccounts 
      })
    });
    
    const resData = await response.json();
    console.log("Saved successfully:", resData);
    return true;
  } catch (err) {
    console.error("Error saving terminal data:", err);
    return false;
  }
}

// --- 3. STRICT SEARCH FILTER (Requires full 10-digit mobile or ID match) ---
function setupStrictSearch(searchInputId, resultContainerId) {
  const searchInput = document.getElementById(searchInputId);
  const resultContainer = document.getElementById(resultContainerId);

  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const searchValue = e.target.value.trim();

    if (searchValue.length < 10) {
      if (resultContainer) {
        resultContainer.innerHTML = "<p>Please enter the full 10-digit mobile or account number to view data.</p>";
      }
      return;
    }

    const matchedRecords = allCachedAccounts.filter(acc => 
      acc.mobile === searchValue || acc.id === searchValue
    );

    if (matchedRecords.length === 0) {
      if (resultContainer) {
        resultContainer.innerHTML = "<p>No matching record found for this full account number.</p>";
      }
    } else {
      if (typeof renderAccounts === 'function') {
        renderAccounts(matchedRecords);
      }
    }
  });
}

// --- INITIALIZE ON PAGE LOAD ---
window.addEventListener('DOMContentLoaded', () => {
  loadTerminalData();
  setupStrictSearch('search-input', 'accounts-container');
});
