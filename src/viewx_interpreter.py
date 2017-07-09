"""
Module which serves as a viewX model interpreter.
"""

import sys
import os
from textx.metamodel import metamodel_from_file
import preview_generator
import cytoscape_helper as cy

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
    def __init__(self, viewmodel):
        self.view_model = viewmodel
        self.elements = {}
        self.traversed_types = []

    def interpret(self, model):
        """
        Main interpreting logic.
        """

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
        print(dir(view_model.views[0]))

        for view in view_model.views:
            print("1. {}".format(view.name))
            # loop over model tx properties
            self.match_view_within_type(model, view)


    def match_view_within_type(self, type, view, clear=True):
        print()
        print('Match view within type')
        print(type.__class__.__name__, view.name, clear)
        print(self.traversed_types)
        print()
        if clear:
            self.traversed_types.clear()
        if not self.traversed_types.__contains__(view.name):
            self.traversed_types.append(view.name)
            for key, value in type._tx_attrs.items():
                print("2. {}".format(key))
                # if defined get the property
                if value.cont:
                    attr = type.__getattribute__(key)
                    # print('++++')
                    # print(attr)
                    # print(dir(attr))
                    # print('+++++++')
                    # if non-empty list
                    if attr.__class__.__name__ == 'list':
                        first = attr[0] if attr.__len__() > 0 else None
                        if first and first.__class__.__name__ == view.name:
                            print('match')
                            for item in attr:
                                # create json
                                print(item)
                                self.elements.update(self.build_graph_element(item, view))
                            break
                        elif first:
                            print('elif')
                            # print(first)
                            # print(dir(first))
                            # print(first._tx_attrs)
                            # print(dir(first._tx_attrs))
                            for key, value in first._tx_attrs.items():
                                # print(k)
                                # print(v)
                                # print(dir(v))
                                print('*****1')
                                print(first)
                                # print(v.cls)
                                # print(dir(v.cls))
                                # print(v.cls._tx_type)
                                # print(v.cls._tx_metamodel)
                                # print(v.cls._tx_peg_rule)
                                # print(first.__getattribute__(k))
                                # print(first.__getattribute__(k).__class__.__name__)
                                print(attr)
                                print('..........')
                                for item in attr:
                                    item_property = item.__getattribute__(key)
                                    if item_property.__class__.__name__ == 'list':
                                        if item_property[0].__class__.__name__ == view.name:
                                            print('match inside view')
                                            print(item)
                                            print(key)
                                            print(item_property)
                                            print(item_property[0].__class__.__name__)
                                            print(',,,,,,,')
                                            print(item_property[0], view.name)
                                            self.elements.update(self.build_graph_element(item_property[0], view))
                                print('*****2')
                                # print(v.name)
                                # print(v.ref)
                                # print('*****3')
                                print(view.name)
                                self.match_view_within_type(type, view, False)
                        else:
                            print('continue')
                            continue


    def build_graph_element(self, item, view):
        print('****bge******')
        print(item)
        print(dir(item))
        print(item.__hash__())
        # print(item.__getattribute__('_tx_attrs').items())
        print(view)
        print(dir(view))
        graph_element = None
        found_label = False
        # print(view.__getattribute__('_tx_attrs').items())
        for prop in view.properties:
            if prop.__class__.__name__ == 'LabelProperty':
                label = prop.label[0]
                if label.__class__.__name__ == 'ClassLabel':
                    # resolve item name
                    element_label = self.get_class_property(label.classProperties, item)
                else:
                    element_label = prop.label[0]
                found_label = True

        # if label property is not found set default with element index
        if not found_label:
            element_label = 'Element_{0}'.format(self.elements.__len__())

        # if element is edge
        if view.shape in ('Line'):
            print('.....creating edge.....')
            start_element = None
            end_element = None
            for prop in view.properties:
                print(prop)
                if prop.__class__.__name__ == 'LineStartProperty':
                    print('LineStartProperty')
                    print(dir(prop))
                    start_element = self.get_class_property(prop.classProperties, item)
                    print(start_element)
                    print(self.elements[start_element.__hash__()].to_json())
                    start_element = self.elements[start_element.__hash__()]
                elif prop.__class__.__name__ == 'LineEndProperty':
                    print('LineEndProperty')
                    print(dir(prop))
                    end_element = self.get_class_property(prop.classProperties, item)
                    print(end_element)
                    print(self.elements[end_element.__hash__()].to_json())
                    end_element = self.elements[end_element.__hash__()]
                if start_element is not None and end_element is not None:
                    graph_element = cy.Edge(element_label, start_element, end_element, item.__hash__())
                    break
        else:
            graph_element = cy.Node(element_label, item.__hash__())

        return {item.__hash__(): graph_element}

    def get_class_property(self, class_properties, starting_property):
        result_property = starting_property
        for class_prop in class_properties:
            if hasattr(result_property, class_prop):
                result_property = result_property.__getattribute__(class_prop)
        return result_property

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

        metamodel_path = build_path_from_import(sys.argv[1], view_model.tx_import.path)
        model_path = sys.argv[2]
        target_metamodel = metamodel_from_file(metamodel_path)
        target_model = target_metamodel.model_from_file(model_path)

        viewx_interpreter = ViewXInterpreter(view_model)
        viewx_interpreter.interpret(target_model)
        
        for elk, elv in viewx_interpreter.elements.items():
            print(elk)
            print(elv.to_json())

        preview_generator.generate(view_model, target_model, viewx_interpreter)
