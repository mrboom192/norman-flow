# Norman Flow chat proxy

The app's AI chatbot calls this Cloudflare Worker, never Google directly, so the
API key is never in the app or in requests from a device. The Worker holds the
key as a secret, applies the grounding rules (answer only from the app's data,
quote numbers exactly, say when something isn't in the data, no project or cost
recommendations), limits requests per client, and calls Google Gemini
(`gemini-2.5-flash`, free tier).

## Deploy

1. Create a free Gemini API key at https://aistudio.google.com/apikey.
2. From this folder:

   ```bash
   npx wrangler login
   npx wrangler secret put GEMINI_API_KEY
   npx wrangler deploy
   ```

3. Add your web origin(s) to `ALLOWED_ORIGINS` in `wrangler.toml` (for example
   the deployed web app's URL) and redeploy.
4. In the app project, set the Worker URL (it is public, not a secret) and
   restart Metro:

   ```bash
   echo 'EXPO_PUBLIC_CHAT_PROXY_URL=https://norman-flow-chat.<account>.workers.dev/chat' > .env.local
   ```

   For EAS builds, set the same variable in the EAS environment.

Until the URL is set, or whenever the Worker is unreachable or over its limit,
the app falls back to its built-in answers and shows
"AI unavailable, showing basic answers."

## Local testing

```bash
echo 'GEMINI_API_KEY=your-key' > .dev.vars   # git-ignored
npx wrangler dev
```

Then use `EXPO_PUBLIC_CHAT_PROXY_URL=http://localhost:8787/chat`.
