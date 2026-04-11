import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Text,
  Button,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { ErrorCircleRegular, ArrowResetRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    padding: '40px',
    textAlign: 'center',
    gap: '20px',
    background: tokens.colorNeutralBackground3,
  },
  icon: {
    fontSize: '64px',
    color: tokens.colorPaletteRedForeground1,
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
  },
  message: {
    maxWidth: '600px',
    color: tokens.colorNeutralForeground3,
  },
  details: {
    maxWidth: '800px',
    padding: '16px',
    background: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    fontFamily: 'monospace',
    fontSize: '12px',
    textAlign: 'left',
    overflow: 'auto',
    maxHeight: '200px',
  },
});

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

const ErrorFallback: React.FC<{ error: Error | null; onReset: () => void }> = ({
  error,
  onReset,
}) => {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <ErrorCircleRegular className={styles.icon} />
      <Text className={styles.title}>Something went wrong</Text>
      <Text className={styles.message}>
        The application encountered an unexpected error. Please try refreshing the page.
      </Text>
      {error && (
        <details className={styles.details}>
          <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
            Error details
          </summary>
          <pre>{error.toString()}</pre>
        </details>
      )}
      <Button
        icon={<ArrowResetRegular />}
        appearance="primary"
        onClick={onReset}
      >
        Reload Application
      </Button>
    </div>
  );
};

export default ErrorBoundary;
