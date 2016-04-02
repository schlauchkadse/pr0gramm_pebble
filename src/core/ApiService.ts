import ajax = require('ajax');
import Vibe = require('ui/vibe');
import Accel = require('ui/accel');
import Settings = require('settings');

import {Promise} from 'es6-promise';
import {Observer} from '../lib/observer';

// export var ApiService = new ApiService();

export module ApiService {

    export enum Flags {
        NONE = 0,
        SFW = 1 << 0,
        NSFW = 1 << 1,
        NSFL = 1 << 2,
        ALL = Flags.SFW | Flags.NSFW | Flags.NSFL,
    }

    export const BASE_URL = `http://pr0gramm.com/api/`;

    export const THUMB_URL = `http://thumb.pr0gramm.com/`;

    export const URL_ITEMS = `${BASE_URL}items/get`;

    export const URL_INFO = `${BASE_URL}items/info`;

    export const URL_USER = `${BASE_URL}profile/info?name=`;

    // Settings

    export var username: string;

    export var flags: number = Flags.ALL; // Flags.SFW | Flags.NSFL;

    export var promoted: boolean = false;

    export var fetchListTags: boolean = true;

    export var updateInterval: number = 10;

    // Other stuff

    export var updatePromise: Promise<ILatestPosts> = null;

    export var postMap: { [key: number]: IPost } = {};

    export var latestPosts: ILatestPosts = null;

    export var latestPostId: number;

    export var latestPostsObserver = new Observer<ILatestPosts>();

    var antiCacheValue: number = 0;

    var updateTimer: number;

    function init() {
        load();
        // Accel.init();
        // Accel.on('tap', () => {
        //     // console.log('Accel tap');
        //     ApiService.update().then(() => {
        //         Vibe.vibrate('short');
        //     });
        // });
    }

    export function load() {
        username = Settings.option('username') || '';
        flags = Settings.option('flags') || (Flags.SFW | Flags.NSFL);
        setUpdateInterval(Settings.option('interval') || 10);
        promoted = Settings.option('promoted') ? true : false;
        fetchListTags = Settings.option('fetchListTags') ? true : false;
    }

    export function save() {
        Settings.option('username', username);
        Settings.option('flags', flags);
        Settings.option('interval', updateInterval);
        Settings.option('promoted', promoted);
        Settings.option('fetchListTags', fetchListTags);
    }

    export function setUpdateInterval(value: number) {
        updateInterval = value;
        if (!updateInterval || updateInterval < 10)
            updateInterval = 10;
        clearInterval(updateTimer);
        updateTimer = setInterval(update, updateInterval * 1000);
    }

    export function formatTags(tags: IPostTag[], maxTags: number = 8, minConfidence: number = 0.1) {
        var tagNames: string[] = [];
        tags.forEach((t) => {
            if (tagNames.length < maxTags && t.confidence > minConfidence)
                tagNames.push(t.tag);
        });
        return tagNames.join(', ');
    }

    export function minutesSince(timestamp: number): number {
        return Math.floor((Date.now() / 1000 - timestamp) / 60);
    }

    export function formatTimeSince(timestamp: number): string {
        var delta = Date.now() / 1000 - timestamp;
        var m: string = Math.floor(delta).toString();
        var h: string = Math.floor(delta /= 60).toString();
        if (m.length === 1)
            m = '0' + m;
        if (h.length === 1)
            h = '0' + h;
        return `${m}:${h}`;
    }

    export function toggleFlag(value, flag) {
        return (value & flag) ? value & ~flag : value | flag;
    }

    export function updateInfos() {
		console.log('fetching infos...');
        return new Promise<void>((resolve, reject) => {
            var index: number = 0;
            function fetchInfo() {
                if (index >= latestPosts.items.length)
                    return resolve();
                var id = latestPosts.items[index++].id;
                ApiService.info(id)
                    // .then(() => { console.log(`Fetched info for #${id}`); })
                    .then(fetchInfo);
            }
            for (var i = 0; i < 6; i++) {
                fetchInfo();
            }
        });
    }

    export function info(id: number, skipCache: boolean = false) {
        return new Promise<IPostInfo>((resolve, reject) => {
            // console.log(`postMap[id] = ${JSON.stringify(postMap[id])}`);
            if (!postMap[id]) {
                console.error(`Missing post data #${id}. Fetching...`);
                update(id).then(() => {
                    info(id);
                });
                return;
            }
            if (postMap[id].info) {
                if (!skipCache && postMap[id].index >= 6 && postMap[id].info.ts > latestPosts.ts - 120) {
                    // Return cached data
                    // console.log(`Using cached info #${id}.`);
                    return resolve(postMap[id].info);
                }
                // console.log(`Cache invalidated #${id}. ts = ${postMap[id].info.ts} / now = ${latestPosts.ts}`);
            }
            // console.log(`Fetching info #${id}.`);
            ajax(<pebblejs.IAjaxOptions>
                {
                    url: `${URL_INFO}?itemId=${id}&v=${antiCacheValue++}`,
                    type: 'json',
                    method: 'GET',
                    async: true,
                    cache: false,
                },
                (body: string, status: number, req: XMLHttpRequest) => {
                    var data: IPostInfo = <IPostInfo><any>body;
                    postMap[id].info = data;
                    resolve(data);
                },
                (body: string, status: number, req: XMLHttpRequest) => {
                    reject(body);
                }
            );
        });
    }

    export function update(id?: number): Promise<any> {
        if (updatePromise) {
            return updatePromise;
        }
        return updatePromise = new Promise<ILatestPosts>((resolve, reject) => {
            ajax(<pebblejs.IAjaxOptions>
                {
                    url: `${URL_ITEMS}?flags=${flags}${promoted ? '&promoted=1' : ''}${id ? `&id=${id}` : ''}&v=${antiCacheValue++}`,
                    type: 'json',
                    method: 'GET',
                    async: true,
                    cache: false,
                },
                (body: string, status: number, req: XMLHttpRequest) => {
                    updatePromise = null;
                    latestPosts = <ILatestPosts><any>body;
                    for (let i = 0; i < latestPosts.items.length; i++) {
                        var p = latestPosts.items[i];
                        p.index = i;
                        if (postMap[p.id]) {
                            p.info = postMap[p.id].info;
                        }
                        postMap[p.id] = p;
                    }

                    // Check for latest post update
                    if (latestPostId && latestPostId !== latestPosts.items[0].id) {
                        Vibe.vibrate('double');
                    }
                    latestPostId = latestPosts.items[0].id;

                    // console.log('GET api/items/get finished');
                    // console.log(`latest post: ${latestPost.user}`);
                    resolve(latestPosts);
                    latestPostsObserver.notify(latestPosts);
                },
                (body: string, status: number, req: XMLHttpRequest) => {
                    updatePromise = null;
                    reject(body);
                }
            );
        });
    }

    export interface IAjaxResponse {
        body: string;
        status: number;
        req: XMLHttpRequest;
    }

    export function ajaxPromise(options: pebblejs.IAjaxOptions): Promise<IAjaxResponse> {
        return new Promise<IAjaxResponse>((resolve, reject) => {
            ajax(options,
                (body: string, status: number, req: XMLHttpRequest) => {
                    resolve({ body, status, req });
                },
                (body: string, status: number, req: XMLHttpRequest) => {
                    reject({ body, status, req });
                }
            );
        });
    }

    export function ajaxPromiseJson(url: string): Promise<IAjaxResponse> {
        return ajaxPromise({
            url: url,
            type: 'json',
            method: 'GET',
            async: true,
            cache: false,
        });
    }

    init();
}
