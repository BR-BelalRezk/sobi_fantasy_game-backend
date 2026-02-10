import { WebSocketServer } from "ws";
import { WebSocketPool } from "../core/lib/helpers/web-socket-pool";
import { getParams, getRemainingTeamName, wait } from "../core/lib/utils";
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
            wsPool.send({
              to: [teamName, 'admin'],
              message: {
                event: 'magic_card_question',
                data: {
                  question: apps[appName].questions.magic_questions[teamName],
                }
              }
            })
          }
        }
        wsPool.send({
          to: ['admin'],
          message: {
            event: 'choosen_main_question',
            data: {
              question,
              club: room[teamName].choosen_club,
              team_name: room[teamName].name,
              score: room[teamName].score,
            }
          }
        });

        if (room.current_main_question_timeout) {
          clearTimeout(room.current_main_question_timeout);
        }

        room.current_answering_team = teamName;

        room.current_main_question_timeout = setTimeout(() => {
          const currentTeam = room.current_answering_team;
          if (currentTeam && question) {
            const remainingTeamName = getRemainingTeamName(currentTeam);

            room[currentTeam].answered_main_questions_count += 1;

            room[currentTeam].score -= question.points;

            wsPool.send({
              to: ['admin'],
              message: {
                event: 'main_question_answer_result',
                data: {
                  score: room[currentTeam].score,
                  is_correct: false,
                  answer_id: null,
                  question_points: question.points,
                  used_magic_card: room[currentTeam].used_magic_card,
                  team_name: room[currentTeam].name,
                  club: room[currentTeam].choosen_club,
                }
              }
            });

            wsPool.send({
              to: [remainingTeamName],
              message: {
                event: 'unhold_choosing_main_question',
                data: {
                  choosen_questions_ids: room.choosen_main_questions_ids
                }
              }
            });


            if (
              (room.team1.answered_main_questions_count === room.team2.answered_main_questions_count)
            ) {
              if ((room.team1.answered_main_questions_count === 8) && (room.team1.score === room.team2.score)) {
                wsPool.send({
                  to: ['team1', 'team2', 'admin'],
                  message: {
                    event: 'game_draw',
                  }
                })
                wsPool.clear()
              }
              if (room.team1.answered_main_questions_count >= 5 && (Math.abs(room.team1.score - room.team2.score) > 0)) {
                let data = {
                  score: room.team1.score,
                  name: room.team1.name,
                  club: room.team1.choosen_club,
                }
                if (room.team2.score > room.team1.score) {
                  data = {
                    score: room.team2.score,
                    name: room.team2.name,
                    club: room.team2.choosen_club,
                  }
                }
                wsPool.send({
                  to: ['team1', 'team2', 'admin'],
                  message: {
                    event: 'winner',
                    data
                  }
                })
                wsPool.clear()
              }

              if (room.team1.answered_main_questions_count === 5 && (room.team1.score === room.team2.score)) {
                wsPool.send({
                  to: ['team1', 'team2', 'admin'],
                  message: {
                    event: 'play_draw',
                  }
                })
                wsPool.clear()
              }
            }
          }

          room.current_main_question_timeout = null;
          room.current_answering_team = null;
        }, 60000); // 60 seconds
        room.choosen_main_questions_ids.push(parsed.data.question_id)
      } else if (parsed.event === 'answer_main_question' && !isAdmin) {
        // Clear timeout when answer is received
        if (room.current_main_question_timeout) {
          clearTimeout(room.current_main_question_timeout);
          room.current_main_question_timeout = null;
        }
        room.current_answering_team = null;

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

        room[teamName].answered_main_questions_count += 1

        const is_correct = parsed.data.use_magic_card ?
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
              answer_id: parsed.data.answer_id,
              question_points: question.points,
              used_magic_card: room[teamName].used_magic_card,
              team_name: room[teamName].name,
              club: room[teamName].choosen_club,
            }
          }
        })

        wait(5000).then(() => {
          wsPool.send({
            to: [remainingTeamName],
            message: {
              event: 'unhold_choosing_main_question',
              data: {
                choosen_questions_ids: room.choosen_main_questions_ids
              }
            }
          })
        })

        if (
          (room.team1.answered_main_questions_count === room.team2.answered_main_questions_count)
        ) {
          if ((room.team1.answered_main_questions_count === 8) && (room.team1.score === room.team2.score)) {
            wsPool.send({
              to: ['team1', 'team2', 'admin'],
              message: {
                event: 'game_draw',
              }
            })
            wsPool.clear()
          }
          if (room.team1.answered_main_questions_count >= 5 && (Math.abs(room.team1.score - room.team2.score) > 0)) {
            let data = {
              score: room.team1.score,
              name: room.team1.name,
              club: room.team1.choosen_club,
            }
            if (room.team2.score > room.team1.score) {
              data = {
                score: room.team2.score,
                name: room.team2.name,
                club: room.team2.choosen_club,
              }
            }
            wsPool.send({
              to: ['team1', 'team2', 'admin'],
              message: {
                event: 'winner',
                data
              }
            })
            wsPool.clear()
          }

          if (room.team1.answered_main_questions_count === 5 && (room.team1.score === room.team2.score)) {
            wsPool.send({
              to: ['team1', 'team2', 'admin'],
              message: {
                event: 'play_draw',
              }
            })
            wsPool.clear()
          }
        }
      }
    })
  })
}