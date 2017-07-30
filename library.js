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
	mysql = module.parent.require("mysqljs/mysql");
let conn = false;
plugin = {};
const handleErr = (err) => {
	if (err) {
		if (err.code === 'PROTOCOL_CONNECTION_LOST') {
			mysql_connect(settings);
		} else {
			console.error(err.stack || err);
		}
	}
}
const mysql_connect = (settings) => {
	if (settings.host && settings.username && settings.dbname) {
		conn = mysql.createConnection({
			host: settings.host,
			user: settings.username,
			password: settings.password,
			port: settings.port,
			database: settings.dbname
		});
		conn.connect(function (e) {
			if (e) {
				conn = false;
			}

			console.log('[PA Core] MySQL connected as id ' + connection.threadId);
		});
		conn.on('error', handleErr);
	}
};
const core = {
	add: (uid, key, callback) => {
		if (conn) {
			conn.query("INSERT INTO `qqbind_key` VALUES(NULL,'" + uid + "','" + key + "',NULL," + Date.now().toString().slice(0, 10) + ")", (err, res) => { callback(err, res); });
		} else {
			callback('db is not set');
		}

	},
	get: {
		bind: (uid, callback) => {
			if (conn) {
				conn.query("SELECT * FROM `qqbind` WHERE `uid` = " + uid + ";", (err, res) => { callback(err, res) });
			} else {
				callback('db is not set');
			}

		},
		key: (uid, callbacl) => {
			if (conn) {
				conn.query("SELECT * FROM `qqbind_key` WHERE `uid` = " + uid + ";", (err, res) => { callback(err, res); });
			} else {
				callback('db is not set');
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
	hostHelpers.setupPageRoute(router, '/user/:userslug/bind-qq', hostMiddleware, [hostMiddleware.buildHeader, hostMiddleware.requireUser, hostMiddleware.exposeUid], (req, res, next) => {
		//Check Login
		if (!req.user.uid) {
			next();
			return;
		}
		if (req.session.qq) {
			//user is binded
			res.render("binded", { qq: req.session.qq.number, time: req.session.qq.time });
		} else {
			//check bind status
			plugin.hasQQ(req.user.uid, (err, data) => {
				if (err) {
					//err is exist
					console.error(`[PA Core] uid: ${req.user.uid} : There was an error while checking the QQ bind status. (MongoDB)`);
					console.error(`[PA Core] Err Body:`);
					console.error(err);
					res.render('error', { error: [`uid: ${req.user.uid} : There was an error adding the key. (MongoDB)`, err] });
					next();
					return;

				}
				if (!data) {
					//no binded
					//Check Status
					if (!req.session.qq.code) {
						core.get.key(req.user.id, (err, d) => {
							if (d) {
								//Set Session
								req.session.code = d.key;
								//Render Page;
								res.render('qqbind', {
									key: d.key
								});
							} else {
								let code = utils.generateUUID().replace('-', '').slice(0, 20);
								//Save mysql
								core.add(req.user.uid, code, (err, data) => {
									if (err) {
										console.error(`[PA Core] uid: ${req.user.uid} : There was an error adding the key. (MYSQL)`);
										console.error(`[PA Core] Err Body:`);
										console.error(err);
										res.render('error', { error: [`uid: ${req.user.uid} : There was an error adding the key. (MYSQL)`, err] });
										next();
										return;
									}
									//Save MongoDB
									plugin.save(req.user.uid, code, (err, result) => {
										if (err) {
											console.error(`[PA Core] uid: ${req.user.uid} : There was an error adding the key. (MongoDB)`);
											console.error(`[PA Core] Err Body:`);
											console.error(err);
											res.render('error', { error: [`uid: ${req.user.uid} : There was an error adding the key. (Mongo)`, err] });
											next();
											return;
										}
										res.render('qqbind', {
											key: code
										});
									});
								});
							}
						});
					} else {
						res.render("qqbind", {
							key: req.session.code
						});
					}
				} else {
					//qq is binded
					res.render("binded", { qq: data.qq.number, time: data.qq.time });
				}
			});
		}
	});
	//Check Router
	router.post('/qqbind/check', loggedIn.ensureLoggedIn(), (req, res, next) => {
		//Check QQ bind status
		core.get.key(req.user.uid, (err, data) => {
			if (err) {
				//err
				console.error(`[PA Core] uid: ${req.user.uid} : There was an error While Checking Bind Satus. (MySQL)`);
				console.error(`[PA Core] Err Body:`);
				console.error(err);
				res.render('error', { error: [`uid: ${req.user.uid} : There was an error adding the key. (MySQL)`, err] });
				next();
				return;
			}
			if (data) {
				//Binded
				//Save  Mongo 
				let t = Date.now().toString().slice(1, 10);
				plugin.save(req.user.uid, { qq: data.qq, time: t }, (err, result) => {
					if (err) {
						//err
						console.error(`[PA Core] uid: ${req.user.uid} : There was an error While Checking Bind Satus $1. (Mongo)`);
						console.error(`[PA Core] Err Body:`);
						console.error(err);
						res.status(500).render('error', { error: [`uid: ${req.user.uid} : There was an error While Checking Bind Satus. (Mongo)`, err] });
						next();
						return;
					}
					//Save Session
					req.session.qq.number = data.qq;
					req.session.qq.time = t;

					//Return
					res.status(200).json({ status: "BIND OK." });

				});
			} else {
				//no data
				//err
				res.status(403).json({ status: "403", error: 'no binded.' })
			}
		});
	});
	// Router
	//router.get('/login/2fa', hostMiddleware.buildHeader, loggedIn.ensureLoggedIn(), controllers.renderLogin);
	//router.get('/api/login/2fa', loggedIn.ensureLoggedIn(), controllers.renderLogin);
	//router.post('/login/2fa', loggedIn.ensureLoggedIn(), controllers.processLogin, function (req, res) {
	//	req.session.tfa = true;
	//	res.redirect(nconf.get('relative_path') + (req.query.next || '/'));
	//});

	callback();
};

plugin.addAdminNavigation = (header, callback) => {
	translator.translate('[[qqbind:title]]', (title) => {
		header.plugins.push({
			route: '/plugins/qqbind',
			icon: 'fa-qq',
			name: title
		});

		callback(null, header);
	});
};

plugin.addProfileItem = (data, callback) => {
	translator.translate('[[qqbind:title]]', function (title) {
		data.links.push({
			id: 'qqbind',
			route: 'bind-qq',
			icon: 'fa-qq',
			name: title,
			visibility: {
				self: true,
				other: false,
				moderator: false,
				globalMod: false,
				admin: false,
			}
		});

		callback(null, data);
	});
};

plugin.get = (uid, callback) => {
	//Mongo query
	db.getObjectField('qqbind:uid:qq', uid, callback);
};

plugin.save = (uid, qq, callback) => {
	db.setObjectField('qqbind:uid:qq', uid, qq, callback);
};

plugin.hasQQ = (uid, callback) => {
	db.isObjectField('qqbind:uid:qq', uid, callback);
};

plugin.checkBind = (uid, key, callback) => {
	//Check Bind Status via mysql

};
plugin.disassociate = (uid, callback) => {
	async.parallel([
		async.apply(db.deleteObjectField, 'qqbind:uid:qq', uid),
	], callback);
};
module.exports = plugin;
