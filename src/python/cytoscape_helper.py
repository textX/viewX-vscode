import json


class Element(object):
    """
    Abstract class for Cytoscape.js graph element with common properties for nodes and edges
    """

    def __init__(self, _id):
        self.__metaclass__ = Element
        self.group = 'nodes'  # 'nodes' for a node, 'edges' for an edge
        self.data = {  # element data (put json serializable dev data here)
            # define 'source' and 'target' for an edge
            'id': small_hash(self) if _id is None else _id
        }
        self.scratch = {}  # scratchpad data (usually temp or non-serializable data)
        self.selected = False  # whether the element is selected (default false)
        self.selectable = True  # whether the selection state is mutable (default true)
        self.classes = ''  # a space separated list of class names that the element has

    def add_class(self, cls):
        if self.classes.__len__() > 0:
            self.classes += ' '    
        self.classes += cls

    def add_data(self, key, value):
        # self.data.update({key : value})
        self.data[key] = value

    def set_edge_data(self, source_el, target_el):
        self.group = 'edges'
        self.add_data('source', source_el.data['id'])
        self.add_data('target', target_el.data['id'])
    
    def to_json(self):
        return json.dumps(self, default=serialize_json)


class Node(Element):
    """
    Class which represents Cytoscape.js nodes with node specific properties
    """
    def __init__(self, _id=None):
        super().__init__(_id)
        self.group = 'nodes'
        self.position = {  # the model position of the node (optional on init, mandatory after)
            'x': 0,
            'y': 0
        }
        self.locked = False  # when locked a node's position is immutable (default false)
        self.grabbable = True  # whether the node can be grabbed and moved by the user


class Edge(Element):
    """
    Class which represents Cytoscape.js edges with edge specific properties
    """
    def __init__(self, source_el, target_el, _id=None):
        super().__init__(_id)
        self.set_edge_data(source_el, target_el)


class ViewStyle(object):
    """
    Class which represents Cytoscape.js style definition.

    Contains css styles and selector for elements for which those styles should be applied.
    """
    def __init__(self, selector):
        # self.selector = element.__class__.__name__.lower()
        # if element.classes.__len__() > 0:
        #     self.selector += '.' + element.classes.replace(' ', '.')
        self.selector = selector
        self.style = {}

    def to_json(self):
        return json.dumps(self, default=serialize_json)


def serialize_json(obj):
    """
    A helper method for serializing Cytoscape.js elements in desired json form.
    :param obj: Object to serialize
    :return: JSON string representation of obj
    """
    # handle concrete class serialization
    if hasattr(obj, '__metaclass__') and obj.__metaclass__.__name__ == 'Element':
        json = {}  # { '__classname__' : type(obj).__name__ }
        json.update(vars(obj))
        json.pop('__metaclass__', None)  # remove __metaclass__ from json
    # handle abstract class serialization
    elif obj.__class__.__name__ == 'type' and obj.__name__ == 'Element':
        json = obj.__name__
    elif obj.__class__.__name__ == 'ViewStyle':
        json = {}
        json.update(vars(obj))
    else:
        json = obj.__str__()
    return json


def deserialize_json(json):
    """
    A helper method for deserializing json into Cytoscape.js elements.
    :param json: json representation of Cytoscape.js element
    :return: Cytoscape.js element object if json is valid, else json
    """
    class_name = json.pop('__classname__', None)
    if class_name == 'Element':  # type(self).__name__:
        obj = Element.__new__(Element)   # Make instance without calling __init__
        for key, value in json.items():
            setattr(obj, key, value)
            return obj
    else:
        return json


def small_hash(instance, digits=9):
    """
    Cytoscape.js has trouble with dealing large or negative integers.

    Returns positive and n-digit hash of the passed instance.

    :param instance: for which it's positive 9-digit hash is returned

    :param digits: number of digits of the resulting hash. Default is 9.

    :return: positive 9-digit hash of the instance
    """
    # take positive value
    hash = instance.__hash__().__abs__()
    hash_str = str(hash)
    # reduce hash to n digit
    hash = int(hash_str[-digits:]) if hash_str.__len__() > digits else hash
    # if first digit iz 0 increase digits to n
    hash = hash * 10 if str(hash).__len__() < digits else hash
    return hash
