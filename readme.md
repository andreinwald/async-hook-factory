# Factory for async hooks
Simplifies their creation

## Usage 
Just copy [AsyncHookFactory.ts](./AsyncHookFactory.ts) into your codebase

## Example
1. Create your custom hook anywhere
```javascript
export const useProductQuery = asyncHookFactory((productId) => yourAsyncFunction(productId));

// API Fetch example
export const useProductQuery = asyncHookFactory(async (productId) => {
    const response = await fetch(`products/${productId}`, {method: 'GET'});
    return response.json();
});
```

2. Use it inside of React component
```javascript
export function MyPage() {
    const productId = 22;
    const {result, error, loading, retry} = useProductQuery(productId);
    return <div>Product: {result}</div>
}
```

## Caching
You may want to not call function each remount or you may have a few components that use same hook - then you can cache result for some time.
```javascript
// original function
const getProduct = (productId) => {/*...*/} 

// Cache it for 10 seconds. getProductCached can be called many times, but some call will return cached result 
const getProductCached = cacheFunction((productId) => getProduct(productId), 10);
```

Together with AsyncHookFactory
```javascript
export const useProductQuery = asyncHookFactory(cacheFunction((productId) => yourAsyncFunction(productId), 10));
```


# Alternatives
- [React query](https://tanstack.com/query)
