import {expect, test, vi} from 'vitest'
import {cacheFunction} from "../AsyncHookFactory.js";

test('same keys 2 func', async () => {
    const fn1 = async () => 1;
    const fn2 = async () => 2;
    const fn1Cached = cacheFunction(fn1, {seconds: 10});
    const fn2Cached = cacheFunction(fn2, {seconds: 10});
    await fn1Cached();
    await fn2Cached();
    expect(await fn1Cached()).toBe(1);
    expect(await fn2Cached()).toBe(2);
});

test('cache and expire', async () => {
    vi.useFakeTimers();
    let calls = 0
    const fn = async () => ++calls;
    expect(await fn()).toBe(1);
    expect(await fn()).toBe(2);
    const fnCached = cacheFunction(fn, {seconds: 1});
    expect(await fnCached()).toBe(3);
    expect(await fnCached()).toBe(3);
    vi.advanceTimersByTime(1000);
    expect(await fnCached()).toBe(4);
    expect(await fnCached()).toBe(4);
});

test('custom key', async () => {
    let calls = 0
    const fn = async (dynamic: number) => ++calls;
    const fnCached = cacheFunction(fn, {seconds: 10, customKey: (dynamic) => 'same'});
    expect(await fnCached(Math.random())).toBe(1);
    expect(await fnCached(Math.random())).toBe(1);
});
