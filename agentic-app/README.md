## Personal SMS Agent

This project delivers a web-based control surface for an SMS assistant that speaks in your voice, keeps track of client context, and dispatches messages through Twilio.

### Features

- Curate the agent persona (name, role, tone, openings, signatures)
- Build reusable text templates with smart placeholders
- Manage contact lists inline and toggle recipients per campaign
- Preview the personalized SMS before sending
- Send texts in bulk via Twilio with per-contact delivery feedback

### Environment Variables

Create an `.env.local` (or configure the variables in your hosting provider) using the template in `.env.example`:

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
# Optional alternative:
# TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Either `TWILIO_PHONE_NUMBER` **or** `TWILIO_MESSAGING_SERVICE_SID` must be set for the API route to send messages.

### Development

```bash
npm install
npm run dev
```

Navigate to `http://localhost:3000` to interact with the agent builder. The page is a client component, so updates appear instantly.

### Linting & Production Build

```bash
npm run lint
npm run build
```

### Deployment

The project is optimized for Vercel. After configuring your environment variables in Vercel, deploy with:

```bash
vercel deploy --prod
```

### Twilio Notes

- Phone numbers must be in E.164 format (e.g. `+15551234567`).
- Ensure your Twilio account has permission to message the destination numbers (verify compliance requirements for your geography).
- Each batch send uses the current persona + template and reports per-contact success or failure in the UI.
