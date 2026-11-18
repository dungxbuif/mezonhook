# Using MezonHook

MezonHook builds an ordered Channel Webhook project in your browser. The visual form is the source of truth; the preview, raw envelope, generated samples, storage, export, and delivery update from that same data.

## 1. Create a Channel Webhook

In Mezon, open the target channel, open its settings and integrations, create a Channel Webhook, and copy its URL. The endpoint follows this form:

```text
https://webhook.mezon.ai/webhooks/{channelId}/{token}
```

Treat the URL as a password. Do not paste it into source code, tickets, screenshots, exported projects, or chat.

## 2. Compose messages

A fresh project begins with `Deployment completed successfully.` so the preview is immediately meaningful. Replace it with the message you intend to send; this example is not sent automatically.

1. Enter the message text.
2. Open only the optional groups you need:
   - **Formatting** for `pre` or link ranges.
   - **Mentions** for a username or user ID plus its text range.
   - **Images** for hosted HTTPS image metadata.
   - **Channel references** for a channel ID plus its text range.
3. Use **Add message**, **Duplicate**, and the arrow buttons to create the exact delivery order.
4. Review the right-hand preview. On desktop it stays below the header while it fits the viewport; a very long preview returns to normal page flow so you can read it through the page scroll instead of a nested pane scrollbar. The composer, Advanced section, and Delivery remain in one natural document flow. On mobile and tablet, switch between **Compose** and **Preview** tabs.

Every range is zero-based, start-inclusive, and end-exclusive. For example, selecting the first four characters uses `s: 0` and `e: 4`.

## 3. Inspect JSON or generated code

Open **Advanced JSON and code**. The JSON is the exact `{ type: "hook", message }` envelope for the selected message.

- Valid edits update the visual form and preview.
- Invalid edits preserve the last valid message, show the validation error, and disable Send.
- The cURL sample uses the current webhook URL only while it is present in memory.
- The JavaScript sample reads bot credentials only from environment variables and sends the same text, formatting, mentions, channel references, and attachments.

Bot-only embeds, buttons, inputs, selects, radio controls, and date pickers are not Channel Webhook fields. They require an authenticated bot process and are tracked separately in the [live verification matrix](LIVE-VERIFICATION.md).

## 4. Choose appearance and deliver

The **Theme** selector is in the top bar because it affects the whole workspace. Import and Export are next to it.

In **Delivery**:

1. Name each target. A fresh project uses `Production alerts`; rename it to match your channel or workflow.
2. Paste its webhook URL into the password-masked field.
3. Select the targets that should receive the sequence.
4. Use the single **Send N messages** button.

MezonHook sends messages in project order to each selected target. Delivery stops at the first failed request and reports how many deliveries completed, so do not blindly resend a partially delivered project.

After a successful send, target URLs are cleared from memory. Project exports contain messages and target names, never webhook URLs.

## CORS and network troubleshooting

If a browser delivery fails:

- Confirm the URL belongs to the intended channel and has not been revoked.
- Check developer tools for a CORS or network error.
- Confirm browser extensions, VPN, proxy, firewall, and DNS permit the request.
- Resolve the cause before resending to avoid duplicate messages.

## If a URL leaks

Revoke or rotate it immediately from the channel integrations settings. Do not share either the old or replacement URL. Report a suspected MezonHook vulnerability through the private process in [SECURITY.md](../SECURITY.md).
