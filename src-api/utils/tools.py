import os
import shutil
from .db import SELECT_MIDDLEWARE_ID, middleware_db
from pathlib import Path

def return_stream_chunk(response_):
    for chunk in response_:
        if chunk.choices[0].delta.content is not None:
            content = chunk.choices[0].delta.content
            yield content


def delete_folder_recursive(folder_path: str):
    if os.path.exists(folder_path):
        print(f"delete_folder_recursive: {folder_path}")
        for root, dirs, files in os.walk(folder_path, topdown=False):
            for name in files:
                file_path = os.path.join(root, name)
                os.remove(file_path)
                print(f"Deleted file: {file_path}")
            for name in dirs:
                dir_path = os.path.join(root, name)
                os.rmdir(dir_path)
                print(f"Deleted empty folder: {dir_path}")
        shutil.rmtree(folder_path, ignore_errors=True)
        print(f"Deleted folder: {folder_path}")
    else:
        print(f"Folder not found: {folder_path}")


