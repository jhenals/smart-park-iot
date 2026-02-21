# Authentication Flow Documentation

## System Architecture

Your system uses **ONE Firebase token** that works across three components:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Single Firebase Token Flow                    │
└─────────────────────────────────────────────────────────────────┘

1. Login (localhost:5050)
   └─> User enters email/password
   └─> Firebase Authentication validates
   └─> Token saved to localStorage
   └─> If admin → Redirect to localhost:5173

2. Admin Dashboard (localhost:5173)
   └─> Reads token from localStorage
   └─> Makes API calls to localhost:8000
   └─> Token sent in Authorization header

3. API Backend (localhost:8000)
   └─> Receives token in Authorization header
   └─> Validates Firebase token
   └─> Checks user role in Firestore
   └─> Returns data if admin
```

## Components

### 1. Login Page (localhost:5050)
**File**: `web-app/assets/js/auth.js`

**What it does**:
- User logs in with Firebase email/password
- Gets Firebase ID token (JWT)
- Saves to localStorage:
  ```javascript
  {
    userSession: {
      email, uid, role, token, 
      tokenExpiration, lastLogin
    },
    accessToken: "eyJhbGciOiJSUzI1Ni...",
    tokenType: "bearer",
    userUid: "abc123..."
  }
  ```
- Redirects admin to `http://localhost:5173/`

### 2. Admin Dashboard (localhost:5173)
**File**: `IoT_ProjectWeatherForcast/weather/src/utils/api.js`

**What it does**:
- Reads token from localStorage (saved by login page)
- Makes authenticated API calls:
  ```javascript
  import api from '@/utils/api';
  
  // Example: Get weather forecast
  const data = await api.get('/api/weather/forecast?minutes=60');
  ```

**Token is automatically included**:
```javascript
Authorization: Bearer eyJhbGciOiJSUzI1Ni...
```

### 3. API Backend (localhost:8000)
**File**: `IoT_ProjectWeatherForcast/app/routes/auth.py`

**What it does**:
- Receives token in `Authorization` header
- Validates with Firebase Admin SDK
- Checks role in Firestore
- Only allows if `role === "admin"`

**Protected Endpoint Example**:
```python
from app.routes.auth import get_firebase_admin_user

@router.get("/protected")
def protected_route(user: dict = Depends(get_firebase_admin_user)):
    # Only admins can access this
    # user = { "uid": "...", "email": "...", "role": "admin" }
    return {"message": f"Hello admin {user['email']}"}
```

## Configuration

### Environment Variables (.env)
```env
# API Configuration
SECRET_KEY=12345678
ACCESS_TOKEN_EXPIRE_MINUTES=60

# CORS - Allow requests from login page and dashboard
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5050,http://127.0.0.1:5173,http://127.0.0.1:5050

# Firebase
FIREBASE_API_KEY=AIzaSyAvlmocEGgpWviAtHTcPaoxQWh5PZ6QDbI
FIREBASE_PROJECT_ID=smart-park-iot-d7743
FIREBASE_CREDENTIALS_PATH=firebase/smart-park-iot-d7743-firebase-adminsdk-fbsvc-2938d538d4.json
```

### CORS Setup (main.py)
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Allows 5050 and 5173
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Token Details

### Firebase ID Token
- **Type**: JSON Web Token (JWT)
- **Expiration**: 1 hour (3600 seconds)
- **Auto-refresh**: Firebase SDK handles this
- **Format**: `eyJhbGciOiJSUzI1Ni...` (3 parts separated by dots)

### Token Storage (localStorage)
```javascript
{
  // Main session object
  "userSession": "{
    \"email\": \"admin@example.com\",
    \"uid\": \"abc123xyz\",
    \"role\": \"admin\",
    \"token\": \"eyJhbGciOiJSUzI1Ni...\",
    \"tokenExpiration\": \"2026-02-21T15:30:00Z\",
    \"lastLogin\": \"2026-02-21T14:30:00Z\",
    \"isActive\": true,
    \"timestamp\": 1708524600000
  }",
  
  // Quick access values
  "accessToken": "eyJhbGciOiJSUzI1Ni...",
  "tokenType": "bearer",
  "userUid": "abc123xyz",
  "isLoggedIn": "true",
  "sessionSavedAt": "2026-02-21T14:30:00.000Z"
}
```

## Usage Examples

### Frontend (localhost:5173)

#### Setup in Vue Component
```javascript
import api, { isAuthenticated, getUserSession } from '@/utils/api';

export default {
  async mounted() {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      window.location.href = 'http://localhost:5050/web-app/src/login.html';
      return;
    }
    
    // Get user info
    const session = getUserSession();
    console.log('Logged in as:', session.email);
    
    // Fetch data from API
    await this.loadWeatherData();
  },
  
  methods: {
    async loadWeatherData() {
      try {
        const data = await api.get('/api/weather/forecast?minutes=60');
        console.log('Weather data:', data);
      } catch (error) {
        console.error('Failed to load weather:', error);
      }
    },
    
    async postData() {
      try {
        const result = await api.post('/api/weather/data', {
          temperature: 25,
          humidity: 60
        });
        console.log('Posted:', result);
      } catch (error) {
        console.error('Failed to post:', error);
      }
    }
  }
}
```

### Backend (localhost:8000)

#### Protected Route
```python
from fastapi import Depends
from app.routes.auth import get_firebase_admin_user

@router.get("/api/weather/forecast")
def get_forecast(
    minutes: int = 60,
    user: dict = Depends(get_firebase_admin_user)  # Requires admin
):
    # User is guaranteed to be admin here
    # user = { "uid": "...", "email": "...", "role": "admin" }
    
    return {"forecast": "sunny", "for_user": user["email"]}
```

## Security Features

✅ **Single Token**: One Firebase token for all services  
✅ **Auto-Expiration**: Tokens expire after 1 hour  
✅ **Role Enforcement**: Only admins can access API  
✅ **CORS Protection**: Only allowed origins can make requests  
✅ **Firebase Validation**: Tokens verified by Firebase Admin SDK  
✅ **HTTPS Ready**: Works with HTTPS in production  

## Troubleshooting

### Token not found at localhost:5173
**Problem**: localStorage is origin-specific  
**Solution**: The token is saved at `localhost:5050` but needs to be read at `localhost:5173`

Since localStorage is origin-specific, the token saved at `localhost:5050` won't be automatically available at `localhost:5173`. 

**Fix**: The redirect from 5050 to 5173 carries the session in localStorage. Make sure:
1. User logs in at 5050
2. Token is saved to localStorage at 5050
3. User is redirected to 5173
4. At 5173, the page checks localStorage for the token

Actually, since localStorage is origin-specific, you need to:
- Save token at 5050
- Pass it via URL parameter during redirect, OR
- Use a shared domain, OR
- **Recommended**: Have users log in directly at 5173

### 401 Unauthorized
- Token expired (refresh token)
- Token invalid (login again)
- Token not sent (check Authorization header)

### 403 Forbidden
- User is not admin
- Check role in Firestore users collection

### CORS Error
- Check ALLOWED_ORIGINS includes your origin
- Restart FastAPI server after .env changes

## Development Workflow

1. **Start API Server** (port 8000)
   ```bash
   cd IoT_ProjectWeatherForcast
   uvicorn app.main:app --reload --port 8000
   ```

2. **Start Frontend** (port 5173)
   ```bash
   cd IoT_ProjectWeatherForcast/weather
   npm run dev
   ```

3. **Start Login Page** (port 5050)
   ```bash
   # Use Live Server or any web server at port 5050
   # Serve from: web-app/src/login.html
   ```

4. **Test Flow**:
   - Go to `http://localhost:5050`
   - Login as admin
   - Should redirect to `http://localhost:5173`
   - Make API calls - token automatically included
