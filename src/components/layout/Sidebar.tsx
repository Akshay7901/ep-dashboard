import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { LayoutDashboard, FileText, LogOut, Menu, X, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}
interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}
const navItems: NavItem[] = [{
  label: 'Dashboard',
  href: '/dashboard',
  icon: LayoutDashboard
}, {
  label: 'Proposals',
  href: '/proposals',
  icon: FileText
}];
const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggle
}) => {
  const {
    logout
  } = useAuth();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  const SidebarContent = () => <div className="flex h-full flex-col bg-sidebar">
      {/* Logo */}
      <div className="h-16 border-b border-sidebar-border px-0 flex-row flex items-center justify-between">
        {!isCollapsed && <div className="flex items-center gap-3 animate-fade-in">
            
            <span className="text-lg font-semibold text-sidebar-foreground">EP Dashboard   </span>
          </div>}
        <Button variant="ghost" size="icon" onClick={onToggle} className="hidden lg:flex text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <ChevronLeft className={cn('h-4 w-4 transition-transform', isCollapsed && 'rotate-180')} />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1">
        {navItems.map(item => <NavLink key={item.href} to={item.href} onClick={() => setIsMobileOpen(false)} className={({
        isActive
      }) => cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all', isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground')}>
            <item.icon className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="animate-fade-in">{item.label}</span>}
          </NavLink>)}
      </nav>

      {/* Logout */}
      <div className="border-t border-sidebar-border p-3">
        <button onClick={handleLogout} className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-muted transition-all', 'hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground')}>
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span className="animate-fade-in">Logout</span>}
        </button>
      </div>
    </div>;
  return <>
      {/* Mobile menu button */}
      <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(true)} className="fixed left-4 top-4 z-50 lg:hidden">
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile overlay */}
      {isMobileOpen && <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setIsMobileOpen(false)} />}

      {/* Mobile sidebar */}
      <aside className={cn('fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:hidden', isMobileOpen ? 'translate-x-0' : '-translate-x-full')}>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(false)} className="absolute right-2 top-4 text-sidebar-foreground hover:bg-sidebar-accent">
          <X className="h-5 w-5" />
        </Button>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className={cn('hidden lg:flex h-screen flex-col transition-all duration-300', isCollapsed ? 'w-16' : 'w-64')}>
        <SidebarContent />
      </aside>
    </>;
};
export default Sidebar;