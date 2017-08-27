import sys
import os
import datetime
import jinja2

ROOT_PATH = os.path.abspath(os.path.dirname(__file__))
TEMPLATE_PATH = os.path.abspath(os.path.join(ROOT_PATH, 'templates'))

# pair of template name and output file name
TEMPLATE_DATA = [
    ('project_config.template', 'vxconfig.json'),
    ('tx_metamodel.template', 'university.tx'),
    ('tx_model.template', 'university_sample.univ'),
    ('vx_model.template', 'course_overview.vx')
]

# first argument is script path, following are passed args
PROJECT_PATH = sys.argv[1]
PROJECT_NAME = sys.argv[2]

OUTPUT_PATH = os.path.abspath(os.path.join(PROJECT_PATH, PROJECT_NAME))

def generate_viewx_project_files():
    """
    Method that generates all template files for initial ViewX project setup.
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
            'projectName': PROJECT_NAME
        })

        # create output directory if not already exists
        os.makedirs(OUTPUT_PATH, exist_ok=True)

        # Write rendered content to the file
        with open(os.path.join(OUTPUT_PATH, output_file_name), 'w') as output_file:
            output_file.write(rendered)

    return True

if generate_viewx_project_files():
    print('success')
else:
    print('error')