// Server wrapper: declares (empty) static params so this dynamic route survives
// "output: export", then defers rendering to the client component, which reads
// the id via useParams() at runtime. (Refactored for the desktop build.)
import PageClient from "./PageClient";

// One placeholder route so `output: export` has something to emit. Real ids are
// never hard-loaded in the desktop shell — the app always boots at index.html
// and client-routes from there, reading the id via useParams() at runtime.
export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function Page() {
  return <PageClient />;
}
