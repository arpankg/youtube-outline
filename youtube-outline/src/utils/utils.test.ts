import { describe, it, expect } from 'vitest'
import { parseYouTubeUrl } from './utils'

describe('parseYouTubeUrl', () => {
  it('parses standard youtube.com URL', () => {
    const result = parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    expect(result).toEqual({
      videoId: 'dQw4w9WgXcQ'
    })
  })

  it('parses shortened youtu.be URL', () => {
    const result = parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')
    expect(result).toEqual({
      videoId: 'dQw4w9WgXcQ'
    })
  })

  it('parses URL with timestamp', () => {
    const result = parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30')
    expect(result).toEqual({
      videoId: 'dQw4w9WgXcQ',
      timestamp: 30
    })
  })

  it('parses URL with playlist', () => {
    const result = parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLxyz')
    expect(result).toEqual({
      videoId: 'dQw4w9WgXcQ',
      playlistId: 'PLxyz'
    })
  })

  it('parses shortened URL with playlist', () => {
    const result = parseYouTubeUrl('https://youtu.be/lZ3bPUKo5zc?list=PLUl4u3cNGP61-9PEhRognw5vryrSEVLPr')
    expect(result).toEqual({
      videoId: 'lZ3bPUKo5zc',
      playlistId: 'PLUl4u3cNGP61-9PEhRognw5vryrSEVLPr'
    })
  })

  it('handles invalid inputs', () => {
    expect(parseYouTubeUrl('')).toBeNull()
    expect(parseYouTubeUrl('https://example.com')).toBeNull()
    expect(parseYouTubeUrl('https://youtube.com/watch')).toBeNull()
  })
})
