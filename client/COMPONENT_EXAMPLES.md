# Component Usage Examples

## Navbar Component

The Navbar is automatically included in all protected pages. No manual setup needed!

```jsx
import Navbar from '../components/Navbar';

function MyPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      {/* Your page content */}
    </div>
  );
}
```

### Features
- Automatically shows active page
- Handles user info display
- Manages logout functionality
- Responsive mobile menu

---

## Card Component

### Basic Usage

```jsx
import Card from '../components/Card';

function MyComponent() {
  return (
    <Card>
      <h3>Card Title</h3>
      <p>Card content goes here</p>
    </Card>
  );
}
```

### Size Variants

```jsx
// Small card - compact spacing
<Card size="small">
  <p>Compact content</p>
</Card>

// Medium card - default
<Card size="medium">
  <p>Standard content</p>
</Card>

// Large card - spacious
<Card size="large">
  <h2>Large Title</h2>
  <p>More content with breathing room</p>
</Card>
```

### With Gradient Background

```jsx
<Card gradient>
  <h3>Gradient Card</h3>
  <p>Has a subtle gradient background</p>
</Card>
```

### Clickable Card

```jsx
<Card onClick={() => console.log('Card clicked!')}>
  <h3>Click Me</h3>
  <p>This card is interactive</p>
</Card>
```

### Without Hover Effect

```jsx
<Card hover={false}>
  <h3>Static Card</h3>
  <p>No hover animation</p>
</Card>
```

### Complete Example

```jsx
<Card 
  size="large" 
  gradient 
  onClick={() => navigate('/details')}
  className="border-2 border-blue-500"
>
  <div className="flex items-center space-x-4">
    <div className="w-12 h-12 bg-blue-500 rounded-full" />
    <div>
      <h3 className="text-xl font-bold">Feature Card</h3>
      <p className="text-gray-600">Click to learn more</p>
    </div>
  </div>
</Card>
```

---

## LoadingSpinner Component

### Basic Usage

```jsx
import LoadingSpinner from '../components/LoadingSpinner';

function MyComponent() {
  const [loading, setLoading] = useState(true);

  if (loading) {
    return <LoadingSpinner />;
  }

  return <div>Content loaded!</div>;
}
```

### Size Variants

```jsx
// Small spinner
<LoadingSpinner size="small" />

// Medium spinner (default)
<LoadingSpinner size="medium" />

// Large spinner
<LoadingSpinner size="large" />
```

### With Text

```jsx
<LoadingSpinner text="Loading your data..." />
<LoadingSpinner size="large" text="Please wait..." />
```

### In a Card

```jsx
<Card>
  <LoadingSpinner size="medium" text="Fetching posts..." />
</Card>
```

### Full Page Loading

```jsx
function MyPage() {
  const [loading, setLoading] = useState(true);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" text="Loading dashboard..." />
      </div>
    );
  }

  return <div>Page content</div>;
}
```

---

## SmoothScroll Component

Already integrated in App.jsx! No additional setup needed.

```jsx
// In App.jsx (already done)
import SmoothScroll from './components/SmoothScroll';

function App() {
  return (
    <Router>
      <SmoothScroll>
        {/* All your routes */}
      </SmoothScroll>
    </Router>
  );
}
```

---

## Complete Page Example

Here's a complete example combining all components:

```jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import LoadingSpinner from '../components/LoadingSpinner';
import { motion } from 'framer-motion';

function MyCustomPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  useEffect(() => {
    // Simulate data loading
    setTimeout(() => {
      setData([
        { id: 1, title: 'Item 1', description: 'Description 1' },
        { id: 2, title: 'Item 2', description: 'Description 2' },
        { id: 3, title: 'Item 3', description: 'Description 3' },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <Navbar />
        <div className="pt-24 flex items-center justify-center min-h-[calc(100vh-96px)]">
          <LoadingSpinner size="large" text="Loading content..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <Navbar />
      
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              My Custom Page
            </h1>
            <p className="text-gray-600 mt-2">
              Example page using all new components
            </p>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card size="medium">
              <div className="text-center">
                <div className="text-4xl mb-2">📊</div>
                <h3 className="text-2xl font-bold">1,234</h3>
                <p className="text-gray-600 text-sm">Total Items</p>
              </div>
            </Card>

            <Card size="medium" gradient>
              <div className="text-center">
                <div className="text-4xl mb-2">✨</div>
                <h3 className="text-2xl font-bold">856</h3>
                <p className="text-gray-600 text-sm">Active</p>
              </div>
            </Card>

            <Card size="medium">
              <div className="text-center">
                <div className="text-4xl mb-2">🎯</div>
                <h3 className="text-2xl font-bold">94%</h3>
                <p className="text-gray-600 text-sm">Success Rate</p>
              </div>
            </Card>

            <Card size="medium" gradient>
              <div className="text-center">
                <div className="text-4xl mb-2">🚀</div>
                <h3 className="text-2xl font-bold">2.4k</h3>
                <p className="text-gray-600 text-sm">Users</p>
              </div>
            </Card>
          </div>

          {/* Content Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  size="large"
                  onClick={() => console.log('Clicked:', item.title)}
                >
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                  <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
                    View Details
                  </button>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Action Card */}
          <div className="mt-8">
            <Card 
              size="large" 
              gradient
              onClick={() => navigate('/dashboard')}
            >
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-2">Ready to get started?</h3>
                <p className="text-gray-600 mb-4">
                  Click here to return to the dashboard
                </p>
                <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition">
                  Go to Dashboard
                </button>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default MyCustomPage;
```

---

## Dashboard Card Grid Example

```jsx
// Equal-sized cards in responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* Small cards for compact info */}
  <Card size="small">
    <div className="text-center">
      <div className="text-2xl mb-1">📊</div>
      <p className="text-lg font-bold">1,234</p>
      <p className="text-xs text-gray-600">Posts</p>
    </div>
  </Card>

  {/* Medium cards for standard content */}
  <Card size="medium">
    <div className="text-center">
      <div className="text-3xl mb-2">✨</div>
      <p className="text-2xl font-bold">856</p>
      <p className="text-sm text-gray-600">AI Generated</p>
    </div>
  </Card>

  {/* Large cards for detailed content */}
  <Card size="large">
    <div>
      <div className="text-4xl mb-3">🎯</div>
      <p className="text-3xl font-bold mb-2">94.2%</p>
      <p className="text-base text-gray-600">Engagement Rate</p>
      <p className="text-xs text-green-500 mt-2">+5% this week</p>
    </div>
  </Card>
</div>
```

---

## Animation Examples

### Stagger Animation

```jsx
import { motion } from 'framer-motion';

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 }
};

function MyComponent() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-3 gap-4"
    >
      {items.map(item => (
        <motion.div key={item.id} variants={item}>
          <Card>{item.content}</Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
```

### Hover Scale

```jsx
<motion.div
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
  <Card>Hover me!</Card>
</motion.div>
```

### Fade In

```jsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.5 }}
>
  <Card>Fades in smoothly</Card>
</motion.div>
```

---

## Tips & Best Practices

### 1. Card Sizing
- Use `small` for compact stats
- Use `medium` for standard content (default)
- Use `large` for detailed information

### 2. Loading States
Always show a loading spinner while fetching data:
```jsx
{loading ? <LoadingSpinner /> : <YourContent />}
```

### 3. Responsive Grids
Use Tailwind's responsive grid classes:
```jsx
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
```

### 4. Animations
Keep animations subtle and purposeful:
- Page load: 0.5-0.8s duration
- Hover: 0.2-0.3s duration
- Transitions: Use spring animations for natural feel

### 5. Accessibility
- Always provide meaningful text for screen readers
- Ensure sufficient color contrast
- Make interactive elements keyboard accessible

---

**Happy coding!** 🚀
