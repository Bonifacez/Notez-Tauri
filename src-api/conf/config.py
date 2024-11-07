from dataclasses import dataclass


@dataclass
class AppState:
    base_file_url: str = "None"


file_state = AppState()
