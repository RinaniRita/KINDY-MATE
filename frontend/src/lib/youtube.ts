/**
 * Utility functions for handling YouTube URLs.
 */

/**
 * Extracts the YouTube Video ID from various common URL formats.
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * 
 * @param url The YouTube URL string
 * @return The 11-character video ID, or null if invalid/not found.
 */
export function extractYouTubeId(url: string): string | null {
  if (!url || typeof url !== "string") return null;

  // Regex handles:
  // - youtu.be/<id>
  // - youtube.com/watch?v=<id>
  // - youtube.com/embed/<id>
  // - youtube.com/v/<id>
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);

  if (match && match[2].length === 11) {
    return match[2];
  }

  return null;
}

/**
 * Validates if a string is a potentially valid YouTube URL.
 */
export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeId(url) !== null;
}
