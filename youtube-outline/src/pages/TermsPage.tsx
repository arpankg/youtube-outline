export const TermsPage = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
        <p className="mb-4">
          By accessing and using YouTube Outline, you accept and agree to be bound by the terms
          and provision of this agreement.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
        <p className="mb-4">
          YouTube Outline provides tools for creating outlines and summaries of YouTube videos.
          We reserve the right to modify or discontinue the service at any time.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">3. User Responsibilities</h2>
        <ul className="list-disc pl-6 mb-4">
          <li>You must provide accurate information when creating an account</li>
          <li>You are responsible for maintaining the security of your account</li>
          <li>You agree not to misuse our services or help anyone else do so</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">4. Intellectual Property</h2>
        <p className="mb-4">
          The service and its original content, features, and functionality are owned by
          YouTube Outline and are protected by international copyright, trademark, and other
          intellectual property rights laws.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">5. Changes to Terms</h2>
        <p>
          We reserve the right to modify these terms at any time. We will notify users
          of any material changes to these terms.
        </p>
      </section>
    </div>
  )
}

export default TermsPage
