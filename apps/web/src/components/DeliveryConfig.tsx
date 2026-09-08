import type { FormEvent } from 'react';
import type { WebhookProject } from '@mezonhook/schema';

export type AppearanceTheme = 'dark' | 'light' | 'abyss' | 'purple-haze' | 'sunrise' | 'sunset';

const appearanceOptions: Array<{ value: AppearanceTheme; label: string }> = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'abyss', label: 'Abyss' },
  { value: 'purple-haze', label: 'Purple Haze' },
  { value: 'sunrise', label: 'Sunrise' },
  { value: 'sunset', label: 'Sunset' },
];

type DeliveryConfigProps = {
  targets: WebhookProject['targets']; selectedTargetIds: string[]; targetUrls: Record<string, string>; sending: boolean;
  appearance: AppearanceTheme; onAppearanceChange: (appearance: AppearanceTheme) => void;
  status: { kind: 'success' | 'error'; message: string } | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void; onToggleTarget: (id: string, checked: boolean) => void; onTargetNameChange: (id: string, name: string) => void; onTargetUrlChange: (id: string, url: string) => void; onAddTarget: () => void; onRemoveTarget: (id: string) => void;
};

export function DeliveryConfig({ targets, selectedTargetIds, targetUrls, sending, appearance, onAppearanceChange, status, onSubmit, onToggleTarget, onTargetNameChange, onTargetUrlChange, onAddTarget, onRemoveTarget }: DeliveryConfigProps) {
  return <section className="inline-delivery" aria-labelledby="config-title"><p className="eyebrow">Delivery</p><h2 id="config-title">Delivery targets</h2><p className="editor-intro">Target URLs stay only in this browser session. They are masked, excluded from project files, and cleared after a successful send.</p><div className="appearance-config"><label><span>Appearance theme</span><select value={appearance} onChange={(event) => onAppearanceChange(event.target.value as AppearanceTheme)}>{appearanceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><p>Appearance is saved locally and never included in project files.</p></div><form id="delivery-form" onSubmit={onSubmit} className="target-list">{targets.map((target) => <div className="target-row" key={target.id}><label className="target-select"><input type="checkbox" checked={selectedTargetIds.includes(target.id)} onChange={(event) => onToggleTarget(target.id, event.target.checked)} /><span>Send to this target</span></label><label><span>Target name</span><input value={target.name} onChange={(event) => onTargetNameChange(target.id, event.target.value)} /></label><label><span>Webhook URL for {target.name}</span><input type="password" autoComplete="off" value={targetUrls[target.id] ?? ''} onChange={(event) => onTargetUrlChange(target.id, event.target.value)} placeholder="https://webhook.mezon.ai/webhooks/..." /></label><button type="button" className="remove-button" onClick={() => onRemoveTarget(target.id)} disabled={targets.length <= 1}>Remove target</button></div>)}<div className="target-actions"><button type="button" className="secondary-button" onClick={onAddTarget} disabled={targets.length >= 10}>Add target</button><button type="submit" className="add-button" disabled={sending}>{sending ? 'Sending…' : 'Send project'}</button></div></form>{status && <p className={status.kind === 'error' ? 'form-alert' : 'send-success'} role={status.kind === 'error' ? 'alert' : 'status'}>{status.message}</p>}</section>;
}
