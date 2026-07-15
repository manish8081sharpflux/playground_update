require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('./models/User');
const Course   = require('./models/Course');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clean existing data
  await Promise.all([User.deleteMany({}), Course.deleteMany({})]);
  console.log('Cleared old data');

  // Create admin
  const admin = await User.create({
    name: 'Admin User', email: 'admin@edu.com', password: 'admin123', role: 'admin'
  });

  // Create students
  await User.create([
    { name: 'Ravi Kumar',  email: 'ravi@student.com',  password: 'student123' },
    { name: 'Priya Sharma',email: 'priya@student.com', password: 'student123' },
    { name: 'Amit Patel',  email: 'amit@student.com',  password: 'student123' }
  ]);
  console.log('Users created');

  // Create a sample course
  await Course.create({
    title:       'Introduction to JavaScript',
    description: 'Learn the fundamentals of JavaScript programming from scratch.',
    category:    'Programming',
    isPublished: true,
    createdBy:   admin._id,
    lessons: [
      {
        order: 1,
        title: 'What is JavaScript?',
        readTimeMinutes: 4,
        content: `
          <h2>What is JavaScript?</h2>
          <p>JavaScript is a lightweight, interpreted programming language with first-class functions. It is most well-known as the scripting language for Web pages, but it is also used in non-browser environments such as Node.js.</p>
          <h3>Key characteristics</h3>
          <ul>
            <li><strong>Dynamic typing</strong> — variable types are determined at runtime</li>
            <li><strong>Prototype-based OOP</strong> — objects inherit directly from other objects</li>
            <li><strong>Event-driven</strong> — code reacts to user actions and browser events</li>
            <li><strong>Single-threaded</strong> — runs on one thread with an asynchronous event loop</li>
          </ul>
          <blockquote>JavaScript is the only language that runs natively in every modern web browser.</blockquote>
          <h3>A simple example</h3>
          <p>Every JavaScript program starts by executing statements. The simplest program just logs a message to the console:</p>
          <pre style="background:#f1f5f9;padding:1rem;border-radius:8px;overflow:auto"><code>console.log("Hello, World!");</code></pre>
          <p>This tiny line demonstrates two core ideas: calling a function (<code>console.log</code>) and passing a value (a string literal).</p>
        `
      },
      {
        order: 2,
        title: 'Variables and Data Types',
        readTimeMinutes: 6,
        content: `
          <h2>Variables and Data Types</h2>
          <p>JavaScript supports several primitive data types. Understanding them is essential before writing any meaningful code.</p>
          <h3>Declaring variables</h3>
          <p>Modern JavaScript uses <code>let</code> and <code>const</code>:</p>
          <pre style="background:#f1f5f9;padding:1rem;border-radius:8px;overflow:auto"><code>const name = "Ravi";   // cannot be reassigned
let   age  = 25;       // can be reassigned
age = 26;              // valid</code></pre>
          <h3>Primitive types</h3>
          <ul>
            <li><strong>String</strong> — text: <code>"hello"</code></li>
            <li><strong>Number</strong> — integers and floats: <code>42</code>, <code>3.14</code></li>
            <li><strong>Boolean</strong> — <code>true</code> or <code>false</code></li>
            <li><strong>null</strong> — intentional absence of value</li>
            <li><strong>undefined</strong> — variable declared but not assigned</li>
          </ul>
          <h3>Type checking</h3>
          <p>Use the <code>typeof</code> operator to inspect a variable's type at runtime:</p>
          <pre style="background:#f1f5f9;padding:1rem;border-radius:8px;overflow:auto"><code>typeof "hello"   // "string"
typeof 42        // "number"
typeof true      // "boolean"
typeof null      // "object"  ← famous JS quirk!</code></pre>
          <blockquote>The <code>typeof null === "object"</code> result is a historical bug in JavaScript that was never fixed to preserve backward compatibility.</blockquote>
        `
      },
      {
        order: 3,
        title: 'Functions and Scope',
        readTimeMinutes: 7,
        content: `
          <h2>Functions and Scope</h2>
          <p>Functions are the building blocks of JavaScript programs. They let you encapsulate logic and reuse it.</p>
          <h3>Declaring functions</h3>
          <pre style="background:#f1f5f9;padding:1rem;border-radius:8px;overflow:auto"><code>// Function declaration
function greet(name) {
  return "Hello, " + name + "!";
}

// Arrow function (modern syntax)
const add = (a, b) => a + b;

console.log(greet("Priya")); // "Hello, Priya!"
console.log(add(3, 4));      // 7</code></pre>
          <h3>Scope</h3>
          <p>Scope determines where variables are accessible:</p>
          <ul>
            <li><strong>Global scope</strong> — accessible everywhere</li>
            <li><strong>Function scope</strong> — accessible only inside the function</li>
            <li><strong>Block scope</strong> — <code>let</code> and <code>const</code> are limited to the nearest <code>{}</code> block</li>
          </ul>
          <pre style="background:#f1f5f9;padding:1rem;border-radius:8px;overflow:auto"><code>let x = 10;          // global

function example() {
  let y = 20;        // function-scoped
  console.log(x);    // 10  ✓
  console.log(y);    // 20  ✓
}

console.log(y);      // ReferenceError ✗</code></pre>
          <h3>Closures</h3>
          <p>A closure is a function that remembers the variables from its outer scope even after that scope has finished executing. Closures are one of JavaScript's most powerful and commonly used features.</p>
        `
      }
    ],
    quiz: {
      title:    'JavaScript Fundamentals Quiz',
      passMark: 60,
      questions: [
        {
          text:         'Which keyword is used to declare a constant variable in modern JavaScript?',
          options:      ['var', 'let', 'const', 'static'],
          correctIndex: 2,
          explanation:  'const declares a variable whose binding cannot be reassigned after initialisation.'
        },
        {
          text:         'What does typeof null return in JavaScript?',
          options:      ['"null"', '"undefined"', '"object"', '"boolean"'],
          correctIndex: 2,
          explanation:  'This is a well-known historical bug — typeof null returns "object" even though null is a primitive.'
        },
        {
          text:         'Which of the following is a valid arrow function?',
          options:      ['function add(a,b) => a+b', 'const add = (a,b) => a+b', 'arrow add(a,b) { return a+b }', 'const add => (a,b) => a+b'],
          correctIndex: 1,
          explanation:  'Arrow functions use the syntax: const name = (params) => expression.'
        },
        {
          text:         'What is the scope of a variable declared with let inside a block {}?',
          options:      ['Global scope', 'Module scope', 'Function scope', 'Block scope'],
          correctIndex: 3,
          explanation:  'let (and const) are block-scoped — they are only accessible within the enclosing curly braces.'
        },
        {
          text:         'What does a closure allow a function to do?',
          options:      [
            'Run on multiple threads simultaneously',
            'Access variables from its outer scope after that scope has ended',
            'Automatically return undefined',
            'Convert variables to a different type'
          ],
          correctIndex: 1,
          explanation:  'A closure captures references to outer-scope variables and keeps them alive as long as the inner function exists.'
        }
      ]
    }
  });

  // Second course
  await Course.create({
    title:       'HTML & CSS Basics',
    description: 'Build your first web pages using HTML structure and CSS styling.',
    category:    'Web Design',
    isPublished: true,
    createdBy:   admin._id,
    lessons: [
      {
        order: 1,
        title: 'HTML Structure',
        readTimeMinutes: 5,
        content: `
          <h2>HTML Structure</h2>
          <p>HTML (HyperText Markup Language) is the skeleton of every web page. It describes the structure of content using a system of elements represented by tags.</p>
          <h3>Basic page structure</h3>
          <pre style="background:#f1f5f9;padding:1rem;border-radius:8px;overflow:auto"><code>&lt;!DOCTYPE html&gt;
&lt;html lang="en"&gt;
  &lt;head&gt;
    &lt;meta charset="UTF-8"&gt;
    &lt;title&gt;My Page&lt;/title&gt;
  &lt;/head&gt;
  &lt;body&gt;
    &lt;h1&gt;Hello World&lt;/h1&gt;
    &lt;p&gt;My first paragraph.&lt;/p&gt;
  &lt;/body&gt;
&lt;/html&gt;</code></pre>
          <h3>Common elements</h3>
          <ul>
            <li><code>&lt;h1&gt;</code>–<code>&lt;h6&gt;</code> — headings</li>
            <li><code>&lt;p&gt;</code> — paragraph</li>
            <li><code>&lt;a href="..."&gt;</code> — hyperlink</li>
            <li><code>&lt;img src="..." alt="..."&gt;</code> — image</li>
            <li><code>&lt;ul&gt;</code>, <code>&lt;ol&gt;</code>, <code>&lt;li&gt;</code> — lists</li>
            <li><code>&lt;div&gt;</code>, <code>&lt;span&gt;</code> — generic containers</li>
          </ul>
        `
      },
      {
        order: 2,
        title: 'CSS Styling',
        readTimeMinutes: 6,
        content: `
          <h2>CSS Styling</h2>
          <p>CSS (Cascading Style Sheets) controls how HTML elements look on screen. You write rules that target elements and apply visual properties.</p>
          <h3>CSS syntax</h3>
          <pre style="background:#f1f5f9;padding:1rem;border-radius:8px;overflow:auto"><code>selector {
  property: value;
}

h1 {
  color: navy;
  font-size: 2rem;
  margin-bottom: 1rem;
}</code></pre>
          <h3>Selectors</h3>
          <ul>
            <li><strong>Element</strong> — <code>p { }</code> targets all paragraphs</li>
            <li><strong>Class</strong> — <code>.card { }</code> targets elements with class="card"</li>
            <li><strong>ID</strong> — <code>#header { }</code> targets the element with id="header"</li>
          </ul>
          <h3>The Box Model</h3>
          <p>Every element is a rectangular box with four layers: <strong>content</strong> → <strong>padding</strong> → <strong>border</strong> → <strong>margin</strong>. Understanding the box model is fundamental to controlling layout.</p>
          <blockquote>Use <code>box-sizing: border-box</code> globally — it makes width and height include padding and border, which is almost always what you intend.</blockquote>
        `
      }
    ],
    quiz: {
      title: 'HTML & CSS Quiz',
      passMark: 60,
      questions: [
        {
          text:         'Which HTML tag is used to create the largest heading?',
          options:      ['<h6>', '<heading>', '<h1>', '<head>'],
          correctIndex: 2,
          explanation:  '<h1> is the largest heading; headings go from h1 (largest) to h6 (smallest).'
        },
        {
          text:         'What does CSS stand for?',
          options:      ['Colorful Style Syntax', 'Cascading Style Sheets', 'Creative Styling System', 'Computer Style Script'],
          correctIndex: 1,
          explanation:  'CSS stands for Cascading Style Sheets — the "cascading" refers to how styles are inherited and overridden.'
        },
        {
          text:         'Which CSS selector targets an element with class="card"?',
          options:      ['#card', '.card', 'card', '*card'],
          correctIndex: 1,
          explanation:  'Class selectors use a dot prefix: .card targets all elements with class="card".'
        }
      ]
    }
  });

  console.log('✅ Seed complete!');
  console.log('\nDemo accounts:');
  console.log('  Admin:   admin@edu.com   / admin123');
  console.log('  Student: ravi@student.com / student123');
  await mongoose.disconnect();
};

seed().catch(err => { console.error(err); process.exit(1); });
