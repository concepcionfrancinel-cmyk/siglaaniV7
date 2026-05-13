// Force the explicit IPv4 address to prevent the Windows localhost bug
const BASE_URL = 'http://127.0.0.1:5001/api';

/**
 * Custom error that carries the backend's structured error info up to App.jsx
 * so we can distinguish "no fruit in frame" from "backend offline".
 */
class ScanError extends Error {
  constructor(code, userMessage) {
    super(userMessage || code || 'Scan failed');
    this.code        = code;         // e.g. 'no_fruit_detected', 'background_only'
    this.userMessage = userMessage;  // Tagalog-localized message from the server
  }
}

export const apiScan = async (data) => {
  let response;
  try {
    response = await fetch(`${BASE_URL}/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (networkErr) {
    // Server unreachable / fetch crashed
    console.error('[apiScan] network error:', networkErr);
    throw networkErr;
  }

  let json = null;
  try { json = await response.json(); } catch { /* non-JSON body */ }

  if (!response.ok) {
    const code        = json?.error   || `http_${response.status}`;
    const userMessage = json?.message || 'Hindi naproseso ang scan.';
    console.warn('[apiScan] backend rejected:', code, userMessage);
    throw new ScanError(code, userMessage);
  }
  return json;
};

export const apiHistory = async () => {
  try {
    const response = await fetch(`${BASE_URL}/history?limit=50&t=${Date.now()}`);
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error("Error fetching history:", error);
    throw error;
  }
};

export const apiDelete = async (id) => {
  try {
    const response = await fetch(`${BASE_URL}/history/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error("Error deleting record:", error);
    throw error;
  }
};

export const apiClearHistory = async () => {
  try {
    const response = await fetch(`${BASE_URL}/history`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
  } catch (error) {
    console.error("Error clearing history:", error);
    throw error;
  }
};

export { ScanError };
