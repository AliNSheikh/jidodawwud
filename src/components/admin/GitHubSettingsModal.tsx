import React, { useState, useEffect } from 'react';
import {
  Github,
  Key,
  FolderGit2,
  GitBranch,
  FileCode,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { updateGitHubConfig } from '../../services/api';

interface GitHubSettingsModalProps {
  token: string;
  onConfigSaved: () => void;
}

export const GitHubSettingsModal: React.FC<GitHubSettingsModalProps> = ({
  token,
  onConfigSaved,
}) => {
  const [pat, setPat] = useState('');
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [path, setPath] = useState('data/menu.json');

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  // Load existing config on mount
  useEffect(() => {
    fetch('/api/github/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.owner) setOwner(data.owner);
        if (data.repo) setRepo(data.repo);
        if (data.branch) setBranch(data.branch);
        if (data.path) setPath(data.path);
      })
      .catch((err) => console.error(err));
  }, []);

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await updateGitHubConfig(
        { pat: pat.trim() || undefined, owner: owner.trim(), repo: repo.trim(), branch: branch.trim(), path: path.trim() },
        token
      );
      if (res.success) {
        setSuccessMessage(res.message || 'GitHub connection established successfully!');
        onConfigSaved();
      } else {
        setErrorMessage(res.error || 'Failed to verify GitHub connection');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error communicating with server');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-xl font-semibold text-[#F5F5F0]">
            GitHub Repository & PAT Settings
          </h3>
          <p className="text-xs text-[#8E8E93]">
            Synchronize menu data directly with your GitHub repository via GitHub Contents API.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="text-xs text-[#C5A880] hover:underline flex items-center gap-1 cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{showGuide ? 'Hide Token Setup Guide' : 'How to create a GitHub PAT?'}</span>
        </button>
      </div>

      {/* Guide accordion */}
      {showGuide && (
        <div className="p-4 bg-[#18181D] border border-[#27272A] rounded-sm text-xs text-[#A1A1AA] space-y-2 animate-in fade-in">
          <h4 className="font-semibold text-[#F5F5F0] flex items-center gap-2">
            <Github className="w-4 h-4 text-[#C5A880]" />
            <span>How to generate a fine-grained GitHub Personal Access Token (PAT):</span>
          </h4>
          <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] leading-relaxed">
            <li>Go to <strong>GitHub.com &gt; Settings &gt; Developer Settings &gt; Personal access tokens &gt; Fine-grained tokens</strong>.</li>
            <li>Click <strong>Generate new token</strong>.</li>
            <li>Give it a token name (e.g. <code>LEtoile-Menu-Sync</code>) and set an expiration.</li>
            <li>Under <strong>Repository access</strong>, select <strong>Only select repositories</strong> and pick your menu repository.</li>
            <li>Under <strong>Permissions &gt; Repository permissions</strong>, set:
              <ul className="list-disc list-inside pl-4 text-[#E4E4E7] font-mono text-[10px]">
                <li>Contents: Read and write</li>
              </ul>
            </li>
            <li>Click <strong>Generate token</strong> and paste the secret token into the field below.</li>
          </ol>
        </div>
      )}

      {/* Feedback Messages */}
      {successMessage && (
        <div className="p-3 bg-[#064E3B]/80 border border-[#10B981]/50 rounded-xs text-[#A7F3D0] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#34D399]" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-[#450A0A]/80 border border-[#EF4444]/50 rounded-xs text-[#FCA5A5] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#EF4444]" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSaveAndTest} className="p-6 bg-[#141417] border border-[#27272A] rounded-sm space-y-5">
        <div className="space-y-1.5">
          <label className="block text-xs uppercase tracking-wider text-[#A1A1AA] font-medium flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>GitHub Personal Access Token (PAT)</span>
          </label>
          <input
            type="password"
            value={pat}
            onChange={(e) => setPat(e.target.value)}
            placeholder="github_pat_11A... or ghp_..."
            className="w-full px-3.5 py-2.5 text-xs font-mono bg-[#18181C] border border-[#27272A] rounded-xs text-[#F5F5F0] focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880]"
          />
          <p className="text-[11px] text-[#71717A]">
            Secured server-side. Never exposed in client bundles. Leave blank if already configured via environment variable <code>GITHUB_PAT</code>.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs uppercase tracking-wider text-[#A1A1AA] font-medium flex items-center gap-1.5">
              <FolderGit2 className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Repository Owner / User</span>
            </label>
            <input
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="e.g. octocat or chef-aurelien"
              className="w-full px-3 py-2 text-xs bg-[#18181C] border border-[#27272A] rounded-xs text-[#F5F5F0] focus:border-[#C5A880]"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs uppercase tracking-wider text-[#A1A1AA] font-medium flex items-center gap-1.5">
              <Github className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Repository Name</span>
            </label>
            <input
              type="text"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="e.g. letoile-digital-menu"
              className="w-full px-3 py-2 text-xs bg-[#18181C] border border-[#27272A] rounded-xs text-[#F5F5F0] focus:border-[#C5A880]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs uppercase tracking-wider text-[#A1A1AA] font-medium flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Target Branch</span>
            </label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="w-full px-3 py-2 text-xs font-mono bg-[#18181C] border border-[#27272A] rounded-xs text-[#F5F5F0] focus:border-[#C5A880]"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs uppercase tracking-wider text-[#A1A1AA] font-medium flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Target File Path</span>
            </label>
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="data/menu.json"
              className="w-full px-3 py-2 text-xs font-mono bg-[#18181C] border border-[#27272A] rounded-xs text-[#F5F5F0] focus:border-[#C5A880]"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={testing}
            className="px-6 py-2.5 text-xs uppercase tracking-widest font-semibold text-[#0D0D0E] bg-[#C5A880] hover:bg-[#D4B992] rounded-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
          >
            {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{testing ? 'Testing & Verifying...' : 'Save & Verify GitHub Connection'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
