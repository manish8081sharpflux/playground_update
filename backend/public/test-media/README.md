# Test Media Files for Grading Interface

This directory contains placeholder media files for testing the grading interface.

## Required Files

### Art Submissions (JPEG images - 1280x720)
- `art-tree-drawing.jpg` - Drawing of a tree
- `art-family-drawing.jpg` - Family portrait drawing
- `art-nature-scene.jpg` - Nature scene with mountains
- `art-animal-sketch.jpg` - Animal sketch
- `art-self-portrait.jpg` - Self portrait

### Video Submissions (MP4 videos - 1920x1080, 2-3 minutes)
- `video-poem-recitation-1.mp4` - Poetry recitation video
- `video-poem-recitation-2.mp4` - Another poetry video
- `video-introduction.mp4` - Student introduction video
- `video-poem-recitation-1-thumb.jpg` - Thumbnail for video 1
- `video-poem-recitation-2-thumb.jpg` - Thumbnail for video 2
- `video-introduction-thumb.jpg` - Thumbnail for introduction

### Audio Submissions (MP3 audio - 30-60 seconds)
- `audio-life-skills-1.mp3` - Voice answer about hand washing
- `audio-life-skills-2.mp3` - Voice answer about healthy habits
- `audio-life-skills-3.mp3` - Voice answer about environment

## Quick Setup Options

### Option 1: Use Public Test URLs (Recommended for Quick Testing)
The seed script will work without actual files by using placeholder URLs. The grading interface will show broken image/video players, but you can still test the UI and functionality.

### Option 2: Add Your Own Test Files
1. Add any JPEG images (rename to match the names above)
2. Add any MP4 videos (rename to match the names above)
3. Add any MP3 audio files (rename to match the names above)

### Option 3: Generate Placeholder Files
Run the placeholder generation script:
```bash
node backend/scripts/generateTestMedia.js
```

This will create:
- 1x1 pixel colored JPEGs for art submissions
- 5-second black screen MP4 videos for video submissions
- 5-second silent MP3 files for audio submissions

## File URLs

When the backend server is running, these files will be accessible at:
```
http://localhost:5001/test-media/art-tree-drawing.jpg
http://localhost:5001/test-media/video-poem-recitation-1.mp4
http://localhost:5001/test-media/audio-life-skills-1.mp3
```

## Notes

- The seed script (`seedGradingData.js`) references these URLs
- You can add real media files later and re-run the seed script with `--replace` flag
- Make sure your backend serves the `public/` directory as static files
