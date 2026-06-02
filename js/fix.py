import glob
import os

for f in glob.glob('*.js'):
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Fix the weird powershell backtick-n issue and rename to db
    content = content.replace('supabase`n', 'db\n')
    content = content.replace('supabase.', 'db.')
    
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
    print('Fixed ' + f)
