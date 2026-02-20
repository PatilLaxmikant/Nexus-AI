import streamlit as st
import json
import os
from agent import process_request

st.set_page_config(page_title="AI Agent", page_icon="🤖", layout="wide")

st.title("🤖 AI Agent with Tools")

# Initialize chat history
if "messages" not in st.session_state:
    st.session_state.messages = []

def render_message(role, content):
    """Render a message based on its role and content (parsing JSON if needed)."""
    
    # Try to parse JSON content
    parsed = None
    try:
        parsed = json.loads(content)
    except (json.JSONDecodeError, TypeError):
        pass

    if role == "system":
        return # Don't show system prompt

    if role == "user":
        # Check if it's an observation (tool output)
        if parsed and isinstance(parsed, dict) and parsed.get("step") == "observe":
            output = parsed.get("output")
            with st.chat_message("user", avatar="👀"):
                st.markdown(f"**Observation**: `{str(output)[:500]}...`" if len(str(output)) > 500 else f"**Observation**: `{output}`")
                
                # Check if output mentions a saved file that is an image
                if isinstance(output, str) and "saved to" in output.lower():
                    words = output.split()
                    for word in words:
                        if word.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                            filename = word.strip(".,;:\"'")
                            if os.path.exists(filename):
                                st.image(filename, caption=filename)
                                
        # Check if it's an error feedback
        elif parsed and isinstance(parsed, dict) and parsed.get("step") == "error":
             with st.chat_message("user", avatar="❌"):
                st.error(f"System Error: {parsed.get('output')}")
        else:
            # Regular user message
            with st.chat_message("user"):
                st.markdown(content)

    elif role == "assistant":
        if parsed and isinstance(parsed, dict):
            step = parsed.get("step")
            if step == "plan":
                with st.chat_message("assistant", avatar="🧠"):
                    st.markdown(f"**Plan**: {parsed.get('content')}")
            elif step == "action":
                with st.chat_message("assistant", avatar="🛠️"):
                    st.markdown(f"**Action**: `{parsed.get('function')}`")
                    st.json(parsed.get("input"), expanded=False)
            elif step == "output":
                with st.chat_message("assistant", avatar="🤖"):
                    st.markdown(parsed.get("content"))
            elif step == "error":
                with st.chat_message("assistant", avatar="⚠️"):
                    st.error(parsed.get("content"))
        else:
            # Fallback for non-JSON text
            with st.chat_message("assistant"):
                st.markdown(content)

# Display chat messages from history
for message in st.session_state.messages:
    render_message(message["role"], message["content"])

# Accept user input
if prompt := st.chat_input("What can I do for you?"):
    # Add user message to chat history
    st.session_state.messages.append({"role": "user", "content": prompt})
    
    # Display user message immediately
    with st.chat_message("user"):
        st.markdown(prompt)

    # Process request
    with st.container():
        for event in process_request(st.session_state.messages):
            event_type = event["type"]
            
            if event_type == "plan":
                with st.chat_message("assistant", avatar="🧠"):
                    st.markdown(f"**Plan**: {event['content']}")
            
            elif event_type == "action":
                with st.chat_message("assistant", avatar="🛠️"):
                    st.markdown(f"**Action**: `{event['tool']}`")
                    st.json(event['input'], expanded=False)
            
            elif event_type == "observe":
                output = event['content']
                with st.chat_message("user", avatar="👀"):
                    st.markdown(f"**Observation**: `{str(output)[:500]}...`" if len(str(output)) > 500 else f"**Observation**: `{output}`")
                    
                    # Check for image files in output
                    if isinstance(output, str) and "saved to" in output.lower():
                        words = output.split()
                        for word in words:
                            if word.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                                filename = word.strip(".,;:\"'")
                                if os.path.exists(filename):
                                    st.image(filename, caption=filename)
            
            elif event_type == "output":
                with st.chat_message("assistant", avatar="🤖"):
                    st.markdown(event['content'])
            
            elif event_type == "error":
                st.error(event['content'])
