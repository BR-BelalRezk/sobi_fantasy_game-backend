import { WebSocketServer } from "ws";
import { WebSocketPool } from "../core/lib/helpers/web-socket-pool";
import { recordEvent } from "../core/lib/helpers/record-event";
import { getParams, getRemainingTeamName, wait } from "../core/lib/utils";
import { apps } from "../core/lib/assets";
import { baseRoom } from "..";

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

        const message1 = {
          event: 'list_main_questions',
          data: {
            questions: apps[appName].questions.main_questions,
            hold: true
          }
        };
        wsPool.send({ to: [remainingTeamName], message: message1 });
        recordEvent(room, message1, [remainingTeamName]);

        const message2 = {
          event: 'list_main_questions',
          data: {
            questions: apps[appName].questions.main_questions,
            hold: false
          }
        };
        wsPool.send({ to: [room.team_won_phase1!], message: message2 });
        recordEvent(room, message2, [room.team_won_phase1!]);

        const message3 = {
          event: 'main_questions_started',
          data: null
        };
        wsPool.send({ to: ['admin'], message: message3 });
        recordEvent(room, message3, ['admin']);


        const holdMessage = {
          event: 'hold_choosing_main_question',
          data: null
        };
        wsPool.send({ to: [remainingTeamName], message: holdMessage });
        recordEvent(room, holdMessage, [remainingTeamName]);
      } else if (parsed.event === 'choose_main_question' && !isAdmin) {
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


        // Send hold event to the other team
        const holdMessage = {
          event: 'hold_choosing_main_question',
          data: null
        };
        wsPool.send({ to: [remainingTeamName], message: holdMessage });
        recordEvent(room, holdMessage, [remainingTeamName]);


        if (parsed.data.use_magic_card) {
          if (room[teamName].used_magic_card_on) {
            return ws.send(JSON.stringify({
              event: 'error',
              data: {
                message: 'You have already used a magic card'
              }
            }))
          } else {
            room[teamName].used_magic_card_on = question.id;
            const message = {
              event: 'magic_card_question',
              data: {
                question: apps[appName].questions.magic_questions[teamName],
              }
            };
            wsPool.send({ to: [teamName], message });
            recordEvent(room, message, [teamName]);
          }
        } else {
          const msg = {
            event: 'choosen_main_question',
            data: {
              question_id: question.id,
            }
          }
          ws.send(JSON.stringify(msg))
          recordEvent(room, msg, [teamName]);
        }
        const message = {
          event: 'choosen_main_question',
          data: {
            question: parsed.data.use_magic_card ? apps[appName].questions.magic_questions[teamName] : question,
            club: room[teamName].choosen_club,
            team_name: room[teamName].name,
            score: room[teamName].score,
            used_magic_card: parsed.data.use_magic_card,
          }
        };
        wsPool.send({ to: ['admin'], message });
        recordEvent(room, message, ['admin']);

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

            const message1 = {
              event: 'main_question_answer_result',
              data: {
                score: room[currentTeam].score,
                is_correct: false,
                answer_id: null,
                question_id: question.id,
                question_points: question.points,
                used_magic_card: Boolean(room[currentTeam].used_magic_card_on === question.id),
                team_name: room[currentTeam].name,
                club: room[currentTeam].choosen_club,
              }
            };
            wsPool.send({ to: ['admin', currentTeam], message: message1 });
            recordEvent(room, message1, ['admin', currentTeam]);

            const message2 = {
              event: 'unhold_choosing_main_question',
              data: {
                choosen_questions_ids: room.choosen_main_questions_ids
              }
            };
            wsPool.send({ to: [remainingTeamName], message: message2 });
            recordEvent(room, message2, [remainingTeamName]);

            if (
              (room.team1.answered_main_questions_count === room.team2.answered_main_questions_count)
            ) {
              if ((room.team1.answered_main_questions_count === 8) && (room.team1.score === room.team2.score)) {
                const message = {
                  event: 'game_draw',
                };
                wsPool.send({ to: ['team1', 'team2', 'admin'], message });
                recordEvent(room, message, ['team1', 'team2', 'admin']);
                wsPool.clear();
                const newRoom = JSON.parse(JSON.stringify(baseRoom))
                Object.assign(room, newRoom)
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
                const message = {
                  event: 'winner',
                  data
                };
                wsPool.send({ to: ['team1', 'team2', 'admin'], message });
                recordEvent(room, message, ['team1', 'team2', 'admin']);
                wsPool.clear();
                const newRoom = JSON.parse(JSON.stringify(baseRoom))
                Object.assign(room, newRoom)
              }

              if (room.team1.answered_main_questions_count === 5 && (room.team1.score === room.team2.score)) {
                const message = {
                  event: 'play_draw',
                };
                wsPool.send({ to: ['team1', 'team2', 'admin'], message });
                recordEvent(room, message, ['team1', 'team2', 'admin']);
                wsPool.clear()
              }
            }
          }

          room.current_main_question_timeout = null;
          room.current_answering_team = null;
        }, 60000); // 60 seconds
        room.choosen_main_questions_ids.push(parsed.data.question_id)
      } else if (parsed.event === 'answer_main_question' && !isAdmin) {
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
          Boolean(apps[appName].questions.magic_questions[teamName].answers.find(ans => ans.id === parsed.data.answer_id)?.is_correct) :
          Boolean(question.answers.find(a => a.id === parsed.data.answer_id)?.is_correct)

        if (is_correct) {
          room[teamName].score += question.points
        } else {
          room[teamName].score -= question.points
        }

        const message = {
          event: 'main_question_answer_result',
          data: {
            score: room[teamName].score,
            question_id: question.id,
            is_correct,
            answer_id: parsed.data.answer_id,
            question_points: question.points,
            used_magic_card: room[teamName].used_magic_card_on === question.id,
            team_name: room[teamName].name,
            club: room[teamName].choosen_club,
            question_img: question.img_url
          }
        };
        wsPool.send({ to: ['admin', teamName], message });
        recordEvent(room, message, ['admin', teamName]);

        wait(2000).then(() => {
          const message = {
            event: 'unhold_choosing_main_question',
            data: {
              choosen_questions_ids: room.choosen_main_questions_ids
            }
          };
          wsPool.send({ to: [remainingTeamName], message });
          recordEvent(room, message, [remainingTeamName]);


          const holdMessage = {
            event: 'hold_choosing_main_question',
            data: null
          };
          wsPool.send({ to: [teamName], message: holdMessage });
          recordEvent(room, holdMessage, [teamName]);
        })

        if (
          (room.team1.answered_main_questions_count === room.team2.answered_main_questions_count)
        ) {
          if ((room.team1.answered_main_questions_count === 8) && (room.team1.score === room.team2.score)) {
            const message = {
              event: 'game_draw',
            };
            wsPool.send({ to: ['team1', 'team2', 'admin'], message });
            recordEvent(room, message, ['team1', 'team2', 'admin']);
            wsPool.clear();
            const newRoom = JSON.parse(JSON.stringify(baseRoom))
            Object.assign(room, newRoom)
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
            const message = {
              event: 'winner',
              data
            };
            wsPool.send({ to: ['team1', 'team2', 'admin'], message });
            recordEvent(room, message, ['team1', 'team2', 'admin']);
            wsPool.clear();
            const newRoom = JSON.parse(JSON.stringify(baseRoom))
            Object.assign(room, newRoom)
          }

          if (room.team1.answered_main_questions_count === 5 && (room.team1.score === room.team2.score)) {
            const message = {
              event: 'play_draw',
            };
            wsPool.send({ to: ['team1', 'team2', 'admin'], message });
            recordEvent(room, message, ['team1', 'team2', 'admin']);
            wsPool.clear()
          }
        }
      }
    })
  })
}