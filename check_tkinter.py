import tkinter
from tkinter import filedialog

print(f"Tkinter version: {tkinter.TkVersion}")
try:
    root = tkinter.Tk()
    root.withdraw()
    # Don't actually open dialog in test, just check import and init
    print("Tkinter initialized successfully")
    root.destroy()
except Exception as e:
    print(f"Tkinter failed: {e}")
