declare type Room = {
  is_started: boolean;
  used_magic_card_questions_ids: string[];
  choosed_questions_ids: string[];
  team1: {
    name: string;
    choosen_club: string | null;
    is_connected: boolean;
    score: number;
    correct_speed_question_answer: boolean;
    used_magic_card: boolean;
  };
  team2: {
    name: string;
    choosen_club: string | null;
    is_connected: boolean;
    score: number;
    correct_speed_question_answer: boolean;
    used_magic_card: boolean;
  };
}

declare type RoomTeamName = 'team1' | 'team2'


declare type AppName = 'c3g' | 'dbd-dash' | 'doptlet' | 'gamifient' | 'vonjo'


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
      id: number;
      question: string;
      answers: {
        answer: string;
        is_correct: boolean;
        id: number;
      }[];
    }[];
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

  clubs: {
    name: string;
    id: number;
    img_url: string;
  }[],


}