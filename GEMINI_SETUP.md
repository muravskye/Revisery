# Google Gemini API Key Setup

This app uses Google Gemini API to generate study reminders. You need to set up your API key to use this feature.

## How to Get Your Google Gemini API Key

1. Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Choose your Google Cloud project (or create a new one)
5. Copy the API key (you can see it again later in the API keys section)

## Where to Put Your API Key

### Option 1: Direct Configuration (Quick Start - Development Only)

1. Open `/Users/kristians/app/utils/openai.ts`
2. Find the `getApiKey()` function (around line 6)
3. Replace `'your-api-key-here'` with your actual API key:
   ```typescript
   const apiKey = 'your-actual-api-key-here';
   ```
4. **WARNING**: Never commit this file with your API key to version control!

### Option 2: Environment Variable (Recommended for Development)

1. Create a `.env` file in the root directory of the project (same level as `package.json`)
2. Add the following line:
   ```
   EXPO_PUBLIC_GEMINI_API_KEY=your-api-key-here
   ```
3. The `.env` file should be in `.gitignore` (never commit API keys!)

### Option 3: Expo Config (Recommended for Production)

1. Create or update `app.config.js` in the root directory:
   ```javascript
   export default {
     expo: {
       name: "Revisory",
       // ... other config
       extra: {
         geminiApiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
       },
     },
   };
   ```

2. Access via `Constants.expoConfig?.extra?.geminiApiKey` (requires expo-constants)

## Current Implementation

The app currently checks for the API key in this order:
1. `process.env.EXPO_PUBLIC_GEMINI_API_KEY` (environment variable)
2. Direct hardcoded value in `openai.ts` (for development)

## Model Used

- **Model**: `gemini-2.5-flash` (latest, fast, cost-effective)
- This model is the latest and fastest, optimized for speed and cost while maintaining excellent quality
- Alternative models: `gemini-2.5-flash-lite` (even faster), `gemini-1.5-pro` (better quality, slower), or `gemini-pro` (older version)

## Testing

After setting up your API key:
1. Start the app: `npm start` or `expo start`
2. Navigate to the reminder section
3. Select subjects and click "Let's remind you"
4. The AI should generate a reminder with theory and tasks

## Troubleshooting

- **Error: "API key not valid"**: Make sure your API key is correct and has not expired
- **Error: "API key not found"**: Check that you've set the environment variable or updated the code
- **Rate limits**: Free tier has rate limits. If you hit them, wait a bit or check your quota in Google Cloud Console
- **Quota exceeded**: Check your usage in [Google Cloud Console](https://console.cloud.google.com/)

## API Quotas and Pricing

### Free Tier
- **Free requests per minute**: 15 requests/minute
- **Free requests per day**: 1,500 requests/day
- **Monthly free tier**: Generous free tier for development

### Paid Tier
- Very affordable pricing
- Higher rate limits
- Check [Google AI Studio pricing](https://ai.google.dev/pricing) for current rates

## Security Notes

⚠️ **Important**:
- Never commit API keys to version control
- Use environment variables for production
- Consider using a backend proxy for production apps
- Monitor API usage to prevent unexpected charges
- Google Gemini API keys are tied to your Google Cloud project

## Differences from OpenAI

- **Faster responses**: Gemini Flash is optimized for speed
- **Better JSON handling**: Gemini generally follows JSON format instructions well
- **Free tier**: More generous free tier compared to OpenAI
- **Integration**: Works seamlessly with Google Cloud services

## Changing the Model

Edit `utils/openai.ts`, line ~27:
```typescript
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
```

Available models:
- `gemini-2.5-flash` - Latest, fast, cost-effective (recommended)
- `gemini-2.5-flash-lite` - Even faster, lighter version
- `gemini-1.5-pro` - Higher quality, slower
- `gemini-pro` - Older version, still available

## Error Handling

The app includes fallback responses if the API fails:
- Shows a generic study reminder
- Logs errors to console
- Allows the app to continue functioning

## Cost Estimation

- **gemini-1.5-flash**: Very affordable, often free for reasonable usage
- Average reminder: Minimal cost (often covered by free tier)
- Check [Google AI Studio](https://ai.google.dev/pricing) for exact pricing

## Future Improvements

- Cache reminders to reduce API calls
- Allow users to regenerate reminders
- Save reminders for later review
- Add more task types (multiple choice, etc.)
- Support for different languages
- Offline mode with cached reminders

