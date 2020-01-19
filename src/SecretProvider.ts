import { LoginConfig } from './types';

export class SecretProvider {
  login: LoginConfig;

  constructor() {
    this.login = {
      username: '',
      pin: '',
      phrase: '',
      questions: {},
    };
  }

  public set_login(login) {
    this.login = login;
  }

  public get_username() {
    return this.login.username;
  }

  public get_password(phrase) {
    if (phrase === this.login.phrase) {
      return this.login.pin;
    }
  }

  public get_security_challenge_answer(challenge: string): string {
    if (this.login.questions[challenge]) {
      return this.login.questions[challenge];
    }

    throw new Error(`could not find the security challenge for "${challenge}"`);
  }
}
