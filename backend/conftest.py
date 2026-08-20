"""Root conftest — ensures backend/ is on sys.path for pytest."""

import sys
from pathlib import Path

# Add backend/ directory to path so `import app` works from tests/
sys.path.insert(0, str(Path(__file__).parent))
