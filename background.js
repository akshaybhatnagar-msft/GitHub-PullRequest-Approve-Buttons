// GitHub PR Quick Actions - Background Service Worker

// Get PAT from storage
async function getToken() {
  const result = await chrome.storage.sync.get(['githubPAT']);
  return result.githubPAT;
}

// Make authenticated request to GitHub API
async function githubRequest(endpoint, options = {}) {
  const token = await getToken();

  if (!token) {
    throw new Error('GitHub PAT not configured. Click the extension icon to set it up.');
  }

  const url = endpoint.startsWith('https://') ? endpoint : `https://api.github.com${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `GitHub API error: ${response.status}`);
  }

  // Some endpoints return 204 No Content
  if (response.status === 204) {
    return { success: true };
  }

  return response.json();
}

// Make GraphQL request to GitHub API
async function githubGraphQL(query, variables = {}) {
  const token = await getToken();

  if (!token) {
    throw new Error('GitHub PAT not configured. Click the extension icon to set it up.');
  }

  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, variables })
  });

  const data = await response.json();

  if (data.errors) {
    throw new Error(data.errors[0].message || 'GraphQL error');
  }

  return data;
}

// Get PR node ID for GraphQL mutations
async function getPRNodeId(owner, repo, pullNumber) {
  const data = await githubGraphQL(`
    query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
          id
        }
      }
    }
  `, { owner, repo, number: parseInt(pullNumber) });

  return data.data.repository.pullRequest.id;
}

// Submit a review (Approve, Comment, or Request Changes)
async function submitReview(owner, repo, pullNumber, event, body = '') {
  return githubRequest(`/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`, {
    method: 'POST',
    body: JSON.stringify({
      event, // APPROVE, COMMENT, or REQUEST_CHANGES
      body: body || undefined
    })
  });
}

// Close a PR
async function closePR(owner, repo, pullNumber) {
  return githubRequest(`/repos/${owner}/${repo}/pulls/${pullNumber}`, {
    method: 'PATCH',
    body: JSON.stringify({
      state: 'closed'
    })
  });
}

// Squash and merge a PR
async function squashMerge(owner, repo, pullNumber) {
  return githubRequest(`/repos/${owner}/${repo}/pulls/${pullNumber}/merge`, {
    method: 'PUT',
    body: JSON.stringify({
      merge_method: 'squash'
    })
  });
}

// Enable auto-merge with squash strategy
async function enableAutoMerge(owner, repo, pullNumber) {
  const nodeId = await getPRNodeId(owner, repo, pullNumber);

  return githubGraphQL(`
    mutation($pullRequestId: ID!, $mergeMethod: PullRequestMergeMethod!) {
      enablePullRequestAutoMerge(input: {
        pullRequestId: $pullRequestId,
        mergeMethod: $mergeMethod
      }) {
        pullRequest {
          autoMergeRequest {
            enabledAt
          }
        }
      }
    }
  `, {
    pullRequestId: nodeId,
    mergeMethod: 'SQUASH'
  });
}

// Disable auto-merge
async function disableAutoMerge(owner, repo, pullNumber) {
  const nodeId = await getPRNodeId(owner, repo, pullNumber);

  return githubGraphQL(`
    mutation($pullRequestId: ID!) {
      disablePullRequestAutoMerge(input: {
        pullRequestId: $pullRequestId
      }) {
        pullRequest {
          autoMergeRequest {
            enabledAt
          }
        }
      }
    }
  `, {
    pullRequestId: nodeId
  });
}

// Get PR details including auto-merge status and comment counts
async function getPRDetails(owner, repo, pullNumber) {
  const data = await githubGraphQL(`
    query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $number) {
          id
          autoMergeRequest {
            enabledAt
            mergeMethod
          }
          reviewThreads(first: 100) {
            totalCount
            nodes {
              comments {
                totalCount
              }
            }
          }
          reviews(first: 100) {
            totalCount
          }
        }
      }
    }
  `, { owner, repo, number: parseInt(pullNumber) });

  const pr = data.data.repository.pullRequest;

  // Calculate total comments across all review threads
  let totalComments = 0;
  if (pr.reviewThreads && pr.reviewThreads.nodes) {
    pr.reviewThreads.nodes.forEach(thread => {
      totalComments += thread.comments.totalCount;
    });
  }

  return {
    autoMergeEnabled: !!pr.autoMergeRequest,
    autoMergeMethod: pr.autoMergeRequest?.mergeMethod || null,
    totalComments: totalComments,
    reviewThreadCount: pr.reviewThreads?.totalCount || 0
  };
}

// Message listener for content script communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { action, owner, repo, pullNumber, reviewEvent, reviewBody } = request;

  let promise;

  switch (action) {
    case 'submitReview':
      promise = submitReview(owner, repo, pullNumber, reviewEvent, reviewBody);
      break;
    case 'closePR':
      promise = closePR(owner, repo, pullNumber);
      break;
    case 'squashMerge':
      promise = squashMerge(owner, repo, pullNumber);
      break;
    case 'enableAutoMerge':
      promise = enableAutoMerge(owner, repo, pullNumber);
      break;
    case 'disableAutoMerge':
      promise = disableAutoMerge(owner, repo, pullNumber);
      break;
    case 'getPRDetails':
      promise = getPRDetails(owner, repo, pullNumber);
      break;
    case 'checkToken':
      promise = getToken().then(token => ({ hasToken: !!token }));
      break;
    default:
      sendResponse({ error: 'Unknown action' });
      return;
  }

  promise
    .then(data => sendResponse({ success: true, data }))
    .catch(error => sendResponse({ success: false, error: error.message }));

  // Return true to indicate async response
  return true;
});
