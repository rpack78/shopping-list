// Main Application Logic
const App = {
  isInitialized: false,

  // Initialize the app
  async init() {
    console.log("Initializing Shopping List App...");

    // Initialize Voice
    Voice.init();

    // Initialize UI
    await UI.init();

    // Register service worker
    this.registerServiceWorker();

    // Try to initialize Google API
    try {
      await SheetsAPI.init();
      console.log("Google API initialized");

      // Check if already authenticated (will auto-restore from storage if valid)
      if (SheetsAPI.isAuthenticated) {
        console.log("User already authenticated, restoring session...");
        await this.onAuthSuccess();
      }
    } catch (error) {
      console.error("Error initializing Google API:", error);
      UI.showStatus(
        "Error initializing app. Please refresh the page.",
        "error"
      );
    }

    this.isInitialized = true;
  },

  // Sign in with Google
  async signIn() {
    try {
      UI.showStatus("Signing in...", "info");

      // Set callback for successful auth
      window.onAuthSuccess = () => this.onAuthSuccess();

      await SheetsAPI.authenticate();
    } catch (error) {
      console.error("Error signing in:", error);
      UI.showStatus("Failed to sign in. Please try again.", "error");
    }
  },

  // Handle successful authentication
  async onAuthSuccess() {
    try {
      UI.showStatus("Loading your shopping list...", "info");

      // Hide auth section, show main app
      const authSection = document.getElementById("authSection");
      const mainApp = document.getElementById("mainApp");

      if (authSection) authSection.classList.add("hidden");
      if (mainApp) mainApp.classList.remove("hidden");

      // Get user info
      await SheetsAPI.getUserInfo();

      // Initialize sheets if needed
      await SheetsAPI.initializeSheets();

      // Load categories
      await Categories.loadCategories();

      // Update category dropdown
      await UI.updateCategoryDropdown();

      // Load shopping list
      await UI.refreshList();

      // Start auto-sync
      UI.startAutoSync();

      UI.showStatus("Ready!", "success");
      setTimeout(() => UI.hideStatus(), 2000);
    } catch (error) {
      console.error("Error after authentication:", error);
      UI.showStatus(
        "Error loading data. Please check your spreadsheet setup.",
        "error"
      );
    }
  },

  // Sign out
  signOut() {
    SheetsAPI.signOut();

    // Stop auto-sync
    UI.stopAutoSync();

    // Show auth section, hide main app
    const authSection = document.getElementById("authSection");
    const mainApp = document.getElementById("mainApp");

    if (authSection) authSection.classList.remove("hidden");
    if (mainApp) mainApp.classList.add("hidden");

    UI.showStatus("Signed out", "info");
  },

  // Register service worker for PWA
  async registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register(
          "/shopping-list/service-worker.js"
        );
        console.log("Service Worker registered:", registration);

        // Check for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New service worker available
              if (confirm("New version available! Reload to update?")) {
                window.location.reload();
              }
            }
          });
        });
      } catch (error) {
        console.error("Service Worker registration failed:", error);
      }
    }
  },

  // Handle online/offline status
  setupNetworkListeners() {
    window.addEventListener("online", () => {
      UI.showStatus("Back online! Syncing...", "success");
      // Wait a moment for connection to stabilize, then silent refresh
      setTimeout(() => UI.refreshList(true), 2000);
    });

    window.addEventListener("offline", () => {
      UI.showStatus(
        "You are offline. Changes will sync when back online.",
        "warning"
      );
    });
  },

  // Check if app can be installed
  setupInstallPrompt() {
    let deferredPrompt;

    window.addEventListener("beforeinstallprompt", (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      deferredPrompt = e;

      // Show install button or prompt
      console.log("App can be installed");

      // You can add a custom install button here
    });

    window.addEventListener("appinstalled", () => {
      console.log("App installed");
      deferredPrompt = null;
    });
  },
};

// Initialize app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => App.init());
} else {
  App.init();
}

// Setup network and install listeners
App.setupNetworkListeners();
App.setupInstallPrompt();
