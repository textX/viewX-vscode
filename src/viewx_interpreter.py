"""
Module which serves as a viewX model interpreter.
"""

import sys
import os
from textx.metamodel import metamodel_from_file
import preview_generator
import cytoscape_helper as cy
import cytoscape_rule_engine as cre

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
        self.styles = []
        self.traversed_types = []

    def interpret(self, model):
        """
        Main interpreting logic.
        """

        self.model = model

        for view in view_model.views:
            print(view.name)

        print('--------------')

        print(type(model.__getattribute__('_tx_attrs')))
        print(dir(model.__getattribute__('_tx_attrs').items()))
        print(dir(view_model.views[0]))

        for view in view_model.views:
            print("1. {}".format(view.name))
            # loop over model tx properties recursively and match them with defined views
            self.match_view_within_type(model, view)
            # generate view styles
            print('generate view styles')
            visitor = cre.ViewStylePropertyVisitor(view)
            for prop in view.properties:
                visitor.visit(prop)
            self.styles.append(visitor.view_style)

    def match_view_within_type(self, tx_type, view, clear=True):
        print()
        print('Match view within type')
        print(tx_type.__class__.__name__, view.name, clear)
        print(self.traversed_types)
        print()
        if clear:
            self.traversed_types.clear()
        if not self.traversed_types.__contains__(tx_type.__class__.__name__):
            print('traversed not contains {}, add it'.format(tx_type.__class__.__name__))
            self.traversed_types.append(tx_type.__class__.__name__)
            print(self.traversed_types)
            # take all defined items within type
            for key, value in tx_type._tx_attrs.items():
                print("2. {}".format(key))
                # if defined get the property
                if value.cont:
                    items = tx_type.__getattribute__(key)
                    # if non-empty list
                    #
                    # match also single item
                    #
                    if items.__class__.__name__ == 'list':
                        first = items[0] if items.__len__() > 0 else None
                        if first and first.__class__.__name__ == view.name:
                            print('match')
                            for item in items:
                                # create json
                                print(item)
                                self.elements.update(self.build_graph_element(item, view))
                            break
                        else:
                            print('else')
                            # iterate through defined tx items
                            for key, value in first._tx_attrs.items():
                                print('*****1')
                                print(first)
                                print(items)
                                print('..........')
                                match_found = False
                                print(value.cont)
                                for item in items:
                                    # get tx item property
                                    item_property = item.__getattribute__(key)
                                    print('item property')
                                    print(item_property)
                                    # if property class match view
                                    if item_property.__class__.__name__ == 'list':
                                        if item_property[0].__class__.__name__ == view.name:
                                            print('match inside view')
                                            match_found = True
                                            self.elements.update(self.build_graph_element(item_property[0], view))
                                    if not match_found:
                                        print('break')
                                        break


    def build_graph_element(self, item, view):
        # print(item.__getattribute__('_tx_attrs').items())
        print()
        print('****bge******')
        graph_element = None
        element_label = None

        # check item referencing properties (label, is_edge(connection points), parent...)
        label_property = None
        for prop in view.properties:
            if prop.__class__.__name__ == 'Label':
                label_property = prop.label
                break
        is_edge = view.shape in cre.edge_shapes

        # if not defined, set default label with element index
        if label_property is None:
            element_label = 'Element_{0}'.format(self.elements.__len__())
        else:
            if label_property.__class__.__name__ == 'ClassLabel':
                # resolve item name
                element_label = self.get_class_property(label_property.classProperties, item)
            else:
                element_label = label_property
        print(element_label)
        if is_edge:
            start_element = None
            end_element = None
            for prop in view.properties:
                if prop.__class__.__name__ == 'EdgeStartProperty':
                    print('Start edge property')
                    print(item)
                    print(dir(item))
                    print(prop)
                    print(prop.classProperties)
                    print(dir(prop))
                    start_element = self.get_class_property(prop.classProperties, item)
                    print(start_element)
                    print(dir(start_element))
                    print(type(start_element))
                    print(self.elements)
                    print(start_element.__hash__())
                    start_element = self.elements[start_element.__hash__()]
                elif prop.__class__.__name__ == 'EdgeEndProperty':
                    print('End edge property')
                    print(item)
                    print(dir(item))
                    print(prop)
                    print(prop.classProperties)
                    print(dir(prop))
                    end_element = self.get_class_property(prop.classProperties, item)
                    print(end_element)
                    print(dir(end_element))
                    print(type(end_element))
                    print(self.elements)
                    print(end_element.__hash__())
                    end_element = self.elements[end_element.__hash__()]
                # when both start and end nodes are defined
                if start_element is not None and end_element is not None:
                    graph_element = cy.Edge(start_element, end_element, item.__hash__())
        else:
            graph_element = cy.Node(item.__hash__())
        
        graph_element.add_data('label', element_label)
        
        # add parent if defined
        if view.parentView is not None:
            parent = self.find_view_parent_tx_type(item, view, self.model)
            graph_element.add_data('parent', parent.__hash__())            

        graph_element.add_class(view.name.lower())
        return {item.__hash__(): graph_element}
    

    def get_class_property(self, class_properties, starting_item):
        result_property = starting_item
        for class_prop in class_properties:
            if hasattr(result_property, class_prop):
                result_property = result_property.__getattribute__(class_prop)
        return result_property


    def find_view_parent_tx_type(self, tx_type, view_type, tx_root_type):
        """
        Method that finds parent of the passed tx_type, starting from the tx_root_type.
        """
        print()
        print('---find parent---')

        traversed_types = []
        traversed_types.append(tx_root_type.__class__.__name__)

        # find parent
        for key1, value1 in tx_root_type._tx_attrs.items():
            print("1-3. {}".format(key1))
            # if defined get the property
            if value1.cont:
                items1 = tx_root_type.__getattribute__(key1)
                print("1-4. {}".format(items1))
                # if non-empty list
                #
                # match also single item
                #
                if items1.__class__.__name__ == 'list':
                    first1 = items1[0] if items1.__len__() > 0 else None
                    if first1 and view_type.parentView is not None and first1.__class__.__name__ == view_type.parentView.name:
                        print('match1')
                        for item1 in items1:
                            # find child
                            for key2, value2 in item1._tx_attrs.items():
                                print("2-3. {}".format(key2))
                                items2 = item1.__getattribute__(key2)
                                print("2-4. {}".format(items2))
                                # if non-empty list
                                #
                                # match also single item
                                #
                                if items2.__class__.__name__ == 'list':
                                    first2 = items2[0] if items2.__len__() > 0 else None
                                    if first2 and first2.__class__.__name__ == tx_type.__class__.__name__:
                                        print('match2')
                                        for item2 in items2:
                                            if tx_type.__hash__() == item2.__hash__():
                                                return item1
                                        break
                                else:
                                    print('else2')
                        break
                else:
                    print('else1')

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
        
        print()
        print('elements:')
        for elk, elv in viewx_interpreter.elements.items():
            print(elk)
            print(elv.to_json())

        print()
        print('styles:')
        for style in viewx_interpreter.styles:
            print(style.to_json())

        preview_generator.generate(view_model, target_model, viewx_interpreter)
