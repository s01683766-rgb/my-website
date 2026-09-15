const CLOUDWATCH_API_URL = 'https://your-cloudflare-worker-name.your-subdomain.workers.dev';

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
    
    // SAFETY FIX: Automatically handle missing reference numbers or extra fields
    accountsList = accountsList.map((item, index) => {
      return {
        id: item.id || item.refNo || `REF-${Date.now()}-${index}`, // Ensures every item has a tracking ref no.
        name: item.name || item.customerName || "Unknown",
        mobile: item.mobile || item.phone || "",
        amount: item.amount !== undefined ? item.amount : (item.balance || 0),
        type: item.type || "credit",
        timestamp: item.timestamp || item.seconds || new Date().toISOString()
      };
    });
    
    console.log("Synchronized accounts loaded safely:", accountsList);
    
    if (typeof renderAccounts === 'function') {
      renderAccounts(accountsList);
    }
    return accountsList;
  } catch (err) {
    console.error("Error loading terminal data:", err);
  }
}

async function saveTerminalData(updatedAccountsArray) {
  try {
    const response = await fetch(CLOUDWATCH_API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': 'CRIS_SECURE_998877' 
      },
      body: JSON.stringify({ 
        user_path: 'pray73',
        accounts: updatedAccountsArray 
      })
    });
    
    const resData = await response.json();
    console.log("Saved successfully:", resData);
  } catch (err) {
    console.error("Error saving terminal data:", err);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  loadTerminalData();
});
