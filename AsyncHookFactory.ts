import {useCallback, useEffect, useRef, useState} from 'react';

export function asyncHookFactory<Result, Params extends ValuesToStringify>(asyncFunction: (...params: Params) => Promise<Result>) {
    const resultListeners: Record<string, ((result: Result) => void)[]> = {};

    return (...params: Params) => {
        const paramsKey = JSON.stringify(params);
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

type CacheOptions<Params extends ValuesToStringify> = {
    seconds: number,
    customKey?: (...params: Params) => string,
}

export function cacheFunction<Result, Params extends ValuesToStringify>(asyncFunction: (...params: Params) => Promise<Result>, options: CacheOptions<Params>) {
    let cachedResults: { [key: string]: { result: Result, expires: number } } = {};
    let cachedPromises: { [key: string]: Promise<Result> } = {};
    return async (...params: Params): Promise<Result> => {
        let cacheKey = options.customKey ? options.customKey(...params) : JSON.stringify(params);
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

type JsonPrimitive = string | number | boolean | null;
type JsonObject = { [key: string]: ValuesToStringify; }

interface JsonArray extends Array<ValuesToStringify> {
}

type ValuesToStringify = (JsonPrimitive | JsonObject | JsonArray)[];