class SecretProvider {
	constructor() {
		this.login = {
			username: '',
			pin: '',
			phrase: '',
			questions: {}
		};
	}

	set_login(login) {
		this.login = login;
	}

	get_username() {
		return this.login.username;
	}

	get_password(phrase) {
		if (phrase === this.login.phrase) {
			return this.login.pin;
		}
	}

	get_security_challenge_answer(challenge) {
		if(this.login.questions[challenge]) {
			return this.login.questions[challenge];
		}
		
		return false;
	}
}

module.exports = SecretProvider;