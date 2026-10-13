'use client';

import { useState, type FormEvent } from 'react';
import { vttSceneSettingsSchema, type VttSceneSettings } from '@paralax/contracts';

export function VttSceneControls({ settings, disabled, onApply }: { settings: VttSceneSettings; disabled: boolean; onApply: (settings: VttSceneSettings) => void }) {
  const [error, setError] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const square = fields.get('grid') === 'SQUARE';
    const result = vttSceneSettingsSchema.safeParse({ ...settings,
      grid: square ? { type: 'SQUARE', cellSize: Number(fields.get('cellSize')), offsetX: 0, offsetY: 0 } : { type: 'NONE' },
      scale: { pixelsPerUnit: Number(fields.get('scale')), unit: String(fields.get('unit')) },
    });
    if (!result.success) { setError('Use uma célula entre 8 e 1.024 pixels, escala entre 0,01 e 10.000 e uma unidade de até 24 caracteres.'); return; }
    setError(''); onApply(result.data);
  }
  return <section className="vtt-inspector-section"><h2>Grade e escala</h2><form onSubmit={submit} noValidate>
    <fieldset disabled={disabled}>
      <label>Tipo de grade<select name="grid" defaultValue={settings.grid.type}><option value="SQUARE">Quadrada</option><option value="NONE">Sem grade</option></select></label>
      <div className="vtt-field-pair"><label>Célula em pixels<input name="cellSize" type="number" min="8" max="1024" defaultValue={settings.grid.type === 'SQUARE' ? settings.grid.cellSize : 50} /></label><label>Pixels por unidade<input name="scale" type="number" step="any" min="0.01" max="10000" defaultValue={settings.scale.pixelsPerUnit} /></label></div>
      <label>Unidade<input name="unit" maxLength={24} defaultValue={settings.scale.unit} /></label>
      <button className="button button-secondary button-small" type="submit">Aplicar grade e escala</button>
    </fieldset>
    {error ? <p className="feedback error" role="alert">{error}</p> : null}
  </form></section>;
}
