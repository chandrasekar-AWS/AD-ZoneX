import { Component } from 'react';
import ErrorPage from './ErrorPage';

/** Catches any crash while rendering and shows a friendly 500 page instead of a blank screen. */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) { return { error }; }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('App crashed:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <ErrorPage
        kind={500}
        bare
        detail={import.meta.env.DEV ? String(this.state.error?.message || this.state.error) : undefined}
        onRetry={() => { this.setState({ error: null }); window.location.reload(); }}
      />
    );
  }
}
