export function envValue(name) {
  const raw = process.env[name];
  if (raw == null) return '';
  return String(raw).trim().replace(/^['"]|['"]$/g, '');
}

export function requireEnv(name) {
  const value = envValue(name);
  if (!value) {
    throw Object.assign(new Error(`Missing environment variable: ${name}`), {
      statusCode: 500,
    });
  }
  return value;
}
