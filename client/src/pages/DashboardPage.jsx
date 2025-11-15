import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from '../components/LoadingSpinner';
import { clearAuth } from '../utils/localStorage';
import { useApp } from '../context/AppContext';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { toast } = useApp();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Get user info
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        });
      }

      clearAuth();
      toast.showSuccess('Logged out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      clearAuth();
      navigate('/login');
    }
  };

  // Fetch real stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/stats/dashboard', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setStats([
            { label: 'Total Posts', value: data.totalPosts || '0', icon: '📝', color: 'from-blue-500 to-blue-600', change: data.postsChange || '+0%' },
            { label: 'AI Generated', value: data.aiGenerated || '0', icon: '🤖', color: 'from-purple-500 to-purple-600', change: data.aiChange || '+0%' },
            { label: 'Engagement', value: data.engagement || '0%', icon: '❤️', color: 'from-pink-500 to-pink-600', change: data.engagementChange || '+0%' },
            { label: 'Active Users', value: data.activeUsers || '0', icon: '👥', color: 'from-green-500 to-green-600', change: data.usersChange || '+0%' },
          ]);
        } else {
          // Fallback to default values
          setStats([
            { label: 'Total Posts', value: '0', icon: '📝', color: 'from-blue-500 to-blue-600', change: '+0%' },
            { label: 'AI Generated', value: '0', icon: '🤖', color: 'from-purple-500 to-purple-600', change: '+0%' },
            { label: 'Engagement', value: '0%', icon: '❤️', color: 'from-pink-500 to-pink-600', change: '+0%' },
            { label: 'Active Users', value: '1', icon: '👥', color: 'from-green-500 to-green-600', change: '+0%' },
          ]);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
        // Fallback to default values
        setStats([
          { label: 'Total Posts', value: '0', icon: '📝', color: 'from-blue-500 to-blue-600', change: '+0%' },
          { label: 'AI Generated', value: '0', icon: '🤖', color: 'from-purple-500 to-purple-600', change: '+0%' },
          { label: 'Engagement', value: '0%', icon: '❤️', color: 'from-pink-500 to-pink-600', change: '+0%' },
          { label: 'Active Users', value: '1', icon: '👥', color: 'from-green-500 to-green-600', change: '+0%' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const quickActions = [
    { 
      title: 'Configuration', 
      description: 'Manage Instagram settings', 
      icon: '⚙️', 
      color: 'from-blue-500 to-indigo-600',
      action: () => navigate('/configuration')
    },
    { 
      title: 'Automation Control', 
      description: 'Start and stop automation', 
      icon: '🤖', 
      color: 'from-orange-500 to-red-600',
      action: () => navigate('/automation')
    },
    { 
      title: 'Activity Logs', 
      description: 'View automation history', 
      icon: '📋', 
      color: 'from-gray-600 to-slate-700',
      action: () => navigate('/logs')
    },
    { 
      title: 'AI Post Generator', 
      description: 'Create engaging content', 
      icon: '✨', 
      color: 'from-purple-500 to-pink-600',
      action: () => navigate('/ai-post')
    },
    { 
      title: 'Dual Publisher', 
      description: 'Publish to multiple platforms', 
      icon: '🎬', 
      color: 'from-green-500 to-teal-600',
      action: () => navigate('/dual-publish')
    },
    { 
      title: 'API Configuration', 
      description: 'Manage API keys and settings', 
      icon: '🔑', 
      color: 'from-cyan-500 to-blue-600',
      action: () => navigate('/api-config')
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Navbar */}
        <nav className="bg-white/80 backdrop-blur-md shadow-sm fixed w-full z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Link to="/dashboard" className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <linearGradient id="lightning-gradient-nav" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" style={{ stopColor: '#2563EB', stopOpacity: 1 }} />
                          <stop offset="100%" style={{ stopColor: '#9333EA', stopOpacity: 1 }} />
                        </linearGradient>
                      </defs>
                      <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" fill="url(#lightning-gradient-nav)" stroke="url(#lightning-gradient-nav)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    AutoFlow
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </nav>
        <div className="pt-24 flex items-center justify-center min-h-[calc(100vh-96px)]">
          <LoadingSpinner size="large" text="Loading dashboard..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Dashboard Navbar */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="lightning-gradient-dashboard" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#2563EB', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#9333EA', stopOpacity: 1 }} />
                      </linearGradient>
                    </defs>
                    <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" fill="url(#lightning-gradient-dashboard)" stroke="url(#lightning-gradient-dashboard)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  AutoFlow
                </span>
              </Link>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              {user && (
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-2 rounded-full hover:shadow-lg transition transform hover:scale-105"
              >
                Logout
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 space-y-2 border-t border-gray-200">
              {user && (
                <div className="px-4 py-2">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Welcome Back! 👋
            </h1>
            <p className="text-gray-600">Here's what's happening with your automation today</p>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            {stats && stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.4,
                  delay: index * 0.1,
                  ease: "easeOut"
                }}
                whileHover={{ y: -5, scale: 1.02, transition: { duration: 0.2 } }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-2xl shadow-lg`}>
                    {stat.icon}
                  </div>
                  <span className={`text-sm font-semibold ${stat.change.startsWith('+') ? 'text-green-500' : 'text-gray-500'}`}>
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stat.value}</h3>
                <p className="text-gray-600 text-sm">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {quickActions.map((action, index) => (
                <motion.button
                  key={action.title}
                  onClick={action.action}
                  className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 text-left border border-gray-100 group"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.4,
                    delay: 0.5 + index * 0.08,
                    ease: "easeOut"
                  }}
                  whileHover={{ y: -5, scale: 1.02, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-3xl mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    {action.icon}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{action.title}</h3>
                  <p className="text-gray-600 text-sm">{action.description}</p>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
