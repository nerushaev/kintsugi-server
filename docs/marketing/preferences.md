# Marketing preferences

`marketingcontacts` stores one record per normalized email, including customers without accounts.
`marketingEnabled` is an owner-controlled operational flag, not evidence of consent.
`consentStatus` remains `unknown` unless consent is independently recorded.

Initialize existing addresses explicitly with:

```sh
node scripts/initializeMarketingContacts.js --apply
```

The migration reads users, orders and feedbacks; it preserves existing false flags and unsubscribe timestamps. It never calls Brevo, sends emails or activates a promo code. It is not invoked at startup and does not automatically register future customers.

Campaign selection must also honor Brevo suppression status. POST /api/marketing/brevo/webhook authenticates a bearer token against its SHA-256 hash stored in marketingwebhookcredentials. Unsubscribe events set marketingEnabled=false and unsubscribedAt, including for contacts without accounts. Repeated events remain disabled. Imports must never reactivate an excluded address.

After deployment run node scripts/connectBrevoWebhook.js to configure the marketing unsubscribe webhook. The script first checks that the endpoint rejects unauthenticated calls, then configures Brevo and verifies an authenticated no-op. Credentials are never logged. If configuration fails after saving the hash, rerun setup to restore matching credentials; no campaign should run while setup is incomplete.

Registration accepts optional strict boolean marketingOptIn, default false. The checkbox is unchecked in both registration forms. Selection records consentSource and consentRecordedAt; an existing exclusion is never reactivated. Registration does not upload a contact to Brevo. Campaign preparation must read the latest local flag and provider suppressions before each batch.
