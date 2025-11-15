import PublicNavbar from '../components/PublicNavbar';
import { Link } from 'react-router-dom';

const FeaturesPage = () => {
  const features = [
    {
      category: 'Automation',
      icon: '🤖',
      items: [
        {
          title: 'AI-Powered Comment Replies',
          description: 'Automatically respond to Instagram comments with intelligent, context-aware replies using advanced AI models.',
          benefits: ['Save 10+ hours per week', 'Never miss a comment', 'Maintain authentic engagement']
        },
        {
          title: 'Real-Time Monitoring',
          description: 'Monitor your Instagram posts in real-time and respond instantly to new comments.',
          benefits: ['Instant notifications', 'Customizable monitoring', 'Multi-post tracking']
        },
        {
          title: 'Smart Post Selection',
          description: 'Choose which posts to monitor and customize reply strategies for each.',
          benefits: ['Selective automation', 'Post-specific tones', 'Flexible control']
        }
      ]
    },
    {
      category: 'Content Creation',
      icon: '🎨',
      items: [
        {
          title: 'AI Content Generation',
          description: 'Create stunning Instagram posts with AI-generated captions and images in seconds.',
          benefits: ['Professional quality', 'Multiple styles', 'Instant generation']
        },
        {
          title: 'Dual Publishing',
          description: 'Publish to Instagram and YouTube simultaneously with optimized content for each platform.',
          benefits: ['Save time', 'Cross-platform reach', 'Automated formatting']
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />
      
      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Powerful Features
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to automate and grow your Instagram presence
            </p>
          </div>

          <div className="space-y-20">
            {features.map((category, idx) => (
              <div key={idx}>
                <div className="flex items-center mb-8">
                  <span className="text-4xl mr-4">{category.icon}</span>
                  <h2 className="text-3xl font-bold text-gray-900">{category.category}</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {category.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="bg-white p-8 rounded-2xl shadow-lg">
                      <h3 className="text-2xl font-bold text-gray-900 mb-4">{item.title}</h3>
                      <p className="text-gray-600 mb-6">{item.description}</p>
                      <ul className="space-y-2">
                        {item.benefits.map((benefit, benefitIdx) => (
                          <li key={benefitIdx} className="flex items-center text-gray-700">
                            <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-20 text-center">
            <Link
              to="/register"
              className="inline-block bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-blue-700 transition"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturesPage;
