const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import models
const User = require('../models/user');
const Course = require('../models/course');
const Submission = require('../models/Submission');
const Balagruha = require('../models/balagruha');

// Test data: Balagruha
const testBalagruha = {
  name: 'Ramakrishna Ashram',
  location: 'Mumbai',
  capacity: 100,
  currentOccupancy: 45,
  incharge: null, // Will be set after creating incharge user
};

// Test data: Coach user
const testCoach = {
  name: 'Coach Priya',
  email: 'coach@test.com',
  password: 'TestPassword123',
  role: 'coach',
  status: 'active',
};

// Test data: Students (20 students)
const testStudents = [
  { name: 'Ravi Kumar', age: 11, gender: 'male', class: '5th' },
  { name: 'Priya Sharma', age: 12, gender: 'female', class: '6th' },
  { name: 'Suresh Patel', age: 10, gender: 'male', class: '5th' },
  { name: 'Ananya Singh', age: 13, gender: 'female', class: '7th' },
  { name: 'Vikram Reddy', age: 11, gender: 'male', class: '6th' },
  { name: 'Meera Iyer', age: 12, gender: 'female', class: '6th' },
  { name: 'Arjun Desai', age: 10, gender: 'male', class: '5th' },
  { name: 'Kavya Nair', age: 13, gender: 'female', class: '7th' },
  { name: 'Rohan Gupta', age: 11, gender: 'male', class: '5th' },
  { name: 'Ishita Verma', age: 12, gender: 'female', class: '6th' },
  { name: 'Aditya Joshi', age: 10, gender: 'male', class: '5th' },
  { name: 'Diya Kapoor', age: 13, gender: 'female', class: '7th' },
  { name: 'Karan Mehta', age: 11, gender: 'male', class: '6th' },
  { name: 'Pooja Saxena', age: 12, gender: 'female', class: '6th' },
  { name: 'Nikhil Rao', age: 10, gender: 'male', class: '5th' },
  { name: 'Sneha Pillai', age: 13, gender: 'female', class: '7th' },
  { name: 'Amit Bose', age: 11, gender: 'male', class: '5th' },
  { name: 'Riya Chatterjee', age: 12, gender: 'female', class: '6th' },
  { name: 'Sanjay Kulkarni', age: 10, gender: 'male', class: '5th' },
  { name: 'Neha Agarwal', age: 13, gender: 'female', class: '7th' },
];

// Test data: Courses
const testCourses = [
  {
    title: 'Art Workshop Basics',
    description: 'Learn fundamental art techniques including drawing, painting, and coloring',
    category: 'Art',
    difficultyLevel: 'Beginner',
    status: 'published',
    icon: '🎨',
    enableCoinReward: true,
    coinsOnCompletion: 50,
    modules: [
      {
        title: 'Drawing Fundamentals',
        description: 'Learn basic drawing shapes and techniques',
        order: 0,
        chapters: [
          {
            title: 'Free Sketch',
            description: 'Express your creativity through free sketching',
            order: 0,
          },
        ],
      },
    ],
  },
  {
    title: 'Spoken English - Poetry',
    description: 'Improve pronunciation, expression, and confidence through poetry recitation',
    category: 'Spoken English',
    difficultyLevel: 'Intermediate',
    status: 'published',
    icon: '🎤',
    enableCoinReward: true,
    coinsOnCompletion: 60,
    modules: [
      {
        title: 'Poetry Recitation',
        description: 'Learn to recite famous poems with emotion and clarity',
        order: 0,
        chapters: [
          {
            title: 'Poem 5: The Road Not Taken',
            description: 'Recite Robert Frost\'s famous poem',
            order: 0,
          },
        ],
      },
    ],
  },
  {
    title: 'Life Skills - Hygiene & Health',
    description: 'Learn essential life skills about hygiene, health, and personal care',
    category: 'Life Skills',
    difficultyLevel: 'Beginner',
    status: 'published',
    icon: '🧼',
    enableCoinReward: true,
    coinsOnCompletion: 40,
    modules: [
      {
        title: 'Hygiene Basics',
        description: 'Understanding importance of cleanliness and hygiene',
        order: 0,
        chapters: [
          {
            title: 'Question 7: Hand Washing',
            description: 'Why is washing hands before eating important?',
            order: 0,
          },
        ],
      },
    ],
  },
];

// Test data: Art submission tasks
const artTasks = [
  { title: 'Draw a Tree', description: 'Draw a tree with branches, leaves, and roots. Use colors to make it beautiful.' },
  { title: 'Draw Your Family', description: 'Draw a picture of your family members.' },
  { title: 'Nature Scene', description: 'Draw a beautiful nature scene with mountains, rivers, and sky.' },
  { title: 'Animal Sketch', description: 'Draw your favorite animal with colors.' },
  { title: 'Self Portrait', description: 'Draw a picture of yourself.' },
];

// Test data: Video submission tasks
const videoTasks = [
  { title: 'Recite: The Road Not Taken', poem: 'Two roads diverged in a yellow wood...' },
  { title: 'Recite: Twinkle Twinkle', poem: 'Twinkle, twinkle, little star...' },
  { title: 'Recite: If by Rudyard Kipling', poem: 'If you can keep your head when all about you...' },
  { title: 'Introduce Yourself in English', description: 'Introduce yourself, your hobbies, and your goals.' },
];

// Test data: Audio submission tasks
const audioTasks = [
  { question: 'Why is washing hands before eating important?' },
  { question: 'What are three healthy habits everyone should follow?' },
  { question: 'How can we keep our environment clean?' },
  { question: 'Why is exercise important for our body?' },
];

// Placeholder media URLs (will create actual placeholder files later)
const placeholderMediaUrls = {
  art: [
    'http://localhost:5001/test-media/art-tree-drawing.jpg',
    'http://localhost:5001/test-media/art-family-drawing.jpg',
    'http://localhost:5001/test-media/art-nature-scene.jpg',
    'http://localhost:5001/test-media/art-animal-sketch.jpg',
    'http://localhost:5001/test-media/art-self-portrait.jpg',
  ],
  video: [
    'http://localhost:5001/test-media/video-poem-recitation-1.mp4',
    'http://localhost:5001/test-media/video-poem-recitation-2.mp4',
    'http://localhost:5001/test-media/video-introduction.mp4',
  ],
  audio: [
    'http://localhost:5001/test-media/audio-life-skills-1.mp3',
    'http://localhost:5001/test-media/audio-life-skills-2.mp3',
    'http://localhost:5001/test-media/audio-life-skills-3.mp3',
  ],
};

// Helper function to generate random submission date within last 30 days
function getRandomSubmissionDate() {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 30); // 0-30 days ago
  const hoursAgo = Math.floor(Math.random() * 24); // 0-24 hours
  const minutesAgo = Math.floor(Math.random() * 60); // 0-60 minutes

  const submissionDate = new Date(now);
  submissionDate.setDate(submissionDate.getDate() - daysAgo);
  submissionDate.setHours(submissionDate.getHours() - hoursAgo);
  submissionDate.setMinutes(submissionDate.getMinutes() - minutesAgo);

  return submissionDate;
}

// Helper function to generate random time spent (5-90 minutes)
function getRandomTimeSpent() {
  return Math.floor(Math.random() * 86) + 5; // 5-90 minutes
}

// Main seed function
async function seedGradingData() {
  try {
    // Connect to database
    const dbConnection = process.env.NODE_ENV === 'local'
      ? process.env.MONGO_URI_LOCAL
      : process.env.MONGO_URI;

    await mongoose.connect(dbConnection, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Connected to MongoDB');

    // Check if grading test data already exists
    const existingSubmissions = await Submission.countDocuments();

    if (existingSubmissions > 0) {
      console.log(`\n⚠️  Database already contains ${existingSubmissions} submissions.`);
      console.log('Do you want to:');
      console.log('  1. Add more submissions (keep existing)');
      console.log('  2. Replace all test data (delete existing submissions, users, courses)');
      console.log('  3. Cancel');
      console.log('\nTo replace all test data, run: node backend/scripts/seedGradingData.js --replace');

      if (!process.argv.includes('--replace')) {
        console.log('\n❌ Cancelled. Use --replace flag to replace existing test data.');
        await mongoose.disconnect();
        process.exit(0);
      }

      // Delete existing test data
      console.log('\n🗑️  Deleting existing test data...');
      await Submission.deleteMany({});
      console.log('✅ Deleted all submissions');

      // Delete test users (coach and students)
      await User.deleteMany({ email: { $regex: /@test\.com$/i } });
      console.log('✅ Deleted test users');

      // Delete test courses
      await Course.deleteMany({ title: { $in: testCourses.map(c => c.title) } });
      console.log('✅ Deleted test courses');

      // Delete test Balagruha
      await Balagruha.deleteMany({ name: 'Ramakrishna Ashram' });
      console.log('✅ Deleted test Balagruha');
    }

    // Step 1: Create Balagruha
    console.log('\n📍 Creating Balagruha...');
    const balagruha = await Balagruha.create(testBalagruha);
    console.log(`✅ Created Balagruha: ${balagruha.name} (ID: ${balagruha._id})`);

    // Step 2: Create Coach user
    console.log('\n👤 Creating coach user...');
    const hashedPassword = await bcrypt.hash(testCoach.password, 10);
    const coach = await User.create({
      ...testCoach,
      password: hashedPassword,
      balagruhaIds: [balagruha._id],
    });
    console.log(`✅ Created coach: ${coach.name} (${coach.email})`);

    // Step 3: Create Student users
    console.log('\n👥 Creating student users...');
    const students = [];
    for (let i = 0; i < testStudents.length; i++) {
      const studentData = testStudents[i];
      const student = await User.create({
        name: studentData.name,
        email: `student${i + 1}@test.com`,
        password: await bcrypt.hash('student123', 10),
        role: 'student',
        status: 'active',
        age: studentData.age,
        gender: studentData.gender,
        class: studentData.class,
        balagruhaIds: [balagruha._id],
      });
      students.push(student);
      console.log(`  ✅ Created student ${i + 1}/20: ${student.name}`);
    }

    // Step 4: Create Courses
    console.log('\n📚 Creating courses...');
    const courses = [];
    for (const courseData of testCourses) {
      const course = await Course.create({
        ...courseData,
        createdBy: coach._id,
        assignedBalagruha: [balagruha._id],
        publishedAt: new Date(),
      });
      courses.push(course);
      console.log(`  ✅ Created course: ${course.title} (${course.category})`);
    }

    // Step 5: Create Submissions
    console.log('\n📤 Creating submissions...');

    const artCourse = courses.find(c => c.category === 'Art');
    const videoCourse = courses.find(c => c.category === 'Spoken English');
    const audioCourse = courses.find(c => c.category === 'Life Skills');

    const submissions = [];

    // Create art submissions (18 submissions - 9 pending, 6 graded, 3 flagged)
    console.log('\n  🎨 Creating art submissions...');
    for (let i = 0; i < 18; i++) {
      const student = students[i % students.length];
      const task = artTasks[i % artTasks.length];
      const mediaUrl = placeholderMediaUrls.art[i % placeholderMediaUrls.art.length];

      let status = 'pending';
      let grade = null;
      let flagged = null;

      // 9 pending, 6 graded, 3 flagged
      if (i >= 9 && i < 15) {
        status = 'graded';
        const qualities = ['excellent', 'good', 'needs_improvement'];
        const quality = qualities[i % 3];
        const coinsMap = { excellent: 85, good: 65, needs_improvement: 30 };
        grade = {
          quality,
          coinsAwarded: coinsMap[quality],
          feedback: `Great work on your ${task.title.toLowerCase()}! Keep practicing.`,
          gradedBy: coach._id,
          gradedAt: getRandomSubmissionDate(),
        };
      } else if (i >= 15) {
        status = 'flagged';
        flagged = {
          reason: 'Submission unclear - needs review',
          flaggedBy: coach._id,
          flaggedAt: getRandomSubmissionDate(),
        };
      }

      const submission = await Submission.create({
        studentId: student._id,
        courseId: artCourse._id,
        taskId: `art-task-${i + 1}`,
        taskTitle: task.title,
        submissionType: 'art',
        fileUrl: mediaUrl,
        thumbnailUrl: mediaUrl,
        metadata: {
          fileSize: 2400000 + Math.floor(Math.random() * 1000000), // 2.4-3.4 MB
          dimensions: { width: 1280, height: 720 },
          mimeType: 'image/jpeg',
        },
        submittedAt: getRandomSubmissionDate(),
        timeSpent: getRandomTimeSpent(),
        status,
        grade,
        flagged,
      });

      submissions.push(submission);
      console.log(`    ✅ Art submission ${i + 1}/18: ${student.name} - ${task.title} (${status})`);
    }

    // Create video submissions (10 submissions - 5 pending, 5 graded)
    console.log('\n  🎥 Creating video submissions...');
    for (let i = 0; i < 10; i++) {
      const student = students[(i + 5) % students.length];
      const task = videoTasks[i % videoTasks.length];
      const mediaUrl = placeholderMediaUrls.video[i % placeholderMediaUrls.video.length];

      let status = 'pending';
      let grade = null;

      if (i >= 5) {
        status = 'graded';
        const qualities = ['excellent', 'good'];
        const quality = qualities[i % 2];
        const coinsMap = { excellent: 90, good: 70 };
        grade = {
          quality,
          coinsAwarded: coinsMap[quality],
          feedback: `${quality === 'excellent' ? 'Excellent' : 'Good'} pronunciation and expression! ${quality === 'excellent' ? '' : 'Try to memorize next time.'}`,
          gradedBy: coach._id,
          gradedAt: getRandomSubmissionDate(),
        };
      }

      const submission = await Submission.create({
        studentId: student._id,
        courseId: videoCourse._id,
        taskId: `video-task-${i + 1}`,
        taskTitle: task.title,
        submissionType: 'video',
        fileUrl: mediaUrl,
        thumbnailUrl: mediaUrl.replace('.mp4', '-thumb.jpg'),
        metadata: {
          duration: 120 + Math.floor(Math.random() * 60), // 2-3 minutes
          fileSize: 12000000 + Math.floor(Math.random() * 5000000), // 12-17 MB
          mimeType: 'video/mp4',
        },
        submittedAt: getRandomSubmissionDate(),
        timeSpent: getRandomTimeSpent(),
        status,
        grade,
      });

      submissions.push(submission);
      console.log(`    ✅ Video submission ${i + 1}/10: ${student.name} - ${task.title} (${status})`);
    }

    // Create audio submissions (8 submissions - 4 pending, 4 graded)
    console.log('\n  🎙️ Creating audio submissions...');
    for (let i = 0; i < 8; i++) {
      const student = students[(i + 10) % students.length];
      const task = audioTasks[i % audioTasks.length];
      const mediaUrl = placeholderMediaUrls.audio[i % placeholderMediaUrls.audio.length];

      let status = 'pending';
      let grade = null;

      if (i >= 4) {
        status = 'graded';
        const qualities = ['good', 'needs_improvement'];
        const quality = qualities[i % 2];
        const coinsMap = { good: 65, needs_improvement: 35 };
        grade = {
          quality,
          coinsAwarded: coinsMap[quality],
          feedback: quality === 'good'
            ? 'Clear answer! Try to add more details next time.'
            : 'Good effort, but try to speak more clearly and add examples.',
          gradedBy: coach._id,
          gradedAt: getRandomSubmissionDate(),
        };
      }

      const submission = await Submission.create({
        studentId: student._id,
        courseId: audioCourse._id,
        taskId: `audio-task-${i + 1}`,
        taskTitle: task.question,
        submissionType: 'audio',
        fileUrl: mediaUrl,
        metadata: {
          duration: 30 + Math.floor(Math.random() * 30), // 30-60 seconds
          fileSize: 450000 + Math.floor(Math.random() * 200000), // 450-650 KB
          mimeType: 'audio/mpeg',
        },
        submittedAt: getRandomSubmissionDate(),
        timeSpent: getRandomTimeSpent(),
        status,
        grade,
      });

      submissions.push(submission);
      console.log(`    ✅ Audio submission ${i + 1}/8: ${student.name} - ${task.question.substring(0, 40)}... (${status})`);
    }

    // Show summary
    console.log('\n📊 Test Data Summary:');
    console.log(`  👤 Coach: ${coach.name} (${coach.email})`);
    console.log(`  👥 Students: ${students.length} students created`);
    console.log(`  📚 Courses: ${courses.length} courses created`);
    console.log(`     - ${artCourse.title} (Art)`);
    console.log(`     - ${videoCourse.title} (Video)`);
    console.log(`     - ${audioCourse.title} (Audio)`);
    console.log(`  📤 Submissions: ${submissions.length} total submissions`);

    const pendingCount = submissions.filter(s => s.status === 'pending').length;
    const gradedCount = submissions.filter(s => s.status === 'graded').length;
    const flaggedCount = submissions.filter(s => s.status === 'flagged').length;

    console.log(`     - 📝 Pending: ${pendingCount}`);
    console.log(`     - ✅ Graded: ${gradedCount}`);
    console.log(`     - ⚠️ Flagged: ${flaggedCount}`);

    const artSubmissions = submissions.filter(s => s.submissionType === 'art').length;
    const videoSubmissions = submissions.filter(s => s.submissionType === 'video').length;
    const audioSubmissions = submissions.filter(s => s.submissionType === 'audio').length;

    console.log(`     - 🎨 Art: ${artSubmissions} submissions`);
    console.log(`     - 🎥 Video: ${videoSubmissions} submissions`);
    console.log(`     - 🎙️ Audio: ${audioSubmissions} submissions`);

    // Calculate "This Week" count (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const thisWeekCount = submissions.filter(s => s.submittedAt >= oneWeekAgo).length;
    console.log(`     - ⏱️ This Week: ${thisWeekCount} submissions`);

    console.log('\n🎉 Grading test data seeding completed successfully!');
    console.log('\n💡 You can now test the grading interface at:');
    console.log('   Dashboard: http://localhost:3000/coach/grading');
    console.log(`   Login: ${coach.email} / ${testCoach.password}`);
    console.log('\n📝 Note: Placeholder media URLs are used. To test with actual media:');
    console.log('   1. Create backend/public/test-media/ directory');
    console.log('   2. Add sample image/video/audio files');
    console.log('   3. Update file URLs in this script');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the seed function
seedGradingData();
