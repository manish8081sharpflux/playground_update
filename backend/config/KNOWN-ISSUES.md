# Known Issues - FR Rebuild

**Last Updated:** 2025-10-23 20:06:23

## Node.js v22 + TensorFlow.js Compatibility Issue

**Status:** ✅ RESOLVED - Using Node v18.20.5 LTS + Windows DLL Fix
**Task:** Task 2 - Human Installation
**Severity:** Low (resolved by using compatible Node version + Windows-specific fix)

### Problem

TensorFlow.js Node (@tensorflow/tfjs-node v4.22.0) has native binding compatibility issues with Node.js v22.14.0:

```
Error: The specified module could not be found.
\\?\D:\Dev\ISF_Playground\backend\node_modules\@tensorflow\tfjs-node\lib\napi-v8\tfjs_binding.node
```

The package was built for napi-v8 but Node v22 requires napi-v10 bindings.

### Impact

- ❌ Cannot test Human library locally on Node v22
- ❌ Server fails to start with current configuration
- ✅ Code structure and configuration are correct
- ✅ Will work on Node v18/v20 or when tfjs-node v5 is released

### Workarounds

**Option 1: Downgrade Node.js (Recommended for Local Testing)**
```bash
nvm install 20.18.0
nvm use 20.18.0
cd backend && npm install
npm start
```

**Option 2: Wait for TensorFlow.js v5**
- tfjs-node v5 will support Node v22
- Monitor: https://github.com/tensorflow/tfjs/releases

**Option 3: Use Human with Browser/ESM Build**
- Requires refactoring server.js to use ES modules
- Use `import Human from '@vladmandic/human'` with `"type": "module"`

**Option 4: Docker Container with Node v20**
```dockerfile
FROM node:20-alpine
# ... rest of Dockerfile
```

### Resolution

**Implemented Solution:** Switched to Node.js v18.20.5 LTS

**Steps Taken:**
1. ✅ Installed nvm-windows v1.2.2 for Node version management
2. ✅ Tested Node v22.14.0 - FAILED (napi-v10 binding missing from package)
3. ✅ Tested Node v20.18.0 LTS - FAILED (still had binding issues)
4. ✅ Switched to Node v18.20.5 LTS - FAILED initially due to Windows DLL issue
5. ✅ Reinstalled dependencies (774 packages)
6. ✅ Updated humanConfig.js:
   - Changed backend from 'wasm' to 'tensorflow'
   - Fixed modelBasePath to use 'file://' protocol
7. ✅ **Applied Windows DLL Fix** (see below)
8. ✅ Verified server starts and Human initializes successfully

**Windows-Specific DLL Fix (Required on Windows only):**
```bash
# After npm install, copy tensorflow.dll to napi folder
cp backend/node_modules/@tensorflow/tfjs-node/deps/lib/tensorflow.dll \
   backend/node_modules/@tensorflow/tfjs-node/lib/napi-v8/
```

**Why this is needed:**
- On Windows, the native binding (tfjs_binding.node) needs tensorflow.dll in the same folder
- npm doesn't copy the DLL there by default on Windows
- Linux/Mac don't have this issue (different dynamic library loading behavior)
- **Production is Linux-based, so this fix is only needed for local Windows development**

**Current Status:**
- ✅ Server running on Node v18.20.5 LTS
- ✅ TensorFlow.js loads with native bindings
- ✅ Human library initialized successfully
- ✅ Face detection, recognition, and liveness detection enabled
- ✅ Application fully functional
- ✅ Both backend and frontend servers verified working

### Files Modified

- `backend/config/humanConfig.js` - Updated backend and modelBasePath
- `backend/server.js` - Human initialization working correctly
- `backend/package.json` - Dependencies compatible with Node v18

### References

- https://github.com/tensorflow/tfjs/issues/8044
- https://github.com/vladmandic/human/issues/458
- Node v18 LTS: https://nodejs.org/en/blog/release/v18.20.5
