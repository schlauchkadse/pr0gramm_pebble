(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
var Settings = require('settings');
var Tabs_1 = require('./ui/Tabs');
var ApiService_1 = require('./core/ApiService');
var SplashWindow_1 = require('./ui/SplashWindow');
var MainCard_1 = require('./ui/MainCard');
var BenisCard_1 = require('./ui/BenisCard');
Settings.config({
    url: 'http://pebble.analsheep.de/pr0settings.html',
    autoSave: true
}, function (e) {
    ApiService_1.ApiService.save();
}, function (event) {
    ApiService_1.ApiService.load();
    ApiService_1.ApiService.update();
    if (SplashWindow_1.SplashWindow.settingsMenu)
        SplashWindow_1.SplashWindow.settingsMenu.update();
});
var App = (function () {
    function App() {
        this.tabs = new Tabs_1.Tabs();
        this.splashWindow = new SplashWindow_1.SplashWindow();
        this.mainCard = new MainCard_1.MainCard();
        this.benisCard = new BenisCard_1.BenisCard();
        this.tabs.addTab(this.splashWindow);
        this.tabs.addTab(this.mainCard);
        this.tabs.addTab(this.benisCard);
        this.tabs.show();
    }
    return App;
}());
var app = new App();

},{"./core/ApiService":2,"./ui/BenisCard":4,"./ui/MainCard":8,"./ui/SplashWindow":10,"./ui/Tabs":11,"settings":undefined}],2:[function(require,module,exports){
"use strict";
var ajax = require('ajax');
var Vibe = require('ui/vibe');
var Settings = require('settings');
var es6_promise_1 = require('es6-promise');
var observer_1 = require('../lib/observer');
var ApiService;
(function (ApiService) {
    (function (Flags) {
        Flags[Flags["NONE"] = 0] = "NONE";
        Flags[Flags["SFW"] = 1] = "SFW";
        Flags[Flags["NSFW"] = 2] = "NSFW";
        Flags[Flags["NSFL"] = 4] = "NSFL";
        Flags[Flags["ALL"] = 7] = "ALL";
    })(ApiService.Flags || (ApiService.Flags = {}));
    var Flags = ApiService.Flags;
    ApiService.BASE_URL = "http://pr0gramm.com/api/";
    ApiService.THUMB_URL = "http://thumb.pr0gramm.com/";
    ApiService.URL_ITEMS = ApiService.BASE_URL + "items/get";
    ApiService.URL_INFO = ApiService.BASE_URL + "items/info";
    ApiService.flags = Flags.ALL;
    ApiService.promoted = false;
    ApiService.updateInterval = 10;
    ApiService.updatePromise = null;
    ApiService.postMap = {};
    ApiService.latestPosts = null;
    ApiService.latestPostsObserver = new observer_1.Observer();
    var antiCacheValue = 0;
    var updateTimer;
    function init() {
        load();
    }
    function load() {
        ApiService.username = Settings.option('username') || '';
        ApiService.flags = Settings.option('flags') || (Flags.SFW | Flags.NSFL);
        setUpdateInterval(Settings.option('interval') || 10);
        ApiService.promoted = Settings.option('promoted') ? true : false;
    }
    ApiService.load = load;
    function save() {
        Settings.option('username', ApiService.username);
        Settings.option('flags', ApiService.flags);
        Settings.option('interval', ApiService.updateInterval);
        Settings.option('promoted', ApiService.promoted);
    }
    ApiService.save = save;
    function setUpdateInterval(value) {
        ApiService.updateInterval = value;
        if (!ApiService.updateInterval || ApiService.updateInterval < 10)
            ApiService.updateInterval = 10;
        clearInterval(updateTimer);
        updateTimer = setInterval(update, ApiService.updateInterval * 1000);
    }
    ApiService.setUpdateInterval = setUpdateInterval;
    function formatTags(tags, maxTags, minConfidence) {
        if (maxTags === void 0) { maxTags = 8; }
        if (minConfidence === void 0) { minConfidence = 0.1; }
        var tagNames = [];
        tags.forEach(function (t) {
            if (tagNames.length < maxTags && t.confidence > minConfidence)
                tagNames.push(t.tag);
        });
        return tagNames.join(', ');
    }
    ApiService.formatTags = formatTags;
    function minutesSince(timestamp) {
        return Math.floor((Date.now() / 1000 - timestamp) / 60);
    }
    ApiService.minutesSince = minutesSince;
    function formatTimeSince(timestamp) {
        var delta = Date.now() / 1000 - timestamp;
        var m = Math.floor(delta).toString();
        var h = Math.floor(delta /= 60).toString();
        if (m.length === 1)
            m = '0' + m;
        if (h.length === 1)
            h = '0' + h;
        return m + ":" + h;
    }
    ApiService.formatTimeSince = formatTimeSince;
    function toggleFlag(value, flag) {
        return (value & flag) ? value & ~flag : value | flag;
    }
    ApiService.toggleFlag = toggleFlag;
    function updateInfos() {
        return new es6_promise_1.Promise(function (resolve, reject) {
            var index = 0;
            function fetchInfo() {
                if (index >= ApiService.latestPosts.items.length)
                    return resolve();
                var id = ApiService.latestPosts.items[index++].id;
                ApiService.info(id)
                    .then(fetchInfo);
            }
            for (var i = 0; i < 6; i++) {
                fetchInfo();
            }
        });
    }
    ApiService.updateInfos = updateInfos;
    function info(id, skipCache) {
        if (skipCache === void 0) { skipCache = false; }
        return new es6_promise_1.Promise(function (resolve, reject) {
            if (!ApiService.postMap[id]) {
                console.error("Missing post data #" + id + ". Fetching...");
                update(id).then(function () {
                    info(id);
                });
                return;
            }
            if (ApiService.postMap[id].info) {
                if (!skipCache && ApiService.postMap[id].index >= 6 && ApiService.postMap[id].info.ts > ApiService.latestPosts.ts - 120) {
                    return resolve(ApiService.postMap[id].info);
                }
            }
            ajax({
                url: ApiService.URL_INFO + "?itemId=" + id + "&v=" + antiCacheValue++,
                type: 'json',
                method: 'GET',
                async: true,
                cache: false,
            }, function (body, status, req) {
                var data = body;
                ApiService.postMap[id].info = data;
                resolve(data);
            }, function (body, status, req) {
                reject(body);
            });
        });
    }
    ApiService.info = info;
    function update(id) {
        if (ApiService.updatePromise) {
            return ApiService.updatePromise;
        }
        return ApiService.updatePromise = new es6_promise_1.Promise(function (resolve, reject) {
            ajax({
                url: ApiService.URL_ITEMS + "?flags=" + ApiService.flags + (ApiService.promoted ? '&promoted=1' : '') + (id ? "&id=" + id : '') + "&v=" + antiCacheValue++,
                type: 'json',
                method: 'GET',
                async: true,
                cache: false,
            }, function (body, status, req) {
                ApiService.updatePromise = null;
                ApiService.latestPosts = body;
                for (var i = 0; i < ApiService.latestPosts.items.length; i++) {
                    var p = ApiService.latestPosts.items[i];
                    p.index = i;
                    if (ApiService.postMap[p.id]) {
                        p.info = ApiService.postMap[p.id].info;
                    }
                    ApiService.postMap[p.id] = p;
                }
                if (ApiService.latestPostId && ApiService.latestPostId !== ApiService.latestPosts.items[0].id) {
                    Vibe.vibrate('double');
                }
                ApiService.latestPostId = ApiService.latestPosts.items[0].id;
                resolve(ApiService.latestPosts);
                ApiService.latestPostsObserver.notify(ApiService.latestPosts);
            }, function (body, status, req) {
                ApiService.updatePromise = null;
                reject(body);
            });
        });
    }
    ApiService.update = update;
    function ajaxPromise(options) {
        return new es6_promise_1.Promise(function (resolve, reject) {
            ajax(options, function (body, status, req) {
                resolve({ body: body, status: status, req: req });
            }, function (body, status, req) {
                reject({ body: body, status: status, req: req });
            });
        });
    }
    ApiService.ajaxPromise = ajaxPromise;
    function ajaxPromiseJson(url) {
        return ajaxPromise({
            url: url,
            type: 'json',
            method: 'GET',
            async: true,
            cache: false,
        });
    }
    ApiService.ajaxPromiseJson = ajaxPromiseJson;
    init();
})(ApiService = exports.ApiService || (exports.ApiService = {}));

},{"../lib/observer":3,"ajax":undefined,"es6-promise":12,"settings":undefined,"ui/vibe":undefined}],3:[function(require,module,exports){
"use strict";
var Observer = (function () {
    function Observer() {
        this.observers = [];
    }
    Observer.prototype.subscribe = function (fn) {
        this.observers.push(fn);
    };
    Observer.prototype.unsubscribe = function (fn) {
        this.observers.splice(this.observers.indexOf(fn), 1);
    };
    Observer.prototype.notify = function (arg) {
        this.observers.forEach(function (observer) {
            observer(arg);
        });
    };
    return Observer;
}());
exports.Observer = Observer;

},{}],4:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var UI = require('ui');
var BenisCard = (function (_super) {
    __extends(BenisCard, _super);
    function BenisCard() {
        _super.call(this, {
            title: 'Pr0 Benis',
            subtitle: '...',
        });
    }
    return BenisCard;
}(UI.Card));
exports.BenisCard = BenisCard;

},{"ui":undefined}],5:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var UI = require('ui');
var ApiService_1 = require('../core/ApiService');
var ImageWindow_1 = require('./ImageWindow');
var DetailCard = (function (_super) {
    __extends(DetailCard, _super);
    function DetailCard(post) {
        var _this = this;
        _super.call(this, {
            title: post.user,
            scrollable: true,
            subtitle: (post.up - post.down) + " Benis",
            body: "Vor " + ApiService_1.ApiService.minutesSince(post.created) + " min\n" + ApiService_1.ApiService.formatTags(post.info.tags, 10, 0),
        });
        this.on('click', 'select', function () {
            if (!_this.imageWindow)
                _this.imageWindow = new ImageWindow_1.ImageWindow(post);
            _this.imageWindow.show();
        });
    }
    return DetailCard;
}(UI.Card));
exports.DetailCard = DetailCard;

},{"../core/ApiService":2,"./ImageWindow":6,"ui":undefined}],6:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var UI = require('ui');
var Vector2 = require('vector2');
var ApiService_1 = require('../core/ApiService');
var ImageWindow = (function (_super) {
    __extends(ImageWindow, _super);
    function ImageWindow(post) {
        _super.call(this, {
            backgroundColor: 'black',
            fullscreen: false,
            scrollable: false,
        });
        var url = ApiService_1.ApiService.THUMB_URL + post.thumb;
        console.log("img src 1 = " + url);
        url = 'http://utils.bzeutzheim.de/img2pebble.php?url=' + encodeURI(url);
        console.log("img src 2 = " + url);
        this.image = new UI.Image({
            image: url,
            position: new Vector2(0, 0)
        });
        this.add(this.image);
    }
    return ImageWindow;
}(UI.Window));
exports.ImageWindow = ImageWindow;

},{"../core/ApiService":2,"ui":undefined,"vector2":undefined}],7:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var UI = require('ui');
var ApiService_1 = require('../core/ApiService');
var DetailCard_1 = require('./DetailCard');
var LatestPostsMenu = (function (_super) {
    __extends(LatestPostsMenu, _super);
    function LatestPostsMenu() {
        var _this = this;
        _super.call(this, {
            sections: [{
                    title: 'Letzte Posts',
                    items: [{
                            title: 'Lädt...',
                        }]
                }]
        });
        this.visible = false;
        this.menuItems = [];
        this.on('select', function (event) {
            if (!ApiService_1.ApiService.latestPosts)
                return;
            var post = ApiService_1.ApiService.latestPosts.items[event.itemIndex];
            ApiService_1.ApiService.info(post.id).then(function () {
                new DetailCard_1.DetailCard(post).show();
            });
        });
        this.on('show', function () {
            _this.visible = true;
        });
        this.on('hide', function () {
            _this.visible = false;
        });
        ApiService_1.ApiService.latestPostsObserver.subscribe(function (data) {
            _this.updateItems();
            if (_this.visible) {
                console.log('Updating infos in visible list');
                ApiService_1.ApiService.updateInfos().then(function () {
                    _this.updateItems();
                });
            }
        });
    }
    LatestPostsMenu.prototype.updateItems = function () {
        var _this = this;
        if (!ApiService_1.ApiService.latestPosts) {
            if (ApiService_1.ApiService.updatePromise)
                ApiService_1.ApiService.updatePromise.then(function () { return _this.updateItems(); });
            return;
        }
        this.menuItems = [];
        ApiService_1.ApiService.latestPosts.items.forEach(function (item) {
            var listItem = {
                title: (item.up - item.down) + ": " + item.user,
                subtitle: "...",
            };
            if (item.info)
                listItem.subtitle = ApiService_1.ApiService.formatTags(item.info.tags, 4, 0.1);
            _this.menuItems.push(listItem);
        });
        this.items(0, this.menuItems);
    };
    LatestPostsMenu.prototype.show = function () {
        var _this = this;
        this.updateItems();
        ApiService_1.ApiService.updateInfos().then(function () {
            _this.updateItems();
        });
        _super.prototype.show.call(this);
        return this;
    };
    return LatestPostsMenu;
}(UI.Menu));
exports.LatestPostsMenu = LatestPostsMenu;

},{"../core/ApiService":2,"./DetailCard":5,"ui":undefined}],8:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var UI = require('ui');
var ApiService_1 = require('../core/ApiService');
var LatestPostsMenu_1 = require('./LatestPostsMenu');
var MainCard = (function (_super) {
    __extends(MainCard, _super);
    function MainCard() {
        var _this = this;
        _super.call(this, {
            title: 'Pr0 Status',
            icon: 'images/menu_icon.png',
            subtitle: 'Letzter Post',
            body: 'Lade...',
        });
        this.latestPostsMenu = new LatestPostsMenu_1.LatestPostsMenu();
        this.on('click', 'select', function (e) {
            this.latestPostsMenu.show();
        });
        ApiService_1.ApiService.latestPostsObserver.subscribe(function (data) {
            var lastPost = data.items[0];
            _this.subtitle("" + lastPost.user);
            _this.body("Vor " + ApiService_1.ApiService.minutesSince(lastPost.created) + " min\n+" + lastPost.up + " / -" + lastPost.down + " / " + (lastPost.up - lastPost.down));
        });
    }
    return MainCard;
}(UI.Card));
exports.MainCard = MainCard;

},{"../core/ApiService":2,"./LatestPostsMenu":7,"ui":undefined}],9:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var UI = require('ui');
var ApiService_1 = require('../core/ApiService');
var updateIntervalList = {
    10: 30,
    30: 60,
    60: 120,
    120: 10,
};
var SettingsMenu = (function (_super) {
    __extends(SettingsMenu, _super);
    function SettingsMenu() {
        var _this = this;
        _super.call(this, {
            sections: [{
                    title: 'Einstellungen',
                    items: []
                }]
        });
        this.update();
        this.on('show', function () {
            _this.update();
        });
        this.on('select', function (event) {
            switch (event.itemIndex) {
                case 0:
                    ApiService_1.ApiService.promoted = !ApiService_1.ApiService.promoted;
                    ApiService_1.ApiService.update();
                    break;
                case 1:
                    ApiService_1.ApiService.flags = ApiService_1.ApiService.toggleFlag(ApiService_1.ApiService.flags, ApiService_1.ApiService.Flags.SFW);
                    ApiService_1.ApiService.update();
                    break;
                case 2:
                    ApiService_1.ApiService.flags = ApiService_1.ApiService.toggleFlag(ApiService_1.ApiService.flags, ApiService_1.ApiService.Flags.NSFW);
                    ApiService_1.ApiService.update();
                    break;
                case 3:
                    ApiService_1.ApiService.flags = ApiService_1.ApiService.toggleFlag(ApiService_1.ApiService.flags, ApiService_1.ApiService.Flags.NSFL);
                    ApiService_1.ApiService.update();
                    break;
                case 4:
                    ApiService_1.ApiService.setUpdateInterval(updateIntervalList[ApiService_1.ApiService.updateInterval] || 10);
                    break;
            }
            ApiService_1.ApiService.save();
            _this.update();
        });
    }
    SettingsMenu.prototype.update = function () {
        var listItems = [
            {
                title: 'Nur beliebt',
                subtitle: ApiService_1.ApiService.promoted ? 'An' : 'Aus',
            },
            {
                title: 'SFW',
                subtitle: ApiService_1.ApiService.flags & ApiService_1.ApiService.Flags.SFW ? 'An' : 'Aus',
            },
            {
                title: 'NSFW',
                subtitle: ApiService_1.ApiService.flags & ApiService_1.ApiService.Flags.NSFW ? 'An' : 'Aus',
            },
            {
                title: 'NSFL',
                subtitle: ApiService_1.ApiService.flags & ApiService_1.ApiService.Flags.NSFL ? 'An' : 'Aus',
            },
            {
                title: 'Update Interval',
                subtitle: ApiService_1.ApiService.updateInterval.toString(),
            },
        ];
        this.items(0, listItems);
    };
    return SettingsMenu;
}(UI.Menu));
exports.SettingsMenu = SettingsMenu;

},{"../core/ApiService":2,"ui":undefined}],10:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var UI = require('ui');
var Vector2 = require('vector2');
var ApiService_1 = require('../core/ApiService');
var SettingsMenu_1 = require('./SettingsMenu');
var SplashWindow = (function (_super) {
    __extends(SplashWindow, _super);
    function SplashWindow() {
        _super.call(this, {
            backgroundColor: 'black',
            fullscreen: false,
            scrollable: false,
        });
        this.add(new UI.Image({
            image: 'IMAGES_LOGO',
            size: new Vector2(120, 120),
            position: new Vector2(12, 30)
        }));
        this.username = new UI.Text({
            text: ApiService_1.ApiService.username,
            color: 'white',
            textAlign: 'center',
            textOverflow: 'fill',
            position: new Vector2(0, 0),
            size: new Vector2(144, 14)
        });
        this.add(this.username);
        this.on('click', 'select', function (e) {
            SplashWindow.settingsMenu.show();
        });
    }
    SplashWindow.settingsMenu = new SettingsMenu_1.SettingsMenu();
    return SplashWindow;
}(UI.Window));
exports.SplashWindow = SplashWindow;

},{"../core/ApiService":2,"./SettingsMenu":9,"ui":undefined,"vector2":undefined}],11:[function(require,module,exports){
"use strict";
var Tabs = (function () {
    function Tabs() {
        this.tabs = [];
        this.current = 0;
    }
    Tabs.prototype.addTab = function (tab) {
        var _this = this;
        this.tabs.push(tab);
        tab.on('click', 'up', function (clickEvent) {
            _this.prev();
        });
        tab.on('click', 'down', function (clickEvent) {
            _this.next();
        });
    };
    Tabs.prototype.checkIndex = function () {
        if (this.current >= this.tabs.length)
            this.current = 0;
        if (this.current < 0)
            this.current = this.tabs.length - 1;
    };
    Tabs.prototype.hide = function () {
        this.checkIndex();
        if (this.current >= 0)
            this.tabs[this.current].hide();
    };
    Tabs.prototype.show = function () {
        this.checkIndex();
        if (this.current >= 0)
            this.tabs[this.current].show();
    };
    Tabs.prototype.next = function () {
        this.hide();
        this.current++;
        this.show();
    };
    Tabs.prototype.prev = function () {
        this.hide();
        this.current--;
        this.show();
    };
    return Tabs;
}());
exports.Tabs = Tabs;

},{}],12:[function(require,module,exports){
(function (global){
/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/jakearchibald/es6-promise/master/LICENSE
 * @version   3.1.2
 */

(function() {
    "use strict";
    function lib$es6$promise$utils$$objectOrFunction(x) {
      return typeof x === 'function' || (typeof x === 'object' && x !== null);
    }

    function lib$es6$promise$utils$$isFunction(x) {
      return typeof x === 'function';
    }

    function lib$es6$promise$utils$$isMaybeThenable(x) {
      return typeof x === 'object' && x !== null;
    }

    var lib$es6$promise$utils$$_isArray;
    if (!Array.isArray) {
      lib$es6$promise$utils$$_isArray = function (x) {
        return Object.prototype.toString.call(x) === '[object Array]';
      };
    } else {
      lib$es6$promise$utils$$_isArray = Array.isArray;
    }

    var lib$es6$promise$utils$$isArray = lib$es6$promise$utils$$_isArray;
    var lib$es6$promise$asap$$len = 0;
    var lib$es6$promise$asap$$vertxNext;
    var lib$es6$promise$asap$$customSchedulerFn;

    var lib$es6$promise$asap$$asap = function asap(callback, arg) {
      lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len] = callback;
      lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len + 1] = arg;
      lib$es6$promise$asap$$len += 2;
      if (lib$es6$promise$asap$$len === 2) {
        // If len is 2, that means that we need to schedule an async flush.
        // If additional callbacks are queued before the queue is flushed, they
        // will be processed by this flush that we are scheduling.
        if (lib$es6$promise$asap$$customSchedulerFn) {
          lib$es6$promise$asap$$customSchedulerFn(lib$es6$promise$asap$$flush);
        } else {
          lib$es6$promise$asap$$scheduleFlush();
        }
      }
    }

    function lib$es6$promise$asap$$setScheduler(scheduleFn) {
      lib$es6$promise$asap$$customSchedulerFn = scheduleFn;
    }

    function lib$es6$promise$asap$$setAsap(asapFn) {
      lib$es6$promise$asap$$asap = asapFn;
    }

    var lib$es6$promise$asap$$browserWindow = (typeof window !== 'undefined') ? window : undefined;
    var lib$es6$promise$asap$$browserGlobal = lib$es6$promise$asap$$browserWindow || {};
    var lib$es6$promise$asap$$BrowserMutationObserver = lib$es6$promise$asap$$browserGlobal.MutationObserver || lib$es6$promise$asap$$browserGlobal.WebKitMutationObserver;
    var lib$es6$promise$asap$$isNode = typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

    // test for web worker but not in IE10
    var lib$es6$promise$asap$$isWorker = typeof Uint8ClampedArray !== 'undefined' &&
      typeof importScripts !== 'undefined' &&
      typeof MessageChannel !== 'undefined';

    // node
    function lib$es6$promise$asap$$useNextTick() {
      // node version 0.10.x displays a deprecation warning when nextTick is used recursively
      // see https://github.com/cujojs/when/issues/410 for details
      return function() {
        process.nextTick(lib$es6$promise$asap$$flush);
      };
    }

    // vertx
    function lib$es6$promise$asap$$useVertxTimer() {
      return function() {
        lib$es6$promise$asap$$vertxNext(lib$es6$promise$asap$$flush);
      };
    }

    function lib$es6$promise$asap$$useMutationObserver() {
      var iterations = 0;
      var observer = new lib$es6$promise$asap$$BrowserMutationObserver(lib$es6$promise$asap$$flush);
      var node = document.createTextNode('');
      observer.observe(node, { characterData: true });

      return function() {
        node.data = (iterations = ++iterations % 2);
      };
    }

    // web worker
    function lib$es6$promise$asap$$useMessageChannel() {
      var channel = new MessageChannel();
      channel.port1.onmessage = lib$es6$promise$asap$$flush;
      return function () {
        channel.port2.postMessage(0);
      };
    }

    function lib$es6$promise$asap$$useSetTimeout() {
      return function() {
        setTimeout(lib$es6$promise$asap$$flush, 1);
      };
    }

    var lib$es6$promise$asap$$queue = new Array(1000);
    function lib$es6$promise$asap$$flush() {
      for (var i = 0; i < lib$es6$promise$asap$$len; i+=2) {
        var callback = lib$es6$promise$asap$$queue[i];
        var arg = lib$es6$promise$asap$$queue[i+1];

        callback(arg);

        lib$es6$promise$asap$$queue[i] = undefined;
        lib$es6$promise$asap$$queue[i+1] = undefined;
      }

      lib$es6$promise$asap$$len = 0;
    }

    function lib$es6$promise$asap$$attemptVertx() {
      try {
        var r = require;
        var vertx = r('vertx');
        lib$es6$promise$asap$$vertxNext = vertx.runOnLoop || vertx.runOnContext;
        return lib$es6$promise$asap$$useVertxTimer();
      } catch(e) {
        return lib$es6$promise$asap$$useSetTimeout();
      }
    }

    var lib$es6$promise$asap$$scheduleFlush;
    // Decide what async method to use to triggering processing of queued callbacks:
    if (lib$es6$promise$asap$$isNode) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useNextTick();
    } else if (lib$es6$promise$asap$$BrowserMutationObserver) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMutationObserver();
    } else if (lib$es6$promise$asap$$isWorker) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMessageChannel();
    } else if (lib$es6$promise$asap$$browserWindow === undefined && typeof require === 'function') {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$attemptVertx();
    } else {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useSetTimeout();
    }
    function lib$es6$promise$then$$then(onFulfillment, onRejection) {
      var parent = this;
      var state = parent._state;

      if (state === lib$es6$promise$$internal$$FULFILLED && !onFulfillment || state === lib$es6$promise$$internal$$REJECTED && !onRejection) {
        return this;
      }

      var child = new this.constructor(lib$es6$promise$$internal$$noop);
      var result = parent._result;

      if (state) {
        var callback = arguments[state - 1];
        lib$es6$promise$asap$$asap(function(){
          lib$es6$promise$$internal$$invokeCallback(state, child, callback, result);
        });
      } else {
        lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection);
      }

      return child;
    }
    var lib$es6$promise$then$$default = lib$es6$promise$then$$then;
    function lib$es6$promise$promise$resolve$$resolve(object) {
      /*jshint validthis:true */
      var Constructor = this;

      if (object && typeof object === 'object' && object.constructor === Constructor) {
        return object;
      }

      var promise = new Constructor(lib$es6$promise$$internal$$noop);
      lib$es6$promise$$internal$$resolve(promise, object);
      return promise;
    }
    var lib$es6$promise$promise$resolve$$default = lib$es6$promise$promise$resolve$$resolve;

    function lib$es6$promise$$internal$$noop() {}

    var lib$es6$promise$$internal$$PENDING   = void 0;
    var lib$es6$promise$$internal$$FULFILLED = 1;
    var lib$es6$promise$$internal$$REJECTED  = 2;

    var lib$es6$promise$$internal$$GET_THEN_ERROR = new lib$es6$promise$$internal$$ErrorObject();

    function lib$es6$promise$$internal$$selfFulfillment() {
      return new TypeError("You cannot resolve a promise with itself");
    }

    function lib$es6$promise$$internal$$cannotReturnOwn() {
      return new TypeError('A promises callback cannot return that same promise.');
    }

    function lib$es6$promise$$internal$$getThen(promise) {
      try {
        return promise.then;
      } catch(error) {
        lib$es6$promise$$internal$$GET_THEN_ERROR.error = error;
        return lib$es6$promise$$internal$$GET_THEN_ERROR;
      }
    }

    function lib$es6$promise$$internal$$tryThen(then, value, fulfillmentHandler, rejectionHandler) {
      try {
        then.call(value, fulfillmentHandler, rejectionHandler);
      } catch(e) {
        return e;
      }
    }

    function lib$es6$promise$$internal$$handleForeignThenable(promise, thenable, then) {
       lib$es6$promise$asap$$asap(function(promise) {
        var sealed = false;
        var error = lib$es6$promise$$internal$$tryThen(then, thenable, function(value) {
          if (sealed) { return; }
          sealed = true;
          if (thenable !== value) {
            lib$es6$promise$$internal$$resolve(promise, value);
          } else {
            lib$es6$promise$$internal$$fulfill(promise, value);
          }
        }, function(reason) {
          if (sealed) { return; }
          sealed = true;

          lib$es6$promise$$internal$$reject(promise, reason);
        }, 'Settle: ' + (promise._label || ' unknown promise'));

        if (!sealed && error) {
          sealed = true;
          lib$es6$promise$$internal$$reject(promise, error);
        }
      }, promise);
    }

    function lib$es6$promise$$internal$$handleOwnThenable(promise, thenable) {
      if (thenable._state === lib$es6$promise$$internal$$FULFILLED) {
        lib$es6$promise$$internal$$fulfill(promise, thenable._result);
      } else if (thenable._state === lib$es6$promise$$internal$$REJECTED) {
        lib$es6$promise$$internal$$reject(promise, thenable._result);
      } else {
        lib$es6$promise$$internal$$subscribe(thenable, undefined, function(value) {
          lib$es6$promise$$internal$$resolve(promise, value);
        }, function(reason) {
          lib$es6$promise$$internal$$reject(promise, reason);
        });
      }
    }

    function lib$es6$promise$$internal$$handleMaybeThenable(promise, maybeThenable, then) {
      if (maybeThenable.constructor === promise.constructor &&
          then === lib$es6$promise$then$$default &&
          constructor.resolve === lib$es6$promise$promise$resolve$$default) {
        lib$es6$promise$$internal$$handleOwnThenable(promise, maybeThenable);
      } else {
        if (then === lib$es6$promise$$internal$$GET_THEN_ERROR) {
          lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$GET_THEN_ERROR.error);
        } else if (then === undefined) {
          lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
        } else if (lib$es6$promise$utils$$isFunction(then)) {
          lib$es6$promise$$internal$$handleForeignThenable(promise, maybeThenable, then);
        } else {
          lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
        }
      }
    }

    function lib$es6$promise$$internal$$resolve(promise, value) {
      if (promise === value) {
        lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$selfFulfillment());
      } else if (lib$es6$promise$utils$$objectOrFunction(value)) {
        lib$es6$promise$$internal$$handleMaybeThenable(promise, value, lib$es6$promise$$internal$$getThen(value));
      } else {
        lib$es6$promise$$internal$$fulfill(promise, value);
      }
    }

    function lib$es6$promise$$internal$$publishRejection(promise) {
      if (promise._onerror) {
        promise._onerror(promise._result);
      }

      lib$es6$promise$$internal$$publish(promise);
    }

    function lib$es6$promise$$internal$$fulfill(promise, value) {
      if (promise._state !== lib$es6$promise$$internal$$PENDING) { return; }

      promise._result = value;
      promise._state = lib$es6$promise$$internal$$FULFILLED;

      if (promise._subscribers.length !== 0) {
        lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publish, promise);
      }
    }

    function lib$es6$promise$$internal$$reject(promise, reason) {
      if (promise._state !== lib$es6$promise$$internal$$PENDING) { return; }
      promise._state = lib$es6$promise$$internal$$REJECTED;
      promise._result = reason;

      lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publishRejection, promise);
    }

    function lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection) {
      var subscribers = parent._subscribers;
      var length = subscribers.length;

      parent._onerror = null;

      subscribers[length] = child;
      subscribers[length + lib$es6$promise$$internal$$FULFILLED] = onFulfillment;
      subscribers[length + lib$es6$promise$$internal$$REJECTED]  = onRejection;

      if (length === 0 && parent._state) {
        lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publish, parent);
      }
    }

    function lib$es6$promise$$internal$$publish(promise) {
      var subscribers = promise._subscribers;
      var settled = promise._state;

      if (subscribers.length === 0) { return; }

      var child, callback, detail = promise._result;

      for (var i = 0; i < subscribers.length; i += 3) {
        child = subscribers[i];
        callback = subscribers[i + settled];

        if (child) {
          lib$es6$promise$$internal$$invokeCallback(settled, child, callback, detail);
        } else {
          callback(detail);
        }
      }

      promise._subscribers.length = 0;
    }

    function lib$es6$promise$$internal$$ErrorObject() {
      this.error = null;
    }

    var lib$es6$promise$$internal$$TRY_CATCH_ERROR = new lib$es6$promise$$internal$$ErrorObject();

    function lib$es6$promise$$internal$$tryCatch(callback, detail) {
      try {
        return callback(detail);
      } catch(e) {
        lib$es6$promise$$internal$$TRY_CATCH_ERROR.error = e;
        return lib$es6$promise$$internal$$TRY_CATCH_ERROR;
      }
    }

    function lib$es6$promise$$internal$$invokeCallback(settled, promise, callback, detail) {
      var hasCallback = lib$es6$promise$utils$$isFunction(callback),
          value, error, succeeded, failed;

      if (hasCallback) {
        value = lib$es6$promise$$internal$$tryCatch(callback, detail);

        if (value === lib$es6$promise$$internal$$TRY_CATCH_ERROR) {
          failed = true;
          error = value.error;
          value = null;
        } else {
          succeeded = true;
        }

        if (promise === value) {
          lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$cannotReturnOwn());
          return;
        }

      } else {
        value = detail;
        succeeded = true;
      }

      if (promise._state !== lib$es6$promise$$internal$$PENDING) {
        // noop
      } else if (hasCallback && succeeded) {
        lib$es6$promise$$internal$$resolve(promise, value);
      } else if (failed) {
        lib$es6$promise$$internal$$reject(promise, error);
      } else if (settled === lib$es6$promise$$internal$$FULFILLED) {
        lib$es6$promise$$internal$$fulfill(promise, value);
      } else if (settled === lib$es6$promise$$internal$$REJECTED) {
        lib$es6$promise$$internal$$reject(promise, value);
      }
    }

    function lib$es6$promise$$internal$$initializePromise(promise, resolver) {
      try {
        resolver(function resolvePromise(value){
          lib$es6$promise$$internal$$resolve(promise, value);
        }, function rejectPromise(reason) {
          lib$es6$promise$$internal$$reject(promise, reason);
        });
      } catch(e) {
        lib$es6$promise$$internal$$reject(promise, e);
      }
    }

    function lib$es6$promise$promise$all$$all(entries) {
      return new lib$es6$promise$enumerator$$default(this, entries).promise;
    }
    var lib$es6$promise$promise$all$$default = lib$es6$promise$promise$all$$all;
    function lib$es6$promise$promise$race$$race(entries) {
      /*jshint validthis:true */
      var Constructor = this;

      var promise = new Constructor(lib$es6$promise$$internal$$noop);

      if (!lib$es6$promise$utils$$isArray(entries)) {
        lib$es6$promise$$internal$$reject(promise, new TypeError('You must pass an array to race.'));
        return promise;
      }

      var length = entries.length;

      function onFulfillment(value) {
        lib$es6$promise$$internal$$resolve(promise, value);
      }

      function onRejection(reason) {
        lib$es6$promise$$internal$$reject(promise, reason);
      }

      for (var i = 0; promise._state === lib$es6$promise$$internal$$PENDING && i < length; i++) {
        lib$es6$promise$$internal$$subscribe(Constructor.resolve(entries[i]), undefined, onFulfillment, onRejection);
      }

      return promise;
    }
    var lib$es6$promise$promise$race$$default = lib$es6$promise$promise$race$$race;
    function lib$es6$promise$promise$reject$$reject(reason) {
      /*jshint validthis:true */
      var Constructor = this;
      var promise = new Constructor(lib$es6$promise$$internal$$noop);
      lib$es6$promise$$internal$$reject(promise, reason);
      return promise;
    }
    var lib$es6$promise$promise$reject$$default = lib$es6$promise$promise$reject$$reject;

    var lib$es6$promise$promise$$counter = 0;

    function lib$es6$promise$promise$$needsResolver() {
      throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
    }

    function lib$es6$promise$promise$$needsNew() {
      throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
    }

    var lib$es6$promise$promise$$default = lib$es6$promise$promise$$Promise;
    /**
      Promise objects represent the eventual result of an asynchronous operation. The
      primary way of interacting with a promise is through its `then` method, which
      registers callbacks to receive either a promise's eventual value or the reason
      why the promise cannot be fulfilled.

      Terminology
      -----------

      - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
      - `thenable` is an object or function that defines a `then` method.
      - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
      - `exception` is a value that is thrown using the throw statement.
      - `reason` is a value that indicates why a promise was rejected.
      - `settled` the final resting state of a promise, fulfilled or rejected.

      A promise can be in one of three states: pending, fulfilled, or rejected.

      Promises that are fulfilled have a fulfillment value and are in the fulfilled
      state.  Promises that are rejected have a rejection reason and are in the
      rejected state.  A fulfillment value is never a thenable.

      Promises can also be said to *resolve* a value.  If this value is also a
      promise, then the original promise's settled state will match the value's
      settled state.  So a promise that *resolves* a promise that rejects will
      itself reject, and a promise that *resolves* a promise that fulfills will
      itself fulfill.


      Basic Usage:
      ------------

      ```js
      var promise = new Promise(function(resolve, reject) {
        // on success
        resolve(value);

        // on failure
        reject(reason);
      });

      promise.then(function(value) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Advanced Usage:
      ---------------

      Promises shine when abstracting away asynchronous interactions such as
      `XMLHttpRequest`s.

      ```js
      function getJSON(url) {
        return new Promise(function(resolve, reject){
          var xhr = new XMLHttpRequest();

          xhr.open('GET', url);
          xhr.onreadystatechange = handler;
          xhr.responseType = 'json';
          xhr.setRequestHeader('Accept', 'application/json');
          xhr.send();

          function handler() {
            if (this.readyState === this.DONE) {
              if (this.status === 200) {
                resolve(this.response);
              } else {
                reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
              }
            }
          };
        });
      }

      getJSON('/posts.json').then(function(json) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Unlike callbacks, promises are great composable primitives.

      ```js
      Promise.all([
        getJSON('/posts'),
        getJSON('/comments')
      ]).then(function(values){
        values[0] // => postsJSON
        values[1] // => commentsJSON

        return values;
      });
      ```

      @class Promise
      @param {function} resolver
      Useful for tooling.
      @constructor
    */
    function lib$es6$promise$promise$$Promise(resolver) {
      this._id = lib$es6$promise$promise$$counter++;
      this._state = undefined;
      this._result = undefined;
      this._subscribers = [];

      if (lib$es6$promise$$internal$$noop !== resolver) {
        typeof resolver !== 'function' && lib$es6$promise$promise$$needsResolver();
        this instanceof lib$es6$promise$promise$$Promise ? lib$es6$promise$$internal$$initializePromise(this, resolver) : lib$es6$promise$promise$$needsNew();
      }
    }

    lib$es6$promise$promise$$Promise.all = lib$es6$promise$promise$all$$default;
    lib$es6$promise$promise$$Promise.race = lib$es6$promise$promise$race$$default;
    lib$es6$promise$promise$$Promise.resolve = lib$es6$promise$promise$resolve$$default;
    lib$es6$promise$promise$$Promise.reject = lib$es6$promise$promise$reject$$default;
    lib$es6$promise$promise$$Promise._setScheduler = lib$es6$promise$asap$$setScheduler;
    lib$es6$promise$promise$$Promise._setAsap = lib$es6$promise$asap$$setAsap;
    lib$es6$promise$promise$$Promise._asap = lib$es6$promise$asap$$asap;

    lib$es6$promise$promise$$Promise.prototype = {
      constructor: lib$es6$promise$promise$$Promise,

    /**
      The primary way of interacting with a promise is through its `then` method,
      which registers callbacks to receive either a promise's eventual value or the
      reason why the promise cannot be fulfilled.

      ```js
      findUser().then(function(user){
        // user is available
      }, function(reason){
        // user is unavailable, and you are given the reason why
      });
      ```

      Chaining
      --------

      The return value of `then` is itself a promise.  This second, 'downstream'
      promise is resolved with the return value of the first promise's fulfillment
      or rejection handler, or rejected if the handler throws an exception.

      ```js
      findUser().then(function (user) {
        return user.name;
      }, function (reason) {
        return 'default name';
      }).then(function (userName) {
        // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
        // will be `'default name'`
      });

      findUser().then(function (user) {
        throw new Error('Found user, but still unhappy');
      }, function (reason) {
        throw new Error('`findUser` rejected and we're unhappy');
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
        // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
      });
      ```
      If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.

      ```js
      findUser().then(function (user) {
        throw new PedagogicalException('Upstream error');
      }).then(function (value) {
        // never reached
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // The `PedgagocialException` is propagated all the way down to here
      });
      ```

      Assimilation
      ------------

      Sometimes the value you want to propagate to a downstream promise can only be
      retrieved asynchronously. This can be achieved by returning a promise in the
      fulfillment or rejection handler. The downstream promise will then be pending
      until the returned promise is settled. This is called *assimilation*.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // The user's comments are now available
      });
      ```

      If the assimliated promise rejects, then the downstream promise will also reject.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // If `findCommentsByAuthor` fulfills, we'll have the value here
      }, function (reason) {
        // If `findCommentsByAuthor` rejects, we'll have the reason here
      });
      ```

      Simple Example
      --------------

      Synchronous Example

      ```javascript
      var result;

      try {
        result = findResult();
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js
      findResult(function(result, err){
        if (err) {
          // failure
        } else {
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findResult().then(function(result){
        // success
      }, function(reason){
        // failure
      });
      ```

      Advanced Example
      --------------

      Synchronous Example

      ```javascript
      var author, books;

      try {
        author = findAuthor();
        books  = findBooksByAuthor(author);
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js

      function foundBooks(books) {

      }

      function failure(reason) {

      }

      findAuthor(function(author, err){
        if (err) {
          failure(err);
          // failure
        } else {
          try {
            findBoooksByAuthor(author, function(books, err) {
              if (err) {
                failure(err);
              } else {
                try {
                  foundBooks(books);
                } catch(reason) {
                  failure(reason);
                }
              }
            });
          } catch(error) {
            failure(err);
          }
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findAuthor().
        then(findBooksByAuthor).
        then(function(books){
          // found books
      }).catch(function(reason){
        // something went wrong
      });
      ```

      @method then
      @param {Function} onFulfilled
      @param {Function} onRejected
      Useful for tooling.
      @return {Promise}
    */
      then: lib$es6$promise$then$$default,

    /**
      `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
      as the catch block of a try/catch statement.

      ```js
      function findAuthor(){
        throw new Error('couldn't find that author');
      }

      // synchronous
      try {
        findAuthor();
      } catch(reason) {
        // something went wrong
      }

      // async with promises
      findAuthor().catch(function(reason){
        // something went wrong
      });
      ```

      @method catch
      @param {Function} onRejection
      Useful for tooling.
      @return {Promise}
    */
      'catch': function(onRejection) {
        return this.then(null, onRejection);
      }
    };
    var lib$es6$promise$enumerator$$default = lib$es6$promise$enumerator$$Enumerator;
    function lib$es6$promise$enumerator$$Enumerator(Constructor, input) {
      this._instanceConstructor = Constructor;
      this.promise = new Constructor(lib$es6$promise$$internal$$noop);

      if (Array.isArray(input)) {
        this._input     = input;
        this.length     = input.length;
        this._remaining = input.length;

        this._result = new Array(this.length);

        if (this.length === 0) {
          lib$es6$promise$$internal$$fulfill(this.promise, this._result);
        } else {
          this.length = this.length || 0;
          this._enumerate();
          if (this._remaining === 0) {
            lib$es6$promise$$internal$$fulfill(this.promise, this._result);
          }
        }
      } else {
        lib$es6$promise$$internal$$reject(this.promise, this._validationError());
      }
    }

    lib$es6$promise$enumerator$$Enumerator.prototype._validationError = function() {
      return new Error('Array Methods must be provided an Array');
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._enumerate = function() {
      var length  = this.length;
      var input   = this._input;

      for (var i = 0; this._state === lib$es6$promise$$internal$$PENDING && i < length; i++) {
        this._eachEntry(input[i], i);
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._eachEntry = function(entry, i) {
      var c = this._instanceConstructor;
      var resolve = c.resolve;

      if (resolve === lib$es6$promise$promise$resolve$$default) {
        var then = lib$es6$promise$$internal$$getThen(entry);

        if (then === lib$es6$promise$then$$default &&
            entry._state !== lib$es6$promise$$internal$$PENDING) {
          this._settledAt(entry._state, i, entry._result);
        } else if (typeof then !== 'function') {
          this._remaining--;
          this._result[i] = entry;
        } else if (c === lib$es6$promise$promise$$default) {
          var promise = new c(lib$es6$promise$$internal$$noop);
          lib$es6$promise$$internal$$handleMaybeThenable(promise, entry, then);
          this._willSettleAt(promise, i);
        } else {
          this._willSettleAt(new c(function(resolve) { resolve(entry); }), i);
        }
      } else {
        this._willSettleAt(resolve(entry), i);
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._settledAt = function(state, i, value) {
      var promise = this.promise;

      if (promise._state === lib$es6$promise$$internal$$PENDING) {
        this._remaining--;

        if (state === lib$es6$promise$$internal$$REJECTED) {
          lib$es6$promise$$internal$$reject(promise, value);
        } else {
          this._result[i] = value;
        }
      }

      if (this._remaining === 0) {
        lib$es6$promise$$internal$$fulfill(promise, this._result);
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._willSettleAt = function(promise, i) {
      var enumerator = this;

      lib$es6$promise$$internal$$subscribe(promise, undefined, function(value) {
        enumerator._settledAt(lib$es6$promise$$internal$$FULFILLED, i, value);
      }, function(reason) {
        enumerator._settledAt(lib$es6$promise$$internal$$REJECTED, i, reason);
      });
    };
    function lib$es6$promise$polyfill$$polyfill() {
      var local;

      if (typeof global !== 'undefined') {
          local = global;
      } else if (typeof self !== 'undefined') {
          local = self;
      } else {
          try {
              local = Function('return this')();
          } catch (e) {
              throw new Error('polyfill failed because global object is unavailable in this environment');
          }
      }

      var P = local.Promise;

      if (P && Object.prototype.toString.call(P.resolve()) === '[object Promise]' && !P.cast) {
        return;
      }

      local.Promise = lib$es6$promise$promise$$default;
    }
    var lib$es6$promise$polyfill$$default = lib$es6$promise$polyfill$$polyfill;

    var lib$es6$promise$umd$$ES6Promise = {
      'Promise': lib$es6$promise$promise$$default,
      'polyfill': lib$es6$promise$polyfill$$default
    };

    /* global define:true module:true window: true */
    if (typeof define === 'function' && define['amd']) {
      define(function() { return lib$es6$promise$umd$$ES6Promise; });
    } else if (typeof module !== 'undefined' && module['exports']) {
      module['exports'] = lib$es6$promise$umd$$ES6Promise;
    } else if (typeof this !== 'undefined') {
      this['ES6Promise'] = lib$es6$promise$umd$$ES6Promise;
    }

    lib$es6$promise$polyfill$$default();
}).call(this);


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[1]);
