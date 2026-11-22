export interface ServerSecurityConfig {
  frontendOrigin: string;
  allowedOrigins: string[];
}

export interface ServerSecurityEnvironment {
  NODE_ENV?: string;
  FRONTEND_ORIGIN?: string;
  PORT?: string;
}

function parseOrigin(value: string): URL {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error('FRONTEND_ORIGIN must be a valid URL');
  }

  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw new Error('FRONTEND_ORIGIN must be a URL origin');
  }

  return url;
}

export function resolveServerSecurityConfig(
  env: ServerSecurityEnvironment,
  port: number,
): ServerSecurityConfig {
  const production = env.NODE_ENV === 'production';

  if (production && !env.FRONTEND_ORIGIN) {
    throw new Error('FRONTEND_ORIGIN is required in production');
  }

  const frontendUrl = parseOrigin(env.FRONTEND_ORIGIN ?? 'http://localhost:5173');

  if (production && frontendUrl.protocol !== 'https:') {
    throw new Error('FRONTEND_ORIGIN must use HTTPS in production');
  }

  if (production && ['localhost', '127.0.0.1', '[::1]'].includes(frontendUrl.hostname)) {
    throw new Error('FRONTEND_ORIGIN cannot use localhost in production');
  }

  const frontendOrigin = frontendUrl.origin;

  const allowedOrigins = production
    ? [frontendOrigin]
    : [frontendOrigin, `http://localhost:${port}`];

  return {
    frontendOrigin,
    allowedOrigins: [...new Set(allowedOrigins)],
  };
}
