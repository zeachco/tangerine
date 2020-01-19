import strftime from 'strftime';
import fs from 'fs';
import request from 'request-promise';
import { SecretProvider } from './SecretProvider';
import { TangerineLoginFlow } from './TangerineLoginFlow';
import { LoginConfig } from './types';
import { urlencode } from './utils';

export class TangerineClient {
  secret_provider: SecretProvider;
  session: string;
  locale: string;
  login_flow: TangerineLoginFlow;

  constructor(secret_provider = null, session = '', locale = 'en_CA') {
    if (!session) {
      session = request.jar();
    }

    this.secret_provider = new SecretProvider();
    this.session = session;
    this.locale = locale;

    this.login_flow = new TangerineLoginFlow(
      this.secret_provider,
      this.session,
      this.locale
    );
  }

  private apiGet(path, headers = {}) {
    let url = 'https://secure.tangerine.ca/web/rest' + path;

    return request
      .get(url, {
        jar: this.session,
        headers: headers,
      })
      .then((response) => {
        return response;
      });
  }

  public login(login: string | LoginConfig) {
    if (typeof login === 'string') {
      login = JSON.parse(fs.readFileSync(login, 'utf-8')) as LoginConfig;
    }

    this.secret_provider.set_login(login);

    return this.login_flow.start(login).then((response) => {
      return response;
    });
  }

  public me() {
    return this.apiGet('/v1/customers/my');
  }

  //@api_response('accounts')
  public list_accounts() {
    return this.apiGet('/pfm/v1/accounts');
  }

  //@api_response('account_summary')
  public get_account(account_id) {
    return this.apiGet(
      '/v1/accounts/' + account_id + '?billing-cycle-ranges=true'
    );
  }

  //@api_response('transactions')
  public list_transactions(account_ids, period_from, period_to) {
    let params = {
      accountIdentifiers: account_ids.join(','),
      hideAuthorizedStatus: true, // formely True
      periodFrom: period_from.strftime('%Y-%m-%dT00:00:00.000Z'),
      periodTo: period_to.strftime('%Y-%m-%dT00:00:00.000Z'),
      skip: 0,
    };

    return this.apiGet('/pfm/v1/transactions?' + urlencode(params));
  }

  //@api_response('pending_transactions')
  public list_pending_transactions() {
    let params = {
      'include-mf-transactions': 'true',
    };

    return this.apiGet(
      '/v1/customers/my/pending-transactions?' + urlencode(params)
    );
  }

  //@api_response('token', check_response_status=False)
  private getTransactionDownloadToken() {
    return this.apiGet('/v1/customers/my/security/transaction-download-token');
  }

  /**
	Download OFX file.
	:param account: The id of the account
	:param start_date: The start date of the statement period
	:param end_date: The end date of the statement period
	:param save: Save to a file. If False, the content of the OFX will be returned
	:return: The filename of the OFX file if save is True, otherwise the content of the OFX file
	*/
  public download_ofx(account, start_date, end_date, save = true) {
    let account_type, account_display_name, account_nickname;

    if (account['type'] == 'CHEQUING') {
      account_type = 'SAVINGS';
      account_display_name = account['display_name'];
      account_nickname = account['nickname'];
    } else if (account['type'] == 'SAVINGS') {
      account_type = 'SAVINGS';
      account_display_name = account['display_name'];
      account_nickname = account['nickname'];
    } else if (account['type'] == 'CREDIT_CARD') {
      account_type = 'CREDITLINE';
      const account_details = this.get_account(account['number']);
      account_display_name = account_details['display_name'];
      account_nickname = account_details['account_nick_name'];
    } else {
      return;
    }

    let token = this.getTransactionDownloadToken();
    let filename = account_nickname + '.QFX';
    let params = {
      fileType: 'QFX',
      ofxVersion: '102',
      sessionId: 'tng',
      orgName: 'Tangerine',
      bankId: '0614',
      language: 'eng',
      acctType: account_type,
      acctNum: account_display_name,
      acctName: account_nickname,
      userDefined: token,
      startDate: start_date.strftime('%Y%m%d'),
      endDate: end_date.strftime('%Y%m%d'),
      orgId: 10951,
      'custom.tag': 'customValue',
      csvheader: 'Date,Transaction,Name,Memo,Amount',
    };

    let url = 'https://ofx.tangerine.ca/' + filename + '?' + urlencode(params);

    return request
      .get(url, {
        headers: { Referer: 'https://www.tangerine.ca/app/' },
      })
      .then((response) => {
        if (save) {
          let local_filename =
            account_nickname +
            '_' +
            start_date.strftime('%Y%m%d') +
            end_date.strftime('%Y%m%d') +
            '.QFX';

          fs.writeFile(local_filename, response, function(err) {
            if (err) {
              return console.error(err);
            }

            console.log('The file was saved!');
          });

          console.info('Saved: ', local_filename);
          return local_filename;
        } else {
          return response;
        }
      });
  }
}
