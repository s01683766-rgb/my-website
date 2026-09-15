// Replace this URL with your actual live Cloudflare Worker URL
const CLOUDWATCH_API_URL = 'https://your-cloudflare-worker-name.your-subdomain.workers.dev';

// 1. Function to LOAD data from Cloudflare Worker / CockroachDB when Netlify opens
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
    const accountsList = result.accounts || [];
    
    console.log("Loaded accounts from Cloudflare bridge:", accountsList);
    
    // Calls your existing HTML screen render function if available
    if (typeof renderAccounts === 'function') {
      renderAccounts(accountsList);
    }
    return accountsList;
  } catch (err) {
    console.error("Error loading terminal data:", err);
  }
}

// 2. Function to SAVE updates back through the Cloudflare bridge
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
    console.log("Saved successfully via Cloudflare:", resData);
  } catch (err) {
    console.error("Error saving terminal data:", err);
  }
}

// Automatically load the data as soon as the Netlify page finishes opening
window.addEventListener('DOMContentLoaded', () => {
  loadTerminalData();
});
