import { WebSocketServer } from "ws";
import { getParams } from "../core/lib/utils";
import { WebSocketPool } from "../core/lib/helpers/web-socket-pool";
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
      }
    } else {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid Infos'
      }));
      return ws.close();
    }

    if (!room.is_started && wsPool.includes(['admin']) && room.team1.is_connected && room.team2.is_connected) {
      wsPool.send({
        to: ['admin'],
        message: {
          event: 'can_start',
          data: null
        }
      })
    }

    ws.on('message', (event: string) => {
      const parsed: StartExperienceMessage = JSON.parse(event)
      if (parsed.event === 'start_experience' && isAdmin) {
        wsPool.send({
          to: ['admin', 'team1', 'team2'],
          message: {
            event: 'experience_started',
            data: null
          }
        })
      }

      if (parsed.event === 'unhold_play_draw' && isAdmin) {
        wsPool.send({
          to: ['team1', 'team2'],
          message: {
            event: 'unhold_draw',
            data: null
          }
        })
      }

      if (parsed.event === 'terminate_game' && isAdmin) {
        wsPool.send({
          to: ['admin', 'team1', 'team2'],
          message: {
            event: 'game_terminated',
            data: null
          }
        })
        wsPool.clear();
        room = baseRoom;
      }
    })

    ws.on('close', () => {
      if (!name) return
      room[name].is_connected = false;
      wsPool.remove(name);
    });
  })
}