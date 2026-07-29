import { Component } from "react";
import ErrorPage from "./ErrorPage";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // In a real backend-connected build this should also POST to an error
    // logging endpoint (SRS Section 28.1 — Audit Logs).
    console.error("Uncaught application error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorPage
          code={500}
          title="The application hit a snag"
          message={this.state.error?.message || "Please try again, or return to the homepage."}
          onRetry={() => this.setState({ hasError: false, error: null })}
          onHome={() => {
            this.setState({ hasError: false, error: null });
            window.location.href = "/";
          }}
        />
      );
    }
    return this.props.children;
  }
}
