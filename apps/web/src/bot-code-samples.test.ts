import { createAnnouncementDraft, createWebhookProject, type MessageFieldInputs } from '@mezonhook/schema';
import { describe, expect, it } from 'vitest';
import { makeBotProjectSample } from './bot-code-samples';

const interactiveField = (name: string, inputs: MessageFieldInputs) => ({ name, value: `${name} help`, inline: false, inputs });

describe('Bot SDK project samples', () => {
  it('generates a parseable ordered sender for embeds, buttons, and every supported interactive field', () => {
    const project = createWebhookProject();
    project.name = 'Full Bot SDK example';
    const first = createAnnouncementDraft();
    first.body = 'First bot message';
    first.card.title = 'Release approval';
    first.card.fields = [
      { name: 'Status', value: 'Ready', inline: true },
      interactiveField('Input', { id: 'input-field', type: 3, component: { id: 'input-control', placeholder: 'Reason', defaultValue: 'Approved', type: 'text', textarea: true, disabled: false } }),
      interactiveField('Select', { id: 'select-field', type: 2, component: { options: [{ label: 'Alpha', value: 'alpha' }], valueSelected: 'alpha' } }),
      interactiveField('Radio', { id: 'radio-field', type: 5, component: [{ label: 'Yes', value: 'yes', description: 'Ship now', style: 3 }], max_options: 1 }),
    ];
    first.buttons = [{ id: 'approve', label: 'Approve', style: 3 }];
    const second = createAnnouncementDraft();
    second.body = 'Second bot message';
    second.card.fields = [
      interactiveField('Date', { id: 'date-field', type: 4, component: {} }),
      interactiveField('Animation', { id: 'animation-field', type: 6, component: { url_image: 'https://cdn.example/image.png', url_position: 'https://cdn.example/position.json', pool: ['idle'], repeat: 2, duration: 500 } }),
    ];
    project.messages = [first, second];

    const source = makeBotProjectSample(project);

    expect(source).toContain("import { MezonClient, InteractiveBuilder, ButtonBuilder, EButtonMessageStyle } from 'mezon-sdk';");
    for (const name of ['MEZON_BOT_ID', 'MEZON_BOT_TOKEN', 'MEZON_CHANNEL_ID']) expect(source).toContain(name);
    expect(source.match(/await channel\.send\(/g)).toHaveLength(2);
    expect(source.indexOf('First bot message')).toBeLessThan(source.indexOf('Second bot message'));
    for (const method of ['addField(', 'addInputField(', 'addSelectField(', 'addRadioField(', 'addDatePickerField(', 'addAnimation(', 'addButton(']) {
      expect(source).toContain(method);
    }
    expect(source).toContain('EButtonMessageStyle.SUCCESS');
    expect(source).not.toMatch(/botId:\s*['"][^'"]+['"]/);
    expect(source).not.toMatch(/token:\s*['"][^'"]+['"]/);

    const body = source.replace(/^import[^\n]+\n/, '');
    expect(() => new (Object.getPrototypeOf(async function () {}).constructor)(body)).not.toThrow();
  });

  it('rejects invalid projects instead of generating misleading code', () => {
    const invalid = { ...createWebhookProject(), messages: [] };
    expect(() => makeBotProjectSample(invalid)).toThrow('Invalid Bot SDK project');
  });
});
