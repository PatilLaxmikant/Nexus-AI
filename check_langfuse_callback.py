try:
    from langfuse.callback import CallbackHandler
    print("Import from langfuse.callback success")
except ImportError:
    print("Import from langfuse.callback failed")
    try:
        from langfuse.langchain import CallbackHandler
        print("Import from langfuse.langchain success")
    except ImportError as e:
        print(f"Import from langfuse.langchain failed: {e}")
