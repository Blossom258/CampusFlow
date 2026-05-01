import React from "react";
import { Button, Result } from "antd";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // ✅ 你后续要做日志上报/埋点，就从这里接入
    console.error("[ErrorBoundary]", error, info);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24 }}>
          <Result
            status="error"
            title="页面出错了"
            subTitle={this.state.error?.message || "请刷新页面重试"}
            extra={[
              <Button type="primary" key="reload" onClick={this.handleReload}>
                刷新页面
              </Button>,
              <Button key="home" onClick={() => (window.location.href = "/")}>
                返回首页
              </Button>,
            ]}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
