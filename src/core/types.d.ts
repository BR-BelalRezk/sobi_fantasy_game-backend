declare type Room = {
  is_started: boolean;
  used_magic_card_questions_ids: string[];
  team_won_phase1: RoomTeamName | null,
  choosen_main_questions_ids: number[];
  first_choosen_club_id: number | null;
  speed_question_timeout: NodeJS.Timeout | null;
  current_main_question_timeout: NodeJS.Timeout | null;
  current_answering_team: RoomTeamName | null;
  admin_finished_events: {
    event: string,
    data: any
  }[]
  team1: {
    name: string;
    choosen_club: Club | null;
    is_connected: boolean;
    answered_main_questions_count: number,
    score: number;
    used_magic_card_on: number | null;
    answered_speed_question: boolean,
    finished_events: {
      event: string,
      data: any
    }[]
  };
  team2: {
    name: string;
    choosen_club: Club | null;
    is_connected: boolean;
    answered_main_questions_count: number,
    score: number;
    used_magic_card_on: number | null;
    answered_speed_question: boolean
    finished_events: {
      event: string,
      data: any
    }[]
  };
}

declare type RoomTeamName = 'team1' | 'team2'


declare type AppName = 'c3g' | 'dbd-dash' | 'doptlet' | 'gamifient' | 'vonjo'

declare type Club = {
  name: string;
  id: number;
  logo_img_url: string;
  name_img_url: string;
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
      audio_url: string;
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
      audio_url: string;
      answers: {
        answer: string;
        is_correct: boolean;
        id: number;
      }[];
    }[];
  },

  clubs: Club[],


}