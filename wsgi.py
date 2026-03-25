"""
WSGI entry for PythonAnywhere and other WSGI hosts.

Web app → WSGI file path: /path/to/nawa/wsgi.py
"""
from server.app import application  # noqa: F401
