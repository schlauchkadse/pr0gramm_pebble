import UI = require('ui');

import {ApiService} from '../core/ApiService';

import {DetailCard} from './DetailCard';

export class LatestPostsMenu extends UI.Menu {

    public visible: boolean = false;

    public menuItems: pebblejs.UI.IMenuItem[] = [];

    constructor() {
        super({
            sections: [{
                title: 'Letzte Posts',
                items: [{
                    title: 'Lädt...',
                }]
            }]
        });
        this.on('select', (event: pebblejs.UI.IMenuSelectEvent) => {
            if (!ApiService.latestPosts)
                return;
            var post = ApiService.latestPosts.items[event.itemIndex];
            ApiService.info(post.id).then(() => {
                new DetailCard(post).show();
            })
        });

        this.on('show', () => {
            this.visible = true;
        });
        this.on('hide', () => {
            this.visible = false;
        });

        ApiService.latestPostsObserver.subscribe((data) => {
            this.updateItems();
            if (this.visible && ApiService.fetchListTags) {
                console.log('Updating infos in visible list');
                ApiService.updateInfos().then(() => {
                    this.updateItems();
                });
            }
        });
    }

    public updateItems() {
        if (!ApiService.latestPosts) {
            if (ApiService.updatePromise)
                ApiService.updatePromise.then(() => this.updateItems());
            return;
        }
        this.menuItems = [];
        ApiService.latestPosts.items.forEach((item) => {
            var listItem: pebblejs.UI.IMenuItem = { title: `${item.up - item.down}: ${item.user}` };
            if (ApiService.fetchListTags) {
                listItem.subtitle = '...';
                if (item.info)
                    listItem.subtitle = ApiService.formatTags(item.info.tags, 4, 0.1);
            }
            this.menuItems.push(listItem);
        });
        this.items(0, this.menuItems);
    }

    public show(): pebblejs.UI.Menu {
        this.updateItems();
        if (ApiService.fetchListTags) {
            ApiService.updateInfos().then(() => {
                this.updateItems();
            });
        }
        super.show();
        return this;
    }

}
