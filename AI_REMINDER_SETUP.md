# AI-Powered Reminder System Setup

## Overview

The app now includes an AI-powered reminder system that generates personalized study reminders using Google Gemini API. The system:

1. Takes lesson data (topics and homework) for selected subjects
2. Sends it to OpenAI with a carefully crafted prompt
3. Receives a JSON response with:
   - **Theory**: Concise summary split across 2 pages
   - **Key Points**: 4-6 important concepts
   - **Tasks**: 2-3 practice tasks (easy, medium, hard)
4. Displays the reminder in a Duolingo-style card interface

## Architecture

### Files Created/Modified

1. **`utils/openai.ts`**: 
   - Google Gemini API client initialization
   - `generateReminder()`: Generates reminder for a single subject
   - `generateRemindersForSubjects()`: Generates reminders for multiple subjects
   - Handles API key configuration

2. **`screens/ReminderScreen.tsx`**: 
   - New full-screen reminder interface
   - Duolingo-style pagination (Theory Page 1 → Theory Page 2 → Tasks)
   - Navigation between subjects
   - Loading and error states

3. **`App.tsx`**: 
   - Added reminder screen state management
   - Handles navigation between HomePage and ReminderScreen
   - Loads lesson data for reminders

4. **`screens/HomePage.tsx`**: 
   - Removed modal-based reminder display
   - Added `onShowReminder` callback
   - Subject selection functionality

## Google Gemini API Key Setup

### Quick Setup (Development)

1. Get your API key from [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

2. Open `/Users/kristians/app/utils/openai.ts`

3. Find line 16 and replace `'your-api-key-here'` with your actual key:
   ```typescript
   const apiKey = 'your-actual-api-key-here';
   ```

### Production Setup (Recommended)

1. Create a `.env` file in the project root:
   ```
   EXPO_PUBLIC_GEMINI_API_KEY=your-api-key-here
   ```

2. Make sure `.env` is in `.gitignore`

3. The app will automatically pick up the environment variable

### Expo Config Setup (Alternative)

1. Create `app.config.js`:
   ```javascript
   export default {
     expo: {
       extra: {
         geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
       },
     },
   };
   ```

2. Access via `Constants.expoConfig?.extra?.geminiApiKey`

See `GEMINI_SETUP.md` for detailed setup instructions.

## How It Works

### 1. User Flow

1. User selects subjects on HomePage (or leaves all selected)
2. Clicks "Let's remind you" button
3. App navigates to ReminderScreen
4. AI generates reminders for each subject
5. User navigates through:
   - Theory Page 1 (first half of theory)
   - Theory Page 2 (second half + key points)
   - Tasks (2-3 practice questions)

### 2. AI Prompt Structure

The system sends a carefully crafted prompt to Google Gemini that includes:
- Subject name
- All lesson topics for that subject
- All homework/tasks for that subject
- Instructions for JSON response format
- Requirements for theory (concise, practical)
- Requirements for tasks (easy/medium/hard progression)

### 3. JSON Response Format

```json
{
  "theory": {
    "content": "Concise theory summary (2-3 paragraphs, max 300 words)",
    "keyPoints": ["Key point 1", "Key point 2", ...]
  },
  "tasks": [
    {
      "difficulty": "easy",
      "question": "Easy practice question",
      "hint": "Optional hint"
    },
    {
      "difficulty": "medium",
      "question": "Medium practice question",
      "hint": "Optional hint"
    },
    {
      "difficulty": "hard",
      "question": "Challenging but achievable question",
      "hint": "Optional hint"
    }
  ]
}
```

### 4. Display Logic

- **Theory**: Split into two pages for better readability
- **Key Points**: Displayed as bullet points on Theory Page 2
- **Tasks**: Displayed with difficulty badges (green=easy, yellow=medium, red=hard)
- **Navigation**: Swipe-style navigation with Back/Next buttons

## API Configuration

### Model Used
- **Model**: `gemini-2.5-flash` (latest, fast, cost-effective)
- Latest model optimized for speed while maintaining excellent quality
- Alternative: `gemini-2.5-flash-lite` (even faster), `gemini-1.5-pro` (higher quality, slower)

### Rate Limits
- Free tier: 15 requests/minute, 1,500 requests/day
- Paid tier: Higher limits
- The app generates reminders sequentially to avoid rate limits

### Error Handling
- API key validation with warnings
- Fallback responses if API fails
- User-friendly error messages
- Loading states during generation
- Automatic JSON cleaning (removes markdown code blocks)

## Customization

### Changing the AI Model

Edit `utils/openai.ts`, line ~27:
```typescript
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
// Change to 'gemini-2.5-flash-lite', 'gemini-1.5-pro', 'gemini-pro', etc.
```

### Adjusting Prompt

Edit `utils/openai.ts`, `generateReminder()` function to modify the prompt structure.

### Changing Task Difficulty

Modify the prompt requirements in `generateReminder()` to adjust difficulty levels.

## Testing

1. Set up your API key (see above)
2. Start the app: `npm start` or `expo start`
3. Login as "Juris" (password: "1234")
4. Navigate to reminder section
5. Select subjects (or leave all selected)
6. Click "Let's remind you"
7. Verify:
   - Loading state appears
   - Theory pages display correctly
   - Tasks show with correct difficulty badges
   - Navigation works (Back/Next)
   - Multiple subjects can be navigated

## Troubleshooting

### "API key not configured" Warning
- Check that you've set the API key in `openai.ts` or environment variable
- Restart the app after setting environment variables

### "Failed to generate reminders" Error
- Verify API key is valid
- Check internet connection
- Check Google Gemini API status
- Verify you have API quota available
- Check Google Cloud Console for quota limits

### Empty or Malformed Responses
- Check Google AI Studio logs
- Verify prompt is being sent correctly
- Check JSON parsing in `generateReminder()`
- Gemini may wrap JSON in markdown code blocks (auto-handled)

### Rate Limit Errors
- Wait a few minutes and try again
- Consider upgrading OpenAI plan
- Reduce number of subjects selected

## Security Notes

⚠️ **Important**:
- Never commit API keys to version control
- Use environment variables for production
- Consider using a backend proxy for production apps
- Monitor API usage to prevent unexpected charges

## Cost Estimation

- **gemini-2.5-flash**: Very affordable, often free for reasonable usage
- Average reminder: Minimal cost (often covered by free tier)
- Free tier: 15 requests/minute, 1,500 requests/day
- Check [Google AI Studio pricing](https://ai.google.dev/pricing) for exact rates
- Generally more cost-effective than OpenAI for this use case

## Future Improvements

- Cache reminders to reduce API calls
- Allow users to regenerate reminders
- Save reminders for later review
- Add more task types (multiple choice, etc.)
- Support for different languages
- Offline mode with cached reminders

