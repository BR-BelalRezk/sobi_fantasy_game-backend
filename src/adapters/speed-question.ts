import { WebSocketServer } from "ws";
import { WebSocketPool } from "../core/lib/helpers/web-socket-pool";
import { getParams } from "../core/lib/utils";
import { apps } from "../core/lib/assets";

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
        const questions = apps[appName].questions
        room.is_started = true;

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
      }

      if ((parsed.event === 'answer_speed_question' && !isAdmin) && room.team_won_phase1 === null) {
        const questions = apps[appName].questions
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

        if (room.team_won_phase1) {
          wsPool.send({
            to: ['admin', 'team1', 'team2'],
            message: {
              event: 'speed_question_winner',
              data: {
                team: room.team_won_phase1,
                team_name: room[room.team_won_phase1].name
              }
            }
          })
        }

        if (room.team1.answered_speed_question && room.team2.answered_speed_question && room.team_won_phase1 === null) {
          const winnerTeam = ['team1', 'team2'].at(Math.floor(Math.random() * 2)) as RoomTeamName
          wsPool.send({
            to: ['admin', 'team1', 'team2'],
            message: {
              event: 'speed_question_winner',
              data: {
                team: winnerTeam,
                team_name: "Tie"
              }
            }
          })
        }

      }
    });
  })
}