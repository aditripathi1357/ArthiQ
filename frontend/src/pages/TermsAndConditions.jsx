export default function TermsAndConditions() {
  const sections = [
    {
      title: "1. Acceptance of Terms",
      content: `By accessing or using the ArthiQ platform ("Service"), you confirm that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use the Service. These terms apply to all visitors, users, and others who access or use the Service.`
    },
    {
      title: "2. Description of Service",
      content: `ArthiQ provides an AI-powered financial intelligence platform for Indian investors. The Service includes live NSE/BSE stock data, AI-generated market insights, price outlooks, company analysis, forex rate tracking, and financial news aggregation. The Service is provided for informational purposes only and does not constitute financial advice.`
    },
    {
      title: "3. Eligibility",
      content: `You must be at least 18 years of age to use this Service. By using the Service, you represent and warrant that you are at least 18 years of age and have the legal capacity to enter into these Terms. ArthiQ is intended for users residing in India, though it may be accessed globally.`
    },
    {
      title: "4. Not Financial Advice",
      content: `All content provided by ArthiQ — including AI-generated insights, price outlooks, technical analysis, and market commentary — is strictly for informational and educational purposes only. Nothing on this platform constitutes financial, investment, legal, or tax advice. You should always consult with a qualified financial advisor before making any investment decisions. Past performance of any stock or market is not indicative of future results.`
    },
    {
      title: "5. User Accounts",
      content: `To access certain features such as the Watchlist, you may be required to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify ArthiQ immediately of any unauthorized use of your account. ArthiQ cannot and will not be liable for any loss or damage arising from your failure to comply with this security obligation.`
    },
    {
      title: "6. Intellectual Property",
      content: `The Service and its original content, features, and functionality are and will remain the exclusive property of ArthiQ and its licensors. The Service is protected by copyright, trademark, and other laws of India and foreign countries. Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of ArthiQ.`
    },
    {
      title: "7. Prohibited Uses",
      content: `You may not use the Service for any unlawful purpose or in a way that violates these Terms. Prohibited activities include scraping or automated data collection, reverse engineering the platform, distributing our data without permission, impersonating other users, attempting to interfere with the Service's infrastructure, or using the Service to conduct any fraudulent or unlawful financial activities.`
    },
    {
      title: "8. Data Accuracy Disclaimer",
      content: `ArthiQ makes reasonable efforts to ensure the accuracy of data displayed on the platform. However, stock prices and market data may be delayed by up to 15 minutes. AI-generated content is produced by algorithms and may contain errors or inaccuracies. ArthiQ does not guarantee the accuracy, completeness, or timeliness of any information on the platform. Use data at your own risk.`
    },
    {
      title: "9. Limitation of Liability",
      content: `To the maximum extent permitted by applicable law, ArthiQ shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of (or inability to access or use) the Service, any conduct or content of any third party on the Service, any content obtained from the Service, and unauthorized access, use or alteration of your transmissions or content.`
    },
    {
      title: "10. Changes to Terms",
      content: `ArthiQ reserves the right to modify or replace these Terms at any time at its sole discretion. We will provide notice of any significant changes by updating the "Last Updated" date at the top of this page. Your continued use of the Service after any changes constitutes your acceptance of the new Terms.`
    },
    {
      title: "11. Governing Law",
      content: `These Terms shall be governed and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts located in India.`
    },
    {
      title: "12. Contact Information",
      content: `If you have any questions about these Terms and Conditions, please contact us at arthiqaiofficial@gmail.com. We aim to respond to all inquiries within 5 business days.`
    },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      {/* Header */}
      <div className="mb-12">
        <div className="text-xs font-bold uppercase tracking-widest text-saffron mb-4">Legal</div>
        <h1 className="text-4xl font-extrabold text-text-primary mb-4">Terms and Conditions</h1>
        <p className="text-text-secondary">
          Last Updated: <strong>April 10, 2026</strong>
        </p>
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <strong>Important:</strong> Please read these terms carefully before using ArthiQ. This platform provides market data and AI-generated insights for informational purposes only — not financial advice.
        </div>
      </div>

      {/* Body */}
      <div className="space-y-10">
        {sections.map((s, i) => (
          <div key={i} className="glass-card p-6 md:p-8">
            <h2 className="text-lg font-bold text-text-primary mb-4 border-l-4 border-saffron pl-4">
              {s.title}
            </h2>
            <p className="text-text-secondary leading-relaxed text-sm">{s.content}</p>
          </div>
        ))}
      </div>

      {/* Footer CTA */}
      <div className="mt-12 text-center text-sm text-text-muted">
        By using ArthiQ, you agree to these Terms and Conditions. For questions, email{' '}
        <a href="mailto:arthiqaiofficial@gmail.com" className="text-saffron font-semibold hover:underline">
          arthiqaiofficial@gmail.com
        </a>
      </div>
    </div>
  )
}
