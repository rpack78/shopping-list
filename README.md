# Shopping List PWA 🛒

A Progressive Web App that replaces Alexa shopping lists with voice input, OCR scanning, and Google Sheets as a free backend. Share your shopping list with multiple users without any monthly hosting costs.

## Features

✅ **Voice Input** - Add items using your voice with Web Speech API
✅ **Photo OCR** - Scan handwritten or printed lists with Google Vision API
✅ **Real-time Sync** - Google Sheets backend shared between users
✅ **Smart Categories** - Learning system that prioritizes frequently used categories
✅ **Offline Support** - Works offline with service worker, syncs when online
✅ **PWA Installable** - Install on mobile devices like a native app
✅ **Free Hosting** - No server costs, host on GitHub Pages/Netlify/Vercel

## Demo

[Live Demo](https://your-username.github.io/shopping-list) _(update this after deployment)_

## Setup Instructions

### 1. Google Cloud Console Setup

#### A. Create a New Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "Shopping List" and create

#### B. Enable APIs

1. In the sidebar, go to "APIs & Services" → "Library"
2. Search for and enable:
   - **Google Sheets API**
   - **Google Cloud Vision API**

#### C. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Configure consent screen if prompted:
   - User Type: External
   - App name: Shopping List
   - User support email: your email
   - Developer contact: your email
4. Create OAuth client ID:
   - Application type: Web application
   - Name: Shopping List Web Client
   - Authorized JavaScript origins:
     - `http://localhost:8000` (for local testing)
     - `https://your-username.github.io` (for production)
   - Authorized redirect URIs:
     - `http://localhost:8000`
     - `https://your-username.github.io/shopping_list`
5. Copy the **Client ID**

#### D. Create API Key for Vision API

1. Still in "Credentials", click "Create Credentials" → "API key"
2. Copy the **API key**
3. Click "Edit API key" and restrict it:
   - Application restrictions: HTTP referrers
   - Website restrictions: Add your domain
   - API restrictions: Restrict key → Select "Cloud Vision API"

### 2. Create Google Spreadsheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet named "Shopping List"
3. Create two sheets:

#### Sheet 1: "Shopping List"

Add headers in row 1:

```
item | category | checked | addedBy | timestamp | order
```

#### Sheet 2: "Categories"

Add headers in row 1:

```
category | storeOrder | useCount
```

Add default categories:

```
Produce     | 1 | 0
Dairy       | 2 | 0
Meat        | 3 | 0
Bakery      | 4 | 0
Frozen      | 5 | 0
Pantry      | 6 | 0
Beverages   | 7 | 0
Snacks      | 8 | 0
Other       | 9 | 0
```

4. Copy the **Spreadsheet ID** from the URL:

   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
   ```

5. **Share the spreadsheet** with anyone you want to access the list (give them Editor permissions)

### 3. Configure the App

Edit `src/js/config.js` and replace the placeholder values:

```javascript
const CONFIG = {
  google: {
    clientId: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
    apiKey: "YOUR_GOOGLE_API_KEY",
    // ... rest stays the same
  },
  sheets: {
    spreadsheetId: "YOUR_SPREADSHEET_ID",
    // ... rest stays the same
  },
  vision: {
    apiKey: "YOUR_VISION_API_KEY",
    // ... rest stays the same
  },
};
```

### 4. Generate PWA Icons

You need to create icons for the PWA. Use a tool like [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator) or create them manually:

Required sizes:

- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512

Save them to `src/assets/icons/` with names like `icon-192x192.png`.

For a quick solution, you can use an emoji as your icon:

1. Go to [Favicon.io](https://favicon.io/emoji-favicons/)
2. Choose the 🛒 emoji
3. Download and extract to `src/assets/icons/`

### 5. Test Locally

1. Install a local web server:

   ```bash
   # Using Python 3
   python3 -m http.server 8000

   # Or using Node.js
   npx serve
   ```

2. Open browser to `http://localhost:8000`

3. Sign in with your Google account

4. Test adding items, voice input, and categories

### 6. Deploy (Choose One)

#### Option A: GitHub Pages (Free)

1. Create a new GitHub repository
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/your-username/shopping-list.git
   git push -u origin main
   ```
3. Go to repository Settings → Pages
4. Source: Deploy from branch `main` / root
5. Your app will be at `https://your-username.github.io/shopping-list`

#### Option B: Netlify (Free)

1. Create account at [Netlify](https://www.netlify.com/)
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repo
4. Deploy settings:
   - Build command: (leave empty)
   - Publish directory: `/`
5. Deploy!

#### Option C: Vercel (Free)

1. Create account at [Vercel](https://vercel.com/)
2. Click "New Project"
3. Import your GitHub repo
4. Deploy with default settings

### 7. Update OAuth Redirect URIs

After deploying, update your Google OAuth credentials:

1. Go back to Google Cloud Console → Credentials
2. Edit your OAuth 2.0 Client ID
3. Add your production URL to:
   - Authorized JavaScript origins
   - Authorized redirect URIs

## Usage

### Adding Items

**Manual Entry:**

1. Type item name in the input field
2. Select a category from the dropdown
3. Click "Add" button

**Voice Input:**

1. Click the microphone 🎤 button
2. Say the item name (e.g., "Milk" or "Add eggs")
3. Select category from dropdown
4. Click "Add"

**Photo Scanning:**

1. Click the camera 📷 button
2. Take a photo or upload an image of a shopping list
3. Review detected items
4. Assign categories to each item
5. Click "Add Selected Items"

### Managing Items

- **Check off items** - Click the checkbox (checked items move to bottom)
- **Delete items** - Click the 🗑️ trash icon
- **Refresh list** - Click the 🔄 refresh button
- **View categories** - Click the ⚙️ settings button

### Managing Categories

1. Click the ⚙️ settings button
2. View all categories with usage statistics
3. Add new categories with custom store order
4. Categories are automatically sorted by usage frequency

### Offline Mode

- The app works offline after the first visit
- Changes are queued and synced when back online
- You'll see an "offline" indicator when disconnected

### Installing as PWA

**iOS (Safari):**

1. Open the app in Safari
2. Tap the Share button
3. Scroll down and tap "Add to Home Screen"

**Android (Chrome):**

1. Open the app in Chrome
2. Tap the menu (⋮)
3. Tap "Install app" or "Add to Home Screen"

**Desktop (Chrome/Edge):**

1. Look for the install icon in the address bar
2. Click it and confirm installation

## Sharing with Family/Friends

1. Open your Google Spreadsheet
2. Click the "Share" button (top right)
3. Add their email addresses
4. Give them "Editor" permission
5. They can now access the app and see real-time updates!

## Customization

### Change Categories

Edit the default categories in [src/js/sheets.js](src/js/sheets.js#L157) or add them through the UI.

### Adjust Sync Interval

Edit `syncInterval` in [src/js/config.js](src/js/config.js) (default: 10 seconds).

### Modify Colors

Edit CSS variables in [src/css/styles.css](src/css/styles.css) in the `:root` selector.

### Store Layout

Reorder categories to match your grocery store's layout using the store order number (1 = first section, 9 = last section).

## Troubleshooting

### "API not enabled" error

- Make sure you enabled both Google Sheets API and Google Vision API in Cloud Console

### "Access denied" error

- Check that your spreadsheet is shared with your Google account
- Verify the spreadsheet ID in config.js is correct

### Voice input not working

- Voice input only works on HTTPS or localhost
- Check browser console for errors
- Some browsers don't support Web Speech API (works in Chrome/Edge/Safari)

### OCR not detecting text

- Ensure the image is clear and well-lit
- Make sure you enabled billing in Google Cloud (free tier is enough)
- Check that Vision API is enabled and API key is correct

### Service worker not updating

- Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
- Clear browser cache
- Unregister old service workers in DevTools → Application → Service Workers

## Cost Analysis

**Completely Free:**

- Google Sheets API: Free (read/write quotas are more than enough)
- Web Speech API: Free (browser-based)
- Hosting: Free on GitHub Pages/Netlify/Vercel

**Free Tier (should stay free for normal use):**

- Google Vision API: 1,000 requests/month free
  - After that: $1.50 per 1,000 images
  - For a family using OCR 2-3 times/week: ~10-15 requests/month = FREE

**Total monthly cost for typical use: $0.00** 🎉

## Browser Support

- ✅ Chrome (Desktop & Mobile)
- ✅ Edge (Desktop & Mobile)
- ✅ Safari (Desktop & Mobile)
- ⚠️ Firefox (No voice input support)
- ⚠️ Opera (Limited support)

## Privacy & Security

- All data is stored in YOUR Google Spreadsheet
- No third-party servers storing your data
- Google authentication via OAuth 2.0
- All connections use HTTPS
- You control who has access via Google Sheets sharing

## Contributing

Feel free to fork this project and customize it for your needs! Some ideas:

- Add quantity fields for items
- Implement recipe integration
- Add price tracking
- Create multiple lists (by store)
- Add barcode scanning
- Implement shopping history

## License

MIT License - Feel free to use and modify!

## Credits

Built with:

- Google Sheets API
- Google Cloud Vision API
- Web Speech API
- Service Worker API
- Vanilla JavaScript (no frameworks!)

## Support

If you encounter issues:

1. Check the browser console for errors
2. Verify all configuration steps were completed
3. Test with a fresh Google Spreadsheet
4. Open an issue on GitHub with details

---

**Made with ❤️ for families who want a simple, free shopping list alternative**
