# PDF Text Matcher

AI-powered app to match your text against uploaded PDF content.

## How to Start

### 1. Install Dependencies

**Backend:**

```bash
cd backend
npm install
```

**Frontend:**

```bash
cd frontend
npm install
```

### 2. Start the Application

**Terminal 1 - Backend:**

```bash
cd backend
npm start
```

Server runs on: http://localhost:5000

**Terminal 2 - Frontend:**

```bash
cd frontend
npm start
```

App opens on: http://localhost:3000

## How to Use

1. Upload a PDF file
2. Enter text to match
3. Click "Find Match"
4. See confidence percentage

## Optional: OpenAI API Key

For better AI matching, add your OpenAI API key to `backend/.env`:

```env
OPENAI_API_KEY=your_api_key_here
```

Without API key, it runs in demo mode with basic text matching.
