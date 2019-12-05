// @see https://github.com/mhzed/find-free-port

import net = require('net');

// call method 1: (port, cb(err, freePort))
// call method 2: (portBeg, portEnd, cb(err, freePort))
// call method 3: (portBeg, host, cb(err, freePort))
// call method 4: (portBeg, portEnd, host, cb(err, freePort))
// call method 5: (portBeg, portEnd, host, howmany, cb(err, freePort1, freePort2, ...))

function findFreePortCb(beg: number, ...rest: (string | number)[]) {
    const p = rest.slice(0, rest.length - 1);
    const cb = rest[rest.length - 1] as any as (err: any, port?: number) => void;

    const arr = Array.from(p);

    let end: number = Number(arr[0]);
    let ip: string = arr[1] as any as string;
    let cnt: number = Number(arr[2]);

    // let [end, ip, cnt] = Array.from(p);

    if (!ip && end && !/^\d+$/.test(String(end))) { // deal with method 3
        ip = String(end);
        end = 65534;
    } else {
        if (end == null) { end = 65534; }
    }
    if (cnt == null) { cnt = 1; }

    const retcb = cb;
    const res: number[] = [];

    const probe = function(
        probeIp: string,
        probePort: number,
        probeCb: (port: number | null, nextPort?: number,
    ) => void) {
        const s = net.createConnection({port: probePort, host: probeIp});
        s.on('connect', function() { s.end(); probeCb(null, probePort + 1); });
        s.on('error', (/* err */) => { probeCb(probePort); });  // can't connect, port is available
    };
    const onprobe = function(port: number | null, nextPort?: number) {
        if (port) {
            res.push(port);
            if (res.length >= cnt) {
                retcb(null, ...res);
            } else {
                setImmediate(() => probe(ip, port + 1, onprobe));
            }
        } else {
            if (Number(nextPort) >= end) {
                retcb(new Error('No available ports'));
            } else {
                setImmediate(() => probe(ip, Number(nextPort), onprobe));
            }
        }
    };
    return probe(ip, beg, onprobe);
}

// @ts-ignore
function findFreePort(beg: number, ...rest: (string | number)[]) {
    const last = rest[rest.length - 1];

    if (typeof last === 'function') {
        findFreePortCb(beg, ...rest);
    } else {
        return new Promise((resolve, reject) => {
            // @ts-ignore
            findFreePortCb(beg, ...rest, (err, ...ports) => {
                if (err) {
                    reject(err);
                }  else {
                    resolve(ports);
                }
            });
        });
    }
}
export default findFreePort as any as ((begin: number, end: number, host: string, count: number) => Promise<number[]>);
