const fs = require('fs');
const base64Png = "iVBORw0KGgoAAAANSUhEUgAABLAAAAJ6AQMAAAAiX562AAAAA1BMVEUACw+BfH5qAAAAU0lEQVR42u3BAQEAAACCIP+vb8EBBwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8A2wEAABp/XnAAAAAABJRU5ErkJggg==";

const buffer = Buffer.from(base64Png, 'base64');
fs.writeFileSync('public/og-image.png', buffer);
console.log("og-image.png created successfully.");
