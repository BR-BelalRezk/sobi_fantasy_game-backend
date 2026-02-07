import { WebSocketServer } from "ws";
import { WebSocketPool } from "../core/lib/helpers/web-socket-pool";
import { getParams, getRemainingTeamName } from "../core/lib/utils";
import { apps } from "../core/lib/assets";

type Message = {
  event: 'start_main_questions',
  data: null
} | {
  event: 'choose_main_question',
  data: {
    question_id: number,
    use_magic_card: boolean
  }
} | {
  event: "answer_main_question",
  data: {
    question_id: number,
    answer_id: number,
    use_magic_card: boolean
  }
}

export function QuestionsAdapter(wss: WebSocketServer, wsPool: WebSocketPool, room: Room) {
  wss.addListener('connection', (ws, request) => {
    const isAdmin = (getParams(request.url!).role === 'admin')
    const teamName = getParams(request.url!).team_name as RoomTeamName;
    const appName = getParams(request.url!).app_name as AppName;

    ws.on('message', (data: string) => {
      const parsed: Message = JSON.parse(data)
      const remainingTeamName = getRemainingTeamName(room.team_won_phase1!)

      if (parsed.event === 'start_main_questions' && isAdmin) {
        wsPool.send({
          to: [remainingTeamName],
          message: {
            event: 'list_main_questions',
            data: {
              questions: apps[appName].questions.main_questions,
              hold: true
            }
          }
        })
        wsPool.send({
          to: [room.team_won_phase1!],
          message: {
            event: 'list_main_questions',
            data: {
              questions: apps[appName].questions.main_questions,
              hold: false
            }
          }
        })
      } else if (parsed.event === 'choose_main_question' && !isAdmin) {
        const question = apps[appName].questions.main_questions.find(q => q.id === parsed.data.question_id)

        if (!question) {
          return ws.send(JSON.stringify({
            event: 'error',
            data: {
              message: 'Question not found'
            }
          }))
        }
        if (parsed.data.use_magic_card) {
          if (room[teamName].used_magic_card) {
            return ws.send(JSON.stringify({
              event: 'error',
              data: {
                message: 'You have already used a magic card'
              }
            }))
          } else {
            room[teamName].used_magic_card = true;
            ws.send(JSON.stringify({
              event: 'magic_card_question',
              data: {
                question: apps[appName].questions.magic_questions[teamName],
              }
            }))
          }
        }
        room.choosen_main_questions_ids.push(parsed.data.question_id)
        wsPool.send({
          to: ['admin'],
          message: {
            event: 'view_choosen_main_question',
            data: {
              question,
              team: {
                club: room[teamName].choosen_club,
                name: room[teamName].name,
                score: room[teamName].score,
                is_magic_card_question: parsed.data.use_magic_card,
              },
            }
          }
        })
      } else if (parsed.event === 'answer_main_question' && !isAdmin) {
        const question = apps[appName].questions.main_questions.find(q => q.id === parsed.data.question_id)
        const remainingTeamName = getRemainingTeamName(teamName)

        if (!question) {
          return ws.send(JSON.stringify({
            event: 'error',
            data: {
              message: 'Question not found'
            }
          }))
        }

        const is_correct = parsed.data.question_id ?
          Boolean(apps[appName].questions.magic_questions[teamName].answers.find(ans => ans.id === parsed.data.answer_id)) :
          Boolean(question.answers.find(a => a.id === parsed.data.answer_id)?.is_correct)

        if (is_correct) {
          room[teamName].score += question.points
        } else {
          room[teamName].score -= question.points
        }

        wsPool.send({
          to: ['admin'],
          message: {
            event: 'main_question_answer_result',
            data: {
              score: room[teamName].score,
              is_correct,
              question_points: question.points,
              used_magic_card: room[teamName].used_magic_card,
              team_name: room[teamName].name,
              club: room[teamName].choosen_club,
            }
          }
        })

        wsPool.send({
          to: [remainingTeamName],
          message: {
            event: 'unhold_choosing_main_question',
            data: {
              choosen_questions_ids: room.choosen_main_questions_ids
            }
          }
        })
      }
    })
  })
}