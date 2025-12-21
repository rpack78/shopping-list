// Configuration file for API keys and settings
// IMPORTANT: Replace these with your actual API credentials

const CONFIG = {
  // Google API Configuration
  google: {
    // Get these from Google Cloud Console
    // https://console.cloud.google.com/
    clientId: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
    apiKey: "YOUR_GOOGLE_API_KEY",

    // Scopes needed for the app
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],

    // Discovery docs
    discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
  },

  // Google Sheets Configuration
  sheets: {
    // Your Google Sheets spreadsheet ID
    // Get this from the URL: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
    spreadsheetId: "YOUR_SPREADSHEET_ID",

    // Sheet names
    shoppingListSheet: "Shopping List",
    categoriesSheet: "Categories",
  },

  // Google Vision API Configuration
  vision: {
    apiKey: "YOUR_VISION_API_KEY",
    endpoint: "https://vision.googleapis.com/v1/images:annotate",
  },

  // App Configuration
  app: {
    syncInterval: 10000, // Sync every 10 seconds
    offlineStorageKey: "shopping_list_offline",
    categoryCacheKey: "shopping_list_categories",
    maxRetries: 3,
  },
};

// For development: Check if running on localhost and warn about configuration
if (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
) {
  if (CONFIG.google.clientId.includes("YOUR_")) {
    console.warn(
      "⚠️  Please update CONFIG in config.js with your Google API credentials"
    );
  }
}
