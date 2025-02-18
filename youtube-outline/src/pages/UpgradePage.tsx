import { Link } from 'react-router-dom'

const tiers = [
  {
    name: 'Free',
    price: '$0',
    features: [
      '3 video summaries per day',
      'Max 10-minute videos',
      'Basic outline format',
      'Email support'
    ],
    buttonText: 'Current Plan',
    buttonVariant: 'outline'
  },
  {
    name: 'Pro',
    price: '$10',
    features: [
      '50 video summaries per day',
      'Max 2-hour videos',
      'Advanced outline format',
      'Priority support',
      'Custom styling options'
    ],
    buttonText: 'Upgrade to Pro',
    buttonVariant: 'solid'
  },
  {
    name: 'Enterprise',
    price: '$49',
    features: [
      'Unlimited summaries',
      'Unlimited video length',
      'Custom outline templates',
      '24/7 priority support',
      'API access',
      'Team collaboration'
    ],
    buttonText: 'Contact Sales',
    buttonVariant: 'solid'
  }
]

export const UpgradePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navigation */}
      <nav className="px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/" className="text-3xl font-bold">LectureTube</Link>
        </div>
      </nav>

      {/* Pricing Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Upgrade Your Experience</h1>
          <p className="text-xl text-gray-600 mb-12">
            Choose the perfect plan for your needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="rounded-lg bg-white p-8 shadow-lg border border-gray-200 flex flex-col"
            >
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">{tier.name}</h2>
                <p className="text-4xl font-bold mb-4">
                  {tier.price}
                  <span className="text-base font-normal text-gray-500">/month</span>
                </p>
              </div>

              <ul className="mb-8 space-y-4 flex-grow">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-center">
                    <svg
                      className="h-5 w-5 text-green-500 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-3 px-4 rounded-lg font-medium ${
                  tier.buttonVariant === 'solid'
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'border-2 border-blue-500 text-blue-500 hover:bg-blue-50'
                }`}
              >
                {tier.buttonText}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
