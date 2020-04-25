import {IComparison, IConfig} from '@/lib/config';

export type RecursivePartial<T> = {
    [P in keyof T]?:
    T[P] extends (infer U)[] ? RecursivePartial<U>[] :
        T[P] extends object ? RecursivePartial<T[P]> :
            T[P];
};

export interface IOriginalMetrics {
    [index: string]: number;
}

export type SiteName = string;

export interface ISite {
    name: SiteName;
    url: string;
}

export interface ICheckOptions {
    compareId: number;
    comparison: IComparison;
    config: IConfig;
}

export declare function assertNonNull<T>(obj: T): asserts obj is NonNullable<T>;
