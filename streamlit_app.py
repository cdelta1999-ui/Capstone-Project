"""Repo-root entry point for Streamlit Community Cloud.

The actual dashboard lives in ``streamlit-dashboard/streamlit_app.py``. This
thin shim lets Streamlit Community Cloud deploy with its default main file
(``streamlit_app.py``) at the repository root, where it also reliably finds
``requirements.txt``.

It executes the real app as ``__main__`` so the dashboard's
``if __name__ == "__main__": main()`` guard runs and ``__file__`` still points
inside ``streamlit-dashboard/`` (keeping the relative data path correct).
"""

import runpy
from pathlib import Path

APP = Path(__file__).resolve().parent / "streamlit-dashboard" / "streamlit_app.py"

runpy.run_path(str(APP), run_name="__main__")
