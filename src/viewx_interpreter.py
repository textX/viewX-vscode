from textx.metamodel import metamodel_from_file
import os
import sys

for v in sys.argv[1:]:
    print(v)

dir_path = os.path.dirname(os.path.realpath(__file__))

dir_path = os.path.dirname(dir_path)

print(dir_path)

os.system("start /wait cmd /c PAUSE")

viewx_mm = metamodel_from_file(os.path.join(dir_path, 'grammar', 'viewX.tx'))

viewx_model = viewx_mm.model_from_file(os.path.join(dir_path, 'examples', 'state_machine.vx'))

print(dir(viewx_model))

print('kraj')

