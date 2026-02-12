export function recordEvent(room: Room, message: any, recipients: string[]) {
  if (recipients.includes('team1')) {
    room.team1.finished_events.push(message);
  }
  if (recipients.includes('team2')) {
    room.team2.finished_events.push(message);
  }
  if (recipients.includes('admin')) {
    room.admin_finished_events.push(message);
  }
}
