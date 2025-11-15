import { Link } from 'react-router-dom';
import { useState } from 'react';

const LandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: '🤖',
      title: 'AI-Powered Replies',
      description: 'Automatically respond to Instagram comments with intelligent, context-aware replies using advanced AI.'
    },
    {
      icon: '⚡',
      title: 'Real-Time Automation',
      description: 'Monitor and respond to comments in real-time. Never miss an engagement opportunity.'
    },
    {
      icon: '📊',
      title: 'Analytics Dashboard',
      description: 'Track engagement metrics, response rates, and audience insights with beautiful visualizations.'
    },
    {
      icon: '🎨',
      title: 'AI Content Generation',
      description: 'Create stunning Instagram posts with AI-generated captions and images in seconds.'
    },
    {
      icon: '🔄',
      title: 'Dual Publishing',
      description: 'Publish to Instagram and YouTube simultaneously. Save time managing multiple platforms.'
    },
    {
      icon: '🎯',
      title: 'Smart Targeting',
      description: 'Select specific posts to monitor and customize reply tones for different audiences.'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Content Creator',
      image: '👩‍💼',
      text: 'This tool has transformed how I engage with my audience. I save 10+ hours per week!'
    },
    {
      name: 'Mike Chen',
      role: 'Digital Marketer',
      image: '👨‍💻',
      text: 'The AI replies are so natural, my followers can\'t tell the difference. Game changer!'
    },
    {
      name: 'Emma Davis',
      role: 'Brand Manager',
      image: '👩‍🎨',
      text: 'Managing multiple accounts is now effortless. The analytics are incredibly insightful.'
    }
  ];

  const stats = [
    { value: '10K+', label: 'Active Users' },
    { value: '1M+', label: 'Comments Replied' },
    { value: '99.9%', label: 'Uptime' },
    { value: '24/7', label: 'Support' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center shadow-lg mr-3">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="lightning-gradient-landing" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#2563EB', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#9333EA', stopOpacity: 1 }} />
                    </linearGradient>
                  </defs>
                  <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" fill="url(#lightning-gradient-landing)" stroke="url(#lightning-gradient-landing)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">
                AutoFlow
              </span>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 hover:text-blue-600 transition">Features</a>
              <a href="#pricing" className="text-gray-700 hover:text-blue-600 transition">Pricing</a>
              <a href="#testimonials" className="text-gray-700 hover:text-blue-600 transition">Testimonials</a>
              <Link to="/login" className="text-gray-700 hover:text-blue-600 transition">Login</Link>
              <Link
                to="/register"
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full hover:shadow-lg transition transform hover:scale-105"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 space-y-2">
              <a href="#features" className="block text-gray-700 hover:text-blue-600 py-2">Features</a>
              <a href="#pricing" className="block text-gray-700 hover:text-blue-600 py-2">Pricing</a>
              <a href="#testimonials" className="block text-gray-700 hover:text-blue-600 py-2">Testimonials</a>
              <Link to="/login" className="block text-gray-700 hover:text-blue-600 py-2">Login</Link>
              <Link to="/register" className="block bg-blue-600 text-white px-4 py-2 rounded-lg text-center">
                Get Started
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
            Automate Your
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {' '}Social Engagement
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            AI-powered comment replies, content generation, and analytics. 
            Grow your audience while you sleep.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/register"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:shadow-2xl transition transform hover:scale-105"
            >
              Start Free Trial
            </Link>
            <a
              href="#features"
              className="bg-white text-gray-700 px-8 py-4 rounded-full text-lg font-semibold border-2 border-gray-200 hover:border-blue-600 transition"
            >
              Learn More
            </a>
          </div>
          
          {/* Hero Image/Animation */}
          <div className="mt-16 relative">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-1 shadow-2xl max-w-5xl mx-auto">
              <div className="bg-white rounded-xl p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
                    <div className="text-4xl mb-2">💬</div>
                    <div className="text-2xl font-bold text-gray-900">2.5K</div>
                    <div className="text-gray-600">Comments Today</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl">
                    <div className="text-4xl mb-2">⚡</div>
                    <div className="text-2xl font-bold text-gray-900">98%</div>
                    <div className="text-gray-600">Response Rate</div>
                  </div>
                  <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-6 rounded-xl">
                    <div className="text-4xl mb-2">📈</div>
                    <div className="text-2xl font-bold text-gray-900">+45%</div>
                    <div className="text-gray-600">Engagement</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-gray-600 mt-2">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to dominate Instagram engagement
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition transform hover:-translate-y-2"
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600">
              Choose the plan that fits your needs
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Starter Plan */}
            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Starter</h3>
              <div className="text-4xl font-bold text-gray-900 mb-4">
                $29<span className="text-lg text-gray-600">/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  1 Instagram Account
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  500 AI Replies/month
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Basic Analytics
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Email Support
                </li>
              </ul>
              <Link
                to="/register"
                className="block w-full bg-gray-200 text-gray-900 text-center py-3 rounded-full font-semibold hover:bg-gray-300 transition"
              >
                Get Started
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-8 rounded-2xl shadow-2xl transform scale-105 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-sm font-bold">
                POPULAR
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Pro</h3>
              <div className="text-4xl font-bold text-white mb-4">
                $79<span className="text-lg text-blue-100">/mo</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-white">
                  <span className="text-yellow-300 mr-2">✓</span>
                  5 Instagram Accounts
                </li>
                <li className="flex items-center text-white">
                  <span className="text-yellow-300 mr-2">✓</span>
                  Unlimited AI Replies
                </li>
                <li className="flex items-center text-white">
                  <span className="text-yellow-300 mr-2">✓</span>
                  Advanced Analytics
                </li>
                <li className="flex items-center text-white">
                  <span className="text-yellow-300 mr-2">✓</span>
                  AI Content Generation
                </li>
                <li className="flex items-center text-white">
                  <span className="text-yellow-300 mr-2">✓</span>
                  Priority Support
                </li>
              </ul>
              <Link
                to="/register"
                className="block w-full bg-white text-blue-600 text-center py-3 rounded-full font-semibold hover:bg-gray-100 transition"
              >
                Get Started
              </Link>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
              <div className="text-4xl font-bold text-gray-900 mb-4">
                Custom
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Unlimited Accounts
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Unlimited Everything
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Custom AI Training
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  Dedicated Support
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="text-green-500 mr-2">✓</span>
                  API Access
                </li>
              </ul>
              <a
                href="mailto:sales@socialai.com"
                className="block w-full bg-gray-200 text-gray-900 text-center py-3 rounded-full font-semibold hover:bg-gray-300 transition"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Loved by Creators
            </h2>
            <p className="text-xl text-gray-600">
              See what our users have to say
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-2xl">
                <div className="text-5xl mb-4">{testimonial.image}</div>
                <p className="text-gray-700 mb-4 italic">"{testimonial.text}"</p>
                <div className="font-bold text-gray-900">{testimonial.name}</div>
                <div className="text-gray-600 text-sm">{testimonial.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Instagram?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of creators who are already automating their engagement
          </p>
          <Link
            to="/register"
            className="inline-block bg-white text-blue-600 px-8 py-4 rounded-full text-lg font-semibold hover:shadow-2xl transition transform hover:scale-105"
          >
            Start Your Free Trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-bold mb-4">⚡ AutoFlow</h3>
              <p className="text-gray-400">
                Automate your Instagram engagement with AI-powered tools.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
                <li><Link to="/login" className="hover:text-white transition">Login</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-white transition">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2024 AutoFlow. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
