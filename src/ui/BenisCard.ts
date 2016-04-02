import UI = require('ui');

import {ApiService} from '../core/ApiService';

export class BenisCard extends UI.Card {

    public visible: boolean = false;

    constructor() {
        super({
            title: 'Pr0 Benis',
            subtitle: ApiService.username,
        });
        this.on('show', () => {
            this.visible = true;
            this.update();
        });
        this.on('hide', () => {
            this.visible = false;
        });

        ApiService.latestPostsObserver.subscribe((data: ILatestPosts) => {
            if (this.visible)
                this.update();
        });
    }

    public update() {
        if (!ApiService.username || ApiService.username.length === 0)
            this.subtitle('Kein Benutzer');
        ApiService.ajaxPromiseJson(ApiService.URL_USER + ApiService.username).then((response) => {
            var data: any = response.body;
            this.body(`Benis: ${data.user.score}`);
        });
    }

}
