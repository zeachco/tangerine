export interface LoginConfig {
  username: string;
  pin: string;
  phrase: string;
  questions: {
    // The key is the question, the value is the answer
    [key: string]: string;
  };
}

export enum TangerineCommand {
  DisplayLogout = 'displayLogout',
  DisplayLoginRegular = 'displayLoginRegular',
  PersonalCIF = 'PersonalCIF',
}
