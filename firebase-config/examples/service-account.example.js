/* Firebase Service Account Configuration for Python Backend
 *
 * INSTRUCTIONS:
 * 1. Copy this file to service-account.js
 * 2. Replace the placeholder values with your actual service account key
 * 3. Get your service account key from Firebase Console > Project Settings > Service Accounts
 * 4. Click "Generate New Private Key" and copy the JSON contents
 * 5. DO NOT commit the actual service-account.js file - it contains sensitive credentials
 */

export const firebaseConfig = {
  type: "service_account",
  project_id: "your-project-id",
  private_key_id: "your-private-key-id",
  private_key:
    "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n",
  client_email:
    "firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com",
  client_id: "your-client-id",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40your-project-id.iam.gserviceaccount.com",
};

// Load from environment or credentials file
export function loadServiceAccountConfig() {
  // Python backend should load this from environment variables or the credentials JSON file
  return firebaseConfig;
}
