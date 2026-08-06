import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * react-router's <Link>/<NavLink> updates the URL hash on click but does
 * NOT scroll the matching element into view the way a plain <a href="#id">
 * would — that's a well-known gotcha, and it's why the Home page's Nav
 * links (Weekly Meals / Lunch Menu / How it Works) looked "broken": the
 * route change happened, the hash updated, but nothing scrolled.
 */
export default function HashScroll() {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    if (!hash) return;
    // Wait a tick so the target page's content (which may load async data)
    // has a chance to render before we measure its position.
    const id = hash.replace("#", "");
    const scroll = () => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const t1 = setTimeout(scroll, 50);
    const t2 = setTimeout(scroll, 350); // second pass in case content was still loading
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [hash, pathname]);

  return null;
}
