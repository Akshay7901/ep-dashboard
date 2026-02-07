import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import brandLogo from '@/assets/brand-logo.webp';

interface TopbarProps {
  title?: string;
}

const Topbar: React.FC<TopbarProps> = ({ title }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-8">
      {/* Logo + Title */}
      <Link to="/proposals" className="flex items-center gap-3">
        <img src={brandLogo} alt="Logo" className="h-8 w-8 object-contain" />
        <span className="text-xl font-semibold text-foreground">Proposal Intake</span>
      </Link>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/peer-reviewers')}
          className="text-sm"
        >
          Peer Reviewers
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="text-sm"
        >
          Logout
        </Button>
      </div>
    </header>
  );
};

export default Topbar;
