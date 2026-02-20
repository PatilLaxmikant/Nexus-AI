from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from backend.graph import workflow
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from contextlib import asynccontextmanager
from langchain_core.messages import HumanMessage
import json
import asyncio

# Import error handling
from backend.errors import (
    AppError,
    WorkspaceError,
    FileOperationError,
    PathSecurityError,
    app_error_handler,
    http_exception_handler,
    validation_exception_handler,
    generic_exception_handler,
    logger
)

# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize AsyncSqliteSaver and compile graph
    async with AsyncSqliteSaver.from_conn_string("checkpoints.sqlite") as checkpointer:
        app.state.graph = workflow.compile(checkpointer=checkpointer)
        logger.info("Application started successfully")
        yield
        logger.info("Application shutting down")
        # Shutdown logic if needed (checkpointer closes automatically via context manager)

app = FastAPI(lifespan=lifespan)

# Register error handlers
app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Allow CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    thread_id: str
    model_name: str = "gemini-2.5-flash"
    temperature: float = 0.7
    system_prompt: str | None = None
    json_mode: bool = False

from langfuse.langchain import CallbackHandler

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        # Initialize Langfuse CallbackHandler
        langfuse_handler = CallbackHandler()

        config = {
            "configurable": {
                "thread_id": request.thread_id,
                "model_name": request.model_name,
                "temperature": request.temperature,
                "system_prompt": request.system_prompt,
                "json_mode": request.json_mode
            },
            "callbacks": [langfuse_handler]
        }
        
        logger.info(
            f"Chat request received",
            extra={
                "thread_id": request.thread_id,
                "model": request.model_name,
                "message_length": len(request.message)
            }
        )
        
        async def event_generator():
            try:
                # We use astream for async streaming of updates
                async for event in app.state.graph.astream(
                    {"messages": [HumanMessage(content=request.message)]},
                    config,
                    stream_mode="updates"
                ):
                    for node, updates in event.items():
                        if "messages" in updates:
                            for msg in updates["messages"]:
                                # Prepare message dict
                                msg_data = {
                                    "type": msg.type,
                                    "content": msg.content,
                                    "node": node,
                                }
                                # Add tool calls if present (for AI messages)
                                if hasattr(msg, "tool_calls") and msg.tool_calls:
                                    msg_data["tool_calls"] = msg.tool_calls
                                
                                # Add tool output if present (for Tool messages)
                                if hasattr(msg, "artifact"):
                                    msg_data["artifact"] = str(msg.artifact)

                                yield json.dumps(msg_data) + "\n"
            except Exception as e:
                logger.error(f"Error in chat stream: {str(e)}", exc_info=True)
                yield json.dumps({
                    "error": "AgentError",
                    "message": "Failed to generate response",
                    "details": {"error": str(e)}
                }) + "\n"

        return StreamingResponse(event_generator(), media_type="application/x-ndjson")
    
    except Exception as e:
        logger.error(
            f"Chat endpoint error: {str(e)}",
            exc_info=True,
            extra={"thread_id": request.thread_id}
        )
        raise AgentError(
            "Failed to process chat request",
            details={"thread_id": request.thread_id, "error": str(e)}
        )

@app.get("/health")
def health():
    # Simple check if graph is loaded
    if not hasattr(app.state, "graph"):
        return {"status": "error", "message": "Graph not initialized"}
    return {"status": "ok"}

# RAG Upload Endpoint
from fastapi import UploadFile, File
import shutil
import os
from backend.rag import ingest_file

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        # Save file to uploads directory
        uploads_dir = os.path.join(os.getcwd(), "uploads")
        os.makedirs(uploads_dir, exist_ok=True)
        file_path = os.path.join(uploads_dir, file.filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Ingest into Vector DB
        num_chunks = ingest_file(file_path)
        
        return {"status": "success", "message": f"File '{file.filename}' processed and added {num_chunks} chunks to knowledge base."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# File Explorer Endpoints
class FileRequest(BaseModel):
    path: str
    content: str | None = None

def get_file_tree(path: str):
    tree = []
    # Avoid scanning these directories
    exclude = {'.git', '__pycache__', 'node_modules', 'venv', '.pytest_cache', '.vscode', '.idea'}
    
    try:
        with os.scandir(path) as it:
            entries = sorted(list(it), key=lambda e: (not e.is_dir(), e.name))
            for entry in entries:
                if entry.name in exclude:
                    continue
                
                node = {
                    "name": entry.name,
                    "path": entry.path,
                    "type": "directory" if entry.is_dir() else "file"
                }
                
                if entry.is_dir():
                    node["children"] = get_file_tree(entry.path)
                    
                tree.append(node)
    except PermissionError:
        pass
        
    return tree

# Global state for workspace root
WORKSPACE_ROOT = None  # Initially None to force project selection

class WorkspaceRequest(BaseModel):
    path: str

def check_workspace():
    if WORKSPACE_ROOT is None:
        raise WorkspaceError("No workspace selected. Please select a project first.")
    return WORKSPACE_ROOT

@app.get("/workspace/current")
async def get_current_workspace():
    return {"path": WORKSPACE_ROOT}

@app.post("/workspace")
async def set_workspace(request: WorkspaceRequest):
    global WORKSPACE_ROOT
    
    try:
        if not os.path.exists(request.path) or not os.path.isdir(request.path):
            raise WorkspaceError(
                "Path does not exist or is not a directory",
                details={"path": request.path}
            )
        
        WORKSPACE_ROOT = request.path
        # Change current working directory so that agent tools (which use os.getcwd) work correctly
        os.chdir(WORKSPACE_ROOT)
        logger.info(f"Workspace changed to: {WORKSPACE_ROOT}")
        
        return {"status": "success", "message": f"Workspace changed to {WORKSPACE_ROOT}"}
    except OSError as e:
        logger.error(f"Failed to change directory: {e}")
        raise WorkspaceError(
            "Failed to change working directory",
            details={"path": request.path, "error": str(e)}
        )

@app.post("/select-workspace-native")
async def select_workspace_native():
    global WORKSPACE_ROOT
    try:
        import tkinter as tk
        from tkinter import filedialog
        
        # Create a hidden root window
        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True) # Bring to front
        
        # Open folder picker
        initial_dir = WORKSPACE_ROOT if WORKSPACE_ROOT else os.path.expanduser("~")
        folder_path = filedialog.askdirectory(initialdir=initial_dir, title="Select Project Folder")
        root.destroy()
        
        if not folder_path:
            logger.info("Workspace selection cancelled by user")
            return {"status": "cancelled", "message": "Selection cancelled"}
            
        WORKSPACE_ROOT = folder_path
        
        # Change current working directory so that agent tools (which use os.getcwd) work correctly
        os.chdir(WORKSPACE_ROOT)
        logger.info(f"Workspace selected via native dialog: {WORKSPACE_ROOT}")
            
        return {"status": "success", "path": WORKSPACE_ROOT, "message": f"Workspace changed to {WORKSPACE_ROOT}"}
        
    except OSError as e:
        logger.error(f"Failed to change directory: {e}")
        raise WorkspaceError(
            "Failed to change working directory",
            details={"error": str(e)}
        )
    except Exception as e:
        logger.error(f"Dialog error: {e}")
        raise WorkspaceError(
            "Failed to open folder picker",
            details={"error": str(e)}
        )

@app.get("/files")
async def list_files():
    # List files from the current workspace root
    root = check_workspace()
    return get_file_tree(root)

@app.get("/read")
async def read_file(path: str):
    check_workspace()
    
    try:
        if not os.path.exists(path):
            raise FileOperationError(
                "File not found",
                details={"path": path}
            )
        
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        
        logger.info(f"File read successfully: {path}")
        return {"content": content}
    
    except UnicodeDecodeError as e:
        logger.error(f"Failed to decode file: {path}")
        raise FileOperationError(
            "File encoding error. Only UTF-8 encoded text files are supported.",
            details={"path": path, "error": str(e)}
        )
    except PermissionError as e:
        logger.error(f"Permission denied reading file: {path}")
        raise FileOperationError(
            "Permission denied",
            details={"path": path, "error": str(e)}
        )
    except Exception as e:
        logger.error(f"Unexpected error reading file: {path}", exc_info=True)
        raise FileOperationError(
            "Failed to read file",
            details={"path": path, "error": str(e)}
        )

@app.post("/write")
async def write_file(request: FileRequest):
    check_workspace()
    
    try:
        # Ensure directory exists if path has one
        directory = os.path.dirname(request.path)
        if directory:
            os.makedirs(directory, exist_ok=True)
        
        with open(request.path, "w", encoding="utf-8") as f:
            f.write(request.content)
        
        logger.info(f"File written successfully: {request.path}")
        return {"status": "success", "message": f"File '{request.path}' saved."}
    
    except PermissionError as e:
        logger.error(f"Permission denied writing file: {request.path}")
        raise FileOperationError(
            "Permission denied",
            details={"path": request.path, "error": str(e)}
        )
    except OSError as e:
        logger.error(f"IO error writing file: {request.path}")
        raise FileOperationError(
            "Failed to write file",
            details={"path": request.path, "error": str(e)}
        )
    except Exception as e:
        logger.error(f"Unexpected error writing file: {request.path}", exc_info=True)
        raise FileOperationError(
            "Failed to write file",
            details={"path": request.path, "error": str(e)}
        )

from fastapi import WebSocket, WebSocketDisconnect

@app.websocket("/ws/terminal")
async def websocket_terminal(websocket: WebSocket):
    await websocket.accept()
    
    if WORKSPACE_ROOT is None:
        await websocket.send_text("Error: No workspace selected. Please select a project first.\r\n")
        await websocket.close()
        return

    process = None
    try:
        # Use PowerShell on Windows, Bash on others
        shell = "powershell.exe" if os.name == 'nt' else "bash"
        
        # Create async subprocess
        process = await asyncio.create_subprocess_exec(
            shell,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=WORKSPACE_ROOT # Start in current workspace root
        )
        
        async def read_stdout():
            try:
                while True:
                    data = await process.stdout.read(1024)
                    if not data:
                        break
                    # Use a common encoding, might need adjustment for local system
                    # 'cp437' is common for US Windows console, but 'utf-8' or 'mbcs' might be better depending on setup
                    # Let's try to decode with replacement to avoid crashing
                    text = data.decode('utf-8', errors='replace')
                    await websocket.send_text(text)
            except Exception as e:
                print(f"Stdout error: {e}")
                
        async def read_websocket():
            try:
                while True:
                    data = await websocket.receive_text()
                    if process.stdin:
                        process.stdin.write(data.encode())
                        await process.stdin.drain()
            except WebSocketDisconnect:
                pass
            except Exception as e:
                print(f"Websocket error: {e}")
                
        # Run both tasks
        await asyncio.gather(read_stdout(), read_websocket())
        
    except Exception as e:
        print(f"Terminal error: {e}")
        await websocket.close()
    finally:
        if process and process.returncode is None:
            process.terminate()
