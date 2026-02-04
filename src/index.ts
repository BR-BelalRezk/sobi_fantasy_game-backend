import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { WebSocketPool } from './core/utils/helpers/web-socket-pool';
import { AuthAdapter } from './adapters/auth/adapter';
import { SpeedQuestionsAdapter } from './adapters/speed_question/adapter';

const PORT = 3000;

const wss = new WebSocketServer({ port: Number(PORT) });

const socketsPool = new WebSocketPool()

const room: Room = {
  is_started: false,
  choosed_questions_ids: [],
  used_magic_card_questions_ids: [],
  team1: {
    name: "Team (A)",
    choosen_club: null,
    is_connected: false,
    score: 0,
    correct_speed_question_answer: false,
    used_magic_card: false,
  },
  team2: {
    name: "Team (B)",
    choosen_club: null,
    is_connected: false,
    score: 0,
    correct_speed_question_answer: false,
    used_magic_card: false,
  },
}

AuthAdapter(wss, socketsPool, room)
SpeedQuestionsAdapter(wss, socketsPool, room)


