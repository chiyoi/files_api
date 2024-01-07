export const withQuery = (endpoint: string, query: any) => {
  const u = new URL(endpoint)
  for (const key in query) if (key !== undefined) u.searchParams.set(key, query[key])
  return u.href
}
