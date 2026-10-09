export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  acknowledgeOnly?: boolean;
}

// One decision at a time. A second click cannot enqueue a duplicate mutation.
export class Confirmation {
  private resolve: ((accepted: boolean) => void) | null = null;
  onChange: (options: ConfirmOptions | null) => void = () => undefined;

  subscribe(listener: (options: ConfirmOptions | null) => void) {
    this.onChange = listener;
    return () => {
      this.onChange = () => undefined;
      this.finish(false);
    };
  }

  request(options: ConfirmOptions): Promise<boolean> {
    if (this.resolve) return Promise.resolve(false);
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.onChange(options);
    });
  }

  finish(accepted: boolean) {
    const resolve = this.resolve;
    this.resolve = null;
    this.onChange(null);
    resolve?.(accepted);
  }
}
