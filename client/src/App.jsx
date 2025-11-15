import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useApp } from './context/AppContext'
import ToastContainer from './components/ToastContainer'
import SmoothScroll from './components/SmoothScroll'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import NotificationPermission from './components/NotificationPermission'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ConfigurationPage from './pages/ConfigurationPage'
import AutomationPage from './pages/AutomationPage'
import LogsPage from './pages/LogsPage'
import AIPostPage from './pages/AIPostPage'
import DualPublishPage from './pages/DualPublishPage'
import APIConfigPage from './pages/APIConfigPage'
import PricingPage from './pages/PricingPage'
import FeaturesPage from './pages/FeaturesPage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsOfServicePage from './pages/TermsOfServicePage'
import ProtectedRoute from './components/ProtectedRoute'
import TestSocketIO from './components/TestSocketIO'
import { registerServiceWorker } from './utils/pwa'

function App() {
  const { toast } = useApp()

  // Register service worker for PWA
  useEffect(() => {
    registerServiceWorker()
  }, [])

  return (
    <Router>
      <SmoothScroll>
        {/* Toast Notifications */}
        <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
        
        {/* PWA Install Prompt (Mobile Only) */}
        <PWAInstallPrompt />
        
        {/* Notification Permission (Mobile Only) */}
        <NotificationPermission />

      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        
        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/configuration"
          element={
            <ProtectedRoute>
              <ConfigurationPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/automation"
          element={
            <ProtectedRoute>
              <AutomationPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/logs"
          element={
            <ProtectedRoute>
              <LogsPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/ai-post"
          element={
            <ProtectedRoute>
              <AIPostPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/dual-publish"
          element={
            <ProtectedRoute>
              <DualPublishPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/api-config"
          element={
            <ProtectedRoute>
              <APIConfigPage />
            </ProtectedRoute>
          }
        />
        
        {/* Test Socket.IO */}
        <Route
          path="/test-socket"
          element={
            <ProtectedRoute>
              <TestSocketIO />
            </ProtectedRoute>
          }
        />
        
        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </SmoothScroll>
    </Router>
  )
}

export default App
