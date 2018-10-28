import {jStat} from 'jStat';

export type Stat = {
    name: string,
    calc: (values: number[], referenceValues?: number[]) => number,
    roundDigits: number,
    diffAplicable: boolean,
    applicableToReference: boolean,
    paint: (values: number[]) => (0 | -1 | 1)[],
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
        paint: arr => arr.map(pVal => pVal < 0.05 ? 1 : -1),
    },
];

function defaultPaint(arr: number[]) {
    const mean = jStat.mean(arr);

    return arr.map(item => {
        if (item < mean * 0.8) {
            return 1;
        } else if (item > mean * 1.2) {
            return -1;
        }

        return 0;
    })
}
