"""
Module which serves as a viewX model interpreter.
"""

import sys
import os
import copy
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
        self.view_model = viewmodel # assign view model when initialized
        self.model = None # different models can be interpreted with same viewmodel
        self.elements = {} # all cytoscape.js graph elements
        self.styles = [] # style definitions for elements
        self.traversed_types = [] # visited types during recursive search algorithm
        self.existing_parents = [] # used when multiple sources reference same element as inside
        self.links = {} # store links when not all elements have been created yet
        # dictionary of dictionaries
        # {type1 : {source1 : [dst1, dst2]},
        #           {source2 : [dst3, dst4]},
        #  type2 : {source3 : [dst5]},
        #  type3 : {source4 : [dst6, dst7, dst8]}}

    def interpret(self, model):
        """
        Main interpreting logic.
        """

        self.model = model

        for view in view_model.views:
            print(view.name)

        print('--------------')

        print(type(model.__getattribute__('_tx_attrs')))
        print(model.__getattribute__('_tx_attrs').items())
        print(dir(view_model.views[0]))

        for view in view_model.views:
            print()
            print("1. {}".format(view.name))
            # loop over model tx properties recursively and match them with defined views
            self.match_view_within_type(model, view)
            # generate view styles
            print('generate view styles')
            visitor = cre.ViewStylePropertyVisitor(view)
            property_link = None
            for prop in view.properties:
                visitor.visit(prop)
                if prop.__class__.__name__ == 'PropertyLink':
                    property_link = prop
            self.styles.append(visitor.view_style)
            # check if view has link to it's properties
            if property_link is not None:
                link_visitor = cre.LinkStylePropertyVisitor(view, property_link)
                self.styles.append(link_visitor.view_style)

        # create property links if any
        if self.links.__len__() > 0:
            self.create_links()

    def match_view_within_type(self, tx_type, view, recursion=False):
        print()
        print('Match view within type')
        print(view.name, tx_type.__class__.__name__, recursion)
        print()
        print(self.traversed_types)
        if not recursion:
            self.traversed_types.clear()
        # if called by iterating over items recursively (not add_type) or if type not traversed yet
        if recursion or not self.traversed_types.__contains__(tx_type.__class__.__name__):
            # if not recursion:
            print('traversed not contains {}, add it'.format(tx_type.__class__.__name__))
            self.traversed_types.append(tx_type.__class__.__name__)
            print(self.traversed_types)
            # take all defined items within type
            for key, value in tx_type._tx_attrs.items():
                print("2. {}".format(key))
                # if defined get the property
                if value.cont:
                    print('value.cont')
                    items = tx_type.__getattribute__(key)
                    print(items)
                    # if non-empty list
                    #
                    # match also single item
                    #
                    if items.__class__.__name__ == 'list':
                        first = items[0] if items.__len__() > 0 else None
                        if first and first.__class__.__name__ == view.name:
                            print('match inside view - list')
                            for item in items:
                                elements = self.build_graph_element(item, view)
                                for el in elements:
                                    self.elements.update(el)
                        else:
                            print('* else - not correct type')
                            print(view)
                            for item in items:
                                self.match_view_within_type(item, view, True)
                    else:
                        print('single item')
                else:
                    print('not value.cont')
        if recursion:
            print('* leave recursion')
            print()

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
                    start_element = self.get_class_property(prop.classProperties, item)
                    start_element = self.elements[start_element.__hash__()]
                elif prop.__class__.__name__ == 'EdgeEndProperty':
                    end_element = self.get_class_property(prop.classProperties, item)
                    end_element = self.elements[end_element.__hash__()]
                # when both start and end nodes are defined
                if start_element is not None and end_element is not None:
                    graph_element = cy.Edge(start_element, end_element, item.__hash__())
        else:
            graph_element = cy.Node(item.__hash__())
        
        property_link = None
        for prop in view.properties:
            if prop.__class__.__name__ == 'PropertyLink':
                property_link = prop
                break
        
        # if item has defined links to it's properties, store them for later creating
        if property_link is not None:
            property_links = self.get_all_resolved_properties(property_link.link_to.class_properties, item)
            self.update_links(item, property_links)         

        graph_element.add_data('label', element_label)
        
        # add parent if defined
        if view.parentView is not None:
            # if view.conditional_parent is not None:
            #     self.existing_parents.clear()
            #     parent = None
            #     elements = []
            #     while True:
            #         parent = self.find_view_parent_tx_type(item, view, self.model)
            #         if parent is None:
            #             break
            #         self.existing_parents.append(parent)
            #         clone = copy.deepcopy(graph_element)
            #         clone.add_class(view.name.lower())
            #         elements.append({clone.__hash__(): clone})
            #     return elements
            # else:
            parent = self.find_view_parent_tx_type(item, view, self.model)
            graph_element.add_data('parent', parent.__hash__())            

        graph_element.add_class(view.name.lower())
        return [{item.__hash__(): graph_element}]
    

    def get_class_property(self, class_properties, starting_item):
        """
        Resolve single item properties.
        """
        result_property = starting_item
        for class_prop in class_properties:
            if hasattr(result_property, class_prop):
                result_property = result_property.__getattribute__(class_prop)
        return result_property

    def item_contains_property_by_structure(self, class_properties, starting_item, item_to_find):
        """
        Resolve class properties and check whether item_to_find can be found within starting_item
        following the class_properties structure.
        """
        result_property = starting_item
        if class_properties.__len__() == 0:
            return result_property.__hash__() == item_to_find.__hash__()

        if result_property.__class__.__name__ == 'list':
            # try for each item because not every item has to have defined all properties
            for item in result_property:
                for class_prop in class_properties:
                    if hasattr(item, class_prop):
                        result_property = item.__getattribute__(class_prop)
                        # if property found, take following class properties and pass them recursively
                        if self.item_contains_property_by_structure(class_properties[1:], result_property, item_to_find):
                            return True
        else:
            # if single item, resolve property directly
            for class_prop in class_properties:
                if hasattr(result_property, class_prop):
                    result_property = result_property.__getattribute__(class_prop)
                    if self.item_contains_property_by_structure(class_properties[1:], result_property, item_to_find):
                        return True
        return False


    def get_all_resolved_properties(self, class_properties, tx_item):
        """
        Resolve class properties and check whether item_to_find can be found within starting_item
        following the class_properties structure.
        """
        result_property = tx_item
        # if all class properties are used that means we have resolved all properties
        if class_properties.__len__() == 0:
            return result_property

        resolved_properties = []

        if result_property.__class__.__name__ == 'list':
            # try for each item because not every item has to have defined all properties
            for item in result_property:
                for class_prop in class_properties:
                    if hasattr(item, class_prop):
                        result_property = item.__getattribute__(class_prop)
                        # if property found, take following class properties and pass them recursively
                        properties = self.get_all_resolved_properties(class_properties[1:], result_property)
                        if properties.__class__.__name__ != 'list':
                            properties = [properties]    
                        resolved_properties.extend(properties)
        else:
            # if single item, resolve property directly
            for class_prop in class_properties:
                if hasattr(result_property, class_prop):
                    result_property = result_property.__getattribute__(class_prop)
                    properties = self.get_all_resolved_properties(class_properties[1:], result_property)
                    if properties.__class__.__name__ != 'list':
                        properties = [properties]    
                    resolved_properties.extend(properties)

        return resolved_properties


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
                print('value1.cont')
                items1 = tx_root_type.__getattribute__(key1)
                print("1-4. {}".format(items1))
                # if non-empty list
                #
                # match also single item
                #
                if items1.__class__.__name__ == 'list':
                    first1 = items1[0] if items1.__len__() > 0 else None
                    if first1 and view_type.parentView is not None and first1.__class__.__name__ == view_type.parentView.name:
                        print('match1 - parent type found')
                        for item1 in items1:
                            # if inside condition defined

                            if view_type.conditional_parent is not None:
                                print()
                                print('* inside condition defined')
                                print(view_type)
                                print(tx_type)
                                print('tx_type - {}'.format(tx_type.__hash__()))

                                print()
                                print(item1)
                                print('item1 - {}'.format(item1.__hash__()))
                                print(view_type.class_properties)

                                if item1 not in self.existing_parents and self.item_contains_property_by_structure(view_type.class_properties, item1, tx_type):
                                    print('conditional parent found')
                                    print(item1)
                                    return item1

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
                                        print('match2 - children type found')
                                        for item2 in items2:
                                            if tx_type.__hash__() == item2.__hash__():
                                                print('* found exact child {} of type {}'.format(tx_type.__hash__(), tx_type))
                                                return item1
                                        break
                                else:
                                    print('else2 - child of found parent is single item')
                        break
                    else:
                        print('else3 - children not of correct type')
                        # self.find_view_parent_tx_type(tx_type, view_type, first1)
                else:
                    print('else1 - single item')
            else:
                print('not value1.cont')

    def update_links(self, item, item_links):
        """
        Updates links to item's properties. All items are defined by their type in outter dictionary
        and all links are defined by their source item's hash code in inner dictionary.
        """
        link_dict = self.links.get(item.__class__.__name__, {})
        link_dict.update({item.__hash__() : [link.__hash__() for link in item_links]})
        self.links[item.__class__.__name__] = link_dict

    def create_links(self):
        """
        When all property links have been resolved they need to be created additionally.
        """
        new_edges = []
        # outter dictionary iteration
        for key_type, value_link_dict in self.links.items():
            # inner dictionary iteration
            for key_el_hash, value_element in self.elements.items():
                # linked properties (hash codes)
                linked = value_link_dict.get(key_el_hash, [])
                print()
                print(self.links)
                print('linked')
                print(linked)
                print()
                for target_hash in linked:
                    start_element = self.elements.get(key_el_hash, None)
                    end_element = self.elements.get(target_hash, None)
                    if start_element is not None and end_element is not None:
                        new_edge = cy.Edge(start_element, end_element)
                        new_edge.add_class(key_type.lower() + '_to_' + end_element.classes.split(' ')[0])
                        new_edges.append(new_edge)
        # after creation add them to the elements
        for edge in new_edges:
            self.elements[edge.__hash__()] = edge


def build_path_from_import(view_model, _import):
    """
    Build system path from defined import (relative '.' separated) path.
    """
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

        print()
        print('links:')
        for lk, lv in viewx_interpreter.links.items():
            print('{} : {}'.format(lk, lv))

        preview_generator.generate(view_model, target_model, viewx_interpreter)
