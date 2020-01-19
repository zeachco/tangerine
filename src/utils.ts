export function urlencode(data: string | object): string {
  return encodeURI(typeof data === 'object' ? JSON.stringify(data) : data)
}
