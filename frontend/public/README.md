# Public Assets Folder

This folder contains static assets that are served at the root path of your Next.js application.

## Usage

Place images and other static files in this folder, then reference them in your components:

### Example: Using Images

```tsx
// In your React component
import Image from 'next/image';

// Option 1: Using Next.js Image component (recommended)
<Image 
  src="/logo.png" 
  alt="Logo" 
  width={200} 
  height={200}
/>

// Option 2: Using regular img tag
<img src="/logo.png" alt="Logo" />

// Option 3: In CSS
background-image: url('/background.jpg');
```

### Folder Structure

```
public/
  ├── images/
  │   ├── logo.png
  │   ├── favicon.ico
  │   └── ...
  └── README.md
```

## Notes

- Files in the `public` folder are served from the root URL (`/`)
- Use the `/` prefix when referencing files (e.g., `/logo.png`)
- Next.js automatically optimizes images when using the `Image` component
- For better organization, consider creating subfolders like `images/`, `icons/`, etc.

