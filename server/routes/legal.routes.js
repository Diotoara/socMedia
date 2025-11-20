const express = require('express');
const router = express.Router();

/**
 * GET /api/legal/privacy
 * Returns Privacy Policy content
 */
router.get('/privacy', (req, res) => {
  res.json({
    success: true,
    title: 'Privacy Policy',
    lastUpdated: 'February 3, 2025',
    content: {
      introduction: 'This Privacy Policy describes how we collect, use, store, and share information when you access or use the Instagram Automation platform (the "Service"). This policy is publicly accessible, non-geo-blocked, and crawlable as required by Meta\'s Platform Terms.',
      sections: [
        {
          title: '1. Information We Collect',
          content: 'We collect information you provide directly (account credentials, Instagram tokens), automatically (usage data, logs), and from third parties (Instagram Graph API data including posts, comments, and engagement metrics).'
        },
        {
          title: '2. How We Use Your Information',
          content: 'We use your information to: provide and maintain the Service, automate Instagram comment responses, generate AI-powered replies, monitor and analyze usage, communicate with you, and comply with legal obligations.'
        },
        {
          title: '3. Data Storage and Security',
          content: 'We store data securely using encryption (AES-256 for sensitive credentials), secure databases (MongoDB with authentication), and follow industry best practices. Access tokens are encrypted at rest and in transit.'
        },
        {
          title: '4. Data Sharing and Disclosure',
          content: 'We do not sell your personal information. We may share data with: service providers (Instagram/Meta APIs, AI services), legal authorities when required by law, and business transfers (in case of merger or acquisition).'
        },
        {
          title: '5. Your Rights and Choices',
          content: 'You have the right to: access your data, correct inaccurate information, delete your account and data, opt-out of certain data processing, and export your data. Contact us through your account dashboard to exercise these rights.'
        },
        {
          title: '6. Instagram-Specific Data Handling',
          content: 'We access Instagram data via official Graph API with your explicit authorization. We store: access tokens (encrypted), Instagram account ID, posts and comments data, and automation logs. You can revoke access anytime through Instagram settings or our dashboard.'
        },
        {
          title: '7. Data Retention',
          content: 'We retain your data while your account is active and for 30 days after deletion (for recovery). Processed comments are automatically deleted after 30 days. Logs are retained for 90 days for debugging and security purposes.'
        },
        {
          title: '8. International Data Transfers',
          content: 'Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for international transfers in compliance with applicable data protection laws.'
        },
        {
          title: '9. Children\'s Privacy',
          content: 'Our Service is not intended for users under 13 years of age. We do not knowingly collect information from children under 13. If you believe we have collected such information, please contact us immediately.'
        },
        {
          title: '10. Changes to This Policy',
          content: 'We may update this Privacy Policy to reflect changes in our practices, services, or legal obligations. We will post updates here, revise the "Last updated" date, and notify you through the Service or by email when material changes occur.'
        },
        {
          title: '11. Contact Us',
          content: 'If you have questions about this Privacy Policy, data processing, or wish to exercise your rights, contact us through your account dashboard or via email at privacy@autoflow.app.'
        }
      ],
      metaCompliance: {
        note: 'This Privacy Policy is publicly accessible, non-geo-blocked, and crawlable as required by Meta\'s Platform Terms.',
        dataAccessUrl: '/api/legal/privacy',
        dataDeletionUrl: '/api/oauth/instagram/data-deletion'
      }
    }
  });
});

/**
 * GET /api/legal/terms
 * Returns Terms of Service content
 */
router.get('/terms', (req, res) => {
  res.json({
    success: true,
    title: 'Terms of Service',
    lastUpdated: 'February 3, 2025',
    content: {
      introduction: 'Welcome to Instagram Automation. By accessing or using our Service, you agree to be bound by these Terms of Service. Please read them carefully.',
      sections: [
        {
          title: '1. Acceptance of Terms',
          content: 'By creating an account or using the Service, you agree to these Terms, our Privacy Policy, and Instagram\'s Terms of Service. If you do not agree, do not use the Service.'
        },
        {
          title: '2. Description of Service',
          content: 'Instagram Automation provides automated comment response functionality for Instagram Business and Creator accounts using official Instagram Graph API.'
        },
        {
          title: '3. Account Requirements',
          content: 'You must: be at least 13 years old, have an Instagram Business or Creator account, provide accurate registration information, maintain account security, and comply with Instagram terms.'
        },
        {
          title: '4. Prohibited Activities',
          content: 'You may not: violate Instagram\'s Terms, spam users, use the Service for illegal purposes, attempt to circumvent rate limits, reverse engineer the Service, or share your account.'
        },
        {
          title: '5. AI-Generated Content',
          content: 'AI-generated replies are provided "as-is". You are responsible for reviewing automated responses. We are not liable for any content generated by AI.'
        },
        {
          title: '6. Service Availability',
          content: 'We strive for 99.9% uptime but do not guarantee uninterrupted service. We may suspend for maintenance or if you violate these Terms.'
        },
        {
          title: '7. Termination',
          content: 'We may terminate your account for violations. You may terminate anytime. Upon termination, data will be deleted per Privacy Policy.'
        },
        {
          title: '8. Contact Information',
          content: 'For questions, contact us via dashboard or support@autoflow.app.'
        }
      ],
      metaCompliance: {
        note: 'This Service complies with Meta\'s Platform Terms and Instagram API requirements.',
        privacyPolicyUrl: '/api/legal/privacy',
        dataDeletionUrl: '/api/oauth/instagram/data-deletion'
      }
    }
  });
});

module.exports = router;
