import { App, Modal } from "obsidian";

export interface ConfirmModalOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

/** Native window.confirm() steals Electron keyboard focus; use this instead. */
export function openConfirmModal(app: App, options: ConfirmModalOptions): Promise<boolean> {
  return new Promise((resolve) => {
    new ConfirmModal(app, options, resolve).open();
  });
}

export function blurActiveElement(): void {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}

export function blurIfDetached(): void {
  const active = document.activeElement;
  if (active instanceof HTMLElement && !active.isConnected) {
    active.blur();
  }
}

class ConfirmModal extends Modal {
  private result = false;
  private resolved = false;

  constructor(
    app: App,
    private readonly options: ConfirmModalOptions,
    private readonly onResolve: (confirmed: boolean) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText(this.options.title);
    this.contentEl.createEl("p", { text: this.options.message });

    const buttons = this.contentEl.createDiv({ cls: "modal-button-container" });
    buttons.createEl("button", { text: this.options.cancelText ?? "Cancel" }).addEventListener("click", () => {
      this.result = false;
      this.close();
    });

    const confirm = buttons.createEl("button", {
      text: this.options.confirmText ?? "OK",
      cls: this.options.destructive ? "mod-warning" : "mod-cta",
    });
    confirm.addEventListener("click", () => {
      this.result = true;
      this.shouldRestoreSelection = false;
      this.close();
    });
  }

  onClose(): void {
    this.contentEl.empty();
    if (!this.resolved) {
      this.resolved = true;
      this.onResolve(this.result);
    }
  }
}
