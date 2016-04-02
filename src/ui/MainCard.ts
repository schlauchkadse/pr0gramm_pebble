import UI = require('ui');
// import Vector2 = require('vector2');

import {ApiService} from '../core/ApiService';
import {LatestPostsMenu} from './LatestPostsMenu';

export class MainCard extends UI.Card {

	public latestPostsMenu: LatestPostsMenu = new LatestPostsMenu();

	constructor() {
		super({
		    title: 'Pr0 Status',
		    icon: 'images/menu_icon.png',
		    subtitle: 'Letzter Post',
			body: 'Lade...',
			// backgroundColor: '#000000',
		    // subtitleColor: '#00FF00', // Named colors
		    // bodyColor: '#00AA00' // Hex colors
		});

		this.on('click', 'select', function(e) {
			this.latestPostsMenu.show();
		});

		ApiService.latestPostsObserver.subscribe((data: ILatestPosts) => {
            var lastPost = data.items[0];
            this.subtitle(`${lastPost.user}`);
            this.body(`Vor ${ApiService.minutesSince(lastPost.created)} min\n+${lastPost.up} / -${lastPost.down} / ${lastPost.up - lastPost.down}`);
		});

		// this.on('click', 'up', function(clickEvent) {
		//     var menu = new UI.Menu({
		//         sections: [{
		//             items: [{
		//                 title: 'Pebble.js',
		//                 icon: 'images/menu_icon.png',
		//                 subtitle: 'Can do Menus'
		//             }, {
		//                 title: 'Second Item',
		//                 subtitle: 'Subtitle Text'
		//             }]
		//         }]
		//     });
		//     menu.on('select', function(event: pebblejs.UI.IMenuSelectEvent) {
		//         console.log('Selected item #' + event.itemIndex + ' of section #' + event.sectionIndex);
		//         console.log('The item is titled "' + event.item.title + '"');
		//     });
		//     menu.show();
		// });
		//
		// this.on('click', 'select', function(e) {
		//     var wind = new UI.Window({
		//         fullscreen: true,
		//     });
		//     var textfield = new UI.Text({
		//         position: new Vector2(0, 65),
		//         size: new Vector2(144, 30),
		//         font: 'gothic-24-bold',
		//         text: 'Text Anywhere!',
		//         textAlign: 'center'
		//     });
		//     wind.add(textfield);
		//     wind.show();
		// });
		//
		// this.on('click', 'down', function(e) {
		//     var card = new UI.Card();
		//     card.title('A Card');
		//     card.subtitle('Is a Window');
		//     card.body('The simplest window type in Pebble.js.');
		//     card.show();
		// });
	}

}
