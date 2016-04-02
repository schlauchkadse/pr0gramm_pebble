export class Tabs {

    public tabs: (pebblejs.UI.Window | pebblejs.UI.Card)[] = [];

    public current: number = 0;

    public addTab(tab: pebblejs.UI.Window | pebblejs.UI.Card) {
        this.tabs.push(tab);
        tab.on('click', 'up', (clickEvent) => {
            this.prev();
        });
        tab.on('click', 'down', (clickEvent) => {
            this.next();
        });
    }

    public checkIndex() {
        if (this.current >= this.tabs.length)
            this.current = 0;
        if (this.current < 0)
            this.current = this.tabs.length - 1;
    }

    public hide() {
        this.checkIndex();
        if (this.current >= 0)
            this.tabs[this.current].hide();
    }

    public show() {
        this.checkIndex();
        if (this.current >= 0)
            this.tabs[this.current].show();
    }

    public next() {
        this.hide();
        this.current++;
        this.show();
    }

    public prev() {
        this.hide();
        this.current--;
        this.show();
    }

}
