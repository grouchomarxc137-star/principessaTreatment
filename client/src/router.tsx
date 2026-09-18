import { createContext, useContext, useEffect, useState, type AnchorHTMLAttributes, type ReactNode } from "react";

// A few screens don't need a routing library: the path picks the screen, and
// links push history so the phone's back gesture works.

interface Location {
  path: string;
  query: URLSearchParams;
  navigate: (to: string, options?: { replace?: boolean }) => void;
}

const RouterContext = createContext<Location | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const [href, setHref] = useState(() => window.location.pathname + window.location.search);

  useEffect(() => {
    const onPop = () => setHref(window.location.pathname + window.location.search);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const url = new URL(href, window.location.origin);
  const value: Location = {
    path: url.pathname,
    query: url.searchParams,
    navigate(to, options) {
      if (options?.replace) window.history.replaceState(null, "", to);
      else window.history.pushState(null, "", to);
      setHref(to);
      window.scrollTo(0, 0);
    },
  };
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): Location {
  const location = useContext(RouterContext);
  if (!location) throw new Error("useRouter outside RouterProvider");
  return location;
}

export function Link({ to, ...rest }: { to: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { navigate } = useRouter();
  return (
    <a
      href={to}
      {...rest}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey) return;
        event.preventDefault();
        navigate(to);
      }}
    />
  );
}
