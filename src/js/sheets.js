// Google Sheets API Integration
const SheetsAPI = {
  isAuthenticated: false,
  tokenClient: null,
  accessToken: null,
  userInfo: null,
  AUTH_STORAGE_KEY: "shopping_list_auth",
  AUTH_EXPIRY_HOURS: 1,
  AUTH_VERSION: 2, // Increment this when scopes change to force re-auth
  isRefreshingToken: false,
  tokenRefreshPromise: null,

  // Initialize Google API
  async init() {
    const loadGapi = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.onload = () => {
        gapi.load("client", async () => {
          try {
            await gapi.client.init({
              apiKey: CONFIG.google.apiKey,
              discoveryDocs: CONFIG.google.discoveryDocs,
            });
            console.log("Google API client initialized");
            resolve();
          } catch (error) {
            console.error("Error initializing Google API:", error);
            reject(error);
          }
        });
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });

    const loadGsi = new Promise((resolve, reject) => {
      const gsiScript = document.createElement("script");
      gsiScript.src = "https://accounts.google.com/gsi/client";
      gsiScript.onload = () => {
        this.tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: CONFIG.google.clientId,
          scope: CONFIG.google.scopes.join(" "),
          callback: (response) => {
            if (response.access_token) {
              this.accessToken = response.access_token;
              gapi.client.setToken({ access_token: response.access_token });
              this.isAuthenticated = true;
              this.saveAuthToStorage(response.access_token);
              this.isRefreshingToken = false;
              this.tokenRefreshPromise = null;
              if (window.onAuthSuccess) {
                window.onAuthSuccess();
              }
            } else if (response.error) {
              console.error("Token refresh error:", response.error);
              this.isRefreshingToken = false;
              this.tokenRefreshPromise = null;
            }
          },
        });
        resolve();
      };
      gsiScript.onerror = reject;
      document.head.appendChild(gsiScript);
    });

    await Promise.all([loadGapi, loadGsi]);
    
    // Try to restore authentication from storage
    await this.restoreAuthFromStorage();
  },

  // Save authentication to localStorage
  saveAuthToStorage(accessToken) {
    const authData = {
      accessToken: accessToken,
      timestamp: Date.now(),
      version: this.AUTH_VERSION,
    };
    localStorage.setItem(this.AUTH_STORAGE_KEY, JSON.stringify(authData));
  },

  // Restore authentication from localStorage
  async restoreAuthFromStorage() {
    try {
      const stored = localStorage.getItem(this.AUTH_STORAGE_KEY);
      if (!stored) return false;

      const authData = JSON.parse(stored);

      // Check if auth version matches (clear if scopes changed)
      if (authData.version !== this.AUTH_VERSION) {
        console.log("Auth version mismatch, clearing old auth...");
        this.clearAuthStorage();
        return false;
      }

      const age = Date.now() - authData.timestamp;
      const maxAge = 50 * 60 * 1000; // 50 minutes (safe buffer for 1 hour token)
      const refreshAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      // Check if token is still valid
      if (age < maxAge && authData.accessToken) {
        this.accessToken = authData.accessToken;
        // Only set token if gapi.client is initialized
        if (window.gapi && window.gapi.client && window.gapi.client.setToken) {
          window.gapi.client.setToken({ access_token: authData.accessToken });
        }
        this.isAuthenticated = true;
        console.log("Restored authentication from storage");
        return true;
      } else if (age < refreshAge) {
        // Token expired but within refresh window, try to refresh
        console.log("Token expired, attempting silent refresh...");
        try {
            await this.refreshToken();
            return true;
        } catch (e) {
            console.log("Silent refresh failed", e);
            this.clearAuthStorage();
            return false;
        }
      } else {
        // Token expired and too old, clear storage
        console.log("Stored token expired and too old, clearing...");
        this.clearAuthStorage();
        return false;
      }
    } catch (error) {
      console.error("Error restoring auth from storage:", error);
      this.clearAuthStorage();
      return false;
    }
  },

  // Clear authentication from localStorage
  clearAuthStorage() {
    localStorage.removeItem(this.AUTH_STORAGE_KEY);
  },

  // Get user info
  async getUserInfo() {
    try {
      console.log("Fetching user info...");
      const response = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        // Handle 401 Unauthorized
        if (response.status === 401) {
          console.log("getUserInfo got 401, refreshing token...");
          await this.refreshToken();
          // Retry after token refresh
          return await this.getUserInfo();
        }
        
        console.error(
          "Failed to get user info:",
          response.status,
          response.statusText
        );
        return null;
      }

      const data = await response.json();
      console.log("User info retrieved:", data);

      this.userInfo = {
        email: data.email,
        name: data.name || data.email,
      };

      console.log("User info stored:", this.userInfo);
      return this.userInfo;
    } catch (error) {
      console.error("Error getting user info:", error);
      return null;
    }
  },

  // Request authentication
  async authenticate() {
    if (!this.tokenClient) {
      throw new Error("Token client not initialized");
    }

    // Request an access token
    this.tokenClient.requestAccessToken({ prompt: "consent" });
  },

  // Refresh the access token silently
  async refreshToken() {
    // If already refreshing, wait for that to complete
    if (this.isRefreshingToken && this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    this.isRefreshingToken = true;
    this.tokenRefreshPromise = new Promise((resolve, reject) => {
      if (!this.tokenClient) {
        this.isRefreshingToken = false;
        this.tokenRefreshPromise = null;
        reject(new Error("Token client not initialized"));
        return;
      }

      console.log("Refreshing access token...");
      
      // Store the original callback
      const originalCallback = this.tokenClient.callback;
      
      // Set up a one-time callback for the refresh
      this.tokenClient.callback = (response) => {
        // Restore the original callback
        this.tokenClient.callback = originalCallback;
        
        if (response.access_token) {
          this.accessToken = response.access_token;
          // Pass full response to gapi to ensure expires_in is handled
          gapi.client.setToken(response);
          this.isAuthenticated = true;
          this.saveAuthToStorage(response.access_token);
          this.isRefreshingToken = false;
          this.tokenRefreshPromise = null;
          console.log("Token refreshed successfully");
          resolve();
        } else {
          console.error("Failed to refresh token:", response.error);
          this.isRefreshingToken = false;
          this.tokenRefreshPromise = null;
          reject(new Error(response.error || "Token refresh failed"));
        }
      };

      // Request a new token silently (without prompt if possible)
      try {
        this.tokenClient.requestAccessToken({ prompt: "none" });
      } catch (error) {
        console.error("Error requesting token refresh:", error);
        this.tokenClient.callback = originalCallback;
        this.isRefreshingToken = false;
        this.tokenRefreshPromise = null;
        reject(error);
      }
    });

    return this.tokenRefreshPromise;
  },

  // Handle 401 errors by refreshing the token and retrying
  async handleUnauthorized(retryFn) {
    try {
      console.log("Handling 401 error - attempting token refresh...");
      await this.refreshToken();
      
      // Retry the original request
      return await retryFn();
    } catch (error) {
      console.error("Token refresh failed:", error);
      
      // If refresh fails, sign out and show auth screen
      this.isAuthenticated = false;
      this.clearAuthStorage();
      
      // Show auth section
      const authSection = document.getElementById("authSection");
      const mainApp = document.getElementById("mainApp");
      if (authSection) authSection.classList.remove("hidden");
      if (mainApp) mainApp.classList.add("hidden");
      
      if (window.UI) {
        UI.showStatus("Session expired. Please sign in again.", "error");
        UI.stopAutoSync();
      }
      
      throw error;
    }
  },

  // Sign out
  signOut() {
    if (this.accessToken) {
      google.accounts.oauth2.revoke(this.accessToken);
      this.accessToken = null;
    }
    this.isAuthenticated = false;
    this.userInfo = null;
    gapi.client.setToken(null);
    this.clearAuthStorage();
  },

  // Read from spreadsheet
  async read(range, isRetry = false) {
    try {
      const response = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: CONFIG.sheets.spreadsheetId,
        range: range,
      });
      return response.result.values || [];
    } catch (error) {
      console.error("Error reading from sheet:", error);
      
      // Handle 401 Unauthorized - token expired
      if (!isRetry && (error.status === 401 || (error.result && error.result.error && error.result.error.code === 401))) {
        return await this.handleUnauthorized(() => this.read(range, true));
      }
      
      throw error;
    }
  },

  // Write to spreadsheet
  async write(range, values, isRetry = false) {
    try {
      const response = await gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: CONFIG.sheets.spreadsheetId,
        range: range,
        valueInputOption: "USER_ENTERED",
        resource: {
          values: values,
        },
      });
      return response.result;
    } catch (error) {
      console.error("Error writing to sheet:", error);
      
      // Handle 401 Unauthorized - token expired
      if (!isRetry && (error.status === 401 || (error.result && error.result.error && error.result.error.code === 401))) {
        return await this.handleUnauthorized(() => this.write(range, values, true));
      }
      
      throw error;
    }
  },

  // Append to spreadsheet
  async append(range, values, isRetry = false) {
    try {
      const response = await gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: CONFIG.sheets.spreadsheetId,
        range: range,
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        resource: {
          values: values,
        },
      });
      return response.result;
    } catch (error) {
      console.error("Error appending to sheet:", error);
      
      // Handle 401 Unauthorized - token expired
      if (!isRetry && (error.status === 401 || (error.result && error.result.error && error.result.error.code === 401))) {
        return await this.handleUnauthorized(() => this.append(range, values, true));
      }
      
      throw error;
    }
  },

  // Delete rows
  async deleteRow(sheetId, rowIndex, isRetry = false) {
    try {
      const response = await gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId: CONFIG.sheets.spreadsheetId,
        resource: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheetId,
                  dimension: "ROWS",
                  startIndex: rowIndex,
                  endIndex: rowIndex + 1,
                },
              },
            },
          ],
        },
      });
      return response.result;
    } catch (error) {
      console.error("Error deleting row:", error);
      
      // Handle 401 Unauthorized - token expired
      if (!isRetry && (error.status === 401 || (error.result && error.result.error && error.result.error.code === 401))) {
        return await this.handleUnauthorized(() => this.deleteRow(sheetId, rowIndex, true));
      }
      
      throw error;
    }
  },

  // Get all shopping list items
  async getShoppingList() {
    const range = `'${CONFIG.sheets.shoppingListSheet}'!A2:F`;
    const rows = await this.read(range);

    return rows.map((row, index) => ({
      rowIndex: index + 2, // +2 because row 1 is header and array is 0-indexed
      item: row[0] || "",
      category: row[1] || "",
      checked: row[2] === "TRUE" || row[2] === true,
      addedBy: row[3] || "",
      timestamp: row[4] || "",
      order: parseInt(row[5]) || 0,
    }));
  },

  // Get all cleared items
  async getClearedItems() {
    const range = `'${CONFIG.sheets.clearedItemsSheet}'!A2:D`;
    const rows = await this.read(range);

    return rows.map((row) => ({
      item: row[0] || "",
      category: row[1] || "",
      addedBy: row[2] || "",
      timestamp: row[3] || "",
    }));
  },

  // Find most recent category for an item from cleared items
  async findMostRecentCategory(itemName) {
    try {
      const clearedItems = await this.getClearedItems();

      // Filter items that match (case-insensitive)
      const matchingItems = clearedItems.filter(
        (item) => item.item.toLowerCase() === itemName.toLowerCase()
      );

      if (matchingItems.length === 0) {
        return null;
      }

      // Sort by timestamp (most recent first)
      matchingItems.sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateB - dateA;
      });

      // Return the category of the most recent item
      return matchingItems[0].category;
    } catch (error) {
      console.error("Error finding recent category:", error);
      return null;
    }
  },

  // Add new item
  async addItem(item, category, addedBy = null) {
    // Get user info if not provided
    if (!addedBy) {
      console.log("No addedBy provided, checking userInfo:", this.userInfo);
      if (!this.userInfo) {
        console.log("User info not cached, fetching...");
        await this.getUserInfo();
      }
      addedBy = this.userInfo ? this.userInfo.name : "User";
      console.log("Using addedBy:", addedBy);
    }

    const timestamp = new Date().toISOString();
    const order = Date.now(); // Use timestamp as order for new items

    const values = [[item, category, false, addedBy, timestamp, order]];

    // Use A:A to ensure we append to the first column, preventing issues where
    // data might be appended to column G if the sheet thinks A-F are full.
    // Also quote the sheet name to handle spaces correctly.
    const range = `'${CONFIG.sheets.shoppingListSheet}'!A:A`;
    await this.append(range, values);

    // Increment category use count
    await Categories.incrementUseCount(category);
  },

  // Update item checked status
  async updateItemChecked(rowIndex, checked) {
    const order = checked ? Date.now() + 999999999999 : Date.now(); // Checked items go to bottom
    const range = `'${CONFIG.sheets.shoppingListSheet}'!C${rowIndex}:F${rowIndex}`;
    const values = [[checked, "", "", order]];
    await this.write(range, values);
  },

  // Update item
  async updateItem(rowIndex, item, category) {
    const range = `'${CONFIG.sheets.shoppingListSheet}'!A${rowIndex}:B${rowIndex}`;
    const values = [[item, category]];
    await this.write(range, values);
  },

  // Delete item
  async deleteItem(rowIndex) {
    // Note: This is simplified. In production, you'd need to get the sheet ID first
    // For now, we'll just clear the row
    const range = `'${CONFIG.sheets.shoppingListSheet}'!A${rowIndex}:F${rowIndex}`;
    const values = [["", "", "", "", "", ""]];
    await this.write(range, values);
  },

  // Clear all checked items (move to Cleared Items sheet)
  async clearCheckedItems() {
    const items = await this.getShoppingList();
    const checkedItems = items.filter((item) => item.checked);

    if (checkedItems.length === 0) {
      return;
    }

    // Prepare data for Cleared Items sheet
    // Columns: item, category, addedBy, timestamp
    const clearedItemsData = checkedItems.map((item) => [
      item.item,
      item.category,
      item.addedBy,
      new Date().toISOString(), // Current timestamp for when it was cleared
    ]);

    // Append to Cleared Items sheet
    const range = `'${CONFIG.sheets.clearedItemsSheet}'!A:A`;
    await this.append(range, clearedItemsData);

    // Delete items from Shopping List (in reverse order to maintain indices)
    for (const item of checkedItems.reverse()) {
      await this.deleteItem(item.rowIndex);
    }
  },

  // Initialize sheets (create headers if needed)
  async initializeSheets() {
    try {
      // Check if headers exist
      const shoppingListRange = `'${CONFIG.sheets.shoppingListSheet}'!A1:F1`;
      const categoriesRange = `'${CONFIG.sheets.categoriesSheet}'!A1:C1`;
      const clearedItemsRange = `'${CONFIG.sheets.clearedItemsSheet}'!A1:D1`;

      const shoppingHeaders = await this.read(shoppingListRange);
      if (!shoppingHeaders.length) {
        await this.write(shoppingListRange, [
          ["item", "category", "checked", "addedBy", "timestamp", "order"],
        ]);
      }

      const categoryHeaders = await this.read(categoriesRange);
      if (!categoryHeaders.length) {
        await this.write(categoriesRange, [
          ["category", "storeOrder", "useCount"],
        ]);

        // Add default categories
        const defaultCategories = [
          ["Produce", 1, 0],
          ["Dairy", 2, 0],
          ["Meat", 3, 0],
          ["Bakery", 4, 0],
          ["Frozen", 5, 0],
          ["Pantry", 6, 0],
          ["Beverages", 7, 0],
          ["Snacks", 8, 0],
          ["Other", 9, 0],
        ];

        await this.append(
          `'${CONFIG.sheets.categoriesSheet}'!A:A`,
          defaultCategories
        );
      }

      const clearedHeaders = await this.read(clearedItemsRange);
      if (!clearedHeaders.length) {
        await this.write(clearedItemsRange, [
          ["item", "category", "addedBy", "timestamp"],
        ]);
      }
    } catch (error) {
      console.error("Error initializing sheets:", error);
      throw error;
    }
  },
};
