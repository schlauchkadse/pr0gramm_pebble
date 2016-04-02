import UI = require('ui');
import Vector2 = require('vector2');

import {ApiService} from '../core/ApiService';

export class ImageWindow extends UI.Window {

    public image: pebblejs.UI.Image;

    constructor(post: IPost) {
        super({
            backgroundColor: 'black',
            fullscreen: false,
            scrollable: false,
        });
        var url = ApiService.THUMB_URL + post.thumb;
        console.log(`img src 1 = ${url}`);

        url = 'http://utils.bzeutzheim.de/img2pebble.php?url=' + encodeURI(url);
        console.log(`img src 2 = ${url}`);

        this.image = new UI.Image({
            image: url,
            // size: new Vector2(144, 168),
            position: new Vector2(0, 0)
        });
        this.add(this.image);
    }

}
