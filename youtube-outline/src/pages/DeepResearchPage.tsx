import { useState } from 'react';
import { parseYouTubeUrl } from '../utils/utils';
import { connectDeepResearch, processStreamResult } from '../utils/deepResearch';
import { ShowNote } from '../types/deepResearch';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

interface StatusWindowProps {
  messages: string[];
}

const StatusWindow: React.FC<StatusWindowProps> = ({ messages }) => {
  return (
    <div className="w-full max-w-2xl mx-auto rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold">DeepSearch</h3>
      </div>
      <div className="h-[300px] overflow-y-auto p-4 space-y-2">
        {messages.map((message, index) => (
          <div key={index} className="flex items-start space-x-2">
            <span>•</span>
            <span>{message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function DeepResearchPage() {
  const [inputUrl, setInputUrl] = useState('');
  const [statusMessages, setStatusMessages] = useState<string[]>([]);
  const [showNotes, setShowNotes] = useState<ShowNote[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatusMessages([]);
    setShowNotes([]);

    const parsed = parseYouTubeUrl(inputUrl);
    if (!parsed) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setIsLoading(true);

    const ws = connectDeepResearch(
      inputUrl,
      (result) => {
        switch (result.type) {
          case 'status':
            console.log('Status update:', result);
            setStatusMessages(prev => [...prev, result.data.message || '']);
            break;
          case 'segment_result':
            console.log('Segment result:', result);
            if (result.data.show_notes) {
              setShowNotes(prev => [...prev, ...result.data.show_notes]);
            }
            break;
          case 'complete':
            console.log('Complete:', result);
            if (result.data.show_notes) {
              setShowNotes(result.data.show_notes);
            }
            setStatusMessages(prev => [...prev, 'Analysis complete!']);
            setIsLoading(false);
            break;
          case 'error':
            console.error('Error:', result);
            setError(result.data.error || result.data.message || 'An error occurred');
            break;
        }
      },
      (error) => {
        setError(error);
        setIsLoading(false);
      },
      () => setIsLoading(false)
    );

    // Cleanup on unmount
    return () => {
      ws.close();
    };
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
        <DocumentTextIcon className="h-8 w-8" />
        Deep Research
      </h1>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-4">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Enter YouTube URL"
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
          >
            {isLoading ? 'Processing...' : 'Analyze'}
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {statusMessages.length > 0 && (
        <div className="my-8">
          <StatusWindow messages={statusMessages} />
        </div>
      )}

      {showNotes.length > 0 && (
        <div className="space-y-6">
          {showNotes.map((note, index) => (
            <div key={index} className="p-6 bg-white rounded-lg shadow">
              <h3 className="text-xl font-semibold mb-2">{note.name}</h3>
              <p className="text-gray-600 mb-3">{note.context}</p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>Timestamp: {note.timestamp}</span>
                {note.url && (
                  <a
                    href={note.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Learn More
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
