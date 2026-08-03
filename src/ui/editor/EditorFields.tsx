import type { ReactNode } from "react";
import type { UiElement } from "../types";

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, error, hint, children }: FieldProps): UiElement {
  return (
    <label className="cp-editor__field">
      <span className="cp-editor__label">{label}</span>
      {children}
      {hint && <span className="cp-editor__hint">{hint}</span>}
      {error && <span className="cp-editor__error">{error}</span>}
    </label>
  );
}

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  min?: number;
}

export function NumberInput({ value, onChange, disabled, min }: NumberInputProps): UiElement {
  return (
    <input
      type="number"
      className="cp-editor__input"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      disabled={disabled}
      onChange={(event) => {
        const parsed = Number.parseInt(event.target.value, 10);
        onChange(Number.isNaN(parsed) ? 0 : parsed);
      }}
    />
  );
}

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function TextInput({ value, onChange, disabled, autoFocus }: TextInputProps): UiElement {
  return (
    <input
      type="text"
      className="cp-editor__input"
      value={value}
      disabled={disabled}
      autoFocus={autoFocus}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

interface ReadOnlyFieldProps {
  label: string;
  value: string;
  hint?: string;
}

export function ReadOnlyField({ label, value, hint }: ReadOnlyFieldProps): UiElement {
  return (
    <Field label={label} hint={hint ?? "Automatically calculated."}>
      <input type="text" className="cp-editor__input cp-editor__input--readonly" value={value} readOnly />
    </Field>
  );
}

interface CheckboxFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function CheckboxField({ label, checked, onChange }: CheckboxFieldProps): UiElement {
  return (
    <label className="cp-editor__checkbox">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

interface SectionProps {
  title: string;
  children: ReactNode;
}

export function Section({ title, children }: SectionProps): UiElement {
  return (
    <section className="cp-editor__section">
      <h3 className="cp-editor__section-title">{title}</h3>
      <div className="cp-editor__section-body">{children}</div>
    </section>
  );
}
