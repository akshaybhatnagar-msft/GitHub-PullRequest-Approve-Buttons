# GitHub PR Quick Actions

A Chrome extension that adds quick-action buttons to GitHub pull request pages for common operations that are typically buried in submenus.

## Features

- **Review Dropdown** - Submit reviews with a single click
  - Approve
  - Comment
  - Request Changes
  - Opens a modal for adding optional/required comments

- **Actions Dropdown** - Common PR operations
  - Squash & Merge
  - Enable/Disable Auto-Merge (toggles based on current state)
  - Close PR

- **Comment Count** - Displays the number of review comments across all files

- **Dark Mode Support** - Matches GitHub's theme automatically

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select the repository folder

## Configuration

1. Click the extension icon in the Chrome toolbar
2. Generate a GitHub Personal Access Token at https://github.com/settings/tokens/new
   - Required scope: `repo` (for private repositories) or `public_repo` (for public only)
   - If your organization uses SAML SSO, authorize the token for your org after creation
3. Paste the token and click **Save Token**

## Usage

Navigate to any GitHub pull request page. The quick action buttons will appear in the PR header area.

- **Review** - Click to open dropdown, select review type, add optional comment in modal, submit
- **Actions** - Click to open dropdown, select action (with confirmation for destructive operations)

## Security

The Personal Access Token is stored using `chrome.storage.sync`:
- Isolated per extension (other extensions cannot access it)
- Not accessible to websites or page scripts
- Encrypted in transit when syncing across devices
- Stored unencrypted in Chrome's profile directory on disk

For maximum security, consider:
- Using a token with minimal required scopes
- Regularly rotating your token
- Not syncing Chrome data if you don't need cross-device access

## Files

| File | Description |
|------|-------------|
| `manifest.json` | Extension configuration (Manifest V3) |
| `background.js` | Service worker handling GitHub API calls |
| `content.js` | DOM injection and UI logic |
| `content.css` | Styling (GitHub Primer-inspired) |
| `popup.html` | PAT configuration popup UI |
| `popup.js` | Popup logic and token validation |

## API Endpoints Used

| Action | Method | Endpoint |
|--------|--------|----------|
| Submit Review | POST | `/repos/{owner}/{repo}/pulls/{pull_number}/reviews` |
| Close PR | PATCH | `/repos/{owner}/{repo}/pulls/{pull_number}` |
| Squash & Merge | PUT | `/repos/{owner}/{repo}/pulls/{pull_number}/merge` |
| Enable Auto-Merge | GraphQL | `enablePullRequestAutoMerge` mutation |
| Disable Auto-Merge | GraphQL | `disablePullRequestAutoMerge` mutation |
| Get PR Details | GraphQL | Query for auto-merge status and comment counts |

## License

MIT
