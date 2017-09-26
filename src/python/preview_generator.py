import os
import datetime
import jinja2

TEMPLATE_NAME = 'preview.template'
TEMPLATE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), 'templates'))
OUTPUT_PATH = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname((__file__)))), 'graph_preview'))

def generate(view_model, model, viewx_interpreter, socket_port):

    # Initialize template engine.
    jinja_env = jinja2.Environment(
        trim_blocks=True, lstrip_blocks=True,
        loader=jinja2.FileSystemLoader(TEMPLATE_PATH))

    # Load preview template
    template = jinja_env.get_template(TEMPLATE_NAME)

    date = datetime.datetime.now().strftime('%d.%m.%Y. %H:%M:%S')

    # render the template
    rendered = template.render({'date': date,
                                'view_model': view_model,
                                'model': model,
                                'socket_port': socket_port,
                                'elements': viewx_interpreter.elements.values(),
                                'styles': viewx_interpreter.styles,
                                'overwrite_styles': viewx_interpreter.overwrite_styles})

    # Write rendered content to the file
    with open(os.path.join(OUTPUT_PATH, 'preview.html'), 'w') as preview_file:
        preview_file.write(rendered)