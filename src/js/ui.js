// UI Management
const UI = {
  shoppingList: [],
  syncInterval: null,

  // Initialize UI
  async init() {
    this.attachEventListeners();
    this.updateCategoryDropdown();
  },

  // Attach event listeners
  attachEventListeners() {
    // Sign in button
    const signInBtn = document.getElementById("signInBtn");
    if (signInBtn) {
      signInBtn.addEventListener("click", () => App.signIn());
    }

    // Add item
    const addItemBtn = document.getElementById("addItemBtn");
    const itemInput = document.getElementById("itemInput");
    const categorySelect = document.getElementById("categorySelect");

    if (addItemBtn) {
      addItemBtn.addEventListener("click", () => this.addItem());
    }

    if (itemInput) {
      itemInput.addEventListener("keypress", async (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          await this.suggestCategoryFromHistory();
          await this.addItem();
        }
      });

      itemInput.addEventListener("input", () => {
        this.updateAddButtonState();
      });

      // Auto-suggest category based on cleared items history
      itemInput.addEventListener("blur", async () => {
        await this.suggestCategoryFromHistory();
      });
    }

    if (categorySelect) {
      categorySelect.addEventListener("change", () => {
        this.updateAddButtonState();

        // Handle "Add new category" option
        if (categorySelect.value === "__new__") {
          this.showAddCategoryPrompt();
        }
      });
    }

    // Voice button
    const voiceBtn = document.getElementById("voiceBtn");
    if (voiceBtn) {
      voiceBtn.addEventListener("click", () => {
        Voice.startListening();
      });

      // Hide voice button if not supported
      if (!Voice.isSupported()) {
        voiceBtn.style.display = "none";
      }
    }

    // Camera button
    const cameraBtn = document.getElementById("cameraBtn");
    if (cameraBtn) {
      cameraBtn.addEventListener("click", () => {
        this.openOCRModal();
      });
    }

    // Refresh button
    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        this.refreshList();
      });
    }

    // Settings button
    const settingsBtn = document.getElementById("settingsBtn");
    if (settingsBtn) {
      settingsBtn.addEventListener("click", () => {
        this.openCategoryModal();
      });
    }

    // Logout button
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        App.signOut();
      });
    }

    // Clear checked items button
    const clearCheckedBtn = document.getElementById("clearCheckedBtn");
    if (clearCheckedBtn) {
      clearCheckedBtn.addEventListener("click", () => {
        this.clearCheckedItems();
      });
    }

    // Category modal
    const closeCategoryModal = document.getElementById("closeCategoryModal");
    if (closeCategoryModal) {
      closeCategoryModal.addEventListener("click", () => {
        this.closeCategoryModal();
      });
    }

    const addCategoryBtn = document.getElementById("addCategoryBtn");
    if (addCategoryBtn) {
      addCategoryBtn.addEventListener("click", () => {
        this.addNewCategory();
      });
    }

    // Edit modal
    const closeEditModal = document.getElementById("closeEditModal");
    if (closeEditModal) {
      closeEditModal.addEventListener("click", () => {
        this.closeEditModal();
      });
    }

    const saveEditBtn = document.getElementById("saveEditBtn");
    if (saveEditBtn) {
      saveEditBtn.addEventListener("click", () => {
        this.saveEditItem();
      });
    }

    // OCR modal
    const closeOcrModal = document.getElementById("closeOcrModal");
    if (closeOcrModal) {
      closeOcrModal.addEventListener("click", () => {
        this.closeOCRModal();
      });
    }

    const takePhotoBtn = document.getElementById("takePhotoBtn");
    const uploadPhotoBtn = document.getElementById("uploadPhotoBtn");
    const cameraInput = document.getElementById("cameraInput");
    const photoInput = document.getElementById("photoInput");

    if (takePhotoBtn && cameraInput) {
      takePhotoBtn.addEventListener("click", () => {
        cameraInput.click();
      });

      cameraInput.addEventListener("change", (e) => {
        this.handlePhotoSelect(e);
      });
    }

    if (uploadPhotoBtn && photoInput) {
      uploadPhotoBtn.addEventListener("click", () => {
        photoInput.click();
      });

      photoInput.addEventListener("change", (e) => {
        this.handlePhotoSelect(e);
      });
    }
  },

  // Update add button state
  updateAddButtonState() {
    const addItemBtn = document.getElementById("addItemBtn");
    const itemInput = document.getElementById("itemInput");
    const categorySelect = document.getElementById("categorySelect");

    if (addItemBtn && itemInput && categorySelect) {
      const hasItem = itemInput.value.trim().length > 0;
      const hasCategory =
        categorySelect.value && categorySelect.value !== "__new__";
      addItemBtn.disabled = !(hasItem && hasCategory);
    }
  },

  // Suggest category based on cleared items history
  async suggestCategoryFromHistory() {
    const itemInput = document.getElementById("itemInput");
    const categorySelect = document.getElementById("categorySelect");

    if (!itemInput || !categorySelect) return;

    const itemName = itemInput.value.trim();
    if (!itemName) return;

    // Don't override if user already selected a category
    if (categorySelect.value && categorySelect.value !== "__new__") return;

    try {
      const suggestedCategory = await SheetsAPI.findMostRecentCategory(
        itemName
      );

      if (suggestedCategory) {
        // Check if this category exists in the dropdown
        const options = Array.from(categorySelect.options);
        const matchingOption = options.find(
          (opt) => opt.value === suggestedCategory
        );

        if (matchingOption) {
          categorySelect.value = suggestedCategory;
          this.updateAddButtonState();
          console.log(
            `Auto-selected category "${suggestedCategory}" for item "${itemName}"`
          );
        }
      }
    } catch (error) {
      console.error("Error suggesting category:", error);
    }
  },

  // Add item
  async addItem() {
    const itemInput = document.getElementById("itemInput");
    const categorySelect = document.getElementById("categorySelect");

    if (!itemInput || !categorySelect) return;

    const itemName = itemInput.value.trim();
    const category = categorySelect.value;

    if (!itemName || !category || category === "__new__") return;

    try {
      this.showStatus("Adding item...", "info");
      await SheetsAPI.addItem(itemName, category);

      // Clear inputs
      itemInput.value = "";
      categorySelect.value = "";
      this.updateAddButtonState();

      // Refresh list
      await this.refreshList();

      this.showStatus("Item added!", "success");
      setTimeout(() => this.hideStatus(), 2000);
    } catch (error) {
      console.error("Error adding item:", error);
      this.showStatus("Failed to add item", "error");
    }
  },

  // Refresh shopping list
  async refreshList(silent = false) {
    try {
      this.shoppingList = await SheetsAPI.getShoppingList();
      this.renderList();
    } catch (error) {
      console.error("Error refreshing list:", error);
      // Only show error message if not a silent background refresh
      if (!silent) {
        this.showStatus("Failed to refresh list", "error");
      }
    }
  },

  // Render shopping list
  renderList() {
    const container = document.getElementById("listContainer");
    const emptyState = document.getElementById("emptyState");

    if (!container || !emptyState) return;

    // Filter and sort items
    const activeItems = this.shoppingList.filter(
      (item) => !item.checked && item.item
    );
    const checkedItems = this.shoppingList.filter(
      (item) => item.checked && item.item
    );

    // Sort by order
    activeItems.sort((a, b) => a.order - b.order);
    checkedItems.sort((a, b) => a.order - b.order);

    if (activeItems.length === 0 && checkedItems.length === 0) {
      emptyState.classList.remove("hidden");
      container.innerHTML = "";
      return;
    }

    emptyState.classList.add("hidden");

    // Show/hide clear checked button
    const clearCheckedBtn = document.getElementById("clearCheckedBtn");
    if (clearCheckedBtn) {
      if (checkedItems.length > 0) {
        clearCheckedBtn.classList.remove("hidden");
      } else {
        clearCheckedBtn.classList.add("hidden");
      }
    }

    // Group items by category
    const grouped = {};

    [...activeItems, ...checkedItems].forEach((item) => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });

    // Sort category names by storeOrder
    const sortedCategories = Object.keys(grouped).sort((a, b) => {
      const categoryA = Categories.getCategory(a);
      const categoryB = Categories.getCategory(b);
      const orderA = categoryA?.storeOrder ?? 999;
      const orderB = categoryB?.storeOrder ?? 999;
      return orderA - orderB;
    });

    // Render groups in storeOrder
    let html = "";
    for (const category of sortedCategories) {
      html += this.renderCategoryGroup(category, grouped[category]);
    }

    container.innerHTML = html;

    // Attach item event listeners
    this.attachItemEventListeners();
  },

  // Render category group
  renderCategoryGroup(category, items) {
    const itemsHtml = items.map((item) => this.renderItem(item)).join("");

    return `
            <div class="category-group">
                <div class="category-header">${category}</div>
                ${itemsHtml}
            </div>
        `;
  },

  // Render individual item
  renderItem(item) {
    const checkedClass = item.checked ? "checked" : "";
    const checkedAttr = item.checked ? "checked" : "";

    return `
            <div class="list-item ${checkedClass}" data-row="${item.rowIndex}">
                <input
                    type="checkbox"
                    class="item-checkbox"
                    ${checkedAttr}
                    data-row="${item.rowIndex}"
                />
                <div class="item-content" data-row="${
                  item.rowIndex
                }" data-item="${this.escapeHtml(
      item.item
    )}" data-category="${this.escapeHtml(item.category)}">
                    <div class="item-text">${this.escapeHtml(item.item)}</div>
                    <div class="item-meta">
                        ${
                          item.addedBy
                            ? `Added by ${this.escapeHtml(item.addedBy)}`
                            : ""
                        }
                    </div>
                </div>
                <div class="item-actions">
                    <button class="delete-btn" data-row="${
                      item.rowIndex
                    }" title="Delete">🗑️</button>
                </div>
            </div>
        `;
  },

  // Attach item event listeners
  attachItemEventListeners() {
    // Checkboxes
    document.querySelectorAll(".item-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", async (e) => {
        const rowIndex = parseInt(e.target.dataset.row);
        const checked = e.target.checked;
        await this.toggleItemChecked(rowIndex, checked);
      });
    });

    // Item content click to edit
    document.querySelectorAll(".item-content").forEach((content) => {
      content.addEventListener("click", async (e) => {
        const rowIndex = parseInt(e.currentTarget.dataset.row);
        const itemName = e.currentTarget.dataset.item;
        const category = e.currentTarget.dataset.category;
        this.openEditModal(rowIndex, itemName, category);
      });
    });

    // Delete buttons
    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const rowIndex = parseInt(e.target.dataset.row);
        await this.deleteItem(rowIndex);
      });
    });
  },

  // Clear all checked items
  async clearCheckedItems() {
    const checkedCount = this.shoppingList.filter(
      (item) => item.checked
    ).length;

    if (checkedCount === 0) {
      this.showStatus("No checked items to clear", "info");
      setTimeout(() => this.hideStatus(), 2000);
      return;
    }

    if (
      !confirm(
        `Clear ${checkedCount} checked item${checkedCount > 1 ? "s" : ""}?`
      )
    ) {
      return;
    }

    try {
      this.showStatus("Clearing checked items...", "info");
      await SheetsAPI.clearCheckedItems();
      await this.refreshList();
      this.showStatus("Checked items cleared!", "success");
      setTimeout(() => this.hideStatus(), 2000);
    } catch (error) {
      console.error("Error clearing checked items:", error);
      this.showStatus("Failed to clear checked items", "error");
    }
  },

  // Toggle item checked
  async toggleItemChecked(rowIndex, checked) {
    try {
      await SheetsAPI.updateItemChecked(rowIndex, checked);
      await this.refreshList();
    } catch (error) {
      console.error("Error toggling item:", error);
      this.showStatus("Failed to update item", "error");
    }
  },

  // Delete item
  async deleteItem(rowIndex) {
    if (!confirm("Delete this item?")) return;

    try {
      this.showStatus("Deleting item...", "info");
      await SheetsAPI.deleteItem(rowIndex);
      await this.refreshList();
      this.showStatus("Item deleted", "success");
      setTimeout(() => this.hideStatus(), 2000);
    } catch (error) {
      console.error("Error deleting item:", error);
      this.showStatus("Failed to delete item", "error");
    }
  },

  // Open edit modal
  openEditModal(rowIndex, itemName, category) {
    const modal = document.getElementById("editModal");
    const editItemInput = document.getElementById("editItemInput");
    const editCategorySelect = document.getElementById("editCategorySelect");

    if (!modal || !editItemInput || !editCategorySelect) return;

    // Store the current row index
    this.currentEditRowIndex = rowIndex;
    this.currentEditOriginalCategory = category;

    // Set current values
    editItemInput.value = itemName;

    // Populate category dropdown
    const categories = Categories.getSortedCategories();
    let html = "";
    categories.forEach((cat) => {
      const selected = cat.name === category ? "selected" : "";
      html += `<option value="${this.escapeHtml(
        cat.name
      )}" ${selected}>${this.escapeHtml(cat.name)}</option>`;
    });
    editCategorySelect.innerHTML = html;

    // Explicitly set value to ensure it's selected
    if (category) {
      editCategorySelect.value = category;
    }

    // Show modal
    modal.classList.remove("hidden");
    editItemInput.focus();
  },

  // Close edit modal
  closeEditModal() {
    const modal = document.getElementById("editModal");
    if (modal) {
      modal.classList.add("hidden");
    }
    this.currentEditRowIndex = null;
    this.currentEditOriginalCategory = null;
  },

  // Save edited item
  async saveEditItem() {
    const editItemInput = document.getElementById("editItemInput");
    const editCategorySelect = document.getElementById("editCategorySelect");

    if (!editItemInput || !editCategorySelect) return;

    const newItemName = editItemInput.value.trim();
    const newCategory = editCategorySelect.value;

    if (!newItemName || !newCategory) {
      this.showStatus("Please enter item name and select category", "error");
      return;
    }

    try {
      this.showStatus("Saving changes...", "info");

      const categoryChanged = newCategory !== this.currentEditOriginalCategory;

      if (categoryChanged) {
        // If category changed, delete old item and add new one with new category
        // This ensures proper ordering and category grouping
        await SheetsAPI.deleteItem(this.currentEditRowIndex);
        await SheetsAPI.addItem(newItemName, newCategory);
      } else {
        // If category didn't change, just update the item name
        await SheetsAPI.updateItem(
          this.currentEditRowIndex,
          newItemName,
          newCategory
        );
      }

      // Close modal and refresh
      this.closeEditModal();
      await this.refreshList();

      this.showStatus("Item updated!", "success");
      setTimeout(() => this.hideStatus(), 2000);
    } catch (error) {
      console.error("Error updating item:", error);
      this.showStatus("Failed to update item", "error");
    }
  },

  // Update category dropdown
  async updateCategoryDropdown() {
    const categorySelect = document.getElementById("categorySelect");
    if (!categorySelect) return;

    const categories = Categories.getSortedCategories();

    let html = '<option value="">Select category...</option>';

    categories.forEach((category) => {
      html += `<option value="${this.escapeHtml(
        category.name
      )}">${this.escapeHtml(category.name)}</option>`;
    });

    html += '<option value="__new__">➕ Add new category...</option>';

    categorySelect.innerHTML = html;
  },

  // Show status message
  showStatus(message, type = "info") {
    const statusBar = document.getElementById("statusBar");
    const statusText = document.getElementById("statusText");

    if (!statusBar || !statusText) return;

    statusText.textContent = message;
    statusBar.className = `status-bar ${type}`;
    statusBar.classList.remove("hidden");
  },

  // Hide status message
  hideStatus() {
    const statusBar = document.getElementById("statusBar");
    if (statusBar) {
      statusBar.classList.add("hidden");
    }
  },

  // Show add category prompt
  async showAddCategoryPrompt() {
    const categoryName = prompt("Enter new category name:");
    if (!categoryName || !categoryName.trim()) {
      // Reset dropdown
      const categorySelect = document.getElementById("categorySelect");
      if (categorySelect) categorySelect.value = "";
      return;
    }

    const storeOrder = prompt("Enter store order (number):", "99");
    const order = parseInt(storeOrder) || 99;

    try {
      this.showStatus("Adding category...", "info");
      await Categories.addCategory(categoryName.trim(), order);
      await this.updateCategoryDropdown();

      // Select the new category
      const categorySelect = document.getElementById("categorySelect");
      if (categorySelect) {
        categorySelect.value = categoryName.trim();
        this.updateAddButtonState();
      }

      this.showStatus("Category added!", "success");
      setTimeout(() => this.hideStatus(), 2000);
    } catch (error) {
      console.error("Error adding category:", error);
      this.showStatus("Failed to add category", "error");
    }
  },

  // Open category management modal
  openCategoryModal() {
    const modal = document.getElementById("categoryModal");
    if (modal) {
      this.renderCategoryList();
      modal.classList.remove("hidden");
    }
  },

  // Close category modal
  closeCategoryModal() {
    const modal = document.getElementById("categoryModal");
    if (modal) {
      modal.classList.add("hidden");
    }
  },

  // Render category list in modal
  renderCategoryList() {
    const categoryList = document.getElementById("categoryList");
    if (!categoryList) return;

    // Sort categories by storeOrder (ascending)
    const categories = Categories.categories
      .filter((c) => c.name)
      .sort((a, b) => a.storeOrder - b.storeOrder);

    const html = categories
      .map(
        (category) => `
            <div class="category-item" draggable="true" data-category-name="${this.escapeHtml(
              category.name
            )}">
                <div class="drag-handle">⋮⋮</div>
                <div class="category-info">
                    <div class="category-name">${this.escapeHtml(
                      category.name
                    )}</div>
                    <div class="category-stats">
                        Order: ${category.storeOrder} | Used: ${
          category.useCount
        } times
                    </div>
                </div>
            </div>
        `
      )
      .join("");

    categoryList.innerHTML = html;
    
    // Attach drag event listeners
    this.attachDragListeners();
  },

  // Attach drag and drop event listeners for category reordering
  attachDragListeners() {
    const categoryItems = document.querySelectorAll(".category-item");
    let draggedElement = null;

    categoryItems.forEach((item) => {
      item.addEventListener("dragstart", (e) => {
        draggedElement = e.currentTarget;
        e.currentTarget.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      });

      item.addEventListener("dragend", (e) => {
        e.currentTarget.classList.remove("dragging");
        document.querySelectorAll(".category-item").forEach((el) => {
          el.classList.remove("drag-over");
        });
      });

      item.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";

        const afterElement = this.getDragAfterElement(
          e.currentTarget.parentElement,
          e.clientY
        );
        if (afterElement == null) {
          e.currentTarget.parentElement.appendChild(draggedElement);
        } else {
          e.currentTarget.parentElement.insertBefore(
            draggedElement,
            afterElement
          );
        }
      });

      item.addEventListener("drop", async (e) => {
        e.preventDefault();
        await this.updateCategoryOrder();
      });
    });
  },

  // Get the element to insert the dragged element after
  getDragAfterElement(container, y) {
    const draggableElements = [
      ...container.querySelectorAll(".category-item:not(.dragging)"),
    ];

    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element;
  },

  // Update category order after drag and drop
  async updateCategoryOrder() {
    const categoryList = document.getElementById("categoryList");
    if (!categoryList) return;

    const categoryItems = categoryList.querySelectorAll(".category-item");
    const updates = [];

    // Collect updates for all categories
    categoryItems.forEach((item, index) => {
      const categoryName = item.dataset.categoryName;
      const newOrder = (index + 1) * 10; // Use multiples of 10 for easier reordering
      updates.push({ name: categoryName, order: newOrder });
    });

    try {
      await Categories.updateMultipleStoreOrders(updates);
      this.renderCategoryList();
      this.showStatus("Category order updated!", "success");
      setTimeout(() => this.hideStatus(), 2000);
    } catch (error) {
      console.error("Error updating category order:", error);
      this.showStatus("Failed to update order", "error");
      setTimeout(() => this.hideStatus(), 2000);
    }
  },

  // Add new category from modal
  async addNewCategory() {
    const nameInput = document.getElementById("newCategoryName");
    const orderInput = document.getElementById("newCategoryOrder");

    if (!nameInput || !orderInput) return;

    const name = nameInput.value.trim();
    const order = parseInt(orderInput.value) || 99;

    if (!name) {
      alert("Please enter a category name");
      return;
    }

    try {
      await Categories.addCategory(name, order);
      await this.updateCategoryDropdown();
      this.renderCategoryList();

      // Clear inputs
      nameInput.value = "";
      orderInput.value = "";

      this.showStatus("Category added!", "success");
      setTimeout(() => this.hideStatus(), 2000);
    } catch (error) {
      console.error("Error adding category:", error);
      alert("Failed to add category");
    }
  },

  // Open OCR modal
  openOCRModal() {
    const modal = document.getElementById("ocrModal");
    if (modal) {
      modal.classList.remove("hidden");
    }
  },

  // Close OCR modal
  closeOCRModal() {
    const modal = document.getElementById("ocrModal");
    if (modal) {
      modal.classList.add("hidden");

      // Reset modal content
      const preview = document.getElementById("ocrPreview");
      const loading = document.getElementById("ocrLoading");
      const results = document.getElementById("ocrResults");

      if (preview) preview.classList.add("hidden");
      if (loading) loading.classList.add("hidden");
      if (results) results.classList.add("hidden");

      // Reset file input to allow selecting the same file again
      const photoInput = document.getElementById("photoInput");
      if (photoInput) photoInput.value = "";
      
      const cameraInput = document.getElementById("cameraInput");
      if (cameraInput) cameraInput.value = "";
    }
  },

  // Handle photo selection
  async handlePhotoSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      // Validate file
      Vision.validateImageFile(file);

      // Show preview
      const preview = document.getElementById("ocrPreview");
      const previewImage = document.getElementById("previewImage");
      if (preview && previewImage) {
        const imageUrl = URL.createObjectURL(file);
        previewImage.src = imageUrl;
        preview.classList.remove("hidden");
      }

      // Show loading
      const loading = document.getElementById("ocrLoading");
      if (loading) loading.classList.remove("hidden");

      // Resize image if needed
      const resizedFile = await Vision.resizeImage(file);

      // Convert to base64
      const base64 = await Vision.fileToBase64(resizedFile);

      // Process with Vision API
      const items = await Vision.processImage(base64);

      // Hide loading
      if (loading) loading.classList.add("hidden");

      // Show results
      await this.renderOCRResults(items);
    } catch (error) {
      console.error("Error processing photo:", error);
      
      // Show user-friendly error message
      const errorTitle = "Unable to Process Image";
      const errorMessage = error.message || "An unknown error occurred";
      
      // Use a more informative dialog if possible
      if (confirm(`${errorTitle}\n\n${errorMessage}\n\nWould you like to see the configuration guide?`)) {
        window.open('https://console.cloud.google.com/apis/library/vision.googleapis.com', '_blank');
      }

      const loading = document.getElementById("ocrLoading");
      if (loading) loading.classList.add("hidden");
    }
  },

  // Render OCR results
  async renderOCRResults(items) {
    const results = document.getElementById("ocrResults");
    if (!results) return;

    if (items.length === 0) {
      results.innerHTML = "<p>No items detected in image.</p>";
      results.classList.remove("hidden");
      return;
    }

    // Look up categories for all items from Cleared Items history
    const itemCategories = await Promise.all(
      items.map(async (item) => {
        try {
          const category = await SheetsAPI.findMostRecentCategory(item);
          return category;
        } catch (error) {
          console.error(`Error finding category for "${item}":`, error);
          return null;
        }
      })
    );

    const html = `
            <h3>Found ${items.length} items:</h3>
            ${items
              .map(
                (item, index) => `
                <div class="ocr-item">
                    <input type="checkbox" id="ocr-item-${index}" checked>
                    <div class="ocr-item-content">
                        <input type="text" value="${this.escapeHtml(
                          item
                        )}" id="ocr-text-${index}">
                        <select id="ocr-category-${index}">
                            <option value="">Select category...</option>
                            ${Categories.getSortedCategories()
                              .map(
                                (cat) =>
                                  `<option value="${this.escapeHtml(
                                    cat.name
                                  )}" ${
                                    itemCategories[index] === cat.name
                                      ? "selected"
                                      : ""
                                  }>${this.escapeHtml(cat.name)}</option>`
                              )
                              .join("")}
                        </select>
                    </div>
                </div>
            `
              )
              .join("")}
            <button class="primary-btn" id="addOcrItemsBtn" style="margin-top: 1rem;">Add Selected Items</button>
        `;

    results.innerHTML = html;
    results.classList.remove("hidden");

    // Attach event listener to add button
    const addBtn = document.getElementById("addOcrItemsBtn");
    if (addBtn) {
      addBtn.addEventListener("click", () => this.addOCRItems(items.length));
    }
  },

  // Add OCR items
  async addOCRItems(count) {
    const addedItems = [];

    for (let i = 0; i < count; i++) {
      const checkbox = document.getElementById(`ocr-item-${i}`);
      const textInput = document.getElementById(`ocr-text-${i}`);
      const categorySelect = document.getElementById(`ocr-category-${i}`);

      if (checkbox && checkbox.checked && textInput && categorySelect) {
        const item = textInput.value.trim();
        const category = categorySelect.value;

        if (item && category) {
          addedItems.push({ item, category });
        }
      }
    }

    if (addedItems.length === 0) {
      alert("Please select at least one item and assign categories");
      return;
    }

    try {
      this.showStatus(`Adding ${addedItems.length} items...`, "info");

      for (const { item, category } of addedItems) {
        await SheetsAPI.addItem(item, category);
      }

      this.closeOCRModal();
      await this.refreshList();

      this.showStatus(`Added ${addedItems.length} items!`, "success");
      setTimeout(() => this.hideStatus(), 3000);
    } catch (error) {
      console.error("Error adding OCR items:", error);
      this.showStatus("Failed to add some items", "error");
    }
  },

  // Start auto-sync
  startAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      this.refreshList(true); // Silent refresh during auto-sync
    }, CONFIG.app.syncInterval);
  },

  // Stop auto-sync
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  },

  // Escape HTML
  escapeHtml(text) {
    if (!text && text !== 0) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },
};
