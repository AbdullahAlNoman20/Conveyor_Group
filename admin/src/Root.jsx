import { Outlet } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import HashScroll from "./components/HashScroll";

export default function Root() {
  return (
    <>
      <ScrollToTop />
      <HashScroll />
      <Outlet />
    </>
  );
}
