// Google Vision API for OCR
const Vision = {
  // Process image with Google Vision API
  async processImage(imageData) {
    try {
      // Remove data URL prefix if present
      const base64Image = imageData.replace(/^data:image\/\w+;base64,/, "");

      const requestBody = {
        requests: [
          {
            image: {
              content: base64Image,
            },
            features: [
              {
                type: "TEXT_DETECTION",
                maxResults: 1,
              },
            ],
          },
        ],
      };

      const response = await fetch(
        `${CONFIG.vision.endpoint}?key=${CONFIG.vision.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        // Get detailed error message
        let errorMessage = 'Vision API error';
        
        switch (response.status) {
          case 400:
            errorMessage = 'Invalid request to Vision API. Please try a different image.';
            break;
          case 401:
            errorMessage = 'Vision API key is invalid. Please check your API configuration.';
            break;
          case 403:
            errorMessage = 'Vision API access denied. Please ensure:\n1. Cloud Vision API is enabled in Google Cloud Console\n2. API key has proper permissions\n3. Billing is enabled (required for Vision API)\n4. Domain restrictions allow your website';
            break;
          case 429:
            errorMessage = 'Vision API quota exceeded. Please try again later.';
            break;
          case 500:
          case 503:
            errorMessage = 'Vision API is temporarily unavailable. Please try again in a moment.';
            break;
          default:
            errorMessage = `Vision API error: ${response.status}`;
        }
        
        // Try to get more details from response
        try {
          const errorData = await response.json();
          if (errorData.error && errorData.error.message) {
            errorMessage += `\n\nDetails: ${errorData.error.message}`;
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (
        data.responses &&
        data.responses[0] &&
        data.responses[0].textAnnotations
      ) {
        const fullText = data.responses[0].textAnnotations[0].description;
        return this.parseTextToItems(fullText);
      }

      return [];
    } catch (error) {
      console.error("Error processing image:", error);
      throw error;
    }
  },

  // Parse detected text into individual items
  parseTextToItems(text) {
    if (!text) return [];

    // Split by newlines and clean up
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .filter((line) => {
        // Filter out very short lines (likely noise)
        return line.length > 2;
      })
      .map((line) => {
        // Remove common list markers
        return line
          .replace(/^[-•*]\s*/, "")
          .replace(/^\d+[\.)]\s*/, "")
          .trim();
      })
      .filter((line) => line.length > 0);

    // Remove duplicates (case-insensitive)
    const uniqueLines = [];
    const seen = new Set();

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        uniqueLines.push(line);
      }
    }

    return uniqueLines;
  },

  // Convert file to base64
  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  // Validate image file
  validateImageFile(file) {
    // Check file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      throw new Error("Please select a valid image file (JPEG, PNG, or WebP)");
    }

    // Check file size (max 4MB for Vision API)
    const maxSize = 4 * 1024 * 1024; // 4MB
    if (file.size > maxSize) {
      throw new Error(
        "Image file is too large. Please select an image under 4MB"
      );
    }

    return true;
  },

  // Resize image if needed
  async resizeImage(file, maxWidth = 1024, maxHeight = 1024) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              resolve(new File([blob], file.name, { type: "image/jpeg" }));
            },
            "image/jpeg",
            0.9
          );
        };

        img.onerror = reject;
        img.src = e.target.result;
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },
};
