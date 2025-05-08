import {renderHook, act} from '@testing-library/react';
import {expect, test, vi} from "vitest";
import {asyncHookFactory} from "../AsyncHookFactory.js";

test('async hook should load data and handle state correctly', async () => {
    let calls = 0;
    const mockAsyncFn = vi.fn(async () => ++calls);
    const useData = asyncHookFactory(mockAsyncFn);
    const {result: hook} = renderHook(() => useData());
    expect(hook.current.result).toBe(undefined);
    await vi.waitFor(() => expect(hook.current.loading).toBe(false));
    expect(hook.current.result).toBe(1);
    expect(mockAsyncFn).toHaveBeenCalledTimes(1);
    act(() => hook.current.retry());
    await vi.waitFor(() => expect(hook.current.loading).toBe(false));
    expect(hook.current.result).toBe(2);
    expect(mockAsyncFn).toHaveBeenCalledTimes(2);
});