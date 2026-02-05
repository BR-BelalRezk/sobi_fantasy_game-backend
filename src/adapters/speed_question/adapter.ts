import { WebSocketServer } from "ws";
import { WebSocketPool } from "../../core/lib/helpers/web-socket-pool";
import { getParams } from "../../core/lib/utils";
import { readFileSync } from "fs";

type StartMessage = {
  event: 'start_speed_question',
  data: null
}

type AnswerMessage = {
  event: 'answer_speed_question',
  data: {
    answer_id: number
  }
}

export function SpeedQuestionsAdapter(wss: WebSocketServer, wsPool: WebSocketPool, room: Room) {
  wss.addListener('connection', (ws, request) => {
    const appName = getParams(request.url!).app_name as AppName;
    const teamName = getParams(request.url!).team_name as RoomTeamName;
    const isAdmin = (getParams(request.url!).role === 'admin')

    ws.on('message', (data: string) => {
      const parsed: StartMessage | AnswerMessage = JSON.parse(data.toString());

      if (parsed.event === 'start_speed_question' && isAdmin) {
        import(`../../core/data/${appName}.json`).then(({ questions }: App) => {
          room.is_started = true;
          room.events_queue.push('view_speed_question');
          wsPool.send({
            to: ['admin', 'team1', 'team2'],
            message: {
              event: 'view_speed_question',
              data: {
                question: questions.speed_question,
                date: Date.now()
              }
            }
          })
        })
      }

      if ((parsed.event === 'answer_speed_question') && room.team_won_phase1 === null) {
        const data = readFileSync(`../../core/data/${appName}.json`, 'utf-8');
        const { questions }: App = JSON.parse(data);

        const answers = questions.speed_question.answers
        const isCorrect = Boolean(answers.find(ans => ans.id === parsed.data.answer_id)?.is_correct)
        room[teamName].answered_speed_question = true;

        if (!isCorrect) {
          wsPool.send({
            to: [teamName],
            message: {
              event: 'speed_question_answer_status',
              data: { correct: false }
            }
          })
        } else {
          room.team_won_phase1 = teamName;
          wsPool.send({
            to: [teamName],
            message: {
              event: 'speed_question_answer_status',
              data: { correct: true }
            }
          })
        }

        let winnerTeam = room.team_won_phase1

        if (room.team1.answered_speed_question && room.team2.answered_speed_question) {
          if (winnerTeam === null) {
            winnerTeam = ['team1', 'team2'].at(Math.floor(Math.random() * 2)) as RoomTeamName
          } else {
            wsPool.send({
              to: ['admin', 'team1', 'team2'],
              message: {
                event: 'speed_question_winner',
                data: {
                  team: winnerTeam,
                  team_name: room[winnerTeam]
                }
              }
            })
          }
        }
      }

    });
  })
}