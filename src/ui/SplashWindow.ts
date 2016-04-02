import UI = require('ui');
import Vector2 = require('vector2');

import {ApiService} from '../core/ApiService';
import {SettingsMenu} from './SettingsMenu';

export class SplashWindow extends UI.Window {

	public static settingsMenu = new SettingsMenu();

	public username: pebblejs.UI.Text;

    constructor() {
        super({
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
			text: ApiService.username,
			color: 'white',
			textAlign: 'center',
			textOverflow: 'fill',
			position: new Vector2(0, 0),
			size: new Vector2(144, 14)
		});
		this.add(this.username);

		this.on('click', 'select', function(e) {
			SplashWindow.settingsMenu.show();
		});
    }

}
