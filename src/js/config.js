// Configuration file for API keys and settings
// IMPORTANT: Replace these with your actual API credentials

const CONFIG = {
  // Google API Configuration
  google: {
    // Get these from Google Cloud Console
    // https://console.cloud.google.com/
    clientId:
      "431554141668-gvu6gdfjmp9uvtehjd2qinsn9o070hu9.apps.googleusercontent.com",
    apiKey: "AIzaSyACbRnIlrpkwYvK76HTFBrYI0dGviuS_nI", // Can use same key as Vision API

    // Scopes needed for the app
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],

    // Discovery docs
    discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
  },

  // Google Sheets Configuration
  sheets: {
    // Your Google Sheets spreadsheet ID
    // Get this from the URL: https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
    spreadsheetId: "1CR4jZe0Q-lJz5T33ecKfUz4Yn9NrV_dPPeClmy_No0g",

    // Sheet names
    shoppingListSheet: "Shopping List",
    categoriesSheet: "Categories",
  },

  // Google Vision API Configuration
  vision: {
    apiKey: "AIzaSyACbRnIlrpkwYvK76HTFBrYI0dGviuS_nI",
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
