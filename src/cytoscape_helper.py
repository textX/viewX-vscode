import json
import uuid
from abc import ABCMeta, abstractmethod

class Element(object):
    def __init__(self, label, id):
        self.__metaclass__ = Element
        self.group = 'nodes' # 'nodes' for a node, 'edges' for an edge
        self.data = { # element data (put json serialisable dev data here)
            # define 'source' and 'target' for an edge
            'id' : uuid.uuid1() if id is None else id,
            'label' : label
        }
        self.scratch = {} # scratchpad data (usually temp or nonserialisable data)
        self.selected = False # whether the element is selected (default false)
        self.selectable = True # whether the selection state is mutable (default true)
        self.classes = '' # a space separated list of class names that the element has

    def add_class(self, cls):
        if self.classes.__len__ > 0:
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
    def __init__(self, label, id=None):
        super().__init__(label, id)
        self.group = 'nodes'
        self.position = { # the model position of the node (optional on init, mandatory after)
            'x' : 0,
            'y' : 0
        }
        self.locked = False # when locked a node's position is immutable (default false)
        self.grabbable = True # whether the node can be grabbed and moved by the user

class Edge(Element):
    def __init__(self, label, source_el, target_el, id=None):
        super().__init__(label, id)
        self.set_edge_data(source_el, target_el)


def serialize_json(obj):
    # handle concrete class serialization
    if hasattr(obj, '__metaclass__') and obj.__metaclass__.__name__ == 'Element':
        json = {} # { '__classname__' : type(obj).__name__ }
        json.update(vars(obj))
        json.pop('__metaclass__', None) # remove __metaclass__ from json
    # handle abstract class serialization
    elif obj.__class__.__name__ == 'type' and obj.__name__ == 'Element':
        json = obj.__name__
    else:
        json = obj.__str__()
    return json

def deserialize_json(json):
    classname = json.pop('__classname__', None)
    if classname == type(self).__name__:
        obj = Element.__new__(Element)   # Make instance without calling __init__
        for key, value in json.items():
            setattr(obj, key, value)
            return obj
    else:
        return json

n1 = Node('node1')
n2 = Node('node2')
e1 = Edge('edge3', n1, n2)
j1 = json.dumps(n1, default=serialize_json)
j2 = json.dumps(n2, default=serialize_json)
j3 = json.dumps(e1, default=serialize_json)
print(j1)
print(j2)
print(j3)
