// Revalidation headers for the API.
//
// The clients keep their own copy of every list they've seen, so most requests
// that reach here are a background "has this changed?" rather than a first
// read. Express already puts an ETag on JSON responses; these headers are what
// make the client actually USE it — without them a browser has no cache entry
// to revalidate against, so every check re-downloads a body it already holds.
//
// With them, an unchanged list answers 304 with no body at all: the round trip
// remains, but the payload, the gzip pass and the parse all disappear.
//
// `no-cache` is not "don't cache" — it means "cache it, but check with me
// before using it". That is exactly right for ERP data: never shown without
// the server's say-so, never re-sent when it hasn't moved.

const REVALIDATE = 'private, no-cache, must-revalidate';
const NEVER = 'no-store';

module.exports = function httpCache() {
  return (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD') {
      res.set('Cache-Control', REVALIDATE);
      // Two members of the same workspace hit identical URLs and get different
      // answers. Any cache between here and them must key on who asked, or one
      // person's approvals could be served to another.
      res.vary('Authorization');
    } else {
      // A mutation's response is a one-off receipt. Nothing should keep it.
      res.set('Cache-Control', NEVER);
    }
    next();
  };
};
