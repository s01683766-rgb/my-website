const CLOUDWATCH_API_URL = 'https://your-cloudflare-worker-name.your-subdomain.workers.dev';

let allCachedAccounts = [];

// --- FORMAT VALIDATION HELPERS ---
function isValidMobile(mobile) {
  // Strictly checks for exactly 10 numerical digits (e.g., 6900998877)
  const mobileRegex = /^\d{10}$/;
  return mobileRegex.test(String(mobile).trim());
}

function isValidEmail(email) {
  // Standard email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(String(email).trim());
}

function isValidNumeric(val) {
  // Ensures account or reference numbers contain only digits
  const numRegex = /^\d+$/;
  return numRegex.test(String(val).trim());
}

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
    
    if (typeof renderAccounts === 'function') {
      renderAccounts(allCachedAccounts);
    }
    return allCachedAccounts;
  } catch (err) {
    console.error("Error loading terminal data:", err);
  }
}

// STRICT SAVE FUNCTION WITH VALIDATION
async function saveTerminalData(newAccountEntry) {
  try {
    // 1. Validate Mobile (Must be 10 digits numerical)
    if (!isValidMobile(newAccountEntry.mobile)) {
      alert("Validation Error: Mobile number must be exactly 10 numerical digits.");
      return false;
    }

    // 2. Validate Email if provided
    if (newAccountEntry.email && !isValidEmail(newAccountEntry.email)) {
      alert("Validation Error: Please enter a valid email address format.");
      return false;
    }

    // 3. Validate Amount / Account numbers if numerical
    if (newAccountEntry.amount === undefined || isNaN(newAccountEntry.amount)) {
      alert("Validation Error: Amount must be a valid number.");
      return false;
    }

    // Push into cached list and send to Cloudflare Worker bridge
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
    console.log("Saved successfully with validated formats:", resData);
    return true;
  } catch (err) {
    console.error("Error saving terminal data:", err);
    return false;
  }
}

// STRICT SEARCH FUNCTION (Full Account / Mobile Number match required)
function setupStrictSearch(searchInputId, resultContainerId) {
  const searchInput = document.getElementById(searchInputId);
  const resultContainer = document.getElementById(resultContainerId);

  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const searchValue = e.target.value.trim();

    // Requires full length (e.g. 10 digits for mobile or exact ID match) before pulling records
    if (searchValue.length < 10) {
      if (resultContainer) resultContainer.innerHTML = "<p>Please enter the full 10-digit mobile or account number to view data.</p>";
      return;
    }

    const matchedRecords = allCachedAccounts.filter(acc => 
      acc.mobile === searchValue || acc.id === searchValue
    );

    if (matchedRecords.length === 0) {
      if (resultContainer) resultContainer.innerHTML = "<p>No matching record found.</p>";
    } else {
      if (typeof renderAccounts === 'function') {
        renderAccounts(matchedRecords);
      }
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  loadTerminalData();
  setupStrictSearch('search-input', 'accounts-container');
});
