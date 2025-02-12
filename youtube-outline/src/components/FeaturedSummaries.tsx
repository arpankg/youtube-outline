
import { Link } from 'react-router-dom';

type SummaryCard = {
  id: string;
  title: string;
  thumbnail: string;
  overlay?: {
    text: string;
    type: 'round' | 'tag' | 'top' | 'category';
    value?: string;
  };
  channelName?: string;
};

const dummyData: SummaryCard[] = [
  {
    id: 'lZ3bPUKo5zc',
    title: "Introduction to Quantum Physics",
    thumbnail: '/thumbnails/lZ3bPUKo5zc.jpg',
    channelName: "MIT OpenCourseWare"
  },
  {
    id: 'tLRCS48Ens4',
    title: "How to Understand & Assess Your Mental Health",
    thumbnail: '/thumbnails/tLRCS48Ens4.jpg',
    channelName: "Andrew Huberman"
  },
  {
    id: 'o0fG_lnVhHw',
    title: "HOW ROCKETS ARE MADE (Rocket Factory Tour)",
    thumbnail: '/thumbnails/o0fG_lnVhHw.jpg',
    channelName: "Smarter Every Day"
  },
  {
    id: 'BDqvzFY72mg',
    title: "Introduction to Power and Politics in Today's World",
    thumbnail: '/thumbnails/BDqvzFY72mg.jpg',
    channelName: "YaleCourses"
  },
  {
    id: 'WEDIj9JBTC8',
    title: "Everything You Need to Know About Finance and Investing",
    thumbnail: '/thumbnails/WEDIj9JBTC8.jpg',
    channelName: "Bill Ackman"
  },
  {
    id: 'P3IIRiSTc3g',
    title: "The Complete History Of The Roman Empire In 4 Hours",
    thumbnail: '/thumbnails/P3IIRiSTc3g.jpg',
    channelName: "History Hit"
  },
  {
    id: 'OTkq4OsG_Yc',
    title: "Introduction to Poker Theory",
    thumbnail: '/thumbnails/OTkq4OsG_Yc.jpg',
    channelName: "MIT OpenCourseWare"
  },
  {
    id: 't5DvF5OVr1Y',
    title: "Cell Biology Explained (Cell Structure & Function)",
    thumbnail: '/thumbnails/t5DvF5OVr1Y.jpg',
    channelName: "Ninja Nerd"
  },
  {
    id: '7D-gxaie6UI',
    title: "The Deadliest Infectious Disease of All Time",
    thumbnail: '/thumbnails/7D-gxaie6UI.jpg',
    channelName: "Crash Course"
  },
  {
    id: 'uC8TK7GH85o',
    title: "The Rise Of Emperor Napoleon Bonaparte",
    thumbnail: '/thumbnails/uC8TK7GH85o.jpg',
    channelName: "Timeline"
  },
  {
    id: 'cJONS7sqi0o',
    title: "Why Haven't We Found Alien Life?",
    thumbnail: '/thumbnails/cJONS7sqi0o.jpg',
    channelName: "PBS Space Time"
  },
  {
    id: 'c44pmmb_bNU',
    title: "Evolution of Tyrannosauras",
    thumbnail: '/thumbnails/c44pmmb_bNU.jpg',
    channelName: "Hobart's Obsessions"
  }
];

export function FeaturedSummaries() {
  return (
    <div>
      <h2 className="text-3xl font-bold mb-8">
        Featured <span className="text-blue-600">Summaries</span>
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {dummyData.map((card) => (
          <Link
            key={card.id}
            to={`/watch?v=${card.id}`}
            className="group relative overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 block"
          >
            {/* Thumbnail */}
            <div className="relative aspect-video">
              <img
                src={card.thumbnail}
                alt={card.title}
                className="w-full h-full object-cover"
              />

            </div>
            {/* Title */}
            <div className="p-4">
              <h3 className="text-lg font-semibold line-clamp-2 group-hover:text-blue-600 transition-colors">
                {card.title}
              </h3>
              {card.channelName && (
                <p className="text-sm text-gray-600 mt-1">{card.channelName}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
