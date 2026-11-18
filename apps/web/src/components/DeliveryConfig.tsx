import type { ChannelWebhookProject } from '@mezonhook/schema';
import type { FormEvent } from 'react';

export type AppearanceTheme = 'dark' | 'light' | 'abyss' | 'purple-haze' | 'sunrise' | 'sunset';

const themes: Array<{ value: AppearanceTheme; label: string }> = [
  { value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }, { value: 'abyss', label: 'Abyss' },
  { value: 'purple-haze', label: 'Purple Haze' }, { value: 'sunrise', label: 'Sunrise' }, { value: 'sunset', label: 'Sunset' },
];

type Props = {
  targets: ChannelWebhookProject['targets'];
  selectedTargetIds: string[];
  targetUrls: Record<string, string>;
  disabled: boolean;
  sending: boolean;
  messageCount: number;
  appearance: AppearanceTheme;
  status: { kind: 'success' | 'error'; message: string } | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleTarget: (id: string, checked: boolean) => void;
  onTargetNameChange: (id: string, name: string) => void;
  onTargetUrlChange: (id: string, url: string) => void;
  onAddTarget: () => void;
  onRemoveTarget: (id: string) => void;
  onAppearanceChange: (theme: AppearanceTheme) => void;
};

export function DeliveryConfig({ targets, selectedTargetIds, targetUrls, disabled, sending, messageCount, appearance, status, onSubmit, onToggleTarget, onTargetNameChange, onTargetUrlChange, onAddTarget, onRemoveTarget, onAppearanceChange }: Props) {
  return <section className="builder-section delivery-section" aria-labelledby="delivery-title">
    <div className="section-heading"><div><p className="eyebrow">Step 3</p><h2 id="delivery-title">Delivery</h2></div><label className="theme-field"><span>Theme</span><select aria-label="Appearance theme" value={appearance} onChange={(event) => onAppearanceChange(event.target.value as AppearanceTheme)}>{themes.map((theme) => <option value={theme.value} key={theme.value}>{theme.label}</option>)}</select></label></div>
    <p className="editor-intro">Webhook URLs stay masked in memory and are cleared after a successful send.</p>
    <form id="delivery-form" onSubmit={onSubmit} className="target-list">
      {targets.map((target) => <fieldset className="target-row" key={target.id}><legend>{target.name}</legend>
        <label className="target-select"><input type="checkbox" checked={selectedTargetIds.includes(target.id)} onChange={(event) => onToggleTarget(target.id, event.target.checked)} /><span>{`Send to ${target.name}`}</span></label>
        <label><span>Target name</span><input value={target.name} onChange={(event) => onTargetNameChange(target.id, event.target.value)} /></label>
        <label><span>{`Webhook URL for ${target.name}`}</span><input type="password" autoComplete="off" value={targetUrls[target.id] ?? ''} onChange={(event) => onTargetUrlChange(target.id, event.target.value)} placeholder="https://webhook.mezon.ai/webhooks/…" /></label>
        <button type="button" className="remove-button" onClick={() => onRemoveTarget(target.id)} disabled={targets.length <= 1}>Remove target</button>
      </fieldset>)}
      <div className="target-actions"><button type="button" className="secondary-button" onClick={onAddTarget} disabled={targets.length >= 10}>Add target</button><button type="submit" className="primary-button" disabled={disabled || sending}>{sending ? 'Sending…' : `Send ${messageCount} ${messageCount === 1 ? 'message' : 'messages'}`}</button></div>
    </form>
    {status && <p className={status.kind === 'error' ? 'form-alert' : 'send-success'} role={status.kind === 'error' ? 'alert' : 'status'}>{status.message}</p>}
  </section>;
}
