from typing import Annotated, Literal, TypedDict
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langgraph.graph import StateGraph, START, END, MessagesState
from langgraph.prebuilt import ToolNode, tools_condition
from backend.config import API_KEY, BASE_URL, MODEL_NAME
from backend.tools import TOOLS

# Initialize LLM
llm = ChatOpenAI(
    api_key=API_KEY,
    base_url=BASE_URL,
    model=MODEL_NAME,
    temperature=0,
)

# Bind tools
llm_with_tools = llm.bind_tools(TOOLS)

SYSTEM_MSG = "You are Nexus AI, an intelligent coding assistant. - When asked to create or modify code, ALWAYS use the 'write_file' tool to save the code directly to the file. - If the user asks for a React component, create it in a suitable file (e.g., src/components/MyComponent.jsx). - After writing a file, confirm to the user that it has been created."

from langchain_core.runnables import RunnableConfig

# Define the graph
async def agent(state: MessagesState, config: RunnableConfig):
    messages = state["messages"]
    
    # Read config
    conf = config.get("configurable", {})
    model_name = conf.get("model_name", MODEL_NAME)
    temperature = conf.get("temperature", 0.7)
    custom_system_prompt = conf.get("system_prompt")
    json_mode = conf.get("json_mode", False)
    
    # Initialize LLM dynamically
    llm = ChatOpenAI(
        api_key=API_KEY,
        base_url=BASE_URL,
        model=model_name,
        temperature=temperature,
    )
    llm_with_tools = llm.bind_tools(TOOLS)
    
    # Determine system prompt
    current_system_msg = custom_system_prompt if custom_system_prompt else SYSTEM_MSG
    
    if json_mode:
        current_system_msg += " You must answer in strict JSON format. Do not include markdown code blocks, backticks, or any explanation. Output raw JSON only."
    
    # Prepend system message if not present or different
    # (Simplification: Just ensure the first message is SystemMessage with correct content)
    if not messages or not isinstance(messages[0], SystemMessage):
        messages = [SystemMessage(content=current_system_msg)] + messages
    elif isinstance(messages[0], SystemMessage) and messages[0].content != current_system_msg:
        # Update existing system message if config changed
        messages[0] = SystemMessage(content=current_system_msg)
    
    # We invoke with the full history
    response = await llm_with_tools.ainvoke(messages)
    return {"messages": [response]}

workflow = StateGraph(MessagesState)

workflow.add_node("agent", agent)
workflow.add_node("tools", ToolNode(TOOLS))

workflow.add_edge(START, "agent")
workflow.add_conditional_edges("agent", tools_condition)
workflow.add_edge("tools", "agent")

# We do NOT compile here anymore to avoid sync/async issues with SqliteSaver at module level
# The server will handle compilation with AsyncSqliteSaver
