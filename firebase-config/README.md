# Firebase Configuration

This directory contains Firebase configuration files for the Smart Park IoT application.

## ⚠️ Important Security Notice

**NEVER commit actual Firebase credentials to version control!**

The actual configuration files are:
- `firebase.js` (JavaScript/Web config)
- `service-account.js` (Python backend config)
- `*-firebase-adminsdk-*.json` (JSON service account files)

These files are listed in `.gitignore` and will not be committed.

## Setup Instructions

### 1. Get your Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** (gear icon)
4. Under "Your apps", find your Web app
5. Copy the configuration object

### 2. Setup Web Configuration (javascript)

```bash
# Copy the example file
cp firebase.example.js firebase.js

# Edit firebase.js and replace the placeholder values:
# - apiKey
# - authDomain
# - projectId
# - storageBucket
# - messagingSenderId
# - appId
# - measurementId
```

### 3. Setup Service Account (Python Backend)

```bash
# Copy the example file
cp service-account.example.js service-account.js

# Also download the JSON file from Firebase Console:
# 1. Go to Project Settings > Service Accounts
# 2. Click "Generate New Private Key"
# 3. Save the JSON file in this directory (it will be auto-ignored by .gitignore)
```

### 4. Verify Setup

- `.example.js` and `.example.json` files can be safely committed
- The actual credentials should NOT appear in your git repository
- Check `.gitignore` is working: `git status` should not show `firebase.js` or service account files

## File Descriptions

| File | Purpose | Safe to Commit |
|------|---------|---|
| `firebase.example.js` | Template for web config | ✅ Yes |
| `firebase.js` | Actual web config (generated from template) | ❌ No |
| `service-account.example.js` | Template for Python backend | ✅ Yes |
| `service-account.js` | Actual Python config (generated from template) | ❌ No |
| `*-adminsdk.example.json` | Template for service account JSON | ✅ Yes |
| `*-adminsdk-*.json` | Actual service account JSON | ❌ No |
| `.gitignore` | Git ignore rules for this directory | ✅ Yes |

## Common Issues

### "Cannot find module firebase.js"
- Make sure you've copied `firebase.example.js` to `firebase.js`
- Fill in the placeholder values with your actual Firebase config

### "Private key is undefined"
- Make sure you've created `service-account.js` with proper credentials
- The private key should be the full multi-line string from your service account JSON

### Still committing by mistake?
```bash
# Remove cached files from git
git rm --cached firebase.js
git rm --cached service-account.js
git rm --cached '*-firebase-adminsdk-*.json'

# Commit the .gitignore update
git add .gitignore
git commit -m "Fix: ignore sensitive Firebase credentials"
```
