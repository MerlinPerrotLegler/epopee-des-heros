// HTTP Basic Auth middleware
// Set credentials via environment variables: AUTH_USER and AUTH_PASS
export function basicAuth(req, res, next) {
  const user = process.env.AUTH_USER || 'admin';
  const pass = process.env.AUTH_PASS || 'changeme';

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Card Designer"');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
  const [u, p] = credentials.split(':');

  if (u === user && p === pass) {
    return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Card Designer"');
  return res.status(401).json({ error: 'Invalid credentials' });
}
