import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DATA_DIR = path.resolve(__dirname, 'data');
const MENU_FILE_PATH = path.resolve(DATA_DIR, 'menu.json');

app.use(express.json({ limit: '10mb' }));

// In-memory runtime state for GitHub configuration & sync
let runtimeGitHubConfig = {
  pat: process.env.GITHUB_PAT || '',
  owner: process.env.GITHUB_REPO_OWNER || '',
  repo: process.env.GITHUB_REPO_NAME || '',
  branch: process.env.GITHUB_BRANCH || 'main',
  path: process.env.GITHUB_FILE_PATH || 'data/menu.json',
};

let lastKnownSha: string = '';
let lastCommitTimestamp: string = new Date().toISOString();
let lastCommitMessage: string = 'Initial menu seed';

// Ensure data/ directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper to read local menu.json
function getLocalMenu(): any {
  try {
    if (fs.existsSync(MENU_FILE_PATH)) {
      const content = fs.readFileSync(MENU_FILE_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading local menu.json:', err);
  }
  return null;
}

// Helper to save local menu.json
function saveLocalMenu(menuData: any) {
  fs.writeFileSync(MENU_FILE_PATH, JSON.stringify(menuData, null, 2), 'utf-8');
}

// Master password for admin
const ADMIN_PASSWORD = process.env.ADMIN_SECRET_KEY || process.env.ADMIN_PASSWORD || 'etoile2026';
const ADMIN_TOKEN_SECRET = 'etoile_secret_session_token_' + (process.env.ADMIN_SECRET_KEY || 'default');

// Middleware to check admin authorization
function checkAdminAuth(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (token === ADMIN_TOKEN_SECRET || token === ADMIN_PASSWORD) {
    next();
  } else {
    res.status(403).json({ error: 'Invalid admin credentials' });
  }
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// 1. GET /api/menu
// Fetches the menu, checking GitHub if configured, otherwise returning local data
app.get('/api/menu', async (_req: Request, res: Response) => {
  const { pat, owner, repo, branch, path: filePath } = runtimeGitHubConfig;
  
  // If GitHub is configured, attempt to fetch fresh content
  if (pat && owner && repo) {
    try {
      const ghUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
      const ghRes = await fetch(ghUrl, {
        headers: {
          Authorization: `Bearer ${pat}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'LEtoile-Menu-App',
        },
      });

      if (ghRes.ok) {
        const ghData = (await ghRes.json()) as { sha: string; content: string; encoding: string };
        lastKnownSha = ghData.sha;
        const decodedContent = Buffer.from(ghData.content, 'base64').toString('utf-8');
        const parsedMenu = JSON.parse(decodedContent);
        
        // Sync to local disk for fast offline fallback
        saveLocalMenu(parsedMenu);

        res.json({
          menu: parsedMenu,
          sha: lastKnownSha,
          source: 'github',
          repository: `${owner}/${repo}`,
          branch,
          lastModified: new Date().toISOString(),
        });
        return;
      }
    } catch (err) {
      console.warn('Failed to fetch from GitHub, falling back to local file:', err);
    }
  }

  // Fallback to local file
  const localMenu = getLocalMenu();
  if (localMenu) {
    res.json({
      menu: localMenu,
      sha: lastKnownSha || 'local-seeded-sha',
      source: 'local',
      branch: runtimeGitHubConfig.branch,
      lastModified: lastCommitTimestamp,
    });
  } else {
    res.status(500).json({ error: 'No menu data available' });
  }
});

// 2. POST /api/admin/login
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password) {
    res.status(400).json({ error: 'Password required' });
    return;
  }

  // Allow either configured secret, ADMIN_PASSWORD, or default demo password 'etoile2026' or 'admin'
  if (password === ADMIN_PASSWORD || password === 'etoile2026' || password === 'admin') {
    res.json({
      success: true,
      token: ADMIN_TOKEN_SECRET,
      message: 'Authentication successful',
    });
  } else {
    res.status(401).json({ error: 'Invalid password. Hint: default is etoile2026 or admin' });
  }
});

// 3. GET /api/github/status
app.get('/api/github/status', (_req: Request, res: Response) => {
  res.json({
    configured: Boolean(runtimeGitHubConfig.pat && runtimeGitHubConfig.owner && runtimeGitHubConfig.repo),
    owner: runtimeGitHubConfig.owner,
    repo: runtimeGitHubConfig.repo,
    branch: runtimeGitHubConfig.branch,
    path: runtimeGitHubConfig.path,
    lastSha: lastKnownSha,
    lastCommitTimestamp,
    lastCommitMessage,
  });
});

// 4. POST /api/github/config (Save & test GitHub credentials)
app.post('/api/github/config', checkAdminAuth, async (req: Request, res: Response) => {
  const { pat, owner, repo, branch, path: filePath } = req.body;

  const testConfig = {
    pat: pat !== undefined ? pat : runtimeGitHubConfig.pat,
    owner: owner !== undefined ? owner : runtimeGitHubConfig.owner,
    repo: repo !== undefined ? repo : runtimeGitHubConfig.repo,
    branch: branch !== undefined ? branch : runtimeGitHubConfig.branch,
    path: filePath !== undefined ? filePath : runtimeGitHubConfig.path,
  };

  // If credentials supplied, test connectivity
  if (testConfig.pat && testConfig.owner && testConfig.repo) {
    try {
      const ghUrl = `https://api.github.com/repos/${testConfig.owner}/${testConfig.repo}/contents/${testConfig.path}?ref=${testConfig.branch}`;
      const ghRes = await fetch(ghUrl, {
        headers: {
          Authorization: `Bearer ${testConfig.pat}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'LEtoile-Menu-App',
        },
      });

      if (!ghRes.ok && ghRes.status !== 404) {
        const errorData = await ghRes.json().catch(() => ({}));
        res.status(400).json({
          success: false,
          error: `GitHub API error (${ghRes.status}): ${(errorData as any).message || ghRes.statusText}`,
        });
        return;
      }

      if (ghRes.ok) {
        const data = (await ghRes.json()) as { sha: string };
        lastKnownSha = data.sha;
      }

      runtimeGitHubConfig = testConfig;
      res.json({
        success: true,
        message: 'GitHub credentials verified and connected successfully!',
        config: {
          owner: runtimeGitHubConfig.owner,
          repo: runtimeGitHubConfig.repo,
          branch: runtimeGitHubConfig.branch,
          path: runtimeGitHubConfig.path,
          hasPat: Boolean(runtimeGitHubConfig.pat),
          sha: lastKnownSha,
        },
      });
      return;
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: `Failed to connect to GitHub: ${err.message}`,
      });
      return;
    }
  }

  // Update without testing if empty
  runtimeGitHubConfig = testConfig;
  res.json({
    success: true,
    message: 'Configuration saved (disconnected mode)',
    config: {
      owner: runtimeGitHubConfig.owner,
      repo: runtimeGitHubConfig.repo,
      branch: runtimeGitHubConfig.branch,
      path: runtimeGitHubConfig.path,
      hasPat: Boolean(runtimeGitHubConfig.pat),
    },
  });
});

// 5. POST /api/admin/save-menu or /api/github/commit
// Saves the menu both locally and pushes commit directly to GitHub via Contents API
app.post(['/api/admin/save-menu', '/api/github/commit'], checkAdminAuth, async (req: Request, res: Response) => {
  const { menu, commitMessage = 'Update menu items and pricing', expectedSha } = req.body;

  if (!menu || !menu.categories || !menu.items || !menu.restaurant) {
    res.status(400).json({ error: 'Invalid menu data structure' });
    return;
  }

  // Always persist locally first (optimistic local state)
  saveLocalMenu(menu);

  const { pat, owner, repo, branch, path: filePath } = runtimeGitHubConfig;

  // If GitHub is configured, commit using GitHub Contents API (PUT /repos/{owner}/{repo}/contents/{path})
  if (pat && owner && repo) {
    try {
      // 1. Get current SHA if not provided or to ensure fresh SHA
      let currentSha = expectedSha || lastKnownSha;
      
      const checkUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
      const getRes = await fetch(checkUrl, {
        headers: {
          Authorization: `Bearer ${pat}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'LEtoile-Menu-App',
        },
      });

      if (getRes.ok) {
        const fileInfo = (await getRes.json()) as { sha: string };
        currentSha = fileInfo.sha;
      }

      // 2. Prepare payload
      const jsonString = JSON.stringify(menu, null, 2);
      const contentBase64 = Buffer.from(jsonString, 'utf-8').toString('base64');

      const putPayload: any = {
        message: commitMessage,
        content: contentBase64,
        branch,
      };

      if (currentSha) {
        putPayload.sha = currentSha;
      }

      const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
      const putRes = await fetch(putUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${pat}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'LEtoile-Menu-App',
        },
        body: JSON.stringify(putPayload),
      });

      if (!putRes.ok) {
        const errorJson = (await putRes.json().catch(() => ({}))) as any;
        console.error('GitHub Commit Error:', errorJson);
        
        // Handle SHA conflict (409)
        if (putRes.status === 409) {
          res.status(409).json({
            success: false,
            error: 'Conflict: Remote menu was modified by another commit. Please refresh and try again.',
            details: errorJson.message,
          });
          return;
        }

        res.status(putRes.status).json({
          success: false,
          error: `GitHub commit failed (${putRes.status}): ${errorJson.message || putRes.statusText}`,
          persistedLocally: true,
        });
        return;
      }

      const commitResult = (await putRes.json()) as any;
      lastKnownSha = commitResult.content?.sha || commitResult.commit?.sha || '';
      lastCommitTimestamp = new Date().toISOString();
      lastCommitMessage = commitMessage;

      res.json({
        success: true,
        persistedGitHub: true,
        persistedLocally: true,
        sha: lastKnownSha,
        commitUrl: commitResult.commit?.html_url,
        message: `Committed successfully: "${commitMessage}"`,
        timestamp: lastCommitTimestamp,
      });
      return;
    } catch (err: any) {
      console.error('Error committing to GitHub:', err);
      res.status(500).json({
        success: false,
        error: `GitHub commit exception: ${err.message}`,
        persistedLocally: true,
      });
      return;
    }
  }

  // If GitHub is not configured, confirm local persistence and provide guidance
  lastCommitTimestamp = new Date().toISOString();
  lastCommitMessage = commitMessage;
  res.json({
    success: true,
    persistedGitHub: false,
    persistedLocally: true,
    sha: 'local-' + Date.now().toString(16),
    message: 'Menu updated and saved to local disk. (Connect GitHub PAT in Admin Settings to enable instant Git commits!)',
    timestamp: lastCommitTimestamp,
  });
});

// -------------------------------------------------------------
// Dev & Production Middleware Setup
// -------------------------------------------------------------
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`L'Étoile Gastronomie server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
