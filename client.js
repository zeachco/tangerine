var strftime = require('strftime');
var fs = require('fs');
const request = require('request-promise');
const SecretProvider = require('./secret_provider.js');

class TangerineClient {

	constructor(secret_provider, session = false, locale = 'en_CA') {
		const TangerineLoginFlow = require('./login.js');

		if (!session) {
			session = request.jar();
		}

		this.secret_provider = new SecretProvider();
		this.session = session;
		this.locale = locale;

		this.login_flow = new TangerineLoginFlow(this.secret_provider, this.session, this.locale);
	}

	_api_get(path, headers = {}) {
		let url = 'https://secure.tangerine.ca/web/rest' + path;

		return request.get(url, {
			jar: this.session,
			headers: headers
		}).then(response => {
			return response;
		});
	}

	login(login) {
		if (typeof login === 'string') {
			login = JSON.parse(fs.readFileSync(login));
		}

		this.secret_provider.set_login(login);

		return this.login_flow.start(login).then(response => {
			return response;
		});
	}

	me() {
		return this._api_get('/v1/customers/my');
	}

	//@api_response('accounts')
	list_accounts() {
		return this._api_get('/pfm/v1/accounts');
	}

	//@api_response('account_summary')
	get_account(account_id) {
		return this._api_get('/v1/accounts/' + account_id + '?billing-cycle-ranges=true');
	}

	//@api_response('transactions')
	list_transactions(account_ids, period_from, period_to) {
		let params = {
			'accountIdentifiers': ','.join(account_ids),
			'hideAuthorizedStatus': True,
			'periodFrom': period_from.strftime('%Y-%m-%dT00:00:00.000Z'),
			'periodTo': period_to.strftime('%Y-%m-%dT00:00:00.000Z'),
			'skip': 0,
		};

		return this._api_get('/pfm/v1/transactions?' + urlencode(params));
	}

	//@api_response('pending_transactions')
	list_pending_transactions() {
		let params = {
			'include-mf-transactions': 'true',
		}

		return this._api_get('/v1/customers/my/pending-transactions?' + urlencode(params));
	}

	//@api_response('token', check_response_status=False)
	_get_transaction_download_token() {
		return this._api_get('/v1/customers/my/security/transaction-download-token');
	}

	/**
	Download OFX file.
	:param account: The id of the account
	:param start_date: The start date of the statement period
	:param end_date: The end date of the statement period
	:param save: Save to a file. If False, the content of the OFX will be returned
	:return: The filename of the OFX file if save is True, otherwise the content of the OFX file
	*/
	download_ofx(account, start_date, end_date, save = True) {
		let account_type, account_display_name, account_nickname;

		if (account['type'] == 'CHEQUING') {
			account_type = 'SAVINGS'
			account_display_name = account['display_name']
			account_nickname = account['nickname']
		} else if (account['type'] == 'SAVINGS') {
			account_type = 'SAVINGS'
			account_display_name = account['display_name']
			account_nickname = account['nickname']
		} else if (account['type'] == 'CREDIT_CARD') {
			account_type = 'CREDITLINE'
			account_details = this.get_account(account['number'])
			account_display_name = account_details['display_name']
			account_nickname = account_details['account_nick_name']
		} else {
			return;
		}

		let token = this._get_transaction_download_token();
		let filename = account_nickname + '.QFX';
		let params = {
			'fileType': 'QFX',
			'ofxVersion': '102',
			'sessionId': 'tng',
			'orgName': 'Tangerine',
			'bankId': '0614',
			'language': 'eng',
			'acctType': account_type,
			'acctNum': account_display_name,
			'acctName': account_nickname,
			'userDefined': token,
			'startDate': start_date.strftime('%Y%m%d'),
			'endDate': end_date.strftime('%Y%m%d'),
			'orgId': 10951,
			'custom.tag': 'customValue',
			'csvheader': 'Date,Transaction,Name,Memo,Amount',
		}

		let url = 'https://ofx.tangerine.ca/' + filename + '?' + urlencode(params);

		return requst.get(url, {
			headers: { 'Referer': 'https://www.tangerine.ca/app/' }
		})
			.then(response => {
				if (save) {
					let local_filename = account_nickname + '_' + start_date.strftime('%Y%m%d') + end_date.strftime('%Y%m%d') + '.QFX';

					fs.writeFile(local_filename, response, function (err) {
						if (err) {
							return console.error(err);
						}

						console.log('The file was saved!');
					});

					logger.info('Saved: ', local_filename);
					return local_filename;
				} else {
					return response;
				}
			});
	}
}

module.exports = TangerineClient;