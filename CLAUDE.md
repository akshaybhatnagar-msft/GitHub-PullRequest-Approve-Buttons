# Claude Context File

This file captures the context and decisions made during development to help future Claude sessions understand the project.

## Project Overview

**GitHub PR Quick Actions** is a Chrome/Edge extension that adds quick-action buttons to GitHub pull request pages. It eliminates the need to navigate through submenus for common PR operations.

## Key Features Implemented

1. **Review Dropdown** - Approve, Comment, Request Changes
   - Opens a modal for adding optional/required comments
   - Request Changes requires a comment (validation enforced)
   - Supports Ctrl/Cmd + Enter to submit

2. **Actions Dropdown** - Squash & Merge, Auto-Merge, Close PR
   - Auto-merge toggles between Enable/Disable based on current PR state
   - Destructive actions (merge, close) have confirmation dialogs

3. **Comment Count** - Shows number of review comments across all files

4. **Dark Mode** - Automatically matches GitHub's theme

## Technical Decisions

### Authentication
- Uses GitHub Personal Access Token (PAT)
- Stored in `chrome.storage.sync`
- Token is validated on save by calling GitHub API `/user` endpoint
- Required scopes: `repo` (private) or `public_repo` (public only)
- SAML SSO: Users must authorize token for their org after creation

### API Integration
- REST API for: Submit Review, Close PR, Squash & Merge
- GraphQL API for: Enable/Disable Auto-Merge, Get PR Details (auto-merge status, comment counts)

### Button Placement
- Buttons inject into `.gh-header-actions` area (near Edit button)
- Falls back to floating toolbar if header not found
- Uses MutationObserver with debouncing to handle GitHub's SPA navigation

### Security (see THREATMODEL.md)
- Token isolated per extension (other extensions can't access)
- Not accessible to websites/page scripts
- Encrypted in transit when syncing
- **NOT encrypted at rest** on disk (Chrome profile directory)
- User was informed of threat model and accepted the trade-offs

## File Structure

```
├── manifest.json          # Manifest V3 configuration
├── background.js          # Service worker for GitHub API calls
├── content.js             # DOM injection, button logic, modal
├── content.css            # Styling with dark mode support
├── popup.html             # PAT configuration UI
├── popup.js               # Popup logic and token validation
├── icons/                 # Extension icons (16, 48, 128 PNG)
├── screenshots/           # README screenshots
├── store-assets/          # Chrome/Edge store submission assets
├── docs/                  # GitHub Pages landing page
├── README.md              # User-focused documentation
├── THREATMODEL.md         # Security documentation
└── CLAUDE.md              # This file
```

## Store Publishing Status

### Assets Created
- `store-assets/extension.zip` - Ready for upload
- `store-assets/promo-small-440x280.png` - Small promotional tile
- `store-assets/promo-large-920x680.png` - Large promotional tile
- `store-assets/promo-marquee-1400x560.png` - Marquee tile
- `store-assets/screenshot-1280x800.png` - Store screenshot
- `store-assets/STORE_LISTING.md` - Description, tags, listing info
- `icons/icon128.png` - Store icon (128x128)

### URLs for Store Submission
- **Homepage:** `https://akshaybhatnagar-msft.github.io/GitHub-QuickActions/`
- **Support:** `https://github.com/akshaybhatnagar-msft/GitHub-QuickActions/issues`

### Publishing Steps
1. **Chrome Web Store:** https://chrome.google.com/webstore/devconsole ($5 fee)
2. **Edge Add-ons:** https://partner.microsoft.com/dashboard/microsoftedge (free, requires developer registration)

## Analytics

User decided to use built-in store dashboard metrics (no code changes needed):
- Total users / Weekly active users
- Install/uninstall trends
- Geographic distribution
- Ratings and reviews

No custom analytics or tracking implemented.

## Video Script (Not Committed)

A video script was created at `store-assets/VIDEO_SCRIPT.md` (gitignored) for potential promotional video. Research was done on AI video generation tools:
- Runway Gen-4 recommended for image-to-video
- Google Veo for high-quality output
- Pika for free experimentation

## Repository Notes

- Repo was renamed on GitHub to `GitHub-QuickActions` (originally `approveButtons`)
- Local folder is still `approveButtons`
- GitHub Pages enabled from `/docs` folder on `master` branch

## Future Enhancements (Not Implemented)

These were discussed but not built:
- OAuth App flow (more secure than PAT but complex)
- Session-only token storage (more secure but worse UX)
- Custom analytics (would require privacy policy)

## Commands for Development

```bash
# Load extension in Chrome
# 1. Go to chrome://extensions
# 2. Enable Developer mode
# 3. Click "Load unpacked" and select this folder

# Create new store ZIP (if files change)
node -e "
const archiver = require('archiver');
const fs = require('fs');
const output = fs.createWriteStream('./store-assets/extension.zip');
const archive = archiver('zip', { zlib: { level: 9 } });
archive.pipe(output);
archive.file('manifest.json', { name: 'manifest.json' });
archive.file('background.js', { name: 'background.js' });
archive.file('content.js', { name: 'content.js' });
archive.file('content.css', { name: 'content.css' });
archive.file('popup.html', { name: 'popup.html' });
archive.file('popup.js', { name: 'popup.js' });
archive.directory('icons/', 'icons');
archive.finalize();
"

# Convert SVG to PNG (requires sharp)
npm install sharp --save-dev
node -e "const sharp = require('sharp'); sharp('input.svg').resize(128,128).png().toFile('output.png');"
```

## Owner

Repository owned by: akshaybhatnagar-msft
