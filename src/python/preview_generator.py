import os
import datetime
import jinja2

TEMPLATE_NAME = 'preview.template'
TEMPLATE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), 'templates'))

def generate(viewX_interpreter, output_dir, socket_port, model_name, view_model_name):
    """
    Method that generates preview.html file with Cytoscape.js graph representation of interpreted textX model.
    :param viewX_interpreter: viewX interpreter which has all information necessary for preview.html file generation
    :param socket_port: A port used for socket.io server communication
    :return: /
    """

    # Initialize template engine.
    jinja_env = jinja2.Environment(
        trim_blocks=True, lstrip_blocks=True,
        loader=jinja2.FileSystemLoader(TEMPLATE_PATH))

    # Load preview template
    template = jinja_env.get_template(TEMPLATE_NAME)

    date = datetime.datetime.now().strftime('%d.%m.%Y. %H:%M:%S')

    # get project name
    parts = output_dir.split('/') if output_dir.__contains__('/') else output_dir.split('\\')
    project_name = parts[-2]

    # render the template
    rendered = template.render({'date': date,
                                'project_name': project_name,
                                'model_name': model_name,
                                'view_model_name': view_model_name,
                                'view_model': viewX_interpreter.view_model,
                                'model': viewX_interpreter.model,
                                'socket_port': socket_port,
                                'elements': viewX_interpreter.elements.values(),
                                'styles': viewX_interpreter.styles,
                                'overwrite_styles': viewX_interpreter.overwrite_styles})

    # Write rendered content to the file
    with open(os.path.join(output_dir, 'preview.html'), 'w') as preview_file:
        preview_file.write(rendered)