import {jStat} from 'jStat';

export type Stat = {
    name: string,
    calc: (values: number[], referenceValues?: number[]) => number,
    roundDigits: number,
    diffAplicable: boolean,
    applicableToReference: boolean,
    paint: (values: (number | null)[]) => (0 | -1 | 1 | null)[],
};

export const calculatingStats: Stat[] = [
        {
            name: 'q50',
            calc: values => jStat.percentile(values, 0.5),
            roundDigits: 1,
            diffAplicable: true,
            applicableToReference: true,
            paint: defaultPaint,
        }, {
            name: 'q80',
            calc: values => jStat.percentile(values, 0.8),
            roundDigits: 1,
            diffAplicable: true,
            applicableToReference: true,
            paint: defaultPaint,
        }, {
            name: 'q95',
            calc: values => jStat.percentile(values, 0.95),
            roundDigits: 1,
            diffAplicable: true,
            applicableToReference: true,
            paint: defaultPaint,
        }, {
            name: 'p-val',
            calc: (values, referenceValues) => {
                if (referenceValues === values) {
                    return 0;
                }
                const res = jStat.anovaftest(referenceValues, values);

                if (isNaN(res)) {
                    return 0; // This happens when F-Score goes to Infinity;
                }

                return res;
            },
            roundDigits: 3,
            diffAplicable: false,
            applicableToReference: false,
            paint: arr => arr.map(pVal => {
                if (pVal === null) {
                    return null;
                } else if (pVal < 0.05) {
                    return 1
                } else if (pVal > 0.4) {
                    return -1;
                }

                return 0;
            }),
        },
    ]
;

function defaultPaint(arr: (number|null)[]) {
    const mean = jStat.mean(arr.filter(item => typeof item === 'number'));

    return arr.map(item => {
        if (item === null) {
            return null;
        } else if (item < mean * 0.8) {
            return 1;
        } else if (item > mean * 1.2) {
            return -1;
        }

        return 0;
    })
}
