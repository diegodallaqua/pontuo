import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '../shared/ui/components';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error(error, info.componentStack);
  }
  render() {
    if (this.state.failed)
      return (
        <main className="not-found">
          <h1>Precisamos retomar este passo.</h1>
          <p>Ocorreu um erro ao abrir a tela. Suas respostas confirmadas continuam salvas.</p>
          <Button onClick={() => window.location.reload()}>Recarregar página</Button>
        </main>
      );
    return this.props.children;
  }
}
