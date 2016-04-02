import UI = require('ui');

import {ApiService} from '../core/ApiService';

var updateIntervalList = {
    10: 30,
    30: 60,
    60: 120,
    120: 10,
}

export class SettingsMenu extends UI.Menu {

    constructor() {
        super({
            sections: [{
                title: 'Einstellungen',
                items: []
            }]
        });
        this.update();
        this.on('show', () => {
            this.update();
        });
        this.on('select', (event: pebblejs.UI.IMenuSelectEvent) => {
            switch (event.itemIndex) {
                case 0:
                    ApiService.promoted = !ApiService.promoted;
                    ApiService.update();
                    break;
                case 1:
                    ApiService.flags = ApiService.toggleFlag(ApiService.flags, ApiService.Flags.SFW);
                    ApiService.update();
                    break;
                case 2:
                    ApiService.flags = ApiService.toggleFlag(ApiService.flags, ApiService.Flags.NSFW);
                    ApiService.update();
                    break;
                case 3:
                    ApiService.flags = ApiService.toggleFlag(ApiService.flags, ApiService.Flags.NSFL);
                    ApiService.update();
                    break;
                case 4:
                    ApiService.setUpdateInterval(updateIntervalList[ApiService.updateInterval] || 10);
                    break;
            }
            ApiService.save();
            this.update();
        });
    }

    public update() {
        var listItems = [
            {
                title: 'Nur beliebt',
                subtitle: ApiService.promoted ? 'An' : 'Aus',
            },
            {
                title: 'SFW',
                subtitle: ApiService.flags & ApiService.Flags.SFW ? 'An' : 'Aus',
            },
            {
                title: 'NSFW',
                subtitle: ApiService.flags & ApiService.Flags.NSFW ? 'An' : 'Aus',
            },
            {
                title: 'NSFL',
                subtitle: ApiService.flags & ApiService.Flags.NSFL ? 'An' : 'Aus',
            },
            {
                title: 'Update Interval',
                subtitle: ApiService.updateInterval.toString(),
            },
        ];
        this.items(0, listItems);
    }

}
