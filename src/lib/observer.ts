export class Observer<T> {

    private observers: ((data: T) => void)[] = [];

    public subscribe(fn: (data: T) => void) {
        this.observers.push(fn);
    }

    public unsubscribe(fn: (data: T) => void) {
        this.observers.splice(this.observers.indexOf(fn), 1);
    }

    public notify(arg: T) {
        this.observers.forEach((observer: (arg: T) => void) => {
            observer(arg);
        });
    }

}
