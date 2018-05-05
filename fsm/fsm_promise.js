"use strict"
const log4js = require('log4js')
const logger = log4js.getLogger('[tcp-server]')
const config = require('../util/config')
const _ = require('underscore')
const MAX_NUMBER_OF_AREAS = 4
const logEmitter = require('../gsd/logEvent');


var currentState;
var id = 'UPD'
var interval = config.sm.systemUpdater.inactivityInterval


var key = null
var ctx = {
    activeUsers: null,
    users: null,
    activeZones: null,
    zones: null,
    activeAreas: null,
    areas: null,
    activeCommonAreas: null,
    commonAreas: null,
    ARCs: null,
    CRCs: null,
    outputs: {output1: {}, output2: {}, output3: {}, output4: {}},
    ipBoardVersion: null
}
initState()
    .then((next) => {
        return checkExecution();
    }).then()
    .catch((status) => {
        //handle completed or error
    });


var initState = () => {
    return new Promise((resolve, reject) => {
        id = 'UPD [' + queue.deviceId + ']'
        ctx.startTime = new Date()
        LogDebugMessage(queue.deviceId, 'Full Read trigger = init');
        if (opts && opts.key) {
            key = opts.key
            resolve('CheckExecution');
        } else {
            reject('No Key found');
        }
    });
};

var checkExecution = (queue) => {
    return new Promise((resolve, reject) => {
        queue.fullReadRunning = true;
        gsdproc.getFullSystemReadCompleteAndSetToFalse(queue).then((data) => {
            if (!data && !data.result) {
                if (data.result == false)
                    resolve('GetCRCs');
                else {
                    ctx.skip = true;
                    reject('Completed');
                }
            } else resolve('GetCRCs');
        });

    })
};

var forceRestart = () => {
    return new Promise((resolve, reject) => {
        gsdproc.getFullSystemReadCompleteAndSetToFalse(queue).then((data) => {
            if (data)
                resolve('CheckExecution');
            else
                reject('No data from getFullSystemReadCompleteAndSetToFalse');
        });
    });

};


var getCRCs = ((que) => {
    return new Promise((resolve, reject) => {
        gsdnet._getCRCs(queue, key).then((data) => {
            if (!data) {
                if (!data.crcsBeforeARC && data.crcsBeforeARC != "") {
                    ctx.CRCs = new Buffer(data.crcsBeforeARC, 'hex');
                    if (!queue.crcsHex) {
                        ctx.OldCRCs = new Buffer(queue.crcsHex, 'hex');
                    }
                    else
                        ctx.OldCRCs = null;
                    ctx.newHexCRCs = data.crcsBeforeARC;
                }
                var skipARCs = false;
                if (!ctx.OldCRCs && ctx.OldCRCs.length >= 23 && ((ctx.OldCRCs[22] === ctx.CRCs[22]) && (ctx.OldCRCs[23] === ctx.CRCs[23]))) {
                        skipARCs = true;
                    }
                if (skipARCs === true)
                    resolve('GetActiveUsers');
                else
                    resolve('RefreshARCs');
            }

            resolve('GetActiveUsers');
        });
    });
});


function updater(fire, queue, opts) {
    var id = 'UPD'
    var interval = config.sm.systemUpdater.inactivityInterval


    var key = null
    var ctx = {
        activeUsers: null,
        users: null,
        activeZones: null,
        zones: null,
        activeAreas: null,
        areas: null,
        activeCommonAreas: null,
        commonAreas: null,
        ARCs: null,
        CRCs: null,
        outputs: {output1: {}, output2: {}, output3: {}, output4: {}},
        ipBoardVersion: null
    }

    this.startState = "Init"


    function isDebugID(dbgId) {
        if (!dbgId || !config.debugIDs)
            return false;
        for (var i = 0; i < config.debugIDs.length; i++) {
            if (config.debugIDs.indexOf(dbgId) >= 0)
                return true;
        }
        return false;

    }


    function LogDebugMessage(devID, messageToLog) {
        if (isDebugID(devID) === false)
            return;
        var log = {};
        log.key = devID;
        log.event = {
            date: new Date(),
            reason: '',
            type: 'retry',
            details: messageToLog
        };
        logEmitter.emitEvent('qevt', log); //emit the queued event message to the queue
    }

    this.states = {

        'Init': {
            entry: function () {
                id = 'UPD [' + queue.deviceId + ']'
                ctx.startTime = new Date()
                LogDebugMessage(queue.deviceId, 'Full Read trigger = init');
                if (opts && opts.key) {
                    key = opts.key
                    return 'CheckExecution'
                } else {
                    return '@error'
                }
            }
        },

        //forces the full system read to read the CRCs
        'ForceFullReadStart': {
            entry: function () {
                fire.gsdproc.getFullSystemReadCompleteAndSetToFalse(queue) //also saves it and sets it to false. Returns the old value.
            },
            actions: {
                '.done': function (data) {
                    logger.info('Scheduled full system read start flagged as incomplete');
                    return 'CheckExecution'
                }
            }
        },

        //checks the fullReadComplete flag in the database. If it's true or missing, it will execute the full state machine.
        //this ensures the full system read will only start once on the first registration or after a crash in the middle of it
        'CheckExecution': {
            entry: function () {
                queue.fullReadRunning = true;
                fire.gsdproc.getFullSystemReadCompleteAndSetToFalse(queue) //also saves it and sets it to false. Returns the old value.
            },
            actions: {
                '.done': function (data) {
                    if (data != null) {
                        if (data.result != null) {
                            if (data.result == false) {
                                //logger.info('Branch 1, was false in the DB, was started but not finished');
                                return 'GetCRCs';
                            }
                            else { //if it's false it means the previous full system read was successful
                                ctx.skip = true;
                                //logger.info('Branch 2, will skip full system read, it was true so it was finished');
                                return 'Completed';
                            }
                        }
                        else {
                            return 'GetCRCs'; //if it's missing its the first time this is run so it will be false in the DB. The full read must proceed.
                        }
                    }
                    else {
                        //logger.info('Branch 4, error - was missing from DB, will run');
                        return 'GetCRCs'; //if it's missing its the first time this is run so it will be false in the DB. The full read must proceed.
                    }
                }
            }
        },

        'GetCRCs': {
            entry: function () {
                //	console.log('\n\n\n\n');
                //logger.info('updater.js								'+(queue.deviceId||'na')+' : Full system read Start');
                fire.gsdnet._getCRCs(queue, key)
            },
            actions: {
                '.done': function (data) {
                    if (data != null) {
                        if (data.crcsBeforeARC != null) {
                            if (data.crcsBeforeARC != "") {
                                var crcsBeforeARC = new Buffer(data.crcsBeforeARC, 'hex')

                                ctx.CRCs = crcsBeforeARC; //ctx.CRCs will hold the decoded form until it ends. These are the new values
                                if (queue.crcsHex != null) {
                                    //logger.info('queue.crcsHex: '+queue.crcsHex);
                                    ctx.OldCRCs = new Buffer(queue.crcsHex, 'hex'); //I decode the previous values from the DB or the prev. iteration
                                    //	logger.info('Restored OLD crcs:'+JSON.stringify(ctx.OldCRCs));
                                }
                                else
                                    ctx.OldCRCs = null;

                                //the new hex value will be stored into ctx.CRCs and queue.crcsHex at the end, if successful / until then stored in a temp variable: newHexCRCs
                                //when loaded from the DB, quick read stores them in queue.crcsHex - as previous values.
                                ctx.newHexCRCs = data.crcsBeforeARC; //this needs to be updated in Completed: ctx.crcsHex = ctx.CRCs
                            }
                        }

                        //logger.info('CRCs: '+JSON.stringify(ctx.CRCs||'none'));
                        //logger.info('Olds: '+JSON.stringify(ctx.OldCRCs||'none'));
                        //logger.info('Old :'+ctx.OldCRCs[22]+','+ctx.OldCRCs[23]);
                        //logger.info('Old :'+ctx.CRCs[22]+','+ctx.CRCs[23]);

                        //decide when to read ARCs
                        var skipARCs = false;
                        if (ctx.OldCRCs != null)
                            if (ctx.OldCRCs.length >= 23) {
                                if ((ctx.OldCRCs[22] == ctx.CRCs[22]) && (ctx.OldCRCs[23] == ctx.CRCs[23])) {
                                    //logger.info('Will skip ARC reads');
                                    skipARCs = true;
                                }
                            }
                        if (skipARCs == true)
                            return 'GetActiveUsers';
                        else
                            return 'RefreshARCs';
                    }

                    return 'GetActiveUsers';
                }
            }
        },

        'RefreshARCs': {
            entry: function () {
                fire.gsdnet.getARCs(queue, key)
            },
            actions: {
                '.done': function (data) {
                    if (data != null) {
                        //logger.info((queue.deviceId||'na')+' : Full read got ARCs');
                        ctx.ARCs = data;
                    }
                    return 'GetActiveUsers';
                }
            }
        },

        'Wait1': {
            ticker: 1000,
            actions: {
                'tick': function () {
                    if ((queue.priority > 2) || (queue.priority == null)) {
                        //logger.info('					'+(queue.deviceId||'na')+' : Full read resume');
                        return 'GetActiveUsers';
                    }
                    else {
//						logger.info('								'+(queue.deviceId||'na')+' :		Full read  Wait1->Wait1: '+queue.priority);
                        return 'Wait1';
                    }
                }
            }
        },

        'GetActiveUsers': {
            entry: function () {
                if ((queue.priority > 2) || (queue.priority == null)) {
                }
                else {
                    //logger.info('					'+(queue.deviceId||'na')+' : Full read pause');
                    return 'Wait1';
                }

                queue.initialPriority3 = queue.priority || 255;
                ctx.startTime = new Date()
                LogDebugMessage(queue.deviceId, 'Full Read starting');
                fire.gsdnet.getActiveUsersAndPinCodeDigits(queue, key)
            },
            actions: {
                '.done': function (data) {
                    /* logger.info('%s GetActiveUsers done', id)
                     logger.info('%s GetActiveUsers result: %s', id, JSON.stringify(data))*/
                    if (data.users != null) {
                        ctx.activeUsers = data.users.activeUsers
                        ctx.nDigits = data.nDigits;
                    }
                    return ['GetUserInfo', ctx.activeUsers]
                }
            }
        },

        'GetUserInfo': {
            guard: function (activeUsers) {
                if (activeUsers == null) {/*logger.info('No active users');*/
                    return 'GetActiveZones';
                }
                else {
                    if (activeUsers.length == 0) {
                        logger.debug('%s No active users found, skip this state...', id)
                        return 'GetOutputTypes'
                    } else {
                        ctx.users = {}

                        logger.debug('%s Active users found, get info for users: %s', id, JSON.stringify(activeUsers))
                    }
                }
            },
            each: {
                fn: 'gsdnet.getUserInfo',
                fnArgs: function (activeUsers) {
                    return [queue, key, activeUsers];
                },
                iterator: function (index, err, userInfo) {
                    if (err) {
                        logger.debug('%s Error retrieving info for user: %d', index)
                    } else {
                        if (_.has(userInfo, 'userIndex')) {
                            ctx.users[userInfo.userIndex] = userInfo
                            logger.debug('%s Index: %d User: %s', id, index, JSON.stringify(userInfo));
                        }
                    }
                },
                par: 1
            },
            actions: {
                '.done': function () {
                    logger.debug('%s UserInfo done', id)
                    return 'GetOutputTypes'
                }
            }
        },


        'GetOutputTypes': {
            entry: function () {
                fire.gsdnet.getOutputTypes(queue, key)
            },
            actions: {
                '.done': function (data) {
                    if (data != null) {
                        if (data.ok == true) {
                            if (ctx.outputs == null)
                                ctx.outputs = {output1: {}, output2: {}, output3: {}, output4: {}}

                            ctx.outputs.output1.type = data.outputs.output1type;
                            ctx.outputs.output2.type = data.outputs.output2type;
                            ctx.outputs.output3.type = data.outputs.output3type;
                            ctx.outputs.output4.type = data.outputs.output4type;

                            //  logger.info('UPDATER CTX. Output1 :'+JSON.stringify(data||''));

                            if (data.outputs.outputConfig != null) {
                                ctx.outputs.output1.onUntilTime = data.outputs.outputConfig.onUntilTime1;
                                ctx.outputs.output1.scheduleOnSec = data.outputs.outputConfig.scheduleOnsec1;
                                ctx.outputs.output1.scheduleOnMin = data.outputs.outputConfig.scheduleOnmin1;
                                ctx.outputs.output1.scheduleOnHour = data.outputs.outputConfig.scheduleOnhour1;
                                ctx.outputs.output1.scheduleOffSec = data.outputs.outputConfig.scheduleOffsec1;
                                ctx.outputs.output1.scheduleOffMin = data.outputs.outputConfig.scheduleOffmin1;
                                ctx.outputs.output1.scheduleOffHour = data.outputs.outputConfig.scheduleOffhour1;
                                ctx.outputs.output1.command = data.outputs.outputConfig.command1;
                                ctx.outputs.output1.state = data.outputs.outputConfig.status1;

                                ctx.outputs.output2.onUntilTime = data.outputs.outputConfig.onUntilTime2;
                                ctx.outputs.output2.scheduleOnSec = data.outputs.outputConfig.scheduleOnsec2;
                                ctx.outputs.output2.scheduleOnMin = data.outputs.outputConfig.scheduleOnmin2;
                                ctx.outputs.output2.scheduleOnHour = data.outputs.outputConfig.scheduleOnhour2;
                                ctx.outputs.output2.scheduleOffSec = data.outputs.outputConfig.scheduleOffsec2;
                                ctx.outputs.output2.scheduleOffMin = data.outputs.outputConfig.scheduleOffmin2;
                                ctx.outputs.output2.scheduleOffHour = data.outputs.outputConfig.scheduleOffhour2;
                                ctx.outputs.output2.command = data.outputs.outputConfig.command2;
                                ctx.outputs.output2.state = data.outputs.outputConfig.status2;

                                ctx.outputs.output3.onUntilTime = data.outputs.outputConfig.onUntilTime3;
                                ctx.outputs.output3.scheduleOnSec = data.outputs.outputConfig.scheduleOnsec3;
                                ctx.outputs.output3.scheduleOnMin = data.outputs.outputConfig.scheduleOnmin3;
                                ctx.outputs.output3.scheduleOnHour = data.outputs.outputConfig.scheduleOnhour3;
                                ctx.outputs.output3.scheduleOffSec = data.outputs.outputConfig.scheduleOffsec3;
                                ctx.outputs.output3.scheduleOffMin = data.outputs.outputConfig.scheduleOffmin3;
                                ctx.outputs.output3.scheduleOffHour = data.outputs.outputConfig.scheduleOffhour3;
                                ctx.outputs.output3.command = data.outputs.outputConfig.command3;
                                ctx.outputs.output3.state = data.outputs.outputConfig.status3;

                                ctx.outputs.output4.onUntilTime = data.outputs.outputConfig.onUntilTime4;
                                ctx.outputs.output4.scheduleOnSec = data.outputs.outputConfig.scheduleOnsec4;
                                ctx.outputs.output4.scheduleOnMin = data.outputs.outputConfig.scheduleOnmin4;
                                ctx.outputs.output4.scheduleOnHour = data.outputs.outputConfig.scheduleOnhour4;
                                ctx.outputs.output4.scheduleOffSec = data.outputs.outputConfig.scheduleOffsec4;
                                ctx.outputs.output4.scheduleOffMin = data.outputs.outputConfig.scheduleOffmin4;
                                ctx.outputs.output4.scheduleOffHour = data.outputs.outputConfig.scheduleOffhour4;
                                ctx.outputs.output4.command = data.outputs.outputConfig.command4;
                                ctx.outputs.output4.state = data.outputs.outputConfig.status4;

                            }
                        }
                        else
                            data.outputs = null;
                    }
                    return 'GetActiveZones'
                }
            }
        },


        'GetActiveZones': {
            entry: function () {
                logger.debug('%s GetActiveZones', id)
                fire.gsdnet.getActiveZones(queue, key)
            },
            actions: {
                '.done': function (data) {
                    ctx.activeZones = data.activeZones
                    //logger.info('Active zones: '+JSON.stringify(ctx.activeZones));

                    var newZones = [];
                    if (queue.activeZoneIDs != null)
                        if (ctx.activeZones != null) {
                            for (var j = 0; j < ctx.activeZones.length; j++)
                                if (queue.activeZoneIDs.indexOf(ctx.activeZones[j]) < 0) {
                                    newZones.push(ctx.activeZones[j]);
                                }
                        }

                    //logger.info('New zones: '+JSON.stringify(newZones));

                    var skipZonesInfo = false;

                    if (ctx.OldCRCs != null)
                        if (ctx.OldCRCs.length >= 6) {
                            //	logger.info('Old     Zone CRC 1 : '+ctx.OldCRCs[2]+' '+ctx.OldCRCs[3]+' Zones CRC 5: '+ctx.OldCRCs[10]+' '+ctx.OldCRCs[11]);
                            if (ctx.OldCRCs[2] == ctx.CRCs[2] && ctx.OldCRCs[3] == ctx.CRCs[3] && ctx.OldCRCs[10] == ctx.CRCs[10] && ctx.OldCRCs[11] == ctx.CRCs[11]) {
                                //	logger.info('Will skip zone info reads');
                                skipZonesInfo = true;
                            }
                        }
                    ctx.newZones = newZones;
                    if (skipZonesInfo == false)
                        return ['GetActiveZoneInformation', ctx.activeZones]
                    else
                        return ['GetActiveZoneStatusOnly', ctx.activeZones]
                }
            }
        },

        'GetActiveZoneInformation': {
            guard: function (activeZones) {
                //logger.info('GetActiveZoneInformation for zones: '+JSON.stringify(activeZones));
                if (activeZones.length == 0) {
                    logger.debug('%s No active zones found, skip this state...', id)
                    return 'GetActiveAreas'
                } else {
                    if (ctx.zones == null)
                        ctx.zones = {}
                }
            },
            each: {
                fn: 'gsdnet.getActiveZoneInformation',
                fnArgs: function (activeZone) {
                    return [queue, key, activeZone];
                },
                iterator: function (index, err, zoneInfo) {
                    if (err) {
                        logger.debug('%s Error retrieving info for zone: %d', zoneInfo)
                    } else {
                        if (_.has(zoneInfo, 'zoneIndex')) {
                            ctx.zones[zoneInfo.zoneIndex] = zoneInfo
                            //  logger.info('%s Index: %d Zone: %s', id, index, JSON.stringify(zoneInfo));
                        }
                    }
                },
                par: 1
            },
            actions: {
                '.done': function () {
                    if (ctx.zones[200] != null)
                        if (ctx.zones[200].version != null)
                            if (ctx.zones[200].version.length > 2) {
                                var versionSplits = ctx.zones[200].version.split(".");
                                if (versionSplits != null)
                                    if (versionSplits.length > 2)
                                        if (isNaN(versionSplits[0]) == false)
                                            if (isNaN(versionSplits[1]) == false)
                                                if (isNaN(versionSplits[2]) == false) {
                                                    var majorNo = parseInt(versionSplits[0]);
                                                    var mediumNo = parseInt(versionSplits[1]) * 0.01;
                                                    var loNo = parseInt(versionSplits[2]) * 0.0001;
                                                    majorNo = majorNo + mediumNo + loNo;
                                                    if (majorNo > 2.1219) {
                                                        //logger.info('Controller zone info is '+majorNo+', will read ip board version');
                                                        return 'GetIPBoardVersion';
                                                    }
                                                }
                            }
                    return 'GetActiveAreas'
                }
            }
        },

        'GetActiveZoneStatusOnly': {
            guard: function (activeZones) {
                if (activeZones.length == 0) {
                    //logger.info('%s No active zones found, skip this state...', id)
                    return 'GetActiveAreas'
                } else {
                    ctx.zones = {}
                    //logger.info('%s Active zones found, quick get info for zones: %s', id, JSON.stringify(activeZones))
                }
            },
            each: {
                fn: 'gsdnet.getActiveZoneStatusOnly',
                fnArgs: function (activeZone) {
                    return [queue, key, activeZone];
                },
                iterator: function (index, err, zoneInfo) {
                    if (err) {
                        //logger.info('%s Error retrieving info for zone: %d', JSON.stringify(zoneInfo));
                    } else {
                        //  logger.info(index+': quick zone read Got zone info '); //+JSON.stringify(zoneInfo));
                        if (_.has(zoneInfo, 'zoneIndex')) {
                            ctx.zones[zoneInfo.zoneIndex] = zoneInfo
                        }
                    }
                },
                par: 1
            },
            actions: {
                '.done': function () {
                    if (ctx.newZones != null && ctx.newZones.length > 0) {
                        //	logger.info('GetActiveZoneStatusOnly will read full new zones: '+JSON.stringify(ctx.newZones));
                        return ['GetActiveZoneInformation', ctx.newZones];
                    }

                    if (queue.isEngineerLoggedIn()) {
                        if (ctx.zones[200] != null)
                            if (ctx.zones[200].version != null)
                                if (ctx.zones[200].version.length > 2) {
                                    var versionSplits = ctx.zones[200].version.split(".");
                                    if (versionSplits != null)
                                        if (versionSplits.length > 2)
                                            if (isNaN(versionSplits[0]) == false)
                                                if (isNaN(versionSplits[1]) == false)
                                                    if (isNaN(versionSplits[2]) == false) {
                                                        var majorNo = parseInt(versionSplits[0]);
                                                        var mediumNo = parseInt(versionSplits[1]) * 0.01;
                                                        var loNo = parseInt(versionSplits[2]) * 0.0001;
                                                        majorNo = majorNo + mediumNo + loNo;
                                                        if (majorNo > 2.1219) {
                                                            //logger.info('Controller zone info is '+majorNo+', will read ip board version');
                                                            return 'GetIPBoardVersion';
                                                        }
                                                    }
                                }
                    }
                    return 'GetActiveAreas'
                }
            }
        },

        'GetIPBoardVersion': {
            entry: function () {
                fire.gsdnet.getIPBoardVersion(queue, key)
            },
            actions: {
                '.done': function (data) {
                    ctx.ipBoardVersion = data.version
                    return 'GetActiveAreas'
                }
            }
        },


        'GetActiveAreas': {
            entry: function () {
                logger.debug('%s GetActiveAreas', id)
                /*var doReadAreas=true;

                    if(ctx.CRCs!=null)
                        logger.info('Current Area config CRC 5 : '+ctx.CRCs[8]+' '+ctx.CRCs[9]);

                    if(ctx.OldCRCs!=null)
                    if(ctx.OldCRCs.length>=6)
                    {
                        logger.info('Old     Zone CRC 5 : '+ctx.OldCRCs[8]+' '+ctx.OldCRCs[9]);
                        if(ctx.OldCRCs[2]==ctx.CRCs[2] && ctx.OldCRCs[3]==ctx.CRCs[3] && ctx.OldCRCs[10]==ctx.CRCs[10] && ctx.OldCRCs[11]==ctx.CRCs[11])
                        {
                            doReadAreas = false;
                            logger.info('Will skip area information reads');
                        }
                    }*/

                fire.gsdnet.getActiveAreas(queue, key)
            },
            actions: {
                '.done': function (data) {
                    logger.debug('%s GetActiveAreas done', id)
                    logger.debug('%s GetActiveAreas result: %s', id, JSON.stringify(data))
                    ctx.activeAreas = data.numberOfAreas
                    return ['GetActiveAreaInformation', ctx.activeAreas]
                }
            }
        },

        'GetActiveAreaInformation': {
            guard: function (numberOfAreas) {
                if (numberOfAreas <= 0) {
                    logger.debug('%s No active areas found, skip this state...', id)
                    return 'GetCommonActiveAreas'
                } else {
                    ctx.areas = {}
                    logger.debug('%s Active areas found, get info for areas: %d', id, numberOfAreas)
                }
            },
            entry: function (numberOfAreas) {
                //console.log('Send getAreaInformation request...')
                fire.gsdnet.getActiveAreaInformation(queue, key, 0, parseInt(numberOfAreas) - 1)
            },
            actions: {
                '.done': function (data) {
                    //console.log('GetActiveAreaInformation done: ' + JSON.stringify(data))
                    if (!ctx.areas) {
                        ctx.areas = {}
                    }
                    if (_.has(data, 'areasName')) {
                        ctx.areas.names = data.areasName
                    }
                    if (_.has(data, 'areasStatus')) {
                        ctx.areas.status = data.areasStatus
                    }
                    return 'GetCommonActiveAreas'
                }
            }
        },

        'GetCommonActiveAreas': {
            entry: function () {
                logger.debug('%s GetCommonActiveAreas', id)
                fire.gsdnet.getActiveCommonAreas(queue, key)
            },
            actions: {
                '.done': function (data) {
                    logger.debug('%s GetCommonActiveAreas done', id)
                    logger.debug('%s GetCommonActiveAreas result: %s', id, JSON.stringify(data))
                    ctx.activeCommonAreas = data.numberOfCommonAreas
                    return ['GetCommonAreaName', ctx.activeCommonAreas]
                }
            }
        },

        'GetCommonAreaName': {
            guard: function (numberOfAreas) {
                if (numberOfAreas <= 0) {
                    logger.debug('%s No common active areas found, skip this state...', id)
                    return 'GetActivePartSets'
                } else {
                    ctx.commonAreas = []
                    logger.debug('%s Active areas found, get info for areas: %d', id, numberOfAreas)
                }
            },
            entry: function (numberOfAreas) {
                logger.debug('%s GetCommonAreaName', id)
                fire.gsdnet.getCommonAreaName(queue, key, 0, parseInt(numberOfAreas) - 1)
            },
            actions: {
                '.done': function (data) {
                    logger.debug('%s GetCommonAreaName done', id)
                    logger.debug('%s GetCommonAreaName result: %s', id, JSON.stringify(data))
                    if (data && data.commonAreasName && data.commonAreasName.length > 0) {
                        if (!ctx.commonAreas) {
                            ctx.commonAreas = []
                        }

                        for (var i = 0; i < data.commonAreasName.length; i++) {
                            ctx.commonAreas.push({
                                id: i,
                                name: data.commonAreasName[i]
                            })
                        }
                    }
                    return 'GetActiveCommonAreaStatus'
                }
            }
        },

        'GetActiveCommonAreaStatus': {
            guard: function () {
                if (!ctx.activeCommonAreas || ctx.activeCommonAreas <= 0) {
                    logger.debug('%s No active common areas found, skip this state...', id)
                    return 'GetActivePartSets'
                } else {
                    logger.debug('%s Active common areas found, get status for areas: %d', id, ctx.activeCommonAreas)
                }
            },
            entry: function () {
                logger.debug('Send getAreaStatus request...')
                fire.gsdnet.getActiveCommonAreaStatus(queue, key, MAX_NUMBER_OF_AREAS, parseInt(ctx.activeCommonAreas) - 1 + MAX_NUMBER_OF_AREAS)
            },
            actions: {
                '.done': function (data) {
                    logger.debug('GetActiveCommonAreaStatus done: ' + JSON.stringify(data))

                    if (data && data && data.length > 0) {
                        for (var i = 0; i < data.length; i++) {
                            if (ctx.commonAreas && ctx.commonAreas[i]) {
                                ctx.commonAreas[i].status = data[i]
                            }
                        }
                    }

                    return 'GetActivePartSets'
                }
            }
        },

        'GetActivePartSets': {
            entry: function () {
                logger.debug('%s GetActivePartSets', id)
                fire.gsdnet.getActivePartSets(queue, key)
            },
            actions: {
                '.done': function (data) {
                    logger.debug('%s GetActivePartSets done', id)
                    logger.debug('%s GetActivePartSets result: %s', id, JSON.stringify(data))
                    ctx.activePartSets = data.activePartSets
                    return ['GetActivePartSetsNames', ctx.activePartSets]
                }
            }
        },

        'GetActivePartSetsNames': {
            guard: function (activePartSets) {
                if (activePartSets <= 0) {
                    logger.debug('%s No active part sets, skip this state...', id)
                    return 'GetGlobalComms'
                } else {
                    ctx.activePartSetsNames = {}
                    logger.debug('%s Active part sets found: %d, retrieving part set names', id, activePartSets)
                }
            },
            entry: function (activePartSets) {
                logger.debug('%s GetActivePartSetsNames', id)
                fire.gsdnet.getActivePartSetsNames(queue, key, activePartSets)
            },
            actions: {
                '.done': function (data) {
                    logger.debug('%s GetActivePartSetsNames done', id)
                    logger.debug('%s GetActivePartSetsNames result: %s', id, JSON.stringify(data))
                    if (data) {
                        ctx.partSets = data
                    }
                    return 'GetGlobalComms'
                }
            }
        },


        //get global comms settings
        'GetGlobalComms': {
            entry: function () {
                //  logger.info('%s Getting Global Comms', id)
                fire.gsdnet.get_comms_global(queue, key)
            },
            actions: {
                '.done': function (data) {
                    //  logger.info('%s get comms global result: %s', id, JSON.stringify(data||'none'))
                    if (data != null)
                        ctx.commsGlobal = data.globalSettings || {};
                    else
                        ctx.commsGlobal = {};
                    return 'GetRemoteMonitor'
                }
            }
        },

        'GetRemoteMonitor': {
            entry: function () {
                //logger.info('%s Getting Remote Monitor data', id)
                fire.gsdnet.get_remote_monitor(queue, key)
            },
            actions: {
                '.done': function (data) {
                    //  logger.info('Updater.GetRemoteMonitor state: %s got remote monitor settings : %s', id, JSON.stringify(data||'none'))
                    if (data != null)
                        ctx.remoteMonitor = data.remoteMonitor || {};
                    else
                        ctx.remoteMonitor = {};
                    return 'Completed'
                }
            }
        },

        'ForceRestart': {
            entry: function () {
                logger.info('Force restart');
                if (queue.crcsHex != null) {
                    if (queue.crcsHex.length > 12) {
                        //modify CRC 1 and 5
                        var prefix = queue.crcsHex.substr(0, 4);
                        var suffix = queue.crcsHex.substr(8);
                        queue.crcsHex = prefix + '0000' + suffix;
                        prefix = queue.crcsHex.substr(0, 20);
                        suffix = queue.crcsHex.substr(24);
                        queue.crcsHex = prefix + '0000' + suffix;
                    }
                }
                //logger.info('Calling flagFullReadStarted');
                fire.gsdproc.flagFullReadStarted(queue);
            },
            actions: {
                '.done': function (data) {
                    LogDebugMessage(queue.deviceId, 'Full System Read force start');
                    //logger.info('%s ForceRestart -> Init', id)
                    return 'Init'
                }
            }
        },

        'Completed': {
            entry: function () {
                //logger.info('->Flag complete');
                fire.gsdproc.flagFullReadComplete(queue);
            },
            actions: {
                '.done': function (data) {
                    //logger.info('Updater completed, saved flag to true in the database');
                    return 'CompletedEnd';
                }
            }
        },

        'CompletedEnd': {
            ticker: interval,
            entry: function () {
                queue.fullReadRunning = false;
                //logger.info('->Completed');
                if (ctx.skip == true) {
                    delete ctx.skip;
                    //logger.info('Full System read will be skipped, setting flag to true in the DB to mark the end');
                    fire.$factoryEvent('data', null) //firing NULL data back to  device_main
                    ctx = {}
                    //logger.info('updater.js						'+(queue.deviceId||'na')+' Full system read end');
                }
                else {
                    var data = {}
                    data = _.extend(data, ctx)

                    data.ARCs = ctx.ARCs;
                    //logger.info('Reporting outputs: '+(JSON.stringify(data.outputs)||'none')+' vs ctx.outputs: '+JSON.stringify(ctx.outputs||''));

                    queue.crcsHex = ctx.newHexCRCs; //store the values read in this iteration into crcsHex
                    if (queue.crcsHex != null) {
                        data.CRCs = queue.crcsHex;
                    } else {
                    }

                    fire.$factoryEvent('data', data)
                    ctx = {}
                    LogDebugMessage(queue.deviceId, 'Full Read stopping / interval :' + interval);
                    queue.priority = queue.initialPriority3 || 255;
                    //logger.info('updater.js						'+(queue.deviceId||'na')+' : Full system read end. Restored priority '+queue.priority+'\n\n\n\n');
                }
            },
            actions: {
                '.done': function (data) {
                    //logger.info('UPDATER.COMPLETE.DATA');
                },
                'tick': function () {
                    LogDebugMessage(queue.deviceId, 'Full Read Start trigger = interval timer ' + interval);
                    //logger.info('Start ');
                    return 'ForceFullReadStart' //restart the
                },
                'api.setInterval': function (newInterval) {
                    if (interval != newInterval)
                        LogDebugMessage(queue.deviceId, 'setInterval :' + interval + ' with newInterval ' + newInterval);

                    if (newInterval < interval) {
                        interval = newInterval
                        LogDebugMessage(queue.deviceId, 'Full Read trigger = reduced interval');
                        return 'Init'
                    } else {
                        interval = newInterval
                    }


                    //LogDebugMessage(queue.deviceId,'Set full read interval to :'+newInterval+' / '+interval);
                    //logger.info(queue.deviceId+' Set full read interval to :'+newInterval+' from '+interval);
                }
            }
        }
    }

    this.defaults = {
        actions: {
            '.err': function (err) {
                logger.debug('%s Error: %s', id, err)
                if (queue != null)
                    queue.fullReadRunning = false;
                LogDebugMessage(queue.deviceId, 'Full Read abort error: ' + (err || 'na'));
                return '@exit'
            },
            'api.stop': function () {
                logger.debug('%s API.STOP event', id)
                logger.debug('%s Stopped', id)
                return '@exit'
            },
            'api.setInterval': function (newInterval) {
                //logger.info(queue.deviceId+' Set full read interval (2) to :'+newInterval+' from '+interval);
                if (newInterval != interval)
                    LogDebugMessage(queue.deviceId, 'setInterval :' + interval + ' with newInterval ' + newInterval);
                interval = newInterval
            },
            'api.forceStartFullRead': function () {
                if (queue.fullReadRunning == true) {
                    return;
                }
                return 'ForceRestart';
            }
        }
    }

}

module.exports = updater