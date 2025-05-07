import {useEffect, useState} from 'react';

export function asyncHookFactory<Result, Params extends unknown[]>(asyncFunction: (...params: Params) => Promise<Result>) {
    return (...params: Params) => {
        const [result, setResult] = useState<Result>();
        const [error, setError] = useState<Error | false>(false);
        const [loading, setLoading] = useState(true);
        let aborted = false;

        function execute() {
            setLoading(true);
            setError(false);
            asyncFunction(...params)
                .then((resultData: Result) => {
                    if (aborted) {
                        return;
                    }
                    setError(false);
                    setResult(resultData);
                    setLoading(false);
                })
                .catch((error_) => {
                    if (aborted) {
                        return;
                    }
                    setError(error_);
                    setResult(undefined);
                    setLoading(false);
                });
        }

        useEffect(() => {
            execute();
            return (): void => {
                aborted = true;
            };
        }, [...params]);

        return {result, error, loading, refresh: execute};
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
        delete cachedResults[cacheKey];
        try {
            let result = await cachedPromises[cacheKey];
            cachedResults[cacheKey] = {result, expires: Date.now() + cacheSeconds * 1000};
            return result;
        } catch (error) {
            throw error;
        } finally {
            delete cachedPromises[cacheKey];
        }
    }
}