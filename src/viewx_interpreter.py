"""
Module which serves as a viewX model interpreter.
"""

import sys
import os
from textx.metamodel import metamodel_from_file

for v in sys.argv[0:]:
    print(v)

dir_path = os.path.dirname(os.path.realpath(__file__))
dir_path = os.path.dirname(dir_path)

def test():
    print(dir_path)
    os.system("start /wait cmd /c PAUSE")

def view_model():
    viewx_mm = metamodel_from_file(os.path.join(dir_path, 'grammar', 'viewX.tx'))
    viewx_model = viewx_mm.model_from_file(os.path.join(dir_path, 'examples', 'state_machine.vx'))
    print(dir(viewx_model))
    print('kraj')

class ViewXInterpreter(object):
    """
    ViewX model interpreter.
    """
    def __init__(self, model):
        self.view_model = model

    def interpret(self, model_path, metamodel_path):
        """
        Main interpreting logic.
        """
        metamodel = metamodel_from_file(metamodel_path)
        model = metamodel.model_from_file(model_path)
        # print(dir(model))
        # print()
        # print(dir(model.__getattribute__('_tx_attrs')))
        # print()
        # for at in model.__getattribute__('_tx_attrs'):
        #     print(at)
        # print()
        # print(model.__getattribute__('_tx_attrs')['states'])
        # print(dir(model.__getattribute__('_tx_attrs')['states']))
        # print(dir(model.__getattribute__('_tx_attrs')['states'].cls))
        # print(dir(model.__getattribute__('_tx_attrs')['states'].cls._tx_peg_rule))
        # print(model.__getattribute__('_tx_attrs')['states'].cls._tx_peg_rule)
        # print(model.__getattribute__('_tx_attrs')['states'].name)
        # print()
        # print(model.__getattribute__('states'))
        # print(dir(model.__getattribute__('states')))
        # print()

        for view in view_model.views:
            print(view.name)

        print('--------------')

        print(type(model.__getattribute__('_tx_attrs')))
        print(dir(model.__getattribute__('_tx_attrs').items()))

        for view in view_model.views:
            print("1. {}".format(view.name))
            # loop over model tx properties
            for key, value in model.__getattribute__('_tx_attrs').items():
                print("2. {}".format(key))
                # if defined get the property
                if value.cont:
                    attr = model.__getattribute__(key)
                    # if non-empty list
                    if attr.__class__.__name__ == 'list':
                        first = attr[0] if attr.__len__() > 0 else None
                        if first and first.__class__.__name__ == view.name:
                            print('match')
                            for item in attr:
                                # create json
                                print(item)
                            break
                        else:
                            print('continue')
                            continue

def build_path_from_import(view_model, _import):
    path = os.path.dirname(view_model)
    _import = _import[1:-1] # remove ""
    if _import[0:2] == './':
        _import = _import[2:]
    subpaths = _import.split('/')
    for subpath in subpaths:
        if subpath == '..':
            path = os.path.dirname(path)
        else:
            path = os.path.join(path, subpath)
    return path

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python {} <view_model> <model>".format(sys.argv[0]))
    else:
        viewx_grammar_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'grammar')
        view_meta_model = metamodel_from_file(os.path.join(viewx_grammar_folder, 'viewX.tx'))
        view_model = view_meta_model.model_from_file(sys.argv[1])

        # print(dir(view_model))
        # print()
        # print(dir(view_model.tx_import))
        # print()
        # print(view_model.tx_import.model)
        # print(view_model.tx_import.path)

        viewx_interpreter = ViewXInterpreter(view_model)
        import_path = build_path_from_import(sys.argv[1], view_model.tx_import.path)
        viewx_interpreter.interpret(sys.argv[2], import_path)
