// https://stackoverflow.com/a/11301464/1958334
export function indexOfMin(arr: number[]) {
    if (arr.length === 0) {
        return -1;
    }

    let min = arr[0];
    let minIndex = 0;

    for (let i = 1; i < arr.length; i++) {
        if (arr[i] < min) {
            minIndex = i;
            min = arr[i];
        }
    }

    return minIndex;
}

export function roundToNDigits(value: number, digits: number) {
    const rounder = Math.pow(10, digits);
    return Math.round(value * rounder) / rounder;
}

export function sleep(time: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}

export function hasOnlyNumbers(input: Array<number|null>): input is number[] {
    return !input.some((el) => typeof el !== 'number');
}

export function stdoutRect(): [number, number] {
    if (typeof process.stdout.columns !== 'number') {
        throw new Error('process.stdout.columns is not a number');
    }

    if (typeof process.stdout.rows !== 'number') {
        throw new Error('process.stdout.rows is not a number');
    }
    return [process.stdout.rows, process.stdout.columns];
}
