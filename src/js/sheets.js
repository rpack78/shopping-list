// Google Sheets API Integration
const SheetsAPI = {
  isAuthenticated: false,
  tokenClient: null,
  accessToken: null,
  userInfo: null,
  AUTH_STORAGE_KEY: "shopping_list_auth",
  AUTH_EXPIRY_HOURS: 24,
  AUTH_VERSION: 2, // Increment this when scopes change to force re-auth

  // Initialize Google API
  async init() {
    return new Promise((resolve, reject) => {
      // Load Google API client
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

      // Load Google Identity Services
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
              if (window.onAuthSuccess) {
                window.onAuthSuccess();
              }
            }
          },
        });

        // Try to restore authentication from storage
        this.restoreAuthFromStorage();
      };
      document.head.appendChild(gsiScript);
    });
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
  restoreAuthFromStorage() {
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
      const maxAge = this.AUTH_EXPIRY_HOURS * 60 * 60 * 1000; // Convert hours to milliseconds

      // Check if token is still valid (less than 24 hours old)
      if (age < maxAge && authData.accessToken) {
        this.accessToken = authData.accessToken;
        gapi.client.setToken({ access_token: authData.accessToken });
        this.isAuthenticated = true;
        console.log("Restored authentication from storage");

        // Trigger auth success callback
        if (window.onAuthSuccess) {
          window.onAuthSuccess();
        }
        return true;
      } else {
        // Token expired, clear storage
        console.log("Stored token expired, clearing...");
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
  async read(range) {
    try {
      const response = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: CONFIG.sheets.spreadsheetId,
        range: range,
      });
      return response.result.values || [];
    } catch (error) {
      console.error("Error reading from sheet:", error);
      throw error;
    }
  },

  // Write to spreadsheet
  async write(range, values) {
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
      throw error;
    }
  },

  // Append to spreadsheet
  async append(range, values) {
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
      throw error;
    }
  },

  // Delete rows
  async deleteRow(sheetId, rowIndex) {
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
      throw error;
    }
  },

  // Get all shopping list items
  async getShoppingList() {
    const range = `${CONFIG.sheets.shoppingListSheet}!A2:F`;
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

    const range = `${CONFIG.sheets.shoppingListSheet}!A:F`;
    await this.append(range, values);

    // Increment category use count
    await Categories.incrementUseCount(category);
  },

  // Update item checked status
  async updateItemChecked(rowIndex, checked) {
    const order = checked ? Date.now() + 999999999999 : Date.now(); // Checked items go to bottom
    const range = `${CONFIG.sheets.shoppingListSheet}!C${rowIndex}:F${rowIndex}`;
    const values = [[checked, "", "", order]];
    await this.write(range, values);
  },

  // Update item
  async updateItem(rowIndex, item, category) {
    const range = `${CONFIG.sheets.shoppingListSheet}!A${rowIndex}:B${rowIndex}`;
    const values = [[item, category]];
    await this.write(range, values);
  },

  // Delete item
  async deleteItem(rowIndex) {
    // Note: This is simplified. In production, you'd need to get the sheet ID first
    // For now, we'll just clear the row
    const range = `${CONFIG.sheets.shoppingListSheet}!A${rowIndex}:F${rowIndex}`;
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
    const range = `${CONFIG.sheets.clearedItemsSheet}!A:D`;
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
      const shoppingListRange = `${CONFIG.sheets.shoppingListSheet}!A1:F1`;
      const categoriesRange = `${CONFIG.sheets.categoriesSheet}!A1:C1`;
      const clearedItemsRange = `${CONFIG.sheets.clearedItemsSheet}!A1:D1`;

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
          `${CONFIG.sheets.categoriesSheet}!A:C`,
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
