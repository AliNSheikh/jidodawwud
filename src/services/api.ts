import { MenuDatabase, GitHubCommitResult } from '../types/menu';

const API_BASE = '/api';

export interface MenuFetchResponse {
  menu: MenuDatabase;
  sha: string;
  source: 'github' | 'local';
  repository?: string;
  branch?: string;
  lastModified?: string;
}

export interface GitHubStatusResponse {
  configured: boolean;
  owner: string;
  repo: string;
  branch: string;
  path: string;
  lastSha: string;
  lastCommitTimestamp: string;
  lastCommitMessage: string;
}

export async function fetchMenuData(): Promise<MenuFetchResponse> {
  const res = await fetch(`${API_BASE}/menu`, {
    headers: { 'Cache-Control': 'no-cache' },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch menu: ${res.statusText}`);
  }
  return res.json();
}

export async function loginAdmin(password: string): Promise<{ success: boolean; token: string }> {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Authentication failed');
  }
  return data;
}

export async function commitMenuChanges(
  menu: MenuDatabase,
  commitMessage: string,
  token: string,
  expectedSha?: string
): Promise<GitHubCommitResult> {
  const res = await fetch(`${API_BASE}/admin/save-menu`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ menu, commitMessage, expectedSha }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to save menu');
  }
  return data;
}

export async function getGitHubStatus(): Promise<GitHubStatusResponse> {
  const res = await fetch(`${API_BASE}/github/status`);
  if (!res.ok) {
    throw new Error('Failed to retrieve GitHub status');
  }
  return res.json();
}

export async function updateGitHubConfig(
  config: { pat?: string; owner?: string; repo?: string; branch?: string; path?: string },
  token: string
) {
  const res = await fetch(`${API_BASE}/github/config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(config),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update GitHub configuration');
  }
  return data;
}
