import { WebSocketServer } from 'ws';
import { StartingAdapter } from './adapters/starting';
import { SpeedQuestionsAdapter } from './adapters/speed-question';
import { WebSocketPool } from './core/lib/helpers/web-socket-pool';
import { ClubsAdapter } from './adapters/clubs';
import { QuestionsAdapter } from './adapters/questions';

const PORT = 3000;

const wss = new WebSocketServer({ port: Number(PORT) });

const socketsPool = new WebSocketPool()

const room: Room = {
  is_started: false,
  // finished_stages: [],
  choosen_main_questions_ids: [],
  first_choosen_club_id: null,
  team_won_phase1: null,
  used_magic_card_questions_ids: [],
  team1: {
    name: "Team (A)",
    choosen_club: null,
    is_connected: false,
    score: 0,
    used_magic_card: false,
    answered_speed_question: false

  },
  team2: {
    name: "Team (B)",
    choosen_club: null,
    is_connected: false,
    score: 0,
    used_magic_card: false,
    answered_speed_question: false
  },
}

StartingAdapter(wss, socketsPool, room)
SpeedQuestionsAdapter(wss, socketsPool, room)
ClubsAdapter(wss, socketsPool, room)
QuestionsAdapter(wss, socketsPool, room)