import PublicNavbar from '../components/PublicNavbar';

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />
      
      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-8">About AutoFlow</h1>
          
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-gray-700 text-lg leading-relaxed mb-4">
              We're on a mission to help creators, businesses, and influencers build authentic 
              relationships with their audience at scale. By leveraging cutting-edge AI technology, 
              we make it possible to maintain genuine engagement without sacrificing your time.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Story</h2>
            <p className="text-gray-700 text-lg leading-relaxed mb-4">
              Founded in 2024, AutoFlow was born from a simple observation: successful Instagram 
              accounts spend countless hours responding to comments, but this manual work doesn't scale. 
              We built this platform to solve this problem using advanced AI that understands context, 
              tone, and intent.
            </p>
            <p className="text-gray-700 text-lg leading-relaxed">
              Today, we serve thousands of creators worldwide, helping them save time while 
              maintaining authentic engagement with their communities.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Values</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">🎯 Authenticity First</h3>
                <p className="text-gray-700">We believe AI should enhance, not replace, human connection.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">🚀 Innovation</h3>
                <p className="text-gray-700">We're constantly pushing the boundaries of what's possible with AI.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">🤝 Customer Success</h3>
                <p className="text-gray-700">Your success is our success. We're here to help you grow.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
