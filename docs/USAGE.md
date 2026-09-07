# Using MezonHook

MezonHook creates a rich-message draft in your browser, previews it in a Mezon-inspired layout, and sends it to a Mezon Channel Webhook. It does not store your webhook URL in a draft or exported file.

## Create and copy a Channel Webhook

In Mezon, open the target channel, use **Edit Channel**, then open the **Integrations** tab. Choose **New Webhook**, optionally set the webhook bot name and avatar, and use **Copy Webhook URL**. You need to be a member of a clan and have access to that channel. These steps and the endpoint format are defined in the [official Channel Webhook documentation](https://docs.mezon.ai/developer/webhooks/channel-webhook).

Treat the copied URL as a password. Do not paste it into source code, a ticket, a chat message, a screenshot, or an exported template.

## Draft, preview, and send

1. Open your local MezonHook instance or deployment.
2. Choose Announcement, Release note, or Event invitation to begin with a template.
3. Edit the body, card details, fields, and actions. Review the Mezon-style preview as you work.
4. Use **Export template** to download the current draft as JSON, or **Import template** to load a previously exported valid draft. Exports contain draft content only—not the webhook URL.
5. Paste the Channel Webhook URL into the password-masked field. It stays only in current session memory and is cleared after a successful send.
6. Select **Send to Mezon** and verify the result in the target channel.

## CORS and network troubleshooting

MezonHook sends directly from your browser to `https://webhook.mezon.ai/webhooks/{channelId}/{token}`. A static host cannot work around browser CORS policy. If the send fails:

- Confirm the URL was copied from the intended Mezon channel and has not been revoked.
- Check browser developer tools for CORS or network errors.
- Confirm that your network, browser privacy extensions, VPN, proxy, or firewall permits the request.
- Try again only after resolving the origin/CORS or connectivity issue; do not share the URL in a support request.

## If a URL leaks

Immediately revoke or rotate the Channel Webhook in Mezon by replacing it through the channel's Integrations settings. Use the new URL only in the current MezonHook session. Do not post either the old or new URL anywhere public—even after rotation. If the exposure points to a MezonHook vulnerability, report it through a GitHub private security advisory as described in [SECURITY.md](../SECURITY.md).
