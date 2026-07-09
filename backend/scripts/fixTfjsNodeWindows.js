const fs = require('fs');
const path = require('path');

if (process.platform !== 'win32') {
  console.log('Skipping tfjs-node Windows DLL fix on non-Windows platform.');
  process.exit(0);
}

const root = path.join(__dirname, '..');
const source = path.join(root, 'node_modules', '@tensorflow', 'tfjs-node', 'deps', 'lib', 'tensorflow.dll');
const targetDir = path.join(root, 'node_modules', '@tensorflow', 'tfjs-node', 'lib', 'napi-v8');
const target = path.join(targetDir, 'tensorflow.dll');

if (!fs.existsSync(source)) {
  console.warn(`TensorFlow DLL not found at ${source}.`);
  process.exit(0);
}

if (!fs.existsSync(targetDir)) {
  console.warn(`Target directory not found: ${targetDir}.`);
  process.exit(0);
}

try {
  fs.copyFileSync(source, target);
  console.log('Copied tensorflow.dll to tfjs-node native binding folder.');
} catch (error) {
  console.error('Failed to copy tensorflow.dll for tfjs-node:', error);
  process.exit(1);
}
