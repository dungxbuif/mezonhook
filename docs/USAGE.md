# Using MezonHook

MezonHook has two independent composers. **Channel Webhook** sends a version 3 project directly from the browser. **Bot SDK** builds a version 2 project and generates a complete JavaScript sender for an authenticated bot. Use the mode tabs at the top of the workspace; changing modes preserves both drafts.

## 1. Choose the delivery model

Use **Channel Webhook** for text, formatting, mentions, hosted images, channel references, and direct delivery. Use **Bot SDK** for embeds and interactive components. Importing a v2 or v3 project automatically opens the matching composer; exporting saves only the active project.

## 2. Create a Channel Webhook

In Mezon, open the target channel, open its settings and integrations, create a Channel Webhook, and copy its URL. The endpoint follows this form:

```text
https://webhook.mezon.ai/webhooks/{channelId}/{token}
```

Treat the URL as a password. Do not paste it into source code, tickets, screenshots, exported projects, or chat.

## 3. Compose webhook messages

A fresh project contains a rich release-status demo so every supported field is visible immediately. It includes code-style formatting, a link, an illustrative mention, an illustrative channel reference, and hosted image metadata. Replace the demo IDs and content before sending; the example is never sent automatically.

1. Enter the message text. Select text before adding an optional range; the editor pre-fills its zero-based start/end indexes. With no selection it falls back to `0–1`, which you should adjust.
2. Open only the optional groups you need:
   - **Formatting** for `pre` or link ranges.
   - **Mentions** for a username or user ID plus its text range.
   - **Images** for hosted HTTPS image metadata.
   - **Channel references** for a channel ID plus its text range.
3. Use **Add message**, **Duplicate**, and the arrow buttons to create the exact delivery order.
4. Review the Mezon-style conversation preview. On desktop it stays below the header while it fits the viewport; a very long preview returns to normal page flow so you can read it through the page scroll instead of a nested pane scrollbar. The composer, Advanced section, and Delivery remain in one natural document flow. On mobile and tablet, switch between **Compose** and **Preview**.

Every range is zero-based, start-inclusive, and end-exclusive. For example, selecting the first four characters uses `s: 0` and `e: 4`.

## 4. Inspect JSON or generated code

Open **Advanced JSON and code**. The JSON is the exact `{ type: "hook", message }` envelope for the selected message.

- Valid edits update the visual form and preview.
- Invalid edits preserve the last valid message, show the validation error, and disable Send.
- The cURL sample uses the current webhook URL only while it is present in memory.
- Copy feedback is truthful. If browser clipboard access fails, select and copy the visible code manually.

## 5. Compose a Bot SDK project

Switch to **Bot SDK** to edit content, embed appearance, ordinary fields, buttons, inputs, selects, radio controls, date pickers, and animation payloads. The right-hand Mezon-style preview follows the same ordered messages.

Open **Generated JavaScript** and copy the full sender. Run it with these environment variables:

```text
MEZON_BOT_ID
MEZON_BOT_TOKEN
MEZON_CHANNEL_ID
```

The generated code logs in, fetches the channel, builds every message in order, and calls `channel.send`. Buttons and form components are rendered payloads only: register click/submission handlers separately in your long-running bot process. Never put credentials in the project or generated source.

## 6. Choose appearance and deliver

The **Theme** selector is in the top bar because it affects the whole workspace. Import and Export are next to it.

**Delivery appears only in Channel Webhook mode.** In that section:

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
