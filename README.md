```
 _____                           _            
|_   _|                         (_)           
  | | __ _ _ __   __ _  ___ _ __ _ _ __   ___ 
  | |/ _` | '_ \ / _` |/ _ \ '__| | '_ \ / _ \
  | | (_| | | | | (_| |  __/ |  | | | | |  __/
  \_/\__,_|_| |_|\__, |\___|_|  |_|_| |_|\___|
                  __/ |                       
                 |___/                        
```

API and scraper for the Tangerine Bank, based off of the Python version by kevinjqiu https://github.com/kevinjqiu/tangerine/


Install
=======

    npm install tangerine-bank --save


Usage
=====

This module is still under development. Most methods from the Python version have been rewritten to JavaScript, but only login and list accounts has been tested.

Authentication
--------------

Currently only authentication method is by passing an object with the needed login values or a string to a JSON file which contains the files.

```JavaScript
const Tangerine = require('tangerine-bank');

Tangerine.login('login.json').then(result => {
	console.log(result);
});
```

List Accounts
-------------

```JavaScript
const Tangerine = require('tangerine-bank');

Tangerine.login('login.json').then(result => {
	Tangerine.list_accounts().then(result => {
		console.log(result);
	});
});
```


Contribution
============

There is still a lot to do to make this module ship shape. Please feel free to send a pull request.


Licence
=======

MIT