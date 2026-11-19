# Norman Flow chat proxy

The app's AI chatbot calls this Cloudflare Worker, never Google directly, so the
API key is never in the app or in requests from a device. The Worker holds the
key as a secret, applies the grounding rules (answer only from the app's data,
quote numbers exactly, say when something isn't in the data, no project or cost
recommendations), limits requests per client, and calls Google Gemini
(`gemini-3.1-flash-lite`).

## Deploy

1. Create a free Gemini API key at https://aistudio.google.com/apikey.
2. From this folder:

   ```bash
   npx wrangler login
   npx wrangler secret put NORMAN_FLOW_GEMINI_API_KEY
   npx wrangler deploy
   ```

3. Add your web origin(s) to `ALLOWED_ORIGINS` in `wrangler.toml` (for example
   the deployed web app's URL) and redeploy.
4. The app defaults to `https://norman-flow-chat.mrboom192.workers.dev/chat`.
   A fresh clone needs no `.env.local` or Cloudflare login to use this deployment.
   To use another Worker, set `EXPO_PUBLIC_CHAT_PROXY_URL` in `.env.local`
   (or the EAS build environment) and reload the app.

When the Worker is unreachable or over its limit, the app falls back to its
built-in answers and shows "AI unavailable, showing basic answers."
An explicitly empty `EXPO_PUBLIC_CHAT_PROXY_URL` disables AI requests.

## Local testing

```bash
echo 'GEMINI_API_KEY=your-key' > .dev.vars   # git-ignored
npx wrangler dev
```

Then use `EXPO_PUBLIC_CHAT_PROXY_URL=http://localhost:8787/chat`.
