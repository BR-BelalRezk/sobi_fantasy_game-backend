export function validateTeamName(name: string) {
  return ['team1', 'team2'].includes(name);
}

export function getParams<T extends Record<string, string>>(url: string) {
  return Object.fromEntries(new URLSearchParams(url.split('?')[1])) as T;
}