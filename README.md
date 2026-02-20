# Vibe Coding Platform (Nexus AI) 🚀

This is an advanced, AI-powered coding platform designed to provide a "Cursor-like" experience directly in your browser. It combines a powerful AI agent with a full IDE-like interface, allowing you to chat, code, run commands, and preview your work seamlessly.

![Vibe Coding Platform](https://placehold.co/800x400?text=Vibe+Coding+Platform)

## ✨ Key Features

### 🤖 Intelligent Coding Agent (Nexus AI)
- **Context-Aware**: Understands your project structure and file contents.
- **File Operations**: Can create, read, and modify files directly in your workspace.
- **Terminal Integration**: Executes commands (npm install, git, etc.) and sees the output.
- **Memory**: Remembers conversation context across sessions (persisted via SQLite).

### 🖥️ Full-Featured IDE Interface
- **File Explorer**: recursive file tree to browse your project.
- **Code Editor**: Monaco Editor (VS Code core) integration with syntax highlighting.
- **Terminal UI**: Integrated `xterm.js` terminal connected to the backend shell.
- **Tabs System**: Work on multiple files simultaneously.

### ⚡ Live Preview
- **Sandpack Integration**: Live preview for React and HTML/JS projects.
- **Instant Updates**: See your changes reflect immediately as you code.

### � General Chat Mode
- **No Project Required**: Chat with the AI without selecting a workspace.
- **Universal Assistant**: Ask general questions, brainstorm ideas, or get help with coding concepts.

### �🛠️ Architecture
- **Backend**: FastAPI, LangGraph (for agent workflow), LangChain.
- **Frontend**: React, Vite, TailwindCSS, Lucide Icons.
- **Database**: SQLite (for checkpoints), ChromaDB (for RAG/Knowledge Base - *in progress*).

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 16+
- Docker (optional)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/PatilLaxmikant/Nexus-AI.git
    ```

2.  **Backend Setup**
    ```bash
    # Create virtual environment
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate

    # Install dependencies
    pip install -r backend/requirements.txt
    ```

3.  **Frontend Setup**
    ```bash
    cd frontend
    npm install
    ```

4.  **Environment Variables**
    Create a `.env` file in the `backend` folder:
    ```env
    GOOGLE_API_KEY=your_gemini_api_key
    LANGFUSE_PUBLIC_KEY=...
    LANGFUSE_SECRET_KEY=...
    ```

### Running the Application

1.  **Start the Backend**
    ```bash
    # From the root directory
    uvicorn backend.server:app --reload --port 8000
    ```

2.  **Start the Frontend**
    ```bash
    # From the frontend directory
    npm run dev
    ```

3.  **Launch**
    Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🐳 Docker Support

Run the entire stack with a single command:

```bash
docker-compose up --build
```

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License
