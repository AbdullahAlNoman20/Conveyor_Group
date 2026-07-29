import { useRouteError, useNavigate, isRouteErrorResponse } from "react-router-dom";
import ErrorPage from "./ErrorPage";

export default function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  let code = 500;
  let title = "Something went wrong";
  let message = "An unexpected error occurred while loading this page.";

  if (isRouteErrorResponse(error)) {
    code = error.status;
    if (error.status === 404) {
      title = "Page not found";
      message = "The page you're looking for doesn't exist or may have moved.";
    } else {
      title = "Something went wrong";
      message = error.statusText || "The server couldn't process this request.";
    }
  } else if (error?.message) {
    message = error.message;
  }

  return (
    <ErrorPage
      code={code}
      title={title}
      message={message}
      onRetry={() => window.location.reload()}
      onHome={() => navigate("/")}
    />
  );
}
