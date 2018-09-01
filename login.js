const request = require('request-promise');
const queryString = require('query-string');

class TangerineLoginFlow {
	constructor(secret_provider, session, locale = 'en_CA') {
		this.secret_provider = secret_provider;
		this.session = session;
		this.locale = locale;
	}

	_init_tangerine_url(kvs) {
		return 'https://secure.tangerine.ca/web/InitialTangerine.html?' + queryString.stringify(kvs);
	}

	_tangerine_url(kvs, debug = false) {
		if (debug) {
			return 'http://localhost/test.php?' + queryString.stringify(kvs);
		}

		if (kvs) {
			return 'https://secure.tangerine.ca/web/Tangerine.html?' + queryString.stringify(kvs);
		} else {
			return 'https://secure.tangerine.ca/web/Tangerine.html';
		}
	}

	_get_init_tangerine(command) {
		return request.get(this._init_tangerine_url({ command: command, device: 'web', locale: this.locale }), {
			jar: this.session,
			headers: { 'x-web-flavour': 'fbe' }
		});
	}

	_post_tangerine(data) {
		data.locale = this.locale;
		data.device = 'web';

		return request.post(this._tangerine_url(), {
			jar: this.session,
			headers: {
				'x-web-flavour': 'fbe',
				'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
				'Accept': 'application/json'
			},
			form: data
		});
	}

	_get_tangerine(kv, headers = {}) {
		headers = Object.assign({
			'x-web-flavour': 'fbe',
			'Accept': 'application/json'
		}, headers);

		return request.get(this._tangerine_url(kv), {
			jar: this.session,
			headers: headers
		}).then(response => {
			if (response.indexOf('location.replace') === -1) {
				return JSON.parse(response);
			} else {
				return response;
			}
		});
	}

	_get_pin_phrase() {
		return this._get_tangerine({ command: 'displayPIN' }).then(response => {
			if (response.MessageBody && response.MessageBody.Phrase) {
				return response.MessageBody.Phrase;
			} else {
				return false;
			}
		});
	}

	_get_security_challenge() {
		return this._get_tangerine({ command: 'displayChallengeQuestion' }).then(response => {
			if (response.MessageBody && response.MessageBody.Question) {
				return response.MessageBody.Question;
			} else {
				return false;
			}
		});
	}

	end() {
		console.info('Logging out...');
		return this._get_init_tangerine('displayLogout');
	}

	start(login) {
		let that = this;
		return that._get_init_tangerine('displayLogout').then(response => {

		}).then(response => {
			return that._get_init_tangerine('displayLoginRegular').then(response => {

			});
		}).then(response => {
			return that._post_tangerine({
				'command': 'PersonalCIF',
				'ACN': that.secret_provider.get_username(),
			});
		}).then(response => {
			return that._get_security_challenge()
		}).then(question => {
			if (question) {
				let answer = that.secret_provider.get_security_challenge_answer(question);
				if (answer) {
					return that._post_tangerine({
						'command': 'verifyChallengeQuestion',
						'BUTTON': 'Next',
						'Answer': answer,
						'Next': 'Next',
					})
				}
			}
		}).then(response => {
			return that._get_pin_phrase()
		}).then(phrase => {
			if (phrase) {
				return that._post_tangerine({
					'locale': that.locale,
					'command': 'validatePINCommand',
					'BUTTON': 'Go',
					'PIN': that.secret_provider.get_password(phrase),
					'Go': 'Next',
					'callSource': '4',
				});
			}
		}).then(response => {
			return that._get_tangerine({ command: 'PINPADPersonal' })
		}).then(response => {
			return that._get_tangerine({ command: 'displayAccountSummary', fill: 1 })
		}).then(response => {
			return response;
		});
	}
}

module.exports = TangerineLoginFlow;