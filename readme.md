# Factory for async hooks
Simplifies their creation

## Usage 
Just copy [AsyncHookFactory.ts](./AsyncHookFactory.ts) into your codebase

## Example
1. Create your custom hook anywhere
```javascript
export const useProductQuery = asyncHookFactory((productId) => yourAsyncFunction(priceId));
```
2. Use it inside of component
```javascript
export function MyPage() {
    const productId = 22;
    const {result, error, loading, refresh} = useProductQuery(productId);
    return <div>Product: {result}</div>
}
```

## Caching
You may want to not call function each remount or you may have a few components that use same hook - then you can cache result for some time.
```javascript
// cache result for 10 seconds 
export const useProductQuery = asyncHookFactory(cacheFunction((productId) => yourAsyncFunction(priceId), 10));
```

