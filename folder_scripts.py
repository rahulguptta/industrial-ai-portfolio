import os
project_name = "industrial-ai-toolkit"
folders = ["app", "frontend", "data", "models"]
folder_files = {
    "app": ["main.py", "model.py", "utils.py", "database.py"],
    "frontend": ["index.html", "styles.css", "app.js"]
}

os.makedirs(project_name, exist_ok=True)
for folder in folders:
    os.makedirs(os.path.join(project_name, folder), exist_ok=True)
    if folder in folder_files:
        for file in folder_files[folder]:
            file_path = os.path.join(project_name, folder, file)
            open(file_path, 'w').close()

print("done")

