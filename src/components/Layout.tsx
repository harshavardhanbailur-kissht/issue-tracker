import { Link, useLocation } from 'react-router-dom';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { role, logout } = useSimpleAuth();
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  const navItems = [
    { path: '/submit', label: 'Submit Form', icon: '📝', show: role === 'product_support' },
    { path: '/loan-issue', label: 'Loan Issue Form', icon: '📋', show: role === 'sm' },
    { path: '/submissions', label: 'View Submissions', icon: '👁️', show: role === 'product_support' || role === 'tech_support_team' },
  ].filter(item => item.show);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link 
              to={
                role === 'product_support' ? '/submit' : 
                role === 'sm' ? '/loan-issue' : 
                '/submissions'
              } 
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">I</span>
              </div>
              <span className="font-bold text-gray-900 text-lg">Issue Tracker</span>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-4">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    px-4 py-2 text-sm font-medium rounded-lg transition-colors
                    ${isActive(item.path)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }
                  `}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}

              {/* User info */}
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200">
                <span className="text-sm text-gray-600 capitalize">
                  {role?.replace(/_/g, ' ')}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Logout
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
            Issue Tracker © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
