import { LoginConfig, TangerineCommand } from './types';
import request from 'request-promise';
import queryString from 'query-string';
import { SecretProvider } from './SecretProvider';

export class TangerineLoginFlow {
  secret_provider: SecretProvider;
  session: string;
  locale: string;
  constructor(
    secret_provider: SecretProvider,
    session: string,
    locale: string = 'en_CA'
  ) {
    this.secret_provider = secret_provider;
    this.session = session;
    this.locale = locale;
  }

  private init_tangerine_url(kvs) {
    return (
      'https://secure.tangerine.ca/web/InitialTangerine.html?' +
      queryString.stringify(kvs)
    );
  }

  private tangerine_url(kvs?, debug = false) {
    if (debug) {
      return 'http://localhost/test.php?' + queryString.stringify(kvs);
    }

    if (kvs) {
      return (
        'https://secure.tangerine.ca/web/Tangerine.html?' +
        queryString.stringify(kvs)
      );
    } else {
      return 'https://secure.tangerine.ca/web/Tangerine.html';
    }
  }

  private get_init_tangerine(command: TangerineCommand) {
    return request.get(
      this.init_tangerine_url({
        command: command,
        device: 'web',
        locale: this.locale,
      }),
      {
        jar: this.session,
        headers: { 'x-web-flavour': 'fbe' },
      }
    );
  }

  private async post_tangerine(data) {
    data.locale = this.locale;
    data.device = 'web';

    const response = await request.post(this.tangerine_url(), {
      jar: this.session,
      headers: {
        'x-web-flavour': 'fbe',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Accept: 'application/json',
      },
      form: data,
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('post_tangerine', { data, response });
    }

    return response;
  }

  private get_tangerine(kv, headers = {}) {
    headers = Object.assign(
      {
        'x-web-flavour': 'fbe',
        Accept: 'application/json',
      },
      headers
    );

    return request
      .get(this.tangerine_url(kv), {
        jar: this.session,
        headers: headers,
      })
      .then((response) => {
        if (response.indexOf('location.replace') === -1) {
          return JSON.parse(response);
        } else {
          return response;
        }
      });
  }

  private get_pin_phrase() {
    return this.get_tangerine({ command: 'displayPIN' }).then((response) => {
      if (response.MessageBody && response.MessageBody.Phrase) {
        return response.MessageBody.Phrase;
      } else {
        return false;
      }
    });
  }

  private get_security_challenge() {
    return this.get_tangerine({ command: 'displayChallengeQuestion' }).then(
      (response) => {
        if (response.MessageBody && response.MessageBody.Question) {
          return response.MessageBody.Question;
        } else {
          return false;
        }
      }
    );
  }

  public end() {
    console.info('Logging out...');
    return this.get_init_tangerine(TangerineCommand.DisplayLogout);
  }

  public async start(login: LoginConfig) {
    try {
      await this.get_init_tangerine(TangerineCommand.DisplayLogout);
      await this.get_init_tangerine(TangerineCommand.DisplayLoginRegular);
      await this.post_tangerine({
        command: 'PersonalCIF',
        ACN: this.secret_provider.get_username(),
      });
      const question = await this.get_security_challenge();
      if (question) {
        let answer = this.secret_provider.get_security_challenge_answer(
          question
        );
        await this.post_tangerine({
          command: 'verifyChallengeQuestion',
          BUTTON: 'Next',
          Answer: answer,
          Next: 'Next',
        });
      }
      const phrase = await this.get_pin_phrase();
      if (phrase) {
        await this.post_tangerine({
          locale: this.locale,
          command: 'validatePINCommand',
          BUTTON: 'Go',
          PIN: this.secret_provider.get_password(phrase),
          Go: 'Next',
          callSource: '4',
        });
      }
      await this.get_tangerine({ command: 'PINPADPersonal' });
      return await this.get_tangerine({
        command: 'displayAccountSummary',
        fill: 1,
      });
    } catch (err) {
      console.error(err);
    }
  }
}
