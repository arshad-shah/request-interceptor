import React from 'react';
import BrandMark from './BrandMark';

interface Props {
  /** Human-readable label for which surface crashed (e.g. "Side Panel"). */
  scope: string;
  children: React.ReactNode;
  /**
   * 'page' (default) fills the surface (popup, side panel).
   * 'inline' replaces just one tab or panel, leaving the rest of the UI usable.
   */
  variant?: 'page' | 'inline';
}

interface State {
  error: Error | null;
  info: React.ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    this.setState({ info });
    console.error(`[${this.props.scope}] React error:`, error, info.componentStack);
  }

  reset = (): void => {
    this.setState({ error: null, info: null });
  };

  reload = (): void => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.reload) chrome.runtime.reload();
    else location.reload();
  };

  copyDetails = (): void => {
    const { error, info } = this.state;
    const text = [
      `Request Interceptor ${chrome?.runtime?.getManifest?.().version ?? ''} — ${this.props.scope}`,
      `${error?.name}: ${error?.message}`,
      error?.stack ?? '',
      info?.componentStack ?? '',
    ].join('\n');
    navigator.clipboard?.writeText(text).catch(() => {});
  };

  render(): React.ReactNode {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    if (this.props.variant === 'inline') {
      return (
        <div
          role="alert"
          className="m-3 p-4 rounded-[var(--radius-lg)] border border-[rgba(244,63,94,0.3)] bg-[rgba(244,63,94,0.08)] text-[13px]"
        >
          <div className="font-semibold text-[var(--accent-rose)]">{this.props.scope} hit an error</div>
          <p className="mt-1 text-[12px] text-[var(--text-secondary)] font-mono break-words">{error.message}</p>
          <p className="mt-1 text-[12px] text-[var(--text-tertiary)]">The rest of the extension keeps working.</p>
          <div className="mt-3 flex gap-2">
            <button className="ds-btn sm" onClick={this.reset}>Try again</button>
            <button className="ds-btn ghost sm" onClick={this.copyDetails}>Copy details</button>
          </div>
        </div>
      );
    }

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          padding: '24px',
          background: '#0b0d10',
          color: '#e6edf3',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: 14,
          lineHeight: 1.5,
          overflow: 'auto',
        }}
      >
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <BrandMark size={28} />
            <h1 style={{ fontSize: 18, margin: 0, color: '#f87171' }}>{this.props.scope} crashed</h1>
          </div>
          <p style={{ margin: '0 0 16px', color: '#9aa4af' }}>
            An unexpected error occurred while rendering. The rest of the extension is unaffected.
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button onClick={this.reset} style={btn}>Try again</button>
            <button onClick={this.reload} style={{ ...btn, background: '#1f2937' }}>
              Reload extension
            </button>
          </div>
          <details open style={{ background: '#11151a', border: '1px solid #1f2937', borderRadius: 6, padding: 12 }}>
            <summary style={{ cursor: 'pointer', color: '#9aa4af' }}>Error details</summary>
            <pre style={preStyle}>{error.name}: {error.message}</pre>
            {error.stack && <pre style={preStyle}>{error.stack}</pre>}
            {info?.componentStack && (
              <pre style={{ ...preStyle, color: '#9aa4af' }}>{info.componentStack}</pre>
            )}
          </details>
        </div>
      </div>
    );
  }
}

const btn: React.CSSProperties = {
  padding: '8px 14px',
  background: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: 13,
  cursor: 'pointer',
};

const preStyle: React.CSSProperties = {
  margin: '8px 0 0',
  padding: 8,
  background: '#0b0d10',
  border: '1px solid #1f2937',
  borderRadius: 4,
  fontSize: 12,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  color: '#e6edf3',
};
