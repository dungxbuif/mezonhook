import {
  normalizeProject,
  validateProject,
  type MessageButtonStyle,
  type MessageDraft,
  type WebhookProject,
} from '@mezonhook/schema';

const json = (value: unknown) => JSON.stringify(value);
const styleNames: Record<MessageButtonStyle, string> = {
  1: 'PRIMARY',
  2: 'SECONDARY',
  3: 'SUCCESS',
  4: 'DANGER',
  5: 'LINK',
};

function embedBuilderSource(draft: MessageDraft, index: number): string[] {
  const variable = `embed${index + 1}`;
  const lines = [`const ${variable}Builder = new InteractiveBuilder(${json(draft.card.title)})`];
  if (draft.card.description) lines.push(`  .setDescription(${json(draft.card.description)})`);
  if (draft.card.author) lines.push(`  .setAuthor(${json(draft.card.author)})`);
  if (draft.card.thumbnail) lines.push(`  .setThumbnail(${json(draft.card.thumbnail)})`);
  if (draft.card.image) lines.push(`  .setImage(${json(draft.card.image)})`);
  for (const field of draft.card.fields) {
    const inputs = field.inputs;
    if (!inputs) lines.push(`  .addField(${json(field.name)}, ${json(field.value)}, ${field.inline})`);
    else if (inputs.type === 3) lines.push(`  .addInputField(${json(inputs.id)}, ${json(field.name)}, ${json(inputs.component.placeholder ?? '')}, ${json({ defaultValue: inputs.component.defaultValue ?? '', type: inputs.component.type ?? 'text', textarea: inputs.component.textarea ?? false })}, ${json(field.value)})`);
    else if (inputs.type === 2) lines.push(`  .addSelectField(${json(inputs.id)}, ${json(field.name)}, ${json(inputs.component.options)}, ${json(inputs.component.valueSelected)}, ${json(field.value)})`);
    else if (inputs.type === 5) lines.push(`  .addRadioField(${json(inputs.id)}, ${json(field.name)}, ${json(inputs.component)}, ${json(field.value)}, ${json(inputs.max_options)})`);
    else if (inputs.type === 4) lines.push(`  .addDatePickerField(${json(inputs.id)}, ${json(field.name)}, ${json(field.value)})`);
    else if (inputs.type === 6) lines.push(`  .addAnimation(${json(inputs.id)}, ${json(inputs.component)}, ${json(field.name)}, ${json(field.value)})`);
  }
  lines[lines.length - 1] += ';';
  lines.push(`const ${variable} = ${variable}Builder.build();`);
  lines.push(`${variable}.color = ${json(draft.card.color)};`);
  draft.card.fields.forEach((field, fieldIndex) => {
    if (field.inputs) {
      lines.push(`${variable}.fields[${fieldIndex}].inputs = ${json(field.inputs)};`);
      lines.push(`${variable}.fields[${fieldIndex}].inline = ${field.inline};`);
    }
  });
  return lines;
}

function buttonsSource(draft: MessageDraft, index: number): string[] {
  if (draft.buttons.length === 0) return [];
  const variable = `buttons${index + 1}`;
  const lines = [`const ${variable} = new ButtonBuilder()`];
  for (const button of draft.buttons) {
    lines.push(`  .addButton(${json(button.id)}, ${json(button.label)}, EButtonMessageStyle.${styleNames[button.style]})`);
  }
  lines[lines.length - 1] += '.build();';
  return lines;
}

export function makeBotProjectSample(project: WebhookProject): string {
  const validation = validateProject(project);
  if (!validation.valid) throw new Error(`Invalid Bot SDK project: ${validation.errors.join(' ')}`);
  const normalized = normalizeProject(project);
  const messageBlocks = normalized.messages.flatMap((draft, index) => {
    const embedVariable = `embed${index + 1}`;
    const buttonVariable = `buttons${index + 1}`;
    const payload = draft.buttons.length > 0
      ? `{ t: ${json(draft.body)}, embed: [${embedVariable}], components: [{ components: ${buttonVariable} }] }`
      : `{ t: ${json(draft.body)}, embed: [${embedVariable}] }`;
    return [
      ...embedBuilderSource(draft, index),
      ...buttonsSource(draft, index),
      `await channel.send(${payload});`,
      `console.log(${json(`Sent message ${index + 1} of ${normalized.messages.length}.`)});`,
      '',
    ];
  });

  return `import { MezonClient, InteractiveBuilder, ButtonBuilder, EButtonMessageStyle } from 'mezon-sdk';

const required = ['MEZON_BOT_ID', 'MEZON_BOT_TOKEN', 'MEZON_CHANNEL_ID'];
for (const name of required) {
  if (!process.env[name]) throw new Error(\`Missing required environment variable: \${name}\`);
}

const client = new MezonClient({
  botId: process.env.MEZON_BOT_ID,
  token: process.env.MEZON_BOT_TOKEN,
});
try {
  await client.login();
  const channel = await client.channels.fetch(process.env.MEZON_CHANNEL_ID);

${messageBlocks.join('\n')}  console.log('All Bot SDK messages sent.');
} finally {
  client.closeSocket();
}
process.exit(0);
`;
}
