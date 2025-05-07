import {useCallback, useEffect, useRef, useState} from 'react';

export function asyncHookFactory<Result, Params extends unknown[]>(asyncFunction: (...params: Params) => Promise<Result>) {
    return (...params: Params) => {
        const [result, setResult] = useState<Result>();
        const [error, setError] = useState<Error | null>(null);
        const [loading, setLoading] = useState(true);
        const abortedRef = useRef(false);

        const execute = useCallback(() => {
            setLoading(true);
            setError(null);
            asyncFunction(...params)
                .then((resultData) => {
                    if (abortedRef.current) return;
                    setResult(resultData);
                    setError(null);
                })
                .catch((error_) => {
                    if (abortedRef.current) return;
                    setError(error_);
                    setResult(undefined);
                })
                .finally(() => {
                    if (!abortedRef.current) setLoading(false);
                });
        }, [...params]);

        useEffect(() => {
            abortedRef.current = false;
            execute();
            return () => {
                abortedRef.current = true;
            };
        }, [execute]);

        return {result, error, loading, retry: execute};
    };
}

export function cacheFunction<Result, Params extends unknown[]>(asyncFunction: (...params: Params) => Promise<Result>, cacheSeconds: number) {
    let cachedResults = {};
    let cachedPromises = {};
    return async (...params: Params): Promise<Result> => {
        let cacheKey = JSON.stringify(params);
        let stored = cachedResults[cacheKey];
        if (stored) {
            if (stored.expires > Date.now()) {
                return stored.result;
            }
            delete cachedResults[cacheKey];
        }
        if (cachedPromises[cacheKey]) {
            return cachedPromises[cacheKey];
        }
        cachedPromises[cacheKey] = asyncFunction(...params);
        try {
            let result = await cachedPromises[cacheKey];
            cachedResults[cacheKey] = {result, expires: Date.now() + cacheSeconds * 1000};
            return result;
        } catch (error) {
            delete cachedResults[cacheKey];
            throw error;
        } finally {
            delete cachedPromises[cacheKey];
        }
    }
}