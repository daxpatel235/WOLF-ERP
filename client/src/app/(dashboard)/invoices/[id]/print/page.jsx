// Server wrapper: declares (empty) static params so this dynamic route survives
// "output: export", then defers rendering to the client component, which reads
// the id via useParams() at runtime. (Refactored for the desktop build.)
import PageClient from "./PageClient";

export function generateStaticParams() {
  return [];
}

export default function Page() {
  return <PageClient />;
}
