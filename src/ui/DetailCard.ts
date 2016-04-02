import UI = require('ui');

import {ApiService} from '../core/ApiService';

import {ImageWindow} from './ImageWindow';

export class DetailCard extends UI.Card {

	public imageWindow: ImageWindow;

	constructor(post: IPost) {
		super({
		    title: post.user,
			scrollable: true,
		    // icon: 'images/menu_icon.png',
		    subtitle: `${post.up - post.down} Benis`,
			body: `Vor ${ApiService.minutesSince(post.created)} min\n${ApiService.formatTags(post.info.tags, 10, 0)}`,
		});
		this.on('click', 'select', () => {
			if (!this.imageWindow)
				this.imageWindow = new ImageWindow(post);
			this.imageWindow.show();			
		});
	}

}
