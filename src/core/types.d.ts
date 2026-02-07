declare type Room = {
  is_started: boolean;
  used_magic_card_questions_ids: string[];
  team_won_phase1: RoomTeamName | null,
  choosen_main_questions_ids: number[];
  first_choosen_club_id: number | null;
  team1: {
    name: string;
    choosen_club: Club | null;
    is_connected: boolean;
    answered_main_questions_count: number,
    score: number;
    used_magic_card: boolean;
    answered_speed_question: boolean
  };
  team2: {
    name: string;
    choosen_club: Club | null;
    is_connected: boolean;
    answered_main_questions_count: number,
    score: number;
    used_magic_card: boolean;
    answered_speed_question: boolean
  };
}

declare type RoomTeamName = 'team1' | 'team2'


declare type AppName = 'c3g' | 'dbd-dash' | 'doptlet' | 'gamifient' | 'vonjo'

declare type Club = {
  name: string;
  id: number;
  img_url: string;
}

declare type MagicQuestion = {
  question: string;
  answers: {
    answer: string;
    is_correct: boolean;
    id: number;
  }[];
}

declare type App = {
  questions: {
    speed_question: {
      question: string;
      answers: {
        answer: string;
        is_correct: boolean;
        id: number;
      }[];
    };
    magic_questions: {
      team1: MagicQuestion,
      team2: MagicQuestion
    };
    main_questions: {
      id: number;
      img_url: string;
      points: number;
      question: string;
      answers: {
        answer: string;
        is_correct: boolean;
        id: number;
      }[];
    }[];
  },

  clubs: Club[],


}