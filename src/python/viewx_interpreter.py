"""
Module which interprets textX model based on viewX model and generates preview.html file
with Cytoscape.js graph model used for visualization of textX model. The preview.html file is hosted on file server
and can be loaded with multiple clients (regular internet browser or Visual Studio Code extension) and previewed.
The graph is interactive and it's visualization is based on Cytoscape.js graph engine.
"""

import sys
from os.path import dirname, abspath, join
from textx.metamodel import metamodel_from_file
from textx.model import children_of_type
from textx.exceptions import *
import preview_generator
import cytoscape_helper as cy
import cytoscape_rule_engine as cre


class ViewXInterpreter(object):
    """
    ViewX model interpreter.
    """
    def __init__(self, view_model):
        self.view_model = view_model  # assign view model when initialized
        self.model = None  # different models can be interpreted with same view model
        self.elements = {}  # all Cytoscape.js graph elements
        self.styles = []  # style definitions for elements
        self.overwrite_styles = False  # overwrite styles flag
        self.traversed_types = []  # visited types during recursive search algorithm
        self.existing_parents = []  # used when multiple sources reference same element as inside
        self.links = {}  # store links when not all elements have been created yet
        # dictionary of dictionaries of dictionaries of target element (hash code) and list of properties (tuples)
        # {type1 : {source1 : {dst1 : [(prop1, value1), (prop2, value2)]}, {dst2: [(prop3, value3)]} },
        #           {source2 : {dst3 : [(prop4, value4)]}, {dst4 : [(prop5, value5)} },
        #  type2 : {source3 : [{dst5: [(prop6, value6), (prop7, value7)]} },
        #  ... 
        # }

    def interpret(self, model):
        """
        Main interpreting logic.

        :param model: textX model that should be interpreted

        :return: /
        """

        self.model = model

        for view in view_model.views:
            # loop over model tx properties recursively and match them with defined views
            if not (type(view.shape) is str and view.shape.lower() == 'none'):
                self.match_view_within_type(model, view)

            self.overwrite_styles = True if view_model.stylesheet\
                and view_model.stylesheet.overwrite == 'overwrite' else False
            if not self.overwrite_styles:
                # generate view styles
                visitor = cre.ViewStylePropertyVisitor(view)
                self.styles.append(visitor.view_style)

                property_link = None
                selected_property = None
                container_property = None
                for prop in view.properties:
                    # create ViewStyle for selected state
                    if prop.__class__.__name__ == 'SelectedProperty':
                        selected_property = prop
                    # check if view has link to it's properties
                    elif prop.__class__.__name__ == 'PropertyLink':
                        property_link = prop
                    # create styles for container shape
                    elif prop.__class__.__name__ == 'ContainerProperty':
                        container_property = prop

                # if it has, create style for property links
                if property_link:
                    link_visitor = cre.LinkStylePropertyVisitor(view, property_link)
                    self.styles.append(link_visitor.view_style)
                    # create ViewStyle for link in selected state
                    for link_prop in property_link.properties:
                        if link_prop.__class__.__name__ == 'LinkSelectedProperty':
                            sel_link_visitor = cre.LinkStylePropertyVisitor(view, property_link, link_prop, ':selected')
                            self.styles.append(sel_link_visitor.view_style)
                            break

                # append ViewStyle for selected state at the end
                if selected_property:
                    sel_visitor = cre.ViewStylePropertyVisitor(view, False, selected_property, ':selected')
                    self.styles.append(sel_visitor.view_style)

                # create style for container if it is defined
                if container_property:
                    cont_sel_property = None
                    container_visitor = cre.ViewStylePropertyVisitor(view, True, prop)
                    for cont_prop in prop.properties:
                        # create ViewStyle for container in selected state
                        if cont_prop.__class__.__name__ == 'SelectedProperty':
                            cont_sel_property = cont_prop
                            break
                    self.styles.append(container_visitor.view_style)
                    # append ViewStyle for container in selected state at the end
                    if cont_sel_property:
                        cont_sel_visitor = cre.ViewStylePropertyVisitor(view, True, cont_sel_property, ':selected')
                        self.styles.append(cont_sel_visitor.view_style)

        # create property links if any
        if self.links.__len__() > 0:
            self.create_links()

    def match_view_within_type(self, tx_type, view):
        """
        Utilize children_of_type method from textX module to return all elements that match textX type defined in view
        starting from root tx_type.

        :param tx_type: root tx_type to start searching from

        :param view: defined view for contained textX type that should be found within element of tx_type

        :return: /
        """
        children = children_of_type(view.name, tx_type)
        conditional_parent = view.__getattribute__('conditional_parent')
        if conditional_parent is None:
            for child in children:
                self.elements.update(self.build_graph_element(child, view))
        # follow condition of defined parent properties
        else:
            elements_of_type = children_of_type(conditional_parent.name, self.model)
            for parent in elements_of_type:
                for child in children:
                    if self.item_contains_property_by_structure(view.class_properties, parent, child):
                        self.elements.update(self.build_graph_element(child, view))

    def build_graph_element(self, item, view):
        """
        Method for creating Cytoscape.js graph elements defined by specified textX item and view.

        :param item: instance of textX type from which to create Cytoscape.js graph element

        :param view: view which describes how graph element should be created

        :return: Cytoscape.js graph element uniquely defined by textX instance's hash code
        """
        graph_element = None

        # if element is edge
        if view.shape.__class__.__name__ == 'LinkShape':
            start_element = None
            end_element = None
            for prop in view.properties:
                if prop.__class__.__name__ == 'EdgeStartProperty':
                    start_element = self.get_class_property(prop.class_properties, item)
                    start_element = self.elements.get(cy.small_hash(start_element), None)
                elif prop.__class__.__name__ == 'EdgeEndProperty':
                    end_element = self.get_class_property(prop.class_properties, item)
                    end_element = self.elements.get(cy.small_hash(end_element), None)
                # when both start and end nodes are defined
                if start_element is not None and end_element is not None:
                    graph_element = cy.Edge(start_element, end_element, cy.small_hash(item))
        else: # element is node
            graph_element = cy.Node(cy.small_hash(item))

        # check item referencing properties (label, is_edge(connection points), parent...)
        element_label = self.resolve_element_label(item, view.properties)
        # if not defined, set default label with element index
        if element_label is None:
            element_label = 'Element_{0}'.format(self.elements.__len__())

        graph_element.add_data('label', element_label)

        # check if property link is defined (need to store links and create them later)
        property_link = None
        for prop in view.properties:
            if prop.__class__.__name__ == 'PropertyLink':
                property_link = prop
                break

        # if item has defined links to it's properties, store them for later creating
        if property_link is not None:
            # resolve links to properties
            property_links = self.get_all_resolved_properties(property_link.link_to.class_properties, item)
            # transform in dictionary (hash_code : array of properties)
            transformed_links = {cy.small_hash(link): [] for link in property_links}

            # add property link classes as first property in each link
            for value_props in transformed_links.values():
                value_props.append(('class', '{}-{}'.format(property_link.link_to.class_view.name.lower(),
                                    '-'.join(property_link.link_to.class_properties))))

            # if property link label is defined
            for prop in property_link.properties:
                if prop.__class__.__name__ == 'Label':
                    if prop.label.__class__.__name__ == 'ClassLabel':
                        # the result are labels for all links which are resolve by class properties
                        link_labels = self.get_all_resolved_properties(prop.label.class_properties, item)
                        # if label is properly built and based on link, the count should be the same
                        for value_props, link_label in zip(transformed_links.values(), link_labels):
                            value_props.append(('label', link_label))
                    else:
                        # update label as string
                        for value_props in transformed_links.values():
                            value_props.append(('label', prop.label))
                    break

            self.update_links(item, transformed_links)

        # if parent class view is defined
        if hasattr(view, 'parent_view') and view.parent_view is not None:
            parent = self.find_view_parent_tx_type(item, view, self.model)
            if parent is not None:
                graph_element.add_data('parent', cy.small_hash(parent))

        # if parent class view is defined
        if hasattr(view, 'container') and view.container:
            # TODO: add something that uniquely defines peg rule, should be class+parent+conditions because of css
            container = self.find_element_with_class('{}-container'.format(view.name.lower()))
            if container is None:
                # create container element if not exists
                container = cy.Node()
                for prop1 in view.properties:
                    if prop1.__class__.__name__ == 'ContainerProperty':
                        element_label = self.resolve_element_label(item, prop1.properties)
                        if element_label:
                            container.add_data('label', element_label)
                        break
                container.add_class('{}-container'.format(view.name.lower()))
                self.elements.update({cy.small_hash(container): container})
            graph_element.add_data('parent', cy.small_hash(container))

        # add type definition offset
        graph_element.add_data('offset', item._tx_position)
        graph_element.add_data('offset_end', item._tx_position_end)

        # add class of view name (textX model type name)
        graph_element.add_class(view.name.lower())
        return {cy.small_hash(item): graph_element}

    def resolve_element_label(self, element, properties):
        element_label = None
        for prop in properties:
            if prop.__class__.__name__ == 'Label':
                label_property = prop.label
                if label_property.__class__.__name__ == 'ClassLabel':
                    # resolve item name
                    element_label = self.get_class_property(label_property.class_properties, element)
                else:
                    element_label = label_property
                # prepend/append pre_label/post_label if defined
                pre_label = self.get_class_property(['parent', 'pre_label', 'label'], label_property)
                if type(pre_label) is str:
                    element_label = pre_label + element_label
                post_label = self.get_class_property(['parent', 'post_label', 'label'], label_property)
                if type(post_label) is str:
                    element_label = element_label + post_label
                break
        return element_label

    def get_class_property(self, class_properties, starting_item):
        """
        Resolve single item properties.

        :param class_properties: property hierarchy used for retrieving specific item.
        Each property must reference only single item.

        :param starting_item: item from which to start resolving properties

        :return: resolved property or None if not found
        """
        result_property = starting_item
        for class_prop in class_properties:
            if hasattr(result_property, class_prop):
                result_property = result_property.__getattribute__(class_prop)
            else:
                return None
        return result_property

    def item_contains_property_by_structure(self, class_properties, starting_item, item_to_find):
        """
        Resolve class properties and check whether item_to_find can be found within starting_item
        following the class_properties structure.

        :param class_properties: property hierarchy used for resolving

        :param starting_item: textX type instance from which to start resolving

        :param item_to_find: textX type instance to find

        :return: True if item can be found else False
        """

        result_property = starting_item
        if class_properties.__len__() == 0:
            # if result is list, must check if any resulting items match searched item
            if result_property.__class__.__name__ == 'list':
                match_any = True
                for result in result_property:
                    match_any = match_any and cy.small_hash(result) == cy.small_hash(item_to_find)
                return match_any
            else:
                return cy.small_hash(result_property) == cy.small_hash(item_to_find)

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
        Resolve class properties of tx_item following the class_properties structure.

        :param class_properties: property hierarchy used for resolving

        :param tx_item: textX type instance from which to start resolving

        :return: all textX type instances that matched defined class property hierarchy
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

    def find_view_parent_tx_type(self, tx_item, view, tx_root_item):
        """
        Method that finds parent of the passed tx_item, starting from the tx_root_item.

        :param tx_item: textX type instance for which to find parent

        :param view: view which holds defined parent textX type for tx_item

        :param tx_root_item: textX type instance from which to start search
        
        :return: parent textX type instance of the tx_item
        """

        # find parent
        for parent_key, parent_value in tx_root_item._tx_attrs.items():
            # if defined get the property
            if parent_value.cont:
                parents = tx_root_item.__getattribute__(parent_key)
                # parent is list of items
                if parents.__class__.__name__ == 'list':
                    first_parent = parents[0] if parents.__len__() > 0 else None
                    if first_parent and view.parent_view:
                        # if any of found items is type of parent type defined in view
                        if first_parent.__class__.__name__ == view.parent_view.name:
                            for parent in parents:
                                # find child
                                for child_key, child_value in parent._tx_attrs.items():
                                    children = parent.__getattribute__(child_key)
                                    # child is list of items
                                    if children.__class__.__name__ == 'list':
                                        first_child = children[0] if children.__len__() > 0 else None
                                        if first_child and first_child.__class__.__name__ == tx_item.__class__.__name__:
                                            for child in children:
                                                if cy.small_hash(tx_item) == cy.small_hash(child):
                                                    return parent
                                            break
                                    # child is single item
                                    else:
                                        if children.__class__.__name__ == tx_item.__class__.__name__:
                                            return parent
                # parent is single item
                else:
                    if parents and view.parent_view:
                        if parents.__class__.__name__ == view.parent_view.name:
                            for parent in parents:
                                # find child
                                for child_key, child_value in parent._tx_attrs.items():
                                    children = parent.__getattribute__(child_key)
                                    # child is list of items
                                    if children.__class__.__name__ == 'list':
                                        first_child = children[0] if children.__len__() > 0 else None
                                        if first_child and first_child.__class__.__name__ == tx_item.__class__.__name__:
                                            for child in children:
                                                if cy.small_hash(tx_item) == cy.small_hash(child):
                                                    return parent
                                            break
                                    # child is single item
                                    else:
                                        if children.__class__.__name__ == tx_item.__class__.__name__:
                                            return parent
        return None

    def find_element_with_class(self, _class):
        """
        Searches created graph elements and finds the first one with defined class.

        :param _class: A class which element should contain

        :return: Graph element if found else None.
        """

        for element in self.elements.values():
            if element.classes.split(' ')[0] == _class:
                return element
        return None

    def update_links(self, element, element_links):
        """
        Updates links to item's properties. All items are defined by their type in outter dictionary
        and all links are defined by their source item's hash code in inner dictionary.

        :param element: element for which to update links

        :param element_links: links to be updated for specified element

        :return: / (updates private property of element links)
        """

        link_dict = self.links.get(element.__class__.__name__, {})
        link_dict.update({cy.small_hash(element): element_links})
        self.links[element.__class__.__name__] = link_dict

    def create_links(self):
        """
        When all property links have been resolved they need to be created additionally.

        :return: / (Updates private property of elements with newly created edges
        for property links of existing graph elements)
        """

        new_edges = []
        # outter dictionary iteration
        for key_type, value_link_dict in self.links.items():
            # inner dictionary iteration
            for key_el_hash, value_element in self.elements.items():
                # linked properties (hash codes)
                linked = value_link_dict.get(key_el_hash, {})
                for target_hash, link_props in linked.items():
                    start_element = self.elements.get(key_el_hash, None)
                    end_element = self.elements.get(target_hash, None)
                    if start_element is not None and end_element is not None:
                        new_edge = cy.Edge(start_element, end_element)
                        # skip first, first is always class name for property link
                        for prop_key, prop_value in link_props[1:]:
                            new_edge.add_data(prop_key, prop_value)
                        # old class, removed type, property name instead
                        # new_edge.add_class('{}-{}'.format(key_type.lower(), end_element.classes.split(' ')[0]))
                        new_edge.add_class(link_props[0][1])
                        new_edges.append(new_edge)
        # after creation add them to the elements
        for edge in new_edges:
            self.elements[cy.small_hash(edge)] = edge


def build_path_from_import(view_model, _import):
    """
    Build system path from defined import (relative '.' separated) path.

    :param view_model: view model from which to resolve relative import

    :param _import: relative import path

    :return: absolute file system path of the import
    """

    path = dirname(view_model)
    _import = _import[1:-1] # remove ""
    if _import[0:2] == './':
        _import = _import[2:]
    subpaths = _import.split('/')
    for subpath in subpaths:
        if subpath == '..':
            path = dirname(path)
        else:
            path = join(path, subpath)
    return path


if __name__ == '__main__':
    if len(sys.argv) < 4:  # the script expects at least 3 arguments (+1 implicit which is script name)
        print('Usage: python {} <view_model> <model> <output_dir> [<socketPort>]'.format(sys.argv[0]))
    else:
        try:
            script_dir = dirname(abspath(__file__))
            viewX_grammar_folder = join(dirname(dirname(script_dir)), 'grammar')

            # load viewX metamodel from grammar folder and create model
            view_meta_model = metamodel_from_file(join(viewX_grammar_folder, 'viewX.tx'))
            view_model_path = sys.argv[1]
            view_model = view_meta_model.model_from_file(view_model_path)

            # get view model name
            parts = view_model_path.split('/') if view_model_path.__contains__('/') else view_model_path.split('\\')
            view_model_name = parts[-1]

            # create textX metamodel path based on viewX model import
            metamodel_path = build_path_from_import(sys.argv[1], view_model.tx_import.path)
            model_path = sys.argv[2]
            
            # get model name
            parts = model_path.split('/') if model_path.__contains__('/') else model_path.split('\\')
            model_name = parts[-1]

            # load metamodel and create model
            target_metamodel = metamodel_from_file(metamodel_path)
            target_model = target_metamodel.model_from_file(model_path)

            # create viewX interpreter based on viewX model and interpret target textX model
            viewX_interpreter = ViewXInterpreter(view_model)
            viewX_interpreter.interpret(target_model)

            # assign output directory path
            output_dir = sys.argv[3] if sys.argv.__len__() > 3 else script_dir

            # assign socket.io server port number
            socket_port = sys.argv[4] if sys.argv.__len__() > 4 else '4000'
            preview_generator.generate(viewX_interpreter, output_dir, socket_port, model_name, view_model_name)
            # print messages below are interpreted by viewX extension
            print('success')
        except TextXSyntaxError as e:
            print('error')
            print('TextXSyntaxError: {}'.format(e.__str__()))
        except TextXSemanticError as e:
            print('error')
            print('TextXSemanticError: {}'.format(e.__str__()))
        except FileNotFoundError as e:
            print('error')
            print('FileNotFoundError: {} {}'.format(e.strerror, e.filename))
