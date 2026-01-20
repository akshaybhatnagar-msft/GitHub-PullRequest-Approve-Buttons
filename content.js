// GitHub PR Quick Actions - Content Script

(function() {
  'use strict';

  const TOOLBAR_ID = 'gh-pr-quick-actions-toolbar';
  const MODAL_ID = 'gh-pr-quick-actions-modal';
  let isInjecting = false;
  let prDetails = null; // Cache PR details

  // Parse PR info from URL
  function getPRInfo() {
    const match = window.location.pathname.match(/^\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (!match) return null;
    return {
      owner: match[1],
      repo: match[2],
      pullNumber: match[3]
    };
  }

  // Send message to background script
  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Unknown error'));
        }
      });
    });
  }

  // Show toast notification
  function showToast(message, type = 'success') {
    const existing = document.querySelector('.gh-pr-quick-actions-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `gh-pr-quick-actions-toast gh-pr-quick-actions-toast--${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('gh-pr-quick-actions-toast--visible'), 10);
    setTimeout(() => {
      toast.classList.remove('gh-pr-quick-actions-toast--visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Create and show the review modal
  function showReviewModal(prInfo, reviewType) {
    // Remove existing modal
    const existing = document.getElementById(MODAL_ID);
    if (existing) existing.remove();

    const typeConfig = {
      'APPROVE': { title: 'Approve', btnClass: 'approve', btnText: 'Submit Approval' },
      'COMMENT': { title: 'Comment', btnClass: 'comment', btnText: 'Submit Comment' },
      'REQUEST_CHANGES': { title: 'Request Changes', btnClass: 'request-changes', btnText: 'Submit Request' }
    };

    const config = typeConfig[reviewType];

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = MODAL_ID;
    overlay.className = 'gh-pr-quick-actions-modal-overlay';

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'gh-pr-quick-actions-modal';

    modal.innerHTML = `
      <div class="gh-pr-quick-actions-modal-header">
        <h3>${config.title}</h3>
        <button class="gh-pr-quick-actions-modal-close">&times;</button>
      </div>
      <div class="gh-pr-quick-actions-modal-body">
        <textarea
          class="gh-pr-quick-actions-modal-textarea"
          placeholder="Leave a comment (optional for Approve, required for Request Changes)..."
          rows="6"
        ></textarea>
      </div>
      <div class="gh-pr-quick-actions-modal-footer">
        <button class="gh-pr-quick-actions-btn gh-pr-quick-actions-modal-cancel">Cancel</button>
        <button class="gh-pr-quick-actions-btn gh-pr-quick-actions-btn--${config.btnClass} gh-pr-quick-actions-modal-submit">
          ${config.btnText}
        </button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Focus textarea
    const textarea = modal.querySelector('.gh-pr-quick-actions-modal-textarea');
    setTimeout(() => textarea.focus(), 50);

    // Close handlers
    const closeModal = () => overlay.remove();

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    modal.querySelector('.gh-pr-quick-actions-modal-close').addEventListener('click', closeModal);
    modal.querySelector('.gh-pr-quick-actions-modal-cancel').addEventListener('click', closeModal);

    // Handle escape key
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Submit handler
    modal.querySelector('.gh-pr-quick-actions-modal-submit').addEventListener('click', async () => {
      const body = textarea.value.trim();

      // Request Changes requires a body
      if (reviewType === 'REQUEST_CHANGES' && !body) {
        showToast('Please provide feedback when requesting changes', 'error');
        return;
      }

      const submitBtn = modal.querySelector('.gh-pr-quick-actions-modal-submit');
      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        await sendMessage({
          action: 'submitReview',
          ...prInfo,
          reviewEvent: reviewType,
          reviewBody: body
        });

        closeModal();
        showToast(`Review submitted: ${config.title}`);
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        showToast(error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = config.btnText;
      }
    });

    // Submit on Ctrl/Cmd + Enter
    textarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        modal.querySelector('.gh-pr-quick-actions-modal-submit').click();
      }
    });
  }

  // Create the Submit Review dropdown
  function createReviewDropdown(prInfo) {
    const container = document.createElement('div');
    container.className = 'gh-pr-quick-actions-dropdown';

    const button = document.createElement('button');
    button.className = 'gh-pr-quick-actions-btn gh-pr-quick-actions-btn--review';
    button.innerHTML = 'Review <span class="gh-pr-quick-actions-caret">▼</span>';

    const menu = document.createElement('div');
    menu.className = 'gh-pr-quick-actions-dropdown-menu';

    const options = [
      { text: 'Approve', event: 'APPROVE', class: 'approve' },
      { text: 'Comment', event: 'COMMENT', class: 'comment' },
      { text: 'Request Changes', event: 'REQUEST_CHANGES', class: 'request-changes' }
    ];

    options.forEach(opt => {
      const item = document.createElement('button');
      item.className = `gh-pr-quick-actions-dropdown-item gh-pr-quick-actions-dropdown-item--${opt.class}`;
      item.textContent = opt.text;
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.remove('gh-pr-quick-actions-dropdown-menu--open');
        showReviewModal(prInfo, opt.event);
      });
      menu.appendChild(item);
    });

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.gh-pr-quick-actions-dropdown-menu--open').forEach(m => {
        if (m !== menu) m.classList.remove('gh-pr-quick-actions-dropdown-menu--open');
      });
      menu.classList.toggle('gh-pr-quick-actions-dropdown-menu--open');
    });

    container.appendChild(button);
    container.appendChild(menu);
    return container;
  }

  // Create the Actions dropdown (Close, Squash & Merge, Auto-Merge)
  function createActionsDropdown(prInfo, autoMergeEnabled) {
    const container = document.createElement('div');
    container.className = 'gh-pr-quick-actions-dropdown';

    const button = document.createElement('button');
    button.className = 'gh-pr-quick-actions-btn gh-pr-quick-actions-btn--actions';
    button.innerHTML = 'Actions <span class="gh-pr-quick-actions-caret">▼</span>';

    const menu = document.createElement('div');
    menu.className = 'gh-pr-quick-actions-dropdown-menu';
    menu.id = 'gh-pr-quick-actions-menu';

    const actions = [
      {
        text: 'Squash & Merge',
        class: 'merge',
        confirm: 'Are you sure you want to squash and merge this PR?',
        action: 'squashMerge',
        successMsg: 'PR merged successfully'
      },
      {
        text: autoMergeEnabled ? 'Disable Auto-Merge' : 'Enable Auto-Merge',
        class: 'auto-merge',
        confirm: null,
        action: autoMergeEnabled ? 'disableAutoMerge' : 'enableAutoMerge',
        successMsg: autoMergeEnabled ? 'Auto-merge disabled' : 'Auto-merge enabled',
        id: 'auto-merge-item'
      },
      {
        text: 'Close PR',
        class: 'close',
        confirm: 'Are you sure you want to close this PR?',
        action: 'closePR',
        successMsg: 'PR closed successfully'
      }
    ];

    actions.forEach(act => {
      const item = document.createElement('button');
      item.className = `gh-pr-quick-actions-dropdown-item gh-pr-quick-actions-dropdown-item--${act.class}`;
      item.textContent = act.text;
      if (act.id) item.id = act.id;

      item.addEventListener('click', async (e) => {
        e.stopPropagation();
        menu.classList.remove('gh-pr-quick-actions-dropdown-menu--open');

        if (act.confirm && !confirm(act.confirm)) return;

        try {
          button.disabled = true;
          button.textContent = 'Working...';

          await sendMessage({
            action: act.action,
            ...prInfo
          });

          showToast(act.successMsg);
          setTimeout(() => window.location.reload(), 1000);
        } catch (error) {
          showToast(error.message, 'error');
        } finally {
          button.disabled = false;
          button.innerHTML = 'Actions <span class="gh-pr-quick-actions-caret">▼</span>';
        }
      });
      menu.appendChild(item);
    });

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.gh-pr-quick-actions-dropdown-menu--open').forEach(m => {
        if (m !== menu) m.classList.remove('gh-pr-quick-actions-dropdown-menu--open');
      });
      menu.classList.toggle('gh-pr-quick-actions-dropdown-menu--open');
    });

    container.appendChild(button);
    container.appendChild(menu);
    return container;
  }

  // Create comment count label
  function createCommentCount(count) {
    const label = document.createElement('span');
    label.className = 'gh-pr-quick-actions-comment-count';
    label.id = 'gh-pr-quick-actions-comment-count';
    label.innerHTML = `<span class="gh-pr-quick-actions-comment-icon">💬</span> ${count} comment${count !== 1 ? 's' : ''} in files`;
    return label;
  }

  // Create the toolbar with all buttons
  function createToolbar(prInfo, details) {
    const wrapper = document.createElement('div');
    wrapper.id = TOOLBAR_ID;
    wrapper.className = 'gh-pr-quick-actions-wrapper';

    const toolbar = document.createElement('div');
    toolbar.className = 'gh-pr-quick-actions-toolbar';

    // Submit Review dropdown
    toolbar.appendChild(createReviewDropdown(prInfo));

    // Actions dropdown (Close, Squash & Merge, Auto-Merge)
    toolbar.appendChild(createActionsDropdown(prInfo, details?.autoMergeEnabled || false));

    wrapper.appendChild(toolbar);

    // Add comment count on a new line if available
    if (details && details.totalComments > 0) {
      wrapper.appendChild(createCommentCount(details.totalComments));
    }

    return wrapper;
  }

  // Find the header actions area (right side of PR title)
  function findHeaderActions() {
    // Try: the actions area in the PR header (contains Edit button)
    const headerActions = document.querySelector('.gh-header-actions');
    if (headerActions) {
      return { element: headerActions, position: 'prepend' };
    }

    // Try: the header show area that contains title and actions
    const headerShow = document.querySelector('.gh-header-show');
    if (headerShow) {
      const actionsInHeader = headerShow.querySelector('.flex-md-row-reverse, .gh-header-actions, [class*="header-actions"]');
      if (actionsInHeader) {
        return { element: actionsInHeader, position: 'prepend' };
      }
      return { element: headerShow, position: 'append' };
    }

    // Try: Look for the PR header by finding the title element's parent container
    const prTitle = document.querySelector('.js-issue-title, [data-hpc] .markdown-title');
    if (prTitle) {
      let container = prTitle.closest('.gh-header, .js-header-wrapper, [class*="header"]');
      if (container) {
        return { element: container, position: 'append' };
      }
    }

    // Fallback: Look for the sticky header or page header
    const stickyHeader = document.querySelector('.js-sticky-header-wrapper, .sticky-header');
    if (stickyHeader) {
      return { element: stickyHeader, position: 'append' };
    }

    return null;
  }

  // Inject the toolbar into the page
  async function injectToolbar() {
    if (isInjecting) return;
    if (document.getElementById(TOOLBAR_ID)) return;

    const prInfo = getPRInfo();
    if (!prInfo) return;

    isInjecting = true;

    try {
      // Check if token is configured
      const result = await sendMessage({ action: 'checkToken' });
      if (!result.hasToken) {
        console.log('GitHub PR Quick Actions: PAT not configured');
        return;
      }

      // Double-check it doesn't exist (race condition prevention)
      if (document.getElementById(TOOLBAR_ID)) return;

      // Fetch PR details (auto-merge status, comment count)
      let details = null;
      try {
        details = await sendMessage({
          action: 'getPRDetails',
          ...prInfo
        });
        prDetails = details; // Cache for later use
      } catch (err) {
        console.warn('GitHub PR Quick Actions: Could not fetch PR details', err);
      }

      const toolbar = createToolbar(prInfo, details);
      const insertion = findHeaderActions();

      if (insertion) {
        if (insertion.position === 'prepend') {
          insertion.element.insertBefore(toolbar, insertion.element.firstChild);
        } else if (insertion.position === 'append') {
          insertion.element.appendChild(toolbar);
        } else if (insertion.position === 'before') {
          insertion.element.parentNode.insertBefore(toolbar, insertion.element);
        } else {
          insertion.element.parentNode.insertBefore(toolbar, insertion.element.nextSibling);
        }
      } else {
        toolbar.classList.add('gh-pr-quick-actions-toolbar--floating');
        document.body.appendChild(toolbar);
      }
    } catch (error) {
      console.error('GitHub PR Quick Actions:', error);
    } finally {
      isInjecting = false;
    }
  }

  // Debounced injection check
  let debounceTimer = null;
  function debouncedInject() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (getPRInfo() && !document.getElementById(TOOLBAR_ID)) {
        injectToolbar();
      }
    }, 100);
  }

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.gh-pr-quick-actions-dropdown')) {
      document.querySelectorAll('.gh-pr-quick-actions-dropdown-menu--open').forEach(menu => {
        menu.classList.remove('gh-pr-quick-actions-dropdown-menu--open');
      });
    }
  });

  // Initialize
  function init() {
    injectToolbar();

    const observer = new MutationObserver(debouncedInject);
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    document.addEventListener('turbo:load', () => {
      setTimeout(injectToolbar, 50);
    });
    document.addEventListener('pjax:end', () => {
      setTimeout(injectToolbar, 50);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
