import sys
from os.path import abspath, dirname, join
from os import makedirs
import datetime
import jinja2
from shutil import copytree

ROOT_PATH = abspath(dirname(__file__))
TEMPLATE_PATH = abspath(join(ROOT_PATH, 'templates'))

# pair of template name and output file name
TEMPLATE_DATA = [
    ('socket_debugger.template', 'socket-debugger.html')
]

# first argument is script path, following are passed args
PROJECT_PATH = sys.argv[1]
PROJECT_NAME = PROJECT_PATH.split('/')[-1] if PROJECT_PATH.__contains__('/') \
                else PROJECT_PATH.split('\\')[-1]
SOCKET_PORT = sys.argv[2]

OUTPUT_PATH = abspath(join(PROJECT_PATH, 'vxproj', 'js'))

def generate_viewx_socket_debugger():
    """
    Method that generates socket debugger HTML page for ViewX project instance.
    """
    # Initialize template engine.
    jinja_env = jinja2.Environment(
        trim_blocks=True, lstrip_blocks=True,
        loader=jinja2.FileSystemLoader(TEMPLATE_PATH))

    date = datetime.datetime.now().strftime('%d.%m.%Y. %H:%M:%S')

    for template_name, output_file_name in TEMPLATE_DATA:
        # Load preview template
        template = jinja_env.get_template(template_name)

        # render the template
        rendered = template.render({
            'date': date,
            'project_name': PROJECT_NAME,
            'socket_port': SOCKET_PORT
        })

        # create output directory if not already exists
        makedirs(OUTPUT_PATH, exist_ok=True)

        # Write rendered content to the file
        with open(join(OUTPUT_PATH, output_file_name), 'w') as output_file:
            output_file.write(rendered)

    return True

if generate_viewx_socket_debugger():
    print('success')
else:
    print('error')
