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
    await act(() => hook.current.retry());
    await vi.waitFor(() => expect(hook.current.loading).toBe(false));
    expect(hook.current.result).toBe(2);
    expect(mockAsyncFn).toHaveBeenCalledTimes(2);
});

test('async hook should abort operations when component unmounts', async () => {
    // Create a promise we can resolve manually to control when the async function completes
    let resolveFunction;
    const delayedPromise = new Promise(resolve => {
        resolveFunction = resolve;
    });

    // Mock an async function that won't complete until we tell it to
    const mockAsyncFn = vi.fn(() => delayedPromise);
    const useData = asyncHookFactory(mockAsyncFn);
    const {result: hook, unmount} = renderHook(() => useData());

    // Initial state should be loading
    expect(hook.current.loading).toBe(true);
    expect(hook.current.result).toBe(undefined);

    // Unmount the component before the async operation completes
    unmount();

    // Now resolve the promise (after unmount)
    act(() => resolveFunction("completed result"));

    // Wait a tick to allow any state updates to process (which shouldn't happen)
    await vi.waitFor(() => expect(mockAsyncFn).toHaveBeenCalledTimes(1));

    // The hook's state shouldn't have been updated after unmounting
    // If abortedRef works correctly, the then/catch handlers should have exited early
    expect(hook.current.loading).toBe(true);
    expect(hook.current.result).toBe(undefined);
});


test('sync error', async () => {
    // Use real timers for more predictable behavior
    vi.useRealTimers();

    // This function throws an error synchronously instead of returning a promise
    const mockAsyncFn = vi.fn(() => {
        throw new Error('Sync error in async function');
    });

    const useData = asyncHookFactory(mockAsyncFn);

    // This should not throw during rendering
    const {result} = renderHook(() => useData());

    // Wait for the loading state to be false, which indicates the process has completed
    await vi.waitFor(() => expect(result.current.loading).toBe(false));

    // The error should be captured in the error state
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Sync error in async function');

    // Result should be undefined
    expect(result.current.result).toBe(undefined);
});

test('second request finished before first', async () => {
    let resolvers = {};
    let calls = 0;
    const mockAsyncFn = vi.fn((requestParam: string) => new Promise(resolve => {
        resolvers[++calls] = (resolverNum: number) => resolve(resolverNum);
    }));
    const useData = asyncHookFactory((requestParam: string) => mockAsyncFn(requestParam));
    const {result: hook, rerender} = renderHook((p: string) => useData(p),
        {initialProps: 'firstValue',});
    expect(hook.current.loading).toBe(true);
    rerender('newValue');
    act(() => resolvers[2](2));
    await vi.waitFor(() => expect(hook.current.loading).toBe(false));
    expect(hook.current.result).toBe(2);
    act(() => resolvers[1](1));
    await vi.waitFor(() => {
    });
    expect(hook.current.result).toBe(2);
});
