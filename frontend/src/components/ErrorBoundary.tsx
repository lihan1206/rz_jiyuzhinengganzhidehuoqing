import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";
import { Button, Card, Typography } from "antd";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(_error: Error, _errorInfo: ErrorInfo): void {
    this.setState({ hasError: true });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Card>
          <Typography.Title level={4}>页面出现异常</Typography.Title>
          <Typography.Paragraph>系统已捕获错误，请刷新页面后重试。</Typography.Paragraph>
          <Button type="primary" onClick={() => window.location.reload()}>
            刷新页面
          </Button>
        </Card>
      );
    }

    return this.props.children;
  }
}
