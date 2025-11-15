import { Link } from 'react-router-dom';

const TermsOfServicePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6 flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-gray-900">
            Instagram Automation
          </Link>
          <Link
            to="/login"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-xl p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Terms of Service
          </h1>
          <p className="text-gray-600 mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <div className="prose prose-blue max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                1. Acceptance of Terms
              </h2>
              <p className="text-gray-700 leading-relaxed">
                By accessing and using this Instagram Automation platform, you accept and agree to be bound 
                by the terms and provision of this agreement. If you do not agree to these terms, please do 
                not use our service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                2. Description of Service
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Our platform provides automated social media posting services for Instagram and YouTube, 
                including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>AI-powered content generation</li>
                <li>Dual publishing to multiple platforms</li>
                <li>OAuth authentication with social media platforms</li>
                <li>Video processing and optimization</li>
                <li>Scheduled posting capabilities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                3. User Accounts
              </h2>
              <p className="text-gray-700 leading-relaxed">
                You are responsible for:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
                <li>Ensuring your account information is accurate and up-to-date</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                4. Acceptable Use Policy
              </h2>
              <p className="text-gray-700 leading-relaxed">
                You agree NOT to use our service to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Violate any laws or regulations</li>
                <li>Post spam, malicious content, or misleading information</li>
                <li>Infringe on intellectual property rights</li>
                <li>Harass, abuse, or harm others</li>
                <li>Violate Instagram's or YouTube's Terms of Service</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Use automated scripts to abuse our service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                5. Third-Party Services
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Our service integrates with third-party platforms (Instagram, YouTube). You must comply with 
                their respective terms of service. We are not responsible for changes to third-party APIs or 
                policies that may affect our service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                6. Content Ownership and Rights
              </h2>
              <p className="text-gray-700 leading-relaxed">
                You retain all rights to the content you create and post through our platform. By using our 
                service, you grant us a limited license to process, store, and transmit your content solely 
                for the purpose of providing our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                7. AI-Generated Content
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Content generated by our AI services is provided as-is. You are responsible for reviewing and 
                approving all AI-generated content before publishing. We do not guarantee the accuracy, 
                appropriateness, or quality of AI-generated content.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                8. Service Availability
              </h2>
              <p className="text-gray-700 leading-relaxed">
                We strive to maintain high availability but do not guarantee uninterrupted service. We may 
                suspend or terminate service for maintenance, updates, or other reasons. We are not liable 
                for any losses resulting from service interruptions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                9. Limitation of Liability
              </h2>
              <p className="text-gray-700 leading-relaxed">
                To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, 
                special, consequential, or punitive damages, including loss of profits, data, or other 
                intangible losses resulting from your use of our service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                10. Termination
              </h2>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to suspend or terminate your account at any time for violations of these 
                terms. You may terminate your account at any time by contacting us. Upon termination, your 
                right to use the service will immediately cease.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                11. Modifications to Service and Terms
              </h2>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to modify or discontinue our service at any time. We may also update 
                these Terms of Service. Continued use of the service after changes constitutes acceptance 
                of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                12. Indemnification
              </h2>
              <p className="text-gray-700 leading-relaxed">
                You agree to indemnify and hold harmless our company, its officers, directors, employees, 
                and agents from any claims, damages, losses, liabilities, and expenses arising from your 
                use of the service or violation of these terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                13. Governing Law
              </h2>
              <p className="text-gray-700 leading-relaxed">
                These Terms shall be governed by and construed in accordance with applicable laws, without 
                regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                14. Contact Information
              </h2>
              <p className="text-gray-700 leading-relaxed">
                If you have any questions about these Terms of Service, please contact us through your 
                account dashboard or via email.
              </p>
            </section>
          </div>

          {/* Footer Links */}
          <div className="mt-12 pt-8 border-t border-gray-200 flex flex-wrap gap-4 justify-center">
            <Link
              to="/privacy"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Privacy Policy
            </Link>
            <span className="text-gray-400">•</span>
            <Link
              to="/login"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Sign In
            </Link>
            <span className="text-gray-400">•</span>
            <Link
              to="/register"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TermsOfServicePage;
