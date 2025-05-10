import {useCallback, useEffect, useRef, useState} from 'react';

export function asyncHookFactory<Result, Params extends unknown[]>(asyncFunction: (...params: Params) => Promise<Result>) {
    const resultListeners: Record<string, ((result: Result) => void)[]> = {};

    return (...params: Params) => {
        const paramsKey = createParamsKey(params);
        const requestIdRef = useRef(0);
        const [result, setResult] = useState<Result | undefined>(undefined);
        const [error, setError] = useState<Error | null>(null);
        const [loading, setLoading] = useState(true);

        const execute = useCallback(async () => {
            const currentRequestId = ++requestIdRef.current;
            setLoading(true);
            setError(null);
            try {
                const resultData = await asyncFunction(...params);
                if (currentRequestId !== requestIdRef.current) return;
                setResult(resultData);
                setError(null);
                if (resultListeners[paramsKey]) {
                    resultListeners[paramsKey].forEach(listener => {
                        try {
                            listener(resultData);
                        } catch (e) {
                            console.error('Error in listener:', e);
                        }
                    });
                }
            } catch (error_) {
                if (currentRequestId !== requestIdRef.current) return;
                setError(error_ as Error);
                setResult(undefined);
            } finally {
                if (currentRequestId === requestIdRef.current) {
                    setLoading(false);
                }
            }
        }, [paramsKey]);

        useEffect(() => {
            requestIdRef.current++;
            resultListeners[paramsKey] = resultListeners[paramsKey] ?? [];
            resultListeners[paramsKey].push(setResult);
            execute();
            return () => {
                requestIdRef.current++;
                if (resultListeners[paramsKey]) {
                    const index = resultListeners[paramsKey].indexOf(setResult);
                    if (index !== -1) {
                        resultListeners[paramsKey].splice(index, 1);
                    }
                }
            };
        }, [paramsKey, execute]);

        return {result, error, loading, retry: execute};
    };
}

type CacheOptions<Params extends unknown[]> = {
    seconds: number,
    customKey?: (...params: Params) => string,
}

export function cacheFunction<Result, Params extends unknown[]>(asyncFunction: (...params: Params) => Promise<Result>, options: CacheOptions<Params>) {
    let cachedResults: { [key: string]: { result: Result, expires: number } } = {};
    let cachedPromises: { [key: string]: Promise<Result> } = {};
    return async (...params: Params): Promise<Result> => {
        let cacheKey = options.customKey ? options.customKey(...params) : createParamsKey(params);
        let stored = cachedResults[cacheKey];
        if (stored) {
            if (stored.expires > Date.now()) {
                return stored.result;
            }
            delete cachedResults[cacheKey];
        }
        if (cacheKey in cachedPromises) {
            return cachedPromises[cacheKey];
        }
        cachedPromises[cacheKey] = asyncFunction(...params);
        try {
            let result = await cachedPromises[cacheKey];
            cachedResults[cacheKey] = {result, expires: Date.now() + options.seconds * 1000};
            return result;
        } catch (error) {
            delete cachedResults[cacheKey];
            throw error;
        } finally {
            delete cachedPromises[cacheKey];
        }
    }
}

export function createParamsKey<Params extends unknown[]>(params: Params): string {
    // Check for circular references and non-serializable values
    const detectProblematicValues = (value: unknown, path = ''): void => {
        // Skip null and primitive values
        if (value === null || typeof value !== 'object') {
            return;
        }

        // Track visited objects to detect circular references
        const visited = new Set();

        const cantText = ' cannot be used as parameters for caching.'

        const check = (val: unknown, currentPath: string) => {
            // Skip primitives
            if (val === null || typeof val !== 'object') {
                if (typeof val === 'function') {
                    throw new Error(`Functions` + cantText);
                }
                if (typeof val === 'symbol') {
                    throw new Error(`Symbols` + cantText);
                }
                if (val === undefined) {
                    throw new Error(`Undefined` + cantText);
                }
                return;
            }

            // Check for circular references
            if (visited.has(val)) {
                throw new Error(`Circular structures` + cantText);
            }

            visited.add(val);

            // Check for non-serializable types
            if (val instanceof Map || val instanceof Set) {
                throw new Error(`Map or Set` + cantText);
            }

            if (val instanceof Date) {
                // Dates are okay but worth warning about in development
                console.warn(`Date object` + cantText);
                return;
            }

            // Recursively check all properties
            if (Array.isArray(val)) {
                val.forEach((item, index) => {
                    check(item, `${currentPath}[${index}]`);
                });
            } else {
                Object.entries(val).forEach(([key, propVal]) => {
                    check(propVal, currentPath ? `${currentPath}.${key}` : key);
                });
            }

            visited.delete(val);
        };

        check(value, path);
    };

    params.forEach((param, index) => {
        detectProblematicValues(param, `params[${index}]`);
    });
    return JSON.stringify(params);
}