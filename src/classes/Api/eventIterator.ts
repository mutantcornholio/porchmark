import {EventEmitter} from "events";

const eventIterator = (iterations: number, cb: (i: number) => Promise<void>) => {
    return new Promise((resolve, reject) => {
        const events = new EventEmitter();

        let i = 0;

        events.on("done", () => {
            resolve();
        });

        events.on("error", (err) => {
            reject(err);
        });

        events.on("next", async () => {
            if (i >= iterations) {
                events.emit("done");
                return;
            }

            try {
                await cb(i);
            } catch (error) {
                events.emit("error", error);
                return;
            }

            i++;

            events.emit("next");
        });

        events.emit("next");
    });
};

export default eventIterator;
