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
