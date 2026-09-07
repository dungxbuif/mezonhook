# Using MezonHook

MezonHook creates a webhook project in your browser: an ordered sequence of rich messages and named delivery targets. It previews the sequence in a Mezon-inspired layout and does not store webhook URLs in a project or exported file.

## Create and copy a Channel Webhook

In Mezon, open the target channel, use **Edit Channel**, then open the **Integrations** tab. Choose **New Webhook**, optionally set the webhook bot name and avatar, and use **Copy Webhook URL**. You need to be a member of a clan and have access to that channel. These steps and the endpoint format are defined in the [official Vietnamese Channel Webhook documentation](https://mezon.ai/docs/vi/developer/webhooks/channel-webhook/).

Treat the copied URL as a password. Do not paste it into source code, a ticket, a chat message, a screenshot, or an exported template.

## Build, preview, and send a project

1. Open your local MezonHook instance or deployment.
2. Choose Announcement, Release note, or Event invitation to begin with a template.
3. Edit the body, card details, fields, and actions. Review the Mezon-style preview as you work.
4. Add, duplicate, delete, or reorder messages in the message rail. The preview shows the complete send order.
5. Open **Config**, name targets, paste each URL into its password-masked field, and select the targets to receive the project. URLs stay only in current session memory.
6. Use **Export project** to download JSON, or **Import project** to load a project. Exports contain content and target names only—not webhook URLs.
7. Select **Send project**. Delivery stops on the first failure, so earlier messages may already have arrived; fix the error and resend only the messages you intend to repeat.
8. Open **Help** in the app for this workflow and official Mezon docs.

## CORS and network troubleshooting

MezonHook sends directly from your browser to `https://webhook.mezon.ai/webhooks/{channelId}/{token}`. A static host cannot work around browser CORS policy. If the send fails:

- Confirm the URL was copied from the intended Mezon channel and has not been revoked.
- Check browser developer tools for CORS or network errors.
- Confirm that your network, browser privacy extensions, VPN, proxy, or firewall permits the request.
- Try again only after resolving the origin/CORS or connectivity issue; do not share the URL in a support request.

## If a URL leaks

Immediately revoke or rotate the Channel Webhook in Mezon by replacing it through the channel's Integrations settings. Use the new URL only in the current MezonHook session. Do not post either the old or new URL anywhere public—even after rotation. If the exposure points to a MezonHook vulnerability, report it through a GitHub private security advisory as described in [SECURITY.md](../SECURITY.md).
