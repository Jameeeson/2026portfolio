# 3D Interactive Portfolio

A modern, interactive portfolio website featuring a 3D avatar and AI-powered chat assistant built with Next.js, Three.js, and Groq AI.

## ✨ Features

- **3D Avatar**: Interactive 3D character model powered by Three.js and React Three Fiber
- **AI Chat Assistant**: Intelligent chatbot using Groq's LLM API to answer questions about your portfolio
- **Modern UI/UX**: Sleek black and white design with glassmorphism effects
- **Responsive Design**: Optimized for desktop and mobile devices
- **Custom Typography**: Fira Sans and Mitr Google Fonts

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- A Groq API key (get one at [console.groq.com](https://console.groq.com))

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd 3d_portfolio
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory and add your Groq API key:
```env
GROQ_API_KEY=your_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **3D Graphics**: Three.js, React Three Fiber, React Three Drei
- **AI**: Groq SDK (Llama 3.3 70B)
- **Styling**: CSS Modules
- **Fonts**: Next.js Font Optimization
- **Language**: TypeScript

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── llm/          # AI chat API route
│   │   └── prompttemplate/  # System prompt configuration
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout with fonts
│   └── page.tsx          # Home page
└── components/
    ├── Avatar3D/         # 3D avatar component
    └── ChatPanel/        # AI chat interface
```

## 🎨 Customization

### Update the AI Prompt
Edit the system prompt in `src/app/api/prompttemplate/template.ts` to customize the AI assistant's personality and responses.

### Modify the 3D Model
Replace the 3D model files in the `public/models/` directory and update the references in the Avatar3D component.

## 📝 License

MIT

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

