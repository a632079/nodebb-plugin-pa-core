"use strict";

const
	loggedIn = module.parent.require('connect-ensure-login'),

	db = module.parent.require('./database'),
	nconf = module.parent.require('nconf'),
	async = module.parent.require('async'),
	user = module.parent.require('./user'),
	notifications = module.parent.require('./notifications'),
	meta = module.parent.require('./meta'),
	utils = module.parent.require('../public/src/utils'),
	translator = module.parent.require('../public/src/modules/translator'),
	routeHelpers = module.parent.require('./controllers/helpers'),
	mysql = require("mysql");
let pool = false,
	code,
	plugin = {};
const handleErr = (err) => {
	if (err) {
		if (err.code === 'PROTOCOL_CONNECTION_LOST') {
			mysql_connect(settings);
		} else if (err.code = 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR') {
			pool.destroy();
			mysql_connect(settings);
		} else {
			console.error(err.stack || err);
		}
	}
};
const mysql_connect = (settings) => {
	if (settings.host && settings.username && settings.dbname) {
		pool = mysql.createPool({
			host: settings.host,
			user: settings.username,
			password: settings.password,
			port: settings.port,
			database: settings.dbname
		});
		pool.getConnection(function (e) {
			if (e) {
				pool = false;
				return;
			}
			console.log('[PA Core] MySQL Connection Pool is started!');
		});
		pool.on('error', handleErr);
	}
};
const core = {
	add: (uid, key, callback) => {
		if (pool) {
			console.log("INSERT INTO `qqbind_key` VALUES(NULL,'" + uid + "','" + key + "',NULL," + Date.now().toString().slice(0, 10) + ")");
			pool.query("INSERT INTO `qqbind_key` VALUES(NULL,'" + uid + "','" + key + "',NULL," + Date.now().toString().slice(0, 10) + ")", (err, res) => { callback(err, res); });
		} else {
			callback('db is not set');
		}

	},
	get: {
		bind: (uid, callback) => {
			if (pool) {
				console.log("SELECT * FROM `qqbind` WHERE `uid` = " + uid + ";");
				pool.query("SELECT * FROM `qqbind` WHERE `uid` = " + uid + ";", (err, res) => { callback(err, res) });
			} else {
				callback('db is not set');
			}

		},
		key: (uid, callback) => {
			if (pool) {
				pool.query("SELECT * FROM `qqbind_key` WHERE `uid` = " + uid + ";", (err, res) => { callback(err, res); });
			} else {
				callback('db is not set');
			}

		}
	},
	update: {
		key: (uid, key, callback) => {
			if (pool) {
				pool.query("UPDATE `community`.`qqbind_key` SET `key` = " + key + " WHERE `uid` = " + uid + ";", (err, res) => { callback(err, res) });
			} else {
				callback("db is not set.");
			}
		}
	}

};
let settings = {
	host: (meta.config['qqbind:host']) ? meta.config['qqbind:host'] : false,
	port: (meta.config['qqbind:port']) ? meta.config['qqbind:port'] : 3306,
	username: (meta.config['qqbind:username']) ? meta.config['qqbind:username'] : false,
	password: (meta.config['qqbind:password']) ? meta.config['qqbind:password'] : '',
	dbname: (meta.config['qqbind:dbname']) ? meta.config['qqbind:dbname'] : false
};
mysql_connect(settings);

plugin.init = (params, callback) => {
	const router = params.router,
		hostMiddleware = params.middleware,
		hostControllers = params.controllers,
		hostHelpers = require.main.require('./src/routes/helpers');
	//controllers = require('./lib/controllers');

	// ACP
	router.get('/admin/plugins/qqbind', hostMiddleware.admin.buildHeader, (req, res, next) => {
		res.render('admin/plugins/qqbind');
	});
	router.get('/api/admin/plugins/qqbind', (req, res, next) => {
		res.render('admin/plugins/qqbind');
	});

	// UCP
	hostHelpers.setupPageRoute(router, '/user/:userslug/bind-qq', hostMiddleware, [hostMiddleware.requireUser, hostMiddleware.exposeUid], (req, res, next) => {
		//Check Login
		if (!req.user.uid) {
			next();
		}
		console.log(req.session);
		if (req.session.hasOwnProperty('qq') && req.session.qq.hasOwnProperty('number') && req.session.qq.hasOwnProperty('time')) {
			//user is binded
			let bind_time = new Date(parseInt(req.session.qq.time + "000"));
			res.render("binded", { qq: req.session.qq.number, time: bind_time.getFullYear() + "年" + (bind_time.getMonth() + 1) + "月" + bind_time.getDate() + "日 " + bind_time.getHours() + ":" + bind_time.getMinutes() });
		} else {
			//check bind status
			plugin.hasQQ(req.user.uid, (err, data) => {
				if (err) {
					//err is exist
					console.error(`[PA Core] uid: ${req.user.uid} : There was an error while checking the QQ bind status. (MongoDB)`);
					console.error(`[PA Core] Err Body:`);
					console.error(err);
					res.render('error', { error: `uid: ${req.user.uid} : There was an error adding the key. (MongoDB)`, info: JSON.stringify(err) });
					return;

				}
				console.log(data);
				if (!data) {
					//no binded
					//Check Status
					if (!req.session.qbkey) {
						plugin.hasKey(req.user.id, (err, d) => {
							if (d) {
								//Set Session
								req.session.qbkey = d.key;
								//Render Page;
								res.render('qqbind', {
									key: d.key
								});
							} else {
								let code = utils.generateUUID().replace(/-/g, '').slice(0, 20);
								//Save mysql
								core.add(req.user.uid, code, (err, data) => {
									if (err) {
										console.error(`[PA Core] uid: ${req.user.uid} : There was an error adding the key. (MYSQL)`);
										console.error(`[PA Core] Err Body:`);
										console.error(err);
										res.render('error', { error: `uid: ${req.user.uid} : There was an error adding the key. (MYSQL)`, info: JSON.stringify(err) });
										return;
									}
									//Save MongoDB
									plugin.saveKey(req.user.uid, code, (err, result) => {
										if (err) {
											console.error(`[PA Core] uid: ${req.user.uid} : There was an error adding the key. (MongoDB)`);
											console.error(`[PA Core] Err Body:`);
											console.error(err);
											res.render('error', { error: `uid: ${req.user.uid} : There was an error adding the key. (Mongo)`, info: JSON.stringify(err) });
											return;
										}
										req.session.qbkey = code;
										res.render('qqbind', {
											key: code
										});
									});
								});
							}
						});
					} else {
						res.render("qqbind", {
							key: req.session.qbkey
						});
					}
				} else {
					//qq is binded
					plugin.get(req.user.uid, (e, d) => {
						if (e) {
							console.log(e);
							res.render("error", { error: e })
						}
						//Save Session
						req.session.qq = {};
						req.session.qq.number = d.qq;
						req.session.qq.time = d.times;
						let bind_time = new Date(parseInt(d.times + "000"));
						res.render("binded", { qq: d.qq, time: bind_time.getFullYear() + "年" + (bind_time.getMonth() + 1) + "月" + bind_time.getDate() + "日 " + bind_time.getHours() + ":" + bind_time.getMinutes() });
					});
				}
			});
		}
	});
	//Check Router
	router.post('/qqbind/check', loggedIn.ensureLoggedIn(), (req, res, next) => {
		//Check QQ bind status
		//Check Session
		if (req.session.hasOwnProperty('qq') && req.session.qq.hasOwnProperty('number') && req.session.qq.hasOwnProperty('time')) {
			res.status(200).json({ status: "403", error: "You have binded.Please not try again.", data: "" });
		} else {
			//Check Mongo
			plugin.get(req.user.uid, (err, d) => {
				if (err) {
					//err
					console.error(`[PA Core] uid: ${req.user.uid} : There was an error While Checking Bind Satus. (Mongo)`);
					console.error(`[PA Core] Err Body:`);
					console.error(err);
					res.render('error', { error: `uid: ${req.user.uid} : There was an error While Checking Bind Satus. (Mongo)`, info: (JSON.stringify(err)) });
					return;
				}
				if (d && d.qq && d.times) {
					res.status(200).json({ status: "403", error: "You have binded.Please not try again.", data: "" });
				} else {
					//Check MySQL
					core.get.bind(req.user.uid, (err, data) => {
						if (err) {
							//err
							console.error(`[PA Core] uid: ${req.user.uid} : There was an error While Checking Bind Satus. (MySQL)`);
							console.error(`[PA Core] Err Body:`);
							console.error(err);
							res.render('error', { error: `uid: ${req.user.uid} : There was an error adding the key. (MySQL)`, info: err });
							return;
						}
						if (data.length == 1) { //Just Bind One QQ number
							//Binded
							//Save  Mongo 
							let t = Date.now().toString().slice(0, 10);
							plugin.save(req.user.uid, { qq: data[0].qq, times: t }, (err, result) => {
								if (err) {
									//err
									console.error(`[PA Core] uid: ${req.user.uid} : There was an error While Checking Bind Satus $1. (Mongo)`);
									console.error(`[PA Core] Err Body:`);
									console.error(err);
									res.status(500).render('error', { error: `uid: ${req.user.uid} : There was an error While Checking Bind Satus. (Mongo)`, info: err });
									return;
								}
								//Save Session
								req.session.qq = {};
								req.session.qq.number = data[0].qq;
								req.session.qq.time = t;
								//Return
								res.status(200).json({ status: "200", data: "BIND OK." });
							});

						} else {
							//no data
							//err
							res.status(403).json({ status: "403", error: 'no binded.', data: "" })
						}
					});
				}
			});
		}
	});
	// Router
	router.post('/qq-bind/regenerate', loggedIn.ensureLoggedIn(), (req, res, next) => {
		if (req.session.qkt && (parseInt(Date.now().toString().slice(0, 10)) - req.session.qkt) < 60 * 60 * 24) {
			//limit regenerate time
			res.status(403).json({ status: "403", error: 'no key is exist.', data: "" });
			return;
		}
		//Check Status
		if (!req.session.qbkey) {
			plugin.hasKey(req.user.uid, (err, data) => {
				if (err) {
					//err
					console.error(`[PA Core] uid: ${req.user.uid} : There was an error While Checking Bind Satus $1. (Mongo)`);
					console.error(`[PA Core] Err Body:`);
					console.error(err);
					res.status(500).render('error', { error: `uid: ${req.user.uid} : There was an error While Checking Bind Satus. (Mongo)`, info: err });
					return;
				}
				if (data) {
					//Regenerate Key
					let code = utils.generateUUID().replace(/-/g, '').slice(0, 20);
					plugin.saveKey(req.user.uid, code, (e, d) => {
						if (e) {
							console.error(`[PA Core] uid: ${req.user.uid} : There was an error While Checking Bind Satus $1. (Mongo)`);
							console.error(`[PA Core] Err Body:`);
							console.error(e);
							res.status(500).json({ status: 500, error: `uid: ${req.user.uid} : There was an error While Checking Bind Satus. (Mongo)`, info: e });
						}
						core.update.key(req.user.uid, code, (err, ret) => {
							if (error) {
								console.error(`[PA Core] uid: ${req.user.uid} : There was an error While Checking Bind Satus $1. (Mongo)`);
								console.error(`[PA Core] Err Body:`);
								console.error(error);
								res.status(500).json({ status: 500, error: `uid: ${req.user.uid} : There was an error While Checking Bind Satus. (Mongo)`, info: err });
							}
							req.session.qbkey = code;
							req.session.qkt = parseInt(Date.now().toString().slice(0, 10));
							res.status(200).json({ status: 200, data: "regenerate ok.." });

						});
					});
				} else {
					res.status(403).json({ status: "403", error: 'no key is exist.', data: "" });
				}

			});
		} else {
			let code = utils.generateUUID().replace(/-/g, '').slice(0, 20);
			plugin.saveKey(req.user.uid, code, (e, d) => {
				if (e) {
					console.error(`[PA Core] uid: ${req.user.uid} : There was an error While Checking Bind Satus $1. (Mongo)`);
					console.error(`[PA Core] Err Body:`);
					console.error(e);
					res.status(500).json({ status: 500, error: `uid: ${req.user.uid} : There was an error While Checking Bind Satus. (Mongo)`, info: e });
				}
				core.update.key(req.user.uid, code, (err, ret) => {
					if (error) {
						console.error(`[PA Core] uid: ${req.user.uid} : There was an error While Checking Bind Satus $1. (Mongo)`);
						console.error(`[PA Core] Err Body:`);
						console.error(error);
						res.status(500).json({ status: 500, error: `uid: ${req.user.uid} : There was an error While Checking Bind Satus. (Mongo)`, info: err });
					}
					req.session.qbkey = code;
					req.session.qkt = parseInt(Date.now().toString().slice(0, 10));
					res.status(200).json({ status: 200, data: "regenerate ok.." });

				});
			});
		}
	});
	//router.get('/login/2fa', hostMiddleware.buildHeader, loggedIn.ensureLoggedIn(), controllers.renderLogin);
	//router.get('/api/login/2fa', loggedIn.ensureLoggedIn(), controllers.renderLogin);
	//router.post('/login/2fa', loggedIn.ensureLoggedIn(), controllers.processLogin, function (req, res) {
	//	req.session.tfa = true;
	//	res.redirect(nconf.get('relative_path') + (req.query.next || '/'));
	//});

	callback();
};

plugin.addAdminNavigation = (header, callback) => {

	header.plugins.push({
		route: '/plugins/qqbind',
		icon: 'fa-qq',
		name: "PA Core"
	});

	callback(null, header);

};

plugin.addProfileItem = (data, callback) => {
	data.links.push({
		id: 'qqbind',
		route: 'bind-qq',
		icon: 'fa-qq',
		name: "QQ绑定",
		visibility: {
			self: true,
			other: false,
			moderator: false,
			globalMod: false,
			admin: false,
		}
	});
	callback(null, data);
};

plugin.get = (uid, callback) => {
	//Mongo query
	db.getObjectField('qqbind:uid:qq', uid, callback);
};

plugin.save = (uid, qq, callback) => {
	db.setObjectField('qqbind:uid:qq', uid, qq, callback);
};
plugin.saveKey = (uid, qbkey, callback) => {
	db.setObjectField('qqbind:uid:qbkey', uid, qbkey, callback);
};
plugin.hasQQ = (uid, callback) => {
	db.isObjectField('qqbind:uid:qq', uid, callback);
};
plugin.hasKey = (uid, callback) => {
	db.isObjectField('qqbind:uid:qbkey', uid, callback);
};

plugin.checkBind = (uid, key, callback) => {
	//Check Bind Status via mysql

};
plugin.disassociate = (uid, callback) => {
	async.parallel([
		async.apply(db.deleteObjectField, 'qqbind:uid:qq', uid),
	], callback);
};
plugin.setHeaderItem = (data, callback) => {
	let req = data.req, res = data.req, templateData = data.templateData;
	//console.log(req.user);
	//console.log("--------------------------");
	//console.log("--------------------------");
	//console.log(res);
	//c/onsole.log("--------------------------");
	//console.log("--------------------------");
	//console.log(templateData);
	if (templateData.url.match(/user\/.+\/bind-qq/)) {
		templateData.title = "绑定QQ";
	}
	data.req = req;
	data.res = res;
	data.templateData = templateData;
	callback(null, data);
}
module.exports = plugin;
