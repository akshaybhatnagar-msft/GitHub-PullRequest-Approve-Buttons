# GitHub PR Quick Actions

A Chrome extension that adds quick-action buttons to GitHub pull request pages for common operations that are typically buried in submenus.

## Features

- **Review** - Quickly approve, comment, or request changes on PRs
- **Squash & Merge** - One-click merge with squash
- **Auto-Merge** - Enable or disable auto-merge
- **Close PR** - Close pull requests directly
- **Comment Count** - See how many review comments are on the PR
- **Dark Mode** - Automatically matches GitHub's theme

## Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** and select the repository folder

## Setup

### Step 1: Add Your GitHub Token

Click the extension icon to open the configuration popup:

![Add PAT Token](screenshots/Step1_Add_PAT_token.png)

1. Go to [GitHub Settings > Tokens](https://github.com/settings/tokens/new) and create a new token
   - Select scope: `repo` (private repos) or `public_repo` (public only)
   - If using SAML SSO, authorize the token for your organization
2. Paste the token and click **Save Token**

You'll see "PAT configured" when successful:

![PAT Configured](screenshots/Step1_PAT_token_added.png)

### Step 2: Use on Any PR

Navigate to any GitHub pull request. The **Review** and **Actions** buttons appear in the header:

![Buttons on PR](screenshots/Step2_ButtonsShowUp.png)

## Security

Your GitHub token is stored securely in Chrome's extension storage. See [THREATMODEL.md](THREATMODEL.md) for details.

## License

MIT
