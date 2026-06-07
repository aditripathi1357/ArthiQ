export default function PrivacyPolicy() {
  const sections = [
    {
      title: "1. Information We Collect",
      content: `When you use ArthiQ, we may collect the following types of information:\n\n• Account Information: When you register, we collect your name and email address via Supabase Authentication. If you sign in with Google, we receive your Google profile name and email.\n\n• Usage Data: We collect anonymized information about how you interact with the platform — pages visited, stocks searched, watchlist items added — to improve the Service.\n\n• Device Information: We may collect your browser type, operating system, IP address, and device identifiers for security and analytics purposes.\n\n• Cookies: We use session cookies for authentication and preference cookies to remember your settings.`
    },
    {
      title: "2. How We Use Your Information",
      content: `ArthiQ uses the information we collect to:\n\n• Provide, operate, and maintain the Service\n• Personalize your experience (e.g., your Watchlist)\n• Send transactional emails (account confirmation, password reset)\n• Analyze usage patterns to improve the platform\n• Detect, prevent, and address technical issues or fraud\n• Comply with legal obligations\n\nWe do NOT sell your personal data to third parties. We do not use your data for targeted advertising.`
    },
    {
      title: "3. Data Storage and Security",
      content: `User account data is securely stored using Supabase, a GDPR-compliant backend-as-a-service platform hosted on AWS. We implement industry-standard security measures including encrypted data at rest and in transit (HTTPS/TLS), Row Level Security (RLS) policies ensuring users can only access their own data, and regular security audits. Despite our best efforts, no system is 100% secure. We cannot guarantee absolute security of your data.`
    },
    {
      title: "4. Data Sharing",
      content: `We may share your information with:\n\n• Service Providers: Supabase (database & auth), Vercel/hosting provider (infrastructure), OpenAI (AI insights — note: only market data is sent to OpenAI, never personal data)\n\n• Legal Requirements: If required by law, regulation, or valid legal process, we may disclose your information to appropriate authorities.\n\nWe do not share personally identifiable information with advertisers, data brokers, or other third parties.`
    },
    {
      title: "5. Your Rights",
      content: `You have the following rights regarding your personal data:\n\n• Access: You may request a copy of all personal data we hold about you.\n• Correction: You may request that we correct any inaccurate data.\n• Deletion: You may request deletion of your account and all associated data.\n• Portability: You may request your data in a portable format.\n• Withdrawal of Consent: You may withdraw consent to data processing at any time.\n\nTo exercise any of these rights, email us at privacy@arthiq.com.`
    },
    {
      title: "6. Cookies Policy",
      content: `ArthiQ uses the following types of cookies:\n\n• Essential Cookies: Required for the Service to function (authentication sessions).\n• Analytics Cookies: Used to understand how users interact with the platform (anonymized).\n• Preference Cookies: Used to remember your settings.\n\nYou can control cookies through your browser settings. Disabling essential cookies may prevent you from logging in.`
    },
    {
      title: "7. Third-Party Links",
      content: `ArthiQ may contain links to third-party websites including news sources, exchange websites, and company pages. We are not responsible for the privacy practices or content of these external sites. We encourage you to review the privacy policies of any third-party sites you visit.`
    },
    {
      title: "8. Children's Privacy",
      content: `ArthiQ is not intended for use by anyone under the age of 18. We do not knowingly collect personal information from minors. If you believe a minor has provided us with personal information, please contact us immediately so we can delete the data.`
    },
    {
      title: "9. Changes to This Policy",
      content: `We may update this Privacy Policy periodically. We will notify you of significant changes by updating the "Last Updated" date on this page. For material changes, we may also send a notification to your registered email address. We encourage you to review this policy regularly.`
    },
    {
      title: "10. Contact Us",
      content: `For any privacy-related questions, concerns, or to exercise your rights, please contact our Privacy Officer at: privacy@arthiq.com. We aim to respond to all privacy-related requests within 30 days.`
    },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      {/* Header */}
      <div className="mb-12">
        <div className="text-xs font-bold uppercase tracking-widest text-saffron mb-4">Legal</div>
        <h1 className="text-4xl font-extrabold text-text-primary mb-4">Privacy Policy</h1>
        <p className="text-text-secondary">
          Last Updated: <strong>April 10, 2026</strong>
        </p>
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
          <strong>Your privacy matters.</strong> We are committed to being transparent about what data we collect and how we use it. We do not sell your data.
        </div>
      </div>

      {/* Body */}
      <div className="space-y-10">
        {sections.map((s, i) => (
          <div key={i} className="glass-card p-6 md:p-8">
            <h2 className="text-lg font-bold text-text-primary mb-4 border-l-4 border-saffron pl-4">
              {s.title}
            </h2>
            <p className="text-text-secondary leading-relaxed text-sm whitespace-pre-line">{s.content}</p>
          </div>
        ))}
      </div>

      {/* Footer CTA */}
      <div className="mt-12 text-center text-sm text-text-muted">
        Questions about your privacy? Email{' '}
        <a href="mailto:privacy@arthiq.com" className="text-saffron font-semibold hover:underline">
          privacy@arthiq.com
        </a>
      </div>
    </div>
  )
}
