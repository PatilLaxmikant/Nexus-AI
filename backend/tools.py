"""
This module wraps the core tool functions into LangChain-compatible tools.
"""
from langchain_core.tools import tool, StructuredTool
from backend.core_tools import available_tools

# List to hold the converted tools
tools_list = []

for name, func in available_tools.items():
    try:
        # Create a StructuredTool from the function
        # We assume the functions have proper type hints and docstrings as seen in the source
        # strict=True ensures that the schema is derived from the signature
        t = StructuredTool.from_function(
            func=func,
            name=name,
            description=func.__doc__ or "No description provided."
        )
        tools_list.append(t)
    except Exception as e:
        print(f"Warning: Could not convert tool '{name}': {e}")

# Expose the list of tools
TOOLS = tools_list
