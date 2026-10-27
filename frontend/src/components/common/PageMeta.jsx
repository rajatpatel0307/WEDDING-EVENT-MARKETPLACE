import { useEffect } from "react";
import { useLocation } from "react-router-dom";
export default function PageMeta({ title, description }) {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = `${title} | MarryNest`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", description);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [title, description, pathname]);
  return null;
}
