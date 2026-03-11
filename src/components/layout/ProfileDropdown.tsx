import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/authApi';
import { UserCircle, KeyRound, LogOut, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const ProfileDropdown: React.FC = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowChangePassword(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Please fill in both fields');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully');
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-sm text-foreground hover:bg-muted transition-colors"
      >
        <UserCircle className="h-5 w-5 text-muted-foreground" />
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-64 rounded-md border border-border bg-card shadow-lg z-50">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-sm font-medium text-foreground truncate">{user?.name ? user.name.replace(/^(Professor|Prof\.?|Dr\.?|Mr\.?|Mrs\.?|Ms\.?|Miss)\s+/i, '') : 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>

          {showChangePassword ? (
            <div className="p-3 space-y-2.5">
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring pr-8"
                />
                <button type="button" onClick={() => setShowCurrent(p => !p)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showCurrent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  placeholder="New password (min 8 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring pr-8"
                />
                <button type="button" onClick={() => setShowNew(p => !p)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowChangePassword(false); setCurrentPassword(''); setNewPassword(''); }}
                  className="flex-1 rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={loading}
                  className="flex-1 rounded-md bg-primary px-2 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving…' : 'Update'}
                </button>
              </div>
            </div>
          ) : (
            <div className="py-1">
              <button
                onClick={() => setShowChangePassword(true)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                Reset Password
              </button>
              <button
                onClick={() => { setOpen(false); logout(); navigate('/login'); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
