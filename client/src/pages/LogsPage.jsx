import { motion } from 'framer-motion';
import ActivityLog from '../components/ActivityLog';
import Navbar from '../components/Navbar';

export default function LogsPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-slate-50 to-zinc-50">
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
              <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-gray-600 to-slate-700 flex items-center justify-center text-4xl shadow-lg">
                📋
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-linear-to-r from-gray-700 to-slate-700 bg-clip-text text-transparent">
                  Activity Logs
                </h1>
                <p className="text-gray-600 mt-1">View your automation history and activity</p>
              </div>
            </div>
          </motion.div>

          {/* Content */}
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-gray-100">
            <ActivityLog />
          </div>
        </div>
      </main>
    </div>
  );
}
