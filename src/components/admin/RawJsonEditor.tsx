import React, { useState, useEffect } from 'react';
import {
  GitCommit,
  Copy,
  Download,
  RotateCcw,
  Check,
  AlertCircle,
  FileCode,
  CheckCircle2,
} from 'lucide-react';
import { MenuDatabase } from '../../types/menu';

interface RawJsonEditorProps {
  currentMenu: MenuDatabase;
  sha: string;
  gitHubConfigured: boolean;
  onCommit: (updatedMenu: MenuDatabase, commitMessage: string) => Promise<void>;
}

export const RawJsonEditor: React.FC<RawJsonEditorProps> = ({
  currentMenu,
  sha,
  gitHubConfigured,
  onCommit,
}) => {
  const [jsonText, setJsonText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState('Update seasonal tasting menu items and pricing');
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState<string | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setJsonText(JSON.stringify(currentMenu, null, 2));
    setParseError(null);
  }, [currentMenu]);

  // Syntax validation on text change
  const handleTextChange = (value: string) => {
    setJsonText(value);
    setCommitSuccess(null);
    setCommitError(null);

    try {
      JSON.parse(value);
      setParseError(null);
    } catch (err: any) {
      setParseError(err.message);
    }
  };

  // Re-format / prettify
  const handlePrettify = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      setParseError(null);
    } catch (err: any) {
      setParseError('Cannot prettify invalid JSON: ' + err.message);
    }
  };

  // Reset to original
  const handleReset = () => {
    setJsonText(JSON.stringify(currentMenu, null, 2));
    setParseError(null);
    setCommitSuccess(null);
    setCommitError(null);
  };

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(jsonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download menu.json
  const handleDownload = () => {
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'menu.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Commit and Push
  const handleCommit = async () => {
    if (parseError) return;
    setIsCommitting(true);
    setCommitSuccess(null);
    setCommitError(null);

    try {
      const parsed = JSON.parse(jsonText);
      await onCommit(parsed, commitMessage);
      setCommitSuccess('Menu successfully committed and synchronized!');
    } catch (err: any) {
      setCommitError(err.message || 'Failed to commit changes');
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif text-xl font-semibold text-[#F5F5F0]">
            Direct Raw JSON Editor & Git Sync
          </h3>
          <p className="text-xs text-[#8E8E93]">
            Edit <code className="text-[#C5A880] font-mono">data/menu.json</code> with live syntax validation and push directly to GitHub.
          </p>
        </div>

        {/* Toolbar buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrettify}
            className="px-2.5 py-1.5 text-xs text-[#A1A1AA] hover:text-[#F5F5F0] bg-[#18181C] border border-[#27272A] rounded-xs transition-colors cursor-pointer"
          >
            Prettify JSON
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 text-[#A1A1AA] hover:text-[#F5F5F0] bg-[#18181C] border border-[#27272A] rounded-xs transition-colors cursor-pointer"
            title="Reset to latest loaded version"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopy}
            className="p-1.5 text-[#A1A1AA] hover:text-[#F5F5F0] bg-[#18181C] border border-[#27272A] rounded-xs transition-colors cursor-pointer"
            title="Copy JSON"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 text-[#A1A1AA] hover:text-[#F5F5F0] bg-[#18181C] border border-[#27272A] rounded-xs transition-colors cursor-pointer"
            title="Download data/menu.json"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Commit Status Feedback */}
      {commitSuccess && (
        <div className="p-3 bg-[#064E3B]/80 border border-[#10B981]/50 rounded-xs text-[#A7F3D0] text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#34D399]" />
          <span>{commitSuccess}</span>
        </div>
      )}

      {commitError && (
        <div className="p-3 bg-[#450A0A]/80 border border-[#EF4444]/50 rounded-xs text-[#FCA5A5] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#EF4444]" />
          <span>{commitError}</span>
        </div>
      )}

      {/* Syntax Error Box */}
      {parseError && (
        <div className="p-3 bg-[#78350F]/70 border border-[#D97706]/40 text-[#FDE68A] text-xs rounded-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#F59E0B]" />
          <div>
            <strong className="font-semibold">JSON Syntax Error: </strong>
            <span className="font-mono text-[11px]">{parseError}</span>
          </div>
        </div>
      )}

      {/* Editor Container */}
      <div className="relative border border-[#27272A] rounded-sm overflow-hidden bg-[#0F0F12]">
        <div className="px-4 py-2 bg-[#161619] border-b border-[#242428] flex items-center justify-between text-xs text-[#8E8E93]">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-[#C5A880]" />
            <span className="font-mono text-[#D4D4D8]">data/menu.json</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px]">
              SHA: <span className="text-[#C5A880]">{sha ? sha.substring(0, 10) : 'local'}</span>
            </span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-xs bg-[#1F1F24] text-[#A1A1AA]">
              UTF-8
            </span>
          </div>
        </div>

        <textarea
          value={jsonText}
          onChange={(e) => handleTextChange(e.target.value)}
          rows={22}
          spellCheck={false}
          className="w-full p-4 font-mono text-xs text-[#E4E4E7] bg-[#0A0A0C] border-none focus:outline-none focus:ring-1 focus:ring-[#C5A880] resize-y selection:bg-[#C5A880]/30 leading-relaxed"
        />
      </div>

      {/* Commit & Push Section */}
      <div className="p-5 bg-[#141417] border border-[#27272A] rounded-sm space-y-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-[#C5A880] font-semibold">
          <GitCommit className="w-4 h-4" />
          <span>Commit & Deploy Trigger</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8">
            <label className="block text-[11px] uppercase tracking-wider text-[#A1A1AA] mb-1">
              Commit Message
            </label>
            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Descriptive commit message..."
              className="w-full px-3 py-2 text-xs bg-[#1A1A1E] border border-[#2C2C32] rounded-xs text-[#F5F5F0] focus:border-[#C5A880]"
            />
          </div>

          <div className="sm:col-span-4 flex items-end">
            <button
              onClick={handleCommit}
              disabled={Boolean(parseError) || isCommitting}
              className="w-full py-2 px-4 text-xs uppercase tracking-widest font-semibold text-[#0D0D0E] bg-[#C5A880] hover:bg-[#D4B992] rounded-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              <GitCommit className="w-4 h-4" />
              <span>{isCommitting ? 'Pushing Commit...' : gitHubConfigured ? 'Push Commit to GitHub' : 'Commit & Save Locally'}</span>
            </button>
          </div>
        </div>

        <div className="text-[11px] text-[#71717A] flex items-center justify-between">
          <span>
            {gitHubConfigured
              ? 'Uses GitHub Contents API (PUT /repos/{owner}/{repo}/contents/{path}) with automatic SHA handling.'
              : 'GitHub PAT not configured. Changes will persist directly to server disk until credentials are set in Settings.'}
          </span>
          <span className="font-mono text-[#A1A1AA]">
            {parseError ? 'Invalid JSON' : 'Valid JSON'}
          </span>
        </div>
      </div>
    </div>
  );
};
