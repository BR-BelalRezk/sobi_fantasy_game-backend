import { WebSocketServer } from "ws";
import { getParams, validateTeamName } from "../../core/lib/utils";
import { WebSocketPool } from "../../core/lib/helpers/web-socket-pool";


export function AuthAdapter(wss: WebSocketServer, wsPool: WebSocketPool, room: Room) {
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
          event: 'you',
          data: {
            name: room[name!].name,
            score: room[name].score,
            correct_speed_question_answer: room[name].correct_speed_question_answer,
            used_magic_card: room[name].used_magic_card,
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

    ws.on('close', () => {
      if (!name) return
      room[name].is_connected = false;
      wsPool.remove(name);
    });
  })
}