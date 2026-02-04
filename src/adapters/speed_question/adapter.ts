import { WebSocketServer } from "ws";
import { WebSocketPool } from "../../core/utils/helpers/web-socket-pool";

type StartMessage = {
  event: 'start_speed_question',
  data: null
}

export function SpeedQuestionsAdapter(wss: WebSocketServer, wsPool: WebSocketPool, room: Room) {
  wss.addListener('connection', (ws, request) => {
    const appName = request.headers['app_name'] as AppName;

    ws.on('message', async (data: string) => {
      const parsed: StartMessage = JSON.parse(data.toString());

      if (parsed.event === 'start_speed_question') {
        import(`../../core/data/${appName}.json`).then(({ clubs, questions }: App) => {
          room.is_started = true;
          wsPool.send({
            to: ['admin', 'team1', 'team2'],
            message: {
              event: 'view_speed_question',
              data: questions.speed_question
            }
          })
        })
      }
    });
  })
}