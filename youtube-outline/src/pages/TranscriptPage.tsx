import { useSearchParams, Link } from 'react-router-dom'

export default function TranscriptPage() {
  const [searchParams] = useSearchParams()
  const videoId = searchParams.get('v')

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link 
            to="/"
            className="text-blue-500 hover:text-blue-700 font-medium"
          >
            ← Back to Home
          </Link>
        </div>
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Transcript for Video: {videoId}
          </h1>
          {/* TODO: Add actual transcript content */}
          <p className="text-gray-600">
            Loading transcript...
          </p>
        </div>
      </div>
    </div>
  )
}
