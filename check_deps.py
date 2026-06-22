import os
import re
from pathlib import Path

def check_imports():
    src_dir = Path(r"c:\Users\rishi\OneDrive\Desktop\Driverpulse\driver-pulse-hackathon\server\src")
    broken_imports = []
    
    # Regex to find ES module relative imports
    import_regex = re.compile(r"""(?:import|export)\s+(?:.*?)\s*from\s+['"](\..*?)['"]""")
    import_regex2 = re.compile(r"""import\s+['"](\..*?)['"]""")
    
    for root, _, files in os.walk(src_dir):
        for file in files:
            if not file.endswith('.js'):
                continue
                
            filepath = Path(root) / file
            
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
                imports = import_regex.findall(content) + import_regex2.findall(content)
                for imp in imports:
                    if imp.startswith('.'):
                        target_path = (Path(root) / imp).resolve()
                        if not target_path.exists():
                            broken_imports.append({
                                'file': str(filepath.relative_to(src_dir)),
                                'import': imp
                            })
                            
    if not broken_imports:
        print("✅ No broken imports found.")
    else:
        print(f"❌ Found {len(broken_imports)} broken imports:")
        for b in broken_imports:
            print(f"  File: {b['file']}")
            print(f"  Import: {b['import']}\n")

if __name__ == "__main__":
    check_imports()
