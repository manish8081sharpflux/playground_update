const fs = require('fs');
const path = require('path');

// Base directory for test media
const testMediaDir = path.join(__dirname, '..', 'public', 'test-media');

// Ensure directory exists
if (!fs.existsSync(testMediaDir)) {
  fs.mkdirSync(testMediaDir, { recursive: true });
}

console.log('🎨 Generating test media placeholders...\n');

// Generate colored 1x1 pixel JPEGs for art submissions
const colors = [
  { name: 'art-tree-drawing.jpg', color: [34, 139, 34] }, // Green
  { name: 'art-family-drawing.jpg', color: [255, 140, 0] }, // Orange
  { name: 'art-nature-scene.jpg', color: [30, 144, 255] }, // Blue
  { name: 'art-animal-sketch.jpg', color: [218, 112, 214] }, // Purple
  { name: 'art-self-portrait.jpg', color: [255, 215, 0] }, // Gold
];

console.log('📸 Creating art submission placeholders (1x1 colored JPEGs)...');
colors.forEach(({ name, color }) => {
  // Create a minimal JPEG using base64 data
  // This is a 1x1 pixel JPEG with the specified color
  const [r, g, b] = color;

  // For simplicity, we'll create a text file indicating the placeholder
  // In a real scenario, you'd use a library like 'jimp' or 'sharp' to create actual images
  const placeholderContent = `JPEG Placeholder for ${name}\nColor: RGB(${r}, ${g}, ${b})\n\nTo replace with actual image, add a JPEG file here.`;
  fs.writeFileSync(path.join(testMediaDir, name), placeholderContent);
  console.log(`  ✅ Created ${name}`);
});

// Generate video placeholders
const videos = [
  'video-poem-recitation-1.mp4',
  'video-poem-recitation-2.mp4',
  'video-introduction.mp4',
];

console.log('\n🎥 Creating video submission placeholders...');
videos.forEach((name) => {
  const placeholderContent = `MP4 Placeholder for ${name}\n\nTo replace with actual video, add an MP4 file here.`;
  fs.writeFileSync(path.join(testMediaDir, name), placeholderContent);
  console.log(`  ✅ Created ${name}`);

  // Create thumbnail placeholder
  const thumbName = name.replace('.mp4', '-thumb.jpg');
  const thumbContent = `Thumbnail Placeholder for ${thumbName}\n\nTo replace with actual thumbnail, add a JPEG file here.`;
  fs.writeFileSync(path.join(testMediaDir, thumbName), thumbContent);
  console.log(`  ✅ Created ${thumbName}`);
});

// Generate audio placeholders
const audios = [
  'audio-life-skills-1.mp3',
  'audio-life-skills-2.mp3',
  'audio-life-skills-3.mp3',
];

console.log('\n🎙️ Creating audio submission placeholders...');
audios.forEach((name) => {
  const placeholderContent = `MP3 Placeholder for ${name}\n\nTo replace with actual audio, add an MP3 file here.`;
  fs.writeFileSync(path.join(testMediaDir, name), placeholderContent);
  console.log(`  ✅ Created ${name}`);
});

console.log('\n✅ Test media placeholders generated successfully!');
console.log(`📂 Location: ${testMediaDir}`);
console.log('\n💡 Note: These are text placeholders. For functional testing:');
console.log('   1. Replace with actual image/video/audio files');
console.log('   2. Or use public URLs from services like Unsplash, Pixabay, etc.');
console.log('\n🚀 Next step: Run the seed script to populate database:');
console.log('   node backend/scripts/seedGradingData.js');
