import { Outlet } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";

export default function Root() {
  return (
    <>
      <ScrollToTop />
      <Outlet />
    </>
  );
}
