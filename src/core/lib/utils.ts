export function validateTeamName(name: string) {
  return ['team1', 'team2'].includes(name);
}

export function getParams<T extends Record<string, string>>(url: string) {
  return Object.fromEntries(new URLSearchParams(url.split('?')[1])) as T;
}

export function getRemainingTeamName(teamName: RoomTeamName) {
  return teamName === 'team1' ? 'team2' : 'team1';
}

export function wait(ms: number) {
  return new Promise<void>(resolve => setTimeout(() => resolve(), ms));
}