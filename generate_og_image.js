const fs = require('fs');

// Create a basic 1200x630 solid color PNG block if canvas is not available.
// Just a placeholder since generating proper images requires a graphics library
// which might not be installed in the current environment natively.
// Here we will just use a base64 string of a valid blank PNG to create the file.

const base64Png = "iVBORw0KGgoAAAANSUhEUgAABLAAAAJ6AQMAAAAiX562AAAAA1BMVEUACw+BfH5qAAAAU0lEQVR42u3BAQEAAACCIP+vb8EBBwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8A2wEAABp/XnAAAAAABJRU5ErkJggg==";

const buffer = Buffer.from(base64Png, 'base64');
fs.writeFileSync('public/og-image.png', buffer);
console.log("og-image.png created successfully.");
