# Database Schema

## Profiles Table
Extends the default Supabase auth.users table with user tier information.

### Schema
- id: uuid (references auth.users, primary key)
- tier: text (default: 'free')
- watched_videos: jsonb (default: '[]') - Array of watched video objects containing video_id, thumbnail, title, and watch_date
- created_at: timestamp with time zone
- updated_at: timestamp with time zone

### Security
- Row Level Security (RLS) enabled
- Users can only read their own profile