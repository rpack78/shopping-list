// Category Management System
const Categories = {
  categories: [],

  // Load categories from Google Sheets
  async loadCategories() {
    try {
      const range = `${CONFIG.sheets.categoriesSheet}!A2:C`;
      const rows = await SheetsAPI.read(range);

      this.categories = rows.map((row, index) => ({
        rowIndex: index + 2,
        name: row[0] || "",
        storeOrder: parseInt(row[1]) || 999,
        useCount: parseInt(row[2]) || 0,
      }));

      // Sort by useCount (descending) then storeOrder (ascending)
      this.categories.sort((a, b) => {
        if (b.useCount !== a.useCount) {
          return b.useCount - a.useCount;
        }
        return a.storeOrder - b.storeOrder;
      });

      // Cache categories
      this.cacheCategories();

      return this.categories;
    } catch (error) {
      console.error("Error loading categories:", error);
      // Try to load from cache
      return this.loadFromCache();
    }
  },

  // Add new category
  async addCategory(name, storeOrder = 999) {
    try {
      const values = [[name, storeOrder, 0]];
      const range = `${CONFIG.sheets.categoriesSheet}!A:C`;
      await SheetsAPI.append(range, values);

      // Reload categories
      await this.loadCategories();
    } catch (error) {
      console.error("Error adding category:", error);
      throw error;
    }
  },

  // Increment category use count
  async incrementUseCount(categoryName) {
    const category = this.categories.find((c) => c.name === categoryName);
    if (!category) return;

    try {
      const newCount = category.useCount + 1;
      const range = `${CONFIG.sheets.categoriesSheet}!C${category.rowIndex}`;
      await SheetsAPI.write(range, [[newCount]]);

      // Update local cache
      category.useCount = newCount;
      this.cacheCategories();
    } catch (error) {
      console.error("Error incrementing use count:", error);
    }
  },

  // Update category store order
  async updateStoreOrder(categoryName, newOrder) {
    const category = this.categories.find((c) => c.name === categoryName);
    if (!category) return;

    try {
      const range = `${CONFIG.sheets.categoriesSheet}!B${category.rowIndex}`;
      await SheetsAPI.write(range, [[newOrder]]);

      category.storeOrder = newOrder;
      await this.loadCategories();
    } catch (error) {
      console.error("Error updating store order:", error);
      throw error;
    }
  },

  // Update multiple category store orders in batch
  async updateMultipleStoreOrders(updates) {
    try {
      // updates is an array of { name, order } objects
      const updatePromises = updates.map(async ({ name, order }) => {
        const category = this.categories.find((c) => c.name === name);
        if (!category) return;

        const range = `${CONFIG.sheets.categoriesSheet}!B${category.rowIndex}`;
        await SheetsAPI.write(range, [[order]]);
        category.storeOrder = order;
      });

      await Promise.all(updatePromises);
      await this.loadCategories();
    } catch (error) {
      console.error("Error updating multiple store orders:", error);
      throw error;
    }
  },

  // Delete category
  async deleteCategory(categoryName) {
    const category = this.categories.find((c) => c.name === categoryName);
    if (!category) return;

    try {
      const range = `${CONFIG.sheets.categoriesSheet}!A${category.rowIndex}:C${category.rowIndex}`;
      await SheetsAPI.write(range, [["", "", ""]]);
      await this.loadCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      throw error;
    }
  },

  // Get sorted category list for dropdown
  getSortedCategories() {
    return this.categories
      .filter((c) => c.name) // Filter out empty categories
      .sort((a, b) => {
        // Sort by useCount (descending) then storeOrder (ascending)
        if (b.useCount !== a.useCount) {
          return b.useCount - a.useCount;
        }
        return a.storeOrder - b.storeOrder;
      });
  },

  // Cache categories to localStorage
  cacheCategories() {
    try {
      localStorage.setItem(
        CONFIG.app.categoryCacheKey,
        JSON.stringify(this.categories)
      );
    } catch (error) {
      console.error("Error caching categories:", error);
    }
  },

  // Load categories from cache
  loadFromCache() {
    try {
      const cached = localStorage.getItem(CONFIG.app.categoryCacheKey);
      if (cached) {
        this.categories = JSON.parse(cached);
        return this.categories;
      }
    } catch (error) {
      console.error("Error loading from cache:", error);
    }
    return [];
  },

  // Get category by name
  getCategory(name) {
    return this.categories.find((c) => c.name === name);
  },

  // Check if category exists
  categoryExists(name) {
    return this.categories.some(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
  },
};
