import React, { useState } from 'react';
import { Lock, ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react';
import { loginAdmin } from '../../services/api';

interface AdminLoginProps {
  onSuccess: (token: string) => void;
  onCancel: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onCancel }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginAdmin(password);
      if (res.success && res.token) {
        onSuccess(res.token);
      } else {
        setError('Invalid credentials');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error. Default password is "etoile2026" or "admin".');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#131316] border border-[#27272A] rounded-sm p-8 shadow-2xl space-y-6">
        
        {/* Top Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#C5A880]/10 border border-[#C5A880]/30 flex items-center justify-center text-[#C5A880]">
            <Lock className="w-5 h-5 stroke-[1.75]" />
          </div>
          <span className="text-[11px] uppercase tracking-widest text-[#C5A880] font-semibold">
            Administrative Control Panel
          </span>
          <h2 className="font-serif text-2xl text-[#F5F5F0] font-medium">
            Chef & Sommelier Access
          </h2>
          <p className="text-xs text-[#8E8E93] max-w-xs mx-auto">
            Authorize access to modify menus, category hierarchies, and publish Git commits.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 bg-[#450A0A]/70 border border-[#EF4444]/40 text-[#FCA5A5] text-xs rounded-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs uppercase tracking-wider text-[#A1A1AA] font-medium">
              Master Admin Password
            </label>
            <input
              type="password"
              autoFocus
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter master password..."
              className="w-full px-3.5 py-2.5 text-xs text-[#F5F5F0] placeholder-[#52525B] bg-[#18181B] border border-[#2C2C32] rounded-xs focus:outline-none focus:border-[#C5A880] focus:ring-1 focus:ring-[#C5A880] transition-colors"
            />
            <p className="text-[11px] text-[#71717A] pt-0.5">
              Default password: <code className="text-[#C5A880] font-mono">etoile2026</code> or <code className="text-[#C5A880] font-mono">admin</code>
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-xs uppercase tracking-widest font-semibold text-[#0D0D0E] bg-[#C5A880] hover:bg-[#D4B992] rounded-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Control Panel'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2 text-xs text-[#8E8E93] hover:text-[#F5F5F0] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Public Menu</span>
            </button>
          </div>
        </form>

        <div className="pt-4 border-t border-[#1F1F24] text-[11px] text-[#71717A] text-center">
          Persisted via Git Contents API · Zero external databases required
        </div>
      </div>
    </div>
  );
};
