import { Link, useNavigate } from 'react-router-dom';
import OAuthConfiguration from '../components/OAuthConfiguration';

export default function OAuthConfigPage() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              <Link
                to="/dashboard"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                🏠 Dashboard
              </Link>
              <Link
                to="/ai-post"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                🤖 AI Post Generator
              </Link>
              <Link
                to="/dual-publish"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                🎬 Dual Publisher
              </Link>
              <Link
                to="/oauth-config"
                className="inline-flex items-center px-1 pt-1 border-b-2 border-blue-500 text-sm font-medium text-gray-900"
              >
                🔐 OAuth Setup
              </Link>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="py-10">
        <OAuthConfiguration />
      </main>
    </div>
  );
}
