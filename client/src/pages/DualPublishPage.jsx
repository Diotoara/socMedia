import { motion } from 'framer-motion';
import DualPublisher from '../components/DualPublisher';
import Navbar from '../components/Navbar';

export default function DualPublishPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-green-50 via-blue-50 to-teal-50">
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
              <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-green-500 to-teal-600 flex items-center justify-center text-4xl shadow-lg">
                🎬
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-linear-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                  Dual Publisher
                </h1>
                <p className="text-gray-600 mt-1">Publish content to multiple platforms simultaneously</p>
              </div>
            </div>
          </motion.div>

          {/* Content */}
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100">
            <DualPublisher />
          </div>
        </div>
      </main>
    </div>
  );
}
