// main.js - Handles CockroachDB synchronization for pray73

async function loadTerminalData() {
  try {
    const response = await fetch('/api/terminal-data?user_path=pray73', {
      method: 'GET',
      headers: { 'x-api-key': 'CRIS_SECURE_998877' }
    });
    const result = await response.json();
    const accountsList = result.accounts || [];
    
    console.log("Loaded accounts from database:", accountsList);
    
    // If you have a render function in your index.html, call it here:
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
    const response = await fetch('/api/terminal-data', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-api-key': 'CRIS_SECURE_998877' 
      },
      body: JSON.stringify({ accounts: updatedAccountsArray })
    });
    const resData = await response.json();
    console.log("Saved successfully:", resData);
  } catch (err) {
    console.error("Error saving terminal data:", err);
  }
}

// Automatically load data when the page finishes opening
window.addEventListener('DOMContentLoaded', () => {
  loadTerminalData();
});
