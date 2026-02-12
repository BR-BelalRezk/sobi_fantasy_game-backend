import { WebSocketServer } from "ws";
import { getParams } from "../core/lib/utils";
import { WebSocketPool } from "../core/lib/helpers/web-socket-pool";
import { recordEvent } from "../core/lib/helpers/record-event";
import { baseRoom } from "..";

type StartExperienceMessage = {
  event: "start_experience",
  data: null
} | {
  event: "unhold_play_draw",
  data: null
} | {
  event: "terminate_game",
  data: null
}

export function StartingAdapter(wss: WebSocketServer, wsPool: WebSocketPool, room: Room) {
  wss.addListener('connection', (ws, request) => {
    const name = getParams(request.url!).team_name as RoomTeamName | undefined;
    const isAdmin = (getParams(request.url!).role === 'admin')
    const appName = getParams(request.url!).app_name as AppName | undefined;

    if (appName && isAdmin) {
      wsPool.append({ key: 'admin', socket: ws })
      // Flush all previous admin events to restore state
      room.admin_finished_events.forEach((event, idx) => {
        setTimeout(() => {
          ws.send(JSON.stringify(event));
        }, (idx * 100) + 100);
      });
    } else if (appName && name) {
      if (room[name].is_connected) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Team is already connected'
        }));
        ws.close();
        return;
      } else {
        wsPool.append({ key: name, socket: ws });
        room[name].is_connected = true;

        setTimeout(() => {
          ws.send(JSON.stringify({
            event: 'your_team',
            data: {
              name: room[name!].name,
              score: room[name].score,
              won_phase1: room.team_won_phase1 === name,
              used_magic_card: Boolean(room[name].used_magic_card_on),
              choosen_club: room[name].choosen_club,
            }
          }));
        }, 100);
        room[name].finished_events.forEach((event, idx) => {
          setTimeout(() => {
            ws.send(JSON.stringify(event));
          }, (idx * 120) + 100);
        });
      }
    } else {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid Infos'
      }));
      return ws.close();
    }

    if (!room.is_started && wsPool.includes(['admin']) && room.team1.is_connected && room.team2.is_connected) {
      const message = {
        event: 'can_start',
        data: null
      };
      wsPool.send({ to: ['admin'], message });
      recordEvent(room, message, ['admin']);
    }

    ws.on('message', (event: string) => {
      const parsed: StartExperienceMessage = JSON.parse(event)
      if (parsed.event === 'start_experience' && isAdmin) {
        const message = {
          event: 'experience_started',
          data: null
        };
        wsPool.send({ to: ['admin', 'team1', 'team2'], message });
        recordEvent(room, message, ['admin', 'team1', 'team2']);
      }

      if (parsed.event === 'unhold_play_draw' && isAdmin) {
        const message = {
          event: 'unhold_draw',
          data: null
        };
        wsPool.send({ to: ['team1', 'team2'], message });
        recordEvent(room, message, ['team1', 'team2']);
      }

      if (parsed.event === 'terminate_game' && isAdmin) {
        const message = {
          event: 'game_terminated',
          data: null
        };
        wsPool.send({ to: ['admin', 'team1', 'team2'], message });
        recordEvent(room, message, ['admin', 'team1', 'team2']);
        wsPool.clear();
        const newRoom = JSON.parse(JSON.stringify(baseRoom))
        Object.assign(room, newRoom)
      }
    })

    ws.on('close', () => {
      if (!name) return
      room[name].is_connected = false;
      wsPool.remove(name);
    });
  })
}