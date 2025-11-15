import { motion } from 'framer-motion';
import AIPostGenerator from '../components/AIPostGenerator';
import Navbar from '../components/Navbar';

export default function AIPostPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 via-pink-50 to-blue-50">
      <Navbar showBackButton />
      
      {/* Main Content */}
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-purple-500 to-pink-600 flex items-center justify-center text-4xl shadow-lg">
                🤖
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-linear-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  AI Post Generator
                </h1>
                <p className="text-gray-600 mt-1">Create engaging content with artificial intelligence</p>
              </div>
            </div>
          </motion.div>

          {/* Content */}
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100">
            <AIPostGenerator />
          </div>
        </div>
      </main>
    </div>
  );
}
