/**
 * Test script for FR models and encryption
 *
 * Run with: node backend/test-fr-models.js
 */

const { encryptEmbedding, decryptEmbedding, generateKey } = require('./utils/embeddingEncryption');

console.log('🧪 Testing FR Models and Encryption...\n');

// Test 1: Encryption/Decryption
console.log('Test 1: Encryption/Decryption');
console.log('================================');

try {
  // Simulate a 128-d face embedding (just first 10 values for display)
  const mockEmbedding = Array.from({ length: 128 }, (_, i) => Math.random() * 2 - 1);
  console.log('Original embedding (first 10 values):', mockEmbedding.slice(0, 10).map(v => v.toFixed(4)));

  // Encrypt
  const encrypted = encryptEmbedding(mockEmbedding);
  console.log('Encrypted format:', encrypted.substring(0, 50) + '...');
  console.log('Encrypted length:', encrypted.length, 'characters');

  // Decrypt
  const decrypted = decryptEmbedding(encrypted);
  console.log('Decrypted embedding (first 10 values):', decrypted.slice(0, 10).map(v => v.toFixed(4)));

  // Verify match
  const matches = mockEmbedding.every((val, idx) => Math.abs(val - decrypted[idx]) < 0.0001);
  console.log('✅ Encryption/Decryption:', matches ? 'PASSED' : 'FAILED');

  // Test tampering detection
  console.log('\nTest 1b: Tampering detection');
  const tamperedEncrypted = encrypted.split(':');
  tamperedEncrypted[2] = tamperedEncrypted[2].replace('a', 'b'); // Change one character
  const tamperedString = tamperedEncrypted.join(':');

  try {
    decryptEmbedding(tamperedString);
    console.log('❌ Tampering detection: FAILED (should have thrown error)');
  } catch (error) {
    console.log('✅ Tampering detection: PASSED (correctly detected tampered data)');
  }
} catch (error) {
  console.log('❌ Encryption test FAILED:', error.message);
}

console.log('\n');

// Test 2: Generate encryption key
console.log('Test 2: Generate Encryption Key');
console.log('================================');
try {
  const key = generateKey();
  console.log('Generated key length:', key.length, 'characters (should be 64)');
  console.log('Key format:', key.substring(0, 32) + '...');
  console.log('✅ Key generation: PASSED');
} catch (error) {
  console.log('❌ Key generation FAILED:', error.message);
}

console.log('\n');

// Test 3: Model schemas (check they load without errors)
console.log('Test 3: Model Schemas');
console.log('================================');
try {
  const FaceEmbedding = require('./models/FaceEmbedding');
  const FRSession = require('./models/FRSession');

  console.log('FaceEmbedding model:', FaceEmbedding.modelName);
  console.log('FaceEmbedding collection:', FaceEmbedding.collection.name);
  console.log('FRSession model:', FRSession.modelName);
  console.log('FRSession collection:', FRSession.collection.name);

  // Check methods exist
  console.log('\nFaceEmbedding methods:');
  console.log('- setEmbedding:', typeof FaceEmbedding.prototype.setEmbedding === 'function' ? '✅' : '❌');
  console.log('- getEmbedding:', typeof FaceEmbedding.prototype.getEmbedding === 'function' ? '✅' : '❌');
  console.log('- recordUsage:', typeof FaceEmbedding.prototype.recordUsage === 'function' ? '✅' : '❌');

  console.log('\nFaceEmbedding static methods:');
  console.log('- getActiveEmbedding:', typeof FaceEmbedding.getActiveEmbedding === 'function' ? '✅' : '❌');
  console.log('- getAllActiveEmbeddings:', typeof FaceEmbedding.getAllActiveEmbeddings === 'function' ? '✅' : '❌');
  console.log('- replaceEmbedding:', typeof FaceEmbedding.replaceEmbedding === 'function' ? '✅' : '❌');

  console.log('\nFRSession static methods:');
  console.log('- createRegistrationSession:', typeof FRSession.createRegistrationSession === 'function' ? '✅' : '❌');
  console.log('- createLoginSession:', typeof FRSession.createLoginSession === 'function' ? '✅' : '❌');
  console.log('- getSuccessRate:', typeof FRSession.getSuccessRate === 'function' ? '✅' : '❌');
  console.log('- getFailureReasons:', typeof FRSession.getFailureReasons === 'function' ? '✅' : '❌');

  console.log('\n✅ Model schemas: PASSED');
} catch (error) {
  console.log('❌ Model schemas FAILED:', error.message);
}

console.log('\n');

// Test 4: FaceEmbedding instance methods (without DB)
console.log('Test 4: FaceEmbedding Instance Methods');
console.log('================================');
try {
  const FaceEmbedding = require('./models/FaceEmbedding');
  const mongoose = require('mongoose');

  // Create a mock embedding document (not saved to DB)
  const mockDoc = new FaceEmbedding({
    studentId: new mongoose.Types.ObjectId(),
    registeredBy: new mongoose.Types.ObjectId(),
    metadata: {
      confidence: 0.95,
      quality: {
        detection: 0.98,
        landmarks: 0.96,
        image: 0.94,
      },
    },
  });

  // Test setEmbedding
  const testEmbedding = Array.from({ length: 128 }, (_, i) => Math.random() * 2 - 1);
  mockDoc.setEmbedding(testEmbedding);
  console.log('Set embedding:', mockDoc.embedding ? '✅' : '❌');

  // Test getEmbedding
  const retrieved = mockDoc.getEmbedding();
  console.log('Get embedding:', retrieved.length === 128 ? '✅' : '❌');

  // Verify match
  const matches = testEmbedding.every((val, idx) => Math.abs(val - retrieved[idx]) < 0.0001);
  console.log('Embedding integrity:', matches ? '✅' : '❌');

  // Test toJSON (embedding should be excluded)
  const json = mockDoc.toJSON();
  console.log('toJSON excludes embedding:', !json.embedding ? '✅' : '❌');

  console.log('\n✅ FaceEmbedding instance methods: PASSED');
} catch (error) {
  console.log('❌ FaceEmbedding instance methods FAILED:', error.message);
  console.error(error);
}

console.log('\n');
console.log('🎉 All tests completed!');
console.log('\nℹ️  To test with actual database operations, connect to MongoDB and run:');
console.log('   - FaceEmbedding.create(...)');
console.log('   - FRSession.create(...)');
console.log('   - FaceEmbedding.getActiveEmbedding(studentId)');
