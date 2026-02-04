import { WebSocketServer } from "ws";
import { WebSocketPool } from "../../core/utils/helpers/web-socket-pool";
import { validateTeamName } from "../../core/utils/utils";


export function AuthAdapter(wss: WebSocketServer, wsPool: WebSocketPool, room: Room) {
  wss.addListener('connection', (ws, request) => {
    const name = request.headers['team_name'] as RoomTeamName | undefined;
    const isAdmin = (request.headers['role'] === 'admin')
    const appName = request.headers['app_name'] as AppName | undefined;

    if (!appName || !name || (name && !validateTeamName(name))) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid Infos'
      }));
      ws.close();
      return;
    }

    if (room[name].is_connected) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Team is already connected'
      }));
      ws.close();
      return;
    }

    if (isAdmin) {
      wsPool.append({ key: 'admin', socket: ws })
    } else {
      wsPool.append({ key: name, socket: ws });
      room[name].is_connected = true;
      ws.send(JSON.stringify({
        event: 'you',
        data: {
          name: room[name].name,
          score: room[name].score,
          correct_speed_question_answer: room[name].correct_speed_question_answer,
          used_magic_card: room[name].used_magic_card,
          choosen_club: room[name].choosen_club,
        }
      }));
    }

    if (!room.is_started && wsPool.includes(['admin', 'team1', 'team2'])) {
      wsPool.send({
        to: ['admin'],
        message: {
          event: 'can_start',
          data: null
        }
      })
    }

    ws.on('close', () => {
      room[name].is_connected = false;
      wsPool.remove(name);
    });
  })
}