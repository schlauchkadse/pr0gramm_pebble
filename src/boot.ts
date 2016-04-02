import Settings = require('settings');
import UI = require('ui');

import {Tabs} from './ui/Tabs';
import {ApiService} from './core/ApiService';

import {SplashWindow} from './ui/SplashWindow';
import {MainCard} from './ui/MainCard';
import {BenisCard} from './ui/BenisCard';

Settings.config(
       {
              url: 'http://pebble.analsheep.de/pr0settings.html',
              autoSave: true
       },
       (e) => {
              ApiService.save();
       },
       (event) => {
              ApiService.load();
              ApiService.update();
              if (SplashWindow.settingsMenu)
                     SplashWindow.settingsMenu.update();
       }
);

class App {

    public tabs: Tabs = new Tabs();

    public splashWindow: SplashWindow = new SplashWindow();

    public mainCard: MainCard = new MainCard();

    public benisCard: BenisCard = new BenisCard();

    constructor() {
        this.tabs.addTab(this.splashWindow);
        this.tabs.addTab(this.mainCard);
        this.tabs.addTab(this.benisCard);
        this.tabs.show();
    }
}

const app = new App();
