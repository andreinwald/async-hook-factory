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